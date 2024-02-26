import type * as babel from "@babel/core";
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
import { unwrapJsxExpressions } from "~/utils/unwrap-jsx-expressions";
import { unwrapJsxElements } from "~/utils/unwrap-jsx-elements";

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
  }

  computeComponentVariables() {
    this.prepareComponentBody();
    getReturnsOfFunction(this.path).forEach((returnPath) => {
      const bindings = getReferencedVariablesInside(returnPath);
      bindings.forEach((binding) => {
        this.addComponentVariable(binding);
      });
    });
  }

  prepareComponentBody() {
    unwrapJsxExpressions(this.path);
    unwrapJsxElements(this.path);
  }

  hasComponentVariable(name: string) {
    return this.componentVariables.has(name);
  }

  getComponentVariable(name: string) {
    return this.componentVariables.get(name);
  }

  addComponentVariable(binding: Binding) {
    const path = binding.path;

    // If the binding is not in the same function, ignore it i.e. it can't be a component variable
    if (!this.isTheFunctionParentOf(path)) {
      return null;
    }

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
    componentVariable.unwrapAssignmentPatterns();
    componentVariable.computeDependencyGraph();

    return componentVariable;
  }

  isTheFunctionParentOf(path: babel.NodePath<babel.types.Node>) {
    return getFunctionParent(path) === this.path;
  }

  getRootComponentVariables() {
    return [...this.componentVariables.values()].filter(
      (componentVariable) => !componentVariable.isDerived()
    );
  }

  getCacheVariableIdentifier() {
    return t.cloneNode(this.cacheValueIdentifier);
  }

  getCacheCommitIdentifier() {
    return t.cloneNode(this.cacheCommitIdentifier);
  }

  applyModification() {
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();

    const body = this.path.get("body");

    this.componentVariables.forEach((componentVariable) => {
      componentVariable.applyModification();
    });

    if (body.isBlockStatement()) {
      body.unshiftContainer("body", cacheVariableDeclaration);
    }

    const returns = getReturnsOfFunction(this.path);

    returns.forEach((returnPath) => {
      returnPath.insertBefore(
        t.expressionStatement(t.callExpression(this.cacheCommitIdentifier, []))
      );
    });
  }

  getFunctionBlockStatement(): babel.NodePath<babel.types.BlockStatement> | null {
    const path = this.path;
    if (path.isFunctionExpression()) {
      return path.get("body");
    }
    // Need to duplicate the check because the type guard with || is not working
    else if (path.isFunctionDeclaration()) {
      return path.get("body");
    } else if (path.isArrowFunctionExpression()) {
      const body = path.get("body");
      if (body.isBlockStatement()) {
        return body;
      }
    }

    return null;
  }

  private makeCacheVariableDeclaration() {
    const sizeNumber = t.numericLiteral(this.componentVariables.size);
    const declaration = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.arrayPattern([this.cacheValueIdentifier, this.cacheCommitIdentifier]),
        t.callExpression(t.identifier(RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME), [
          sizeNumber,
        ])
      ),
    ]);

    t.addComment(
      sizeNumber,
      "leading",
      "\n" +
        Array.from(this.componentVariables.values())
          .map((componentVariable) => {
            return `${componentVariable.getIndex()} => ${componentVariable.name}`;
          })
          .join("\n") +
        "\n"
    );

    return declaration;
  }

  // --- DEBUGGING ---
  __debug_getComponentVariables() {
    return this.componentVariables;
  }
}
