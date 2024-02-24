import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
} from "~/utils/constants";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { getReturnsOfFunction } from "~/utils/get-returns-of-function";
import { getFunctionParent } from "../utils/get-function-parent";
import { ComponentVariable } from "./ComponentVariable";

export class Component {
  private componentVariables = new Map<string, ComponentVariable>();
  private cacheValueIdentifier: t.Identifier;
  private cacheCommitIdentifier: t.Identifier;

  constructor(public path: babel.NodePath<babel.types.Function>) {
    path.assertFunction();

    this.cacheValueIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_VARIABLE_NAME
    );

    this.cacheCommitIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_COMMIT_VARIABLE_NAME
    );

    this.computeComponentVariables();
  }

  hasComponentVariable(name: string) {
    return this.componentVariables.has(name);
  }

  getComponentVariable(name: string) {
    return this.componentVariables.get(name);
  }

  addComponentVariable(binding: Binding) {
    const name = binding.identifier.name;

    if (this.hasComponentVariable(name)) {
      return this.getComponentVariable(name);
    }

    const componentVariable = new ComponentVariable(
      binding,
      this,
      this.componentVariables.size
    );

    this.componentVariables.set(name, componentVariable);
    componentVariable.computeDependencyGraph();

    return componentVariable;
  }

  computeComponentVariables() {
    getReturnsOfFunction(this.path).forEach((returnPath) => {
      const bindings = getReferencedVariablesInside(returnPath);
      bindings.forEach((binding) => {
        const componentVariable = this.addComponentVariable(binding);
      });
    });
  }

  isTheFunctionParentOf(path: babel.NodePath<babel.types.Node>) {
    return getFunctionParent(path) === this.path;
  }

  getRootComponentVariables() {
    return [...this.componentVariables.values()].filter(
      (componentVariable) => !componentVariable.isDerived()
    );
  }

  public getCacheVariableIdentifier() {
    return t.cloneNode(this.cacheValueIdentifier);
  }

  public getCacheCommitIdentifier() {
    return t.cloneNode(this.cacheCommitIdentifier);
  }

  private makeCacheVariableDeclaration() {
    const declaration = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.arrayPattern([this.cacheValueIdentifier, this.cacheCommitIdentifier]),
        t.callExpression(t.identifier(RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME), [
          t.numericLiteral(this.componentVariables.size),
        ])
      ),
    ]);

    t.addComment(
      declaration,
      "leading",
      "\n" +
        [...this.componentVariables.values()]
          .map((componentVariable) => {
            return `${componentVariable.getIndex()}: ${componentVariable.name}`;
          })
          .join("\n") +
        "\n"
    );

    return declaration;
  }

  applyModification() {
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();

    const body = this.path.get("body");

    if (body.isBlockStatement()) {
      body.unshiftContainer("body", cacheVariableDeclaration);
    }
  }

  // --- DEBUGGING ---
  __debug_getComponentVariables() {
    return this.componentVariables;
  }
}
