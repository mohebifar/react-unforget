import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_NULL_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
} from "~/utils/constants";
import { isVariableInScopeOf } from "~/utils/is-variable-in-scope-of";
import { unwrapJsxElements } from "~/utils/unwrap-jsx-elements";
import { unwrapJsxExpressions } from "~/utils/unwrap-jsx-expressions";
import { getFunctionParent } from "../utils/get-function-parent";
import { ComponentMutableSegment } from "./ComponentMutableSegment";
import { ComponentRunnableSegment } from "./ComponentRunnableSegment";
import { ComponentVariable } from "./ComponentVariable";

export class Component {
  private runnableSegments = new Map<
    babel.NodePath<babel.types.Statement>,
    ComponentRunnableSegment
  >();
  private componentVariables = new Map<Binding, ComponentVariable>();
  private cacheValueIdentifier: t.Identifier;
  private cacheCommitIdentifier: t.Identifier;
  private cacheNullIdentifier: t.Identifier;

  private rootSegment: ComponentRunnableSegment | null = null;

  private mapBlockStatementToComponentRunnableSegment = new Map<
    babel.NodePath<babel.types.BlockStatement>,
    ComponentRunnableSegment
  >();

  constructor(public path: babel.NodePath<babel.types.Function>) {
    path.assertFunction();

    this.cacheValueIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_VARIABLE_NAME
    );

    this.cacheCommitIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_COMMIT_VARIABLE_NAME
    );

    this.cacheNullIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_NULL_VARIABLE_NAME
    );
  }

  computeComponentSegments() {
    this.prepareComponentBody();

    const body = this.path.get("body");
    if (!body.isBlockStatement()) {
      return;
    }

    this.rootSegment = this.addRunnableSegment(body);
    this.rootSegment.computeDependencyGraph();
  }

  prepareComponentBody() {
    unwrapJsxExpressions(this.path);
    unwrapJsxElements(this.path);
  }

  hasComponentVariable(binding: Binding) {
    return this.componentVariables.has(binding);
  }

  getComponentVariable(binding: Binding) {
    return this.componentVariables.get(binding);
  }

  private findBlockStatementOfPath(path: babel.NodePath<babel.types.Node>) {
    return path.findParent(
      (innerPath) =>
        innerPath.isBlockStatement() && innerPath.isDescendant(this.path)
    ) as babel.NodePath<babel.types.BlockStatement> | null;
  }

  addComponentVariable(binding: Binding) {
    // If the binding is not in the same function, ignore it i.e. it can't be a component variable
    if (binding.scope !== this.path.scope) {
      return null;
    }

    const { path } = binding;

    const blockStatement = this.findBlockStatementOfPath(path);
    const parent = blockStatement
      ? this.mapBlockStatementToComponentRunnableSegment.get(blockStatement) ??
        null
      : null;

    if (this.hasComponentVariable(binding)) {
      const componentVariable = this.getComponentVariable(binding)!;
      componentVariable.setParent(parent);
      return componentVariable;
    }

    const componentVariable = new ComponentVariable(
      this,
      parent,
      binding,
      this.componentVariables.size
    );

    this.componentVariables.set(binding, componentVariable);

    componentVariable.unwrapAssignmentPatterns();
    componentVariable.computeDependencyGraph();

    return componentVariable;
  }

  addRunnableSegment(path: babel.NodePath<babel.types.Statement>) {
    const blockStatement = this.findBlockStatementOfPath(path);
    const parent = blockStatement
      ? this.mapBlockStatementToComponentRunnableSegment.get(blockStatement) ??
        null
      : null;

    if (this.runnableSegments.has(path)) {
      const found = this.runnableSegments.get(path)!;
      found.setParent(parent);
      return found;
    }

    const runnableSegment = new ComponentRunnableSegment(this, parent, path);

    if (path.isBlockStatement()) {
      this.mapBlockStatementToComponentRunnableSegment.set(
        path,
        runnableSegment
      );
    }

    this.runnableSegments.set(path, runnableSegment);

    runnableSegment.computeDependencyGraph();

    return runnableSegment;
  }

  isTheFunctionParentOf(path: babel.NodePath<babel.types.Node>) {
    return getFunctionParent(path) === this.path;
  }

  getRootComponentVariables() {
    return [...this.componentVariables.values()].filter(
      (componentVariable) => !componentVariable.hasDependencies()
    );
  }

  getCacheVariableIdentifier() {
    return t.cloneNode(this.cacheValueIdentifier);
  }

  getCacheCommitIdentifier() {
    return t.cloneNode(this.cacheCommitIdentifier);
  }

  getCacheNullIdentifier() {
    return t.cloneNode(this.cacheNullIdentifier);
  }

  private statementsToMutableSegmentMapCache: Map<
    babel.NodePath<babel.types.Statement>,
    ComponentMutableSegment
  > | null = null;

  getStatementsToMutableSegmentMap() {
    if (this.statementsToMutableSegmentMapCache) {
      return this.statementsToMutableSegmentMapCache;
    }

    const statementsToMutableSegmentMap = new Map<
      babel.NodePath<babel.types.Statement>,
      ComponentMutableSegment
    >();

    const statementsMapSet = (segment: ComponentMutableSegment) => {
      const parent = segment.getParentStatement();
      if (parent) {
        statementsToMutableSegmentMap.set(parent, segment);
      }
    };

    this.runnableSegments.forEach(statementsMapSet);
    this.componentVariables.forEach(statementsMapSet);

    this.statementsToMutableSegmentMapCache = statementsToMutableSegmentMap;

    return statementsToMutableSegmentMap;
  }

  applyTransformation() {
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();

    if (!this.rootSegment) {
      throw new Error("Root segment not found");
    }

    const body = this.path.get("body");

    if (!body.isBlockStatement()) {
      return;
    }

    this.rootSegment.applyTransformation();

    body.unshiftContainer("body", cacheVariableDeclaration);
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
        t.arrayPattern([
          this.cacheValueIdentifier,
          this.cacheCommitIdentifier,
          this.cacheNullIdentifier,
        ]),
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

  isBindingInComponentScope(binding: Binding) {
    return isVariableInScopeOf(binding, this.path.scope);
  }
}
