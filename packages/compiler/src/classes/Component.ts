import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { isChildOfScope, isControlFlowStatement } from "~/utils/ast-tools";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_NULL_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
} from "~/utils/constants";
import { isInTheSameFunctionScope } from "~/utils/is-in-the-same-function-scope";
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
  }

  prepareComponentBody() {}

  hasComponentVariable(binding: Binding) {
    return this.componentVariables.has(binding);
  }

  getComponentVariable(binding: Binding) {
    return this.componentVariables.get(binding);
  }

  findPotentialParentForSegment(
    path: babel.NodePath<babel.types.Node>
  ): ComponentRunnableSegment | null {
    const blockOrControlFlowStatement = path.findParent(
      (innerPath) =>
        (innerPath.isBlockStatement() || isControlFlowStatement(innerPath)) &&
        innerPath.isDescendant(this.path) &&
        isInTheSameFunctionScope(innerPath, this.path)
    ) as babel.NodePath<babel.types.BlockStatement> | null;

    if (!blockOrControlFlowStatement) {
      return null;
    }

    const parent =
      this.mapBlockStatementToComponentRunnableSegment.get(
        blockOrControlFlowStatement
      ) ?? null;

    const ensuredParent = parent
      ? parent
      : this.addRunnableSegment(blockOrControlFlowStatement);

    return ensuredParent;
  }

  lock() {
    this.componentVariables.forEach((componentVariable) => {
      componentVariable.lock();
    });
    this.runnableSegments.forEach((runnableSegment) => {
      runnableSegment.lock();
    });
  }

  addComponentVariable(binding: Binding) {
    if (!this.isBindingInComponentScope(binding)) {
      return;
    }

    const { path } = binding;

    const parent = this.findPotentialParentForSegment(path);

    if (this.hasComponentVariable(binding)) {
      const componentVariable = this.getComponentVariable(binding)!;
      componentVariable.setParent(parent);
      return componentVariable;
    }

    // if (isForStatementInit(path)) {
    //   // This is for variables defined in the for statement
    //   // return;
    // }

    const componentVariable = new ComponentVariable(
      this,
      parent,
      binding,
      this.componentVariables.size
    );

    this.componentVariables.set(binding, componentVariable);

    componentVariable.unwrapAssignmentPatterns();
    componentVariable.computeDependencyGraph();

    this.statementsToMutableSegmentMapCache = null;
    return componentVariable;
  }

  addRunnableSegment(path: babel.NodePath<babel.types.Statement>) {
    if (path === this.rootSegment?.path) {
      return this.rootSegment;
    }

    if (!isInTheSameFunctionScope(path, this.path)) {
      const parent = this.findPotentialParentForSegment(path);
      return parent;
    }

    const parent = this.findPotentialParentForSegment(path);

    if (this.runnableSegments.has(path)) {
      const found = this.runnableSegments.get(path)!;

      if (parent !== found.getParent()) {
        found.getParent()?.removeChild(found);
        found.setParent(parent);
      }

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
    this.statementsToMutableSegmentMapCache = null;

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
      if (parent && !parent.isBlockStatement()) {
        statementsToMutableSegmentMap.set(parent, segment);
      }
    };

    this.runnableSegments.forEach(statementsMapSet);
    this.componentVariables.forEach(statementsMapSet);

    this.statementsToMutableSegmentMapCache = statementsToMutableSegmentMap;

    return statementsToMutableSegmentMap;
  }

  applyTransformation() {
    if (!this.rootSegment) {
      throw new Error("Root segment not found");
    }

    this.lock();
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();

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
            return `${componentVariable.getIndex()} => ${
              componentVariable.name
            }`;
          })
          .join("\n") +
        "\n"
    );

    return declaration;
  }

  isBindingInComponentScope(binding: Binding) {
    return isChildOfScope(this.path.scope, binding.scope);
  }

  // --- DEBUGGING ---
  __debug_getComponentVariables() {
    return this.componentVariables;
  }

  __debug_dependencies() {
    return [
      ...[
        ...this.runnableSegments.values(),
        ...this.componentVariables.values(),
      ].map((segment) => {
        return (
          String(segment.path) +
          "depends on (" +
          [...segment.getDependencies().values()]
            .map((d) => d.componentVariable.name)
            .join(" , ") +
          ")"
        );
      }),
    ].join("\n");
  }
}
