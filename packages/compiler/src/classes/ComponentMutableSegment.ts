import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { makeDependencyCondition } from "~/ast-factories/make-dependency-condition";
import { DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME } from "~/utils/constants";
import { hasHookCall } from "~/utils/is-hook-call";
import { Component } from "./Component";
import type { ComponentRunnableSegment } from "./ComponentRunnableSegment";
import { ComponentSegmentDependency } from "./ComponentSegmentDependency";
import type { ComponentVariable } from "./ComponentVariable";

export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE = "Unset";
export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE =
  "ComponentVariable";
export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_RUNNABLE_SEGMENT_TYPE =
  "ComponentRunnableSegment";

type ComponentMutableSegmentType =
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_RUNNABLE_SEGMENT_TYPE;

export type SegmentTransformationResult = {
  performTransformation: () => babel.NodePath<babel.types.Statement>[] | null;
  segmentCallableId: babel.types.Identifier;
  dependencyConditions: babel.types.Expression | null;
  hasHookCall: boolean;
  hasReturnStatement?: boolean;
  updateCache?: babel.types.Statement | null;
  replacements: babel.types.Node[] | null;
} | null;

export abstract class ComponentMutableSegment {
  private segmentCallableId: t.Identifier | null = null;
  protected appliedTransformation = false;

  // Mutable code segments that this depends on this
  protected dependencies = new Set<ComponentSegmentDependency>();

  // Mutable code segments that are children of this
  protected children = new Set<ComponentMutableSegment>();

  protected parent: ComponentMutableSegment | null = null;

  constructor(
    public component: Component,
    parent: ComponentMutableSegment | null = null,
    protected type: ComponentMutableSegmentType = COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE
  ) {
    if (parent) {
      this.setParent(parent);
    }
  }

  setParent(parent: ComponentMutableSegment | null) {
    this.parent?.removeChild(this);
    this.parent = parent;
    parent?.addChild(this);
  }

  removeChild(child: ComponentMutableSegment) {
    this.children.delete(child);
  }

  addChild(child: ComponentMutableSegment) {
    this.children.add(child);
  }

  addDependency(componentVariable: ComponentVariable, accessorNode: t.Node) {
    if (this.isComponentVariable() && componentVariable === this) {
      return;
    }

    const componentSegmentDependency = new ComponentSegmentDependency(
      componentVariable,
      accessorNode as any
    );

    let alreadyHasDependency = false;
    for (const dependency of this.dependencies) {
      const dependenciesEqual = componentSegmentDependency.equals(dependency);
      if (dependenciesEqual) {
        alreadyHasDependency = true;
        break;
      }
    }

    if (!alreadyHasDependency) {
      this.dependencies.add(componentSegmentDependency);
    }
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDependencies() {
    return this.dependencies;
  }

  abstract computeDependencyGraph(): void;

  abstract get path(): babel.NodePath<babel.types.Node>;

  abstract applyTransformation(params?: {
    parent?: ComponentRunnableSegment | null;
  }): SegmentTransformationResult;

  protected makeDependencyCondition() {
    return makeDependencyCondition(this);
  }

  hasHookCall() {
    return hasHookCall(this.path, this.component.path);
  }

  getParentStatement() {
    const parentStatement = this.path.find(
      (p) => p.isStatement() && p.parentPath.isBlockStatement()
    ) as babel.NodePath<babel.types.Statement> | null;

    return parentStatement;
  }

  isComponentVariable(): this is ComponentVariable {
    return this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE;
  }

  isComponentRunnableSegment(): this is ComponentRunnableSegment {
    return (
      this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_RUNNABLE_SEGMENT_TYPE
    );
  }

  protected makeSegmentCallStatement(
    transformation: SegmentTransformationResult
  ) {
    if (!transformation) {
      return null;
    }

    const {
      dependencyConditions,
      segmentCallableId,
      hasHookCall,
      updateCache,
      hasReturnStatement,
    } = transformation;

    const callSegmentCallable = t.callExpression(segmentCallableId, []);
    const updateStatements: t.Statement[] = [];

    if (hasReturnStatement) {
      const customCallVariable =
        this.component.path.scope.generateUidIdentifier();
      updateStatements.push(
        t.variableDeclaration("const", [
          t.variableDeclarator(customCallVariable, callSegmentCallable),
        ])
      );

      updateStatements.push(
        // if customCallVariable not equal to null, return it
        t.ifStatement(
          t.binaryExpression(
            "!==",
            customCallVariable,
            this.component.getCacheNullIdentifier()
          ),
          t.blockStatement([t.returnStatement(customCallVariable)])
        )
      );
    } else {
      updateStatements.push(t.expressionStatement(callSegmentCallable));
    }

    if (updateCache) {
      updateStatements.push(updateCache);
    }

    const callStatementWithCondition =
      dependencyConditions && !hasHookCall
        ? [
            t.ifStatement(
              dependencyConditions,
              t.blockStatement(updateStatements)
            ),
          ]
        : updateStatements;

    return callStatementWithCondition;
  }

  getSegmentCallableId() {
    if (!this.segmentCallableId) {
      this.segmentCallableId = this.component.path.scope.generateUidIdentifier(
        DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME
      );
    }

    return this.segmentCallableId;
  }

  _debug(depth = 0): string {
    const space = "  ".repeat(depth);
    const addedSpace = "  ".repeat(depth + 1);
    return (
      space +
      "(" +
      this.path.type +
      ") ->\n" +
      [...this.children]
        .map((child) => addedSpace + child._debug(depth + 1))
        .join("\n")
    );
  }
}
