import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { makeDependencyCondition } from "~/utils/ast-factories/make-dependency-condition";
import { DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME } from "~/utils/constants";
import { hasHookCall } from "~/utils/path-tools/has-hook-call";
import { isAccessorNode } from "~/utils/ast-tools/is-accessor-node";
import type { Component } from "../Component";
import type { ComponentRunnableSegment } from "./ComponentRunnableSegment";
import { SegmentDependency } from "./SegmentDependency";
import type { ComponentVariableSegment } from "./ComponentVariableSegment";

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
} | null;

export abstract class ComponentSegment {
  private segmentCallableId: t.Identifier | null = null;
  protected appliedTransformation = false;

  // Mutable code segments that this depends on this
  protected dependencies = new Set<SegmentDependency>();

  // Mutable code segments that are children of this
  protected children = new Set<ComponentSegment>();

  protected parent: ComponentSegment | null = null;

  private cachedDependencies: Set<SegmentDependency> | null = null;

  getParent() {
    return this.parent;
  }

  constructor(
    public component: Component,
    parent: ComponentSegment | null = null,
    protected type: ComponentMutableSegmentType = COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE,
  ) {
    if (parent) {
      this.setParent(parent);
    }
  }

  setParent(parent: ComponentSegment | null) {
    this.parent?.removeChild(this);
    this.parent = parent;
    parent?.addChild(this);
  }

  removeChild(child: ComponentSegment) {
    this.children.delete(child);
  }

  addChild(child: ComponentSegment) {
    this.children.add(child);
  }

  addDependency(
    componentVariable: ComponentVariableSegment,
    accessorNode: t.Node,
  ) {
    if (this.isComponentRunnableSegment() && this.isRoot()) {
      return;
    }

    if (this.isComponentVariable() && componentVariable === this) {
      return;
    }

    if (!isAccessorNode(accessorNode)) {
      return;
    }

    const componentSegmentDependency = new SegmentDependency(
      componentVariable,
      accessorNode,
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

    if (!componentVariable.isForLoopArgumentVariable()) {
      this.parent?.addDependency(componentVariable, accessorNode);
    }
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDependencies(visited = new Set<SegmentDependency>()) {
    if (this.cachedDependencies) {
      return this.cachedDependencies;
    }

    const allDependencies = new Set(this.dependencies);

    allDependencies.forEach((dependency) => {
      if (visited.has(dependency)) {
        return;
      }

      visited.add(dependency);

      if (dependency.componentVariable.isForLoopArgumentVariable()) {
        allDependencies.delete(dependency);
        return;
      }

      dependency.componentVariable.getDependencies(visited).forEach((d) => {
        allDependencies.add(d);
      });
    });

    return allDependencies;
  }

  abstract computeDependencyGraph(): void;

  abstract get path(): babel.NodePath<babel.types.Node>;

  abstract applyTransformation(params?: {
    parent?: ComponentRunnableSegment | null;
  }): SegmentTransformationResult;

  lock() {
    this.cachedDependencies = this.getDependencies();
  }

  hasHookCall() {
    return hasHookCall(this.path, this.component.path);
  }

  getParentStatement() {
    const parentStatement = this.path.find(
      (p) => p.isStatement() && p.parentPath.isBlockStatement(),
    ) as babel.NodePath<babel.types.Statement> | null;

    return parentStatement;
  }

  isComponentVariable(): this is ComponentVariableSegment {
    return this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE;
  }

  isComponentRunnableSegment(): this is ComponentRunnableSegment {
    return (
      this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_RUNNABLE_SEGMENT_TYPE
    );
  }

  getSegmentCallableId() {
    if (!this.segmentCallableId) {
      this.segmentCallableId = this.component.path.scope.generateUidIdentifier(
        DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME,
      );
    }

    return this.segmentCallableId;
  }

  getDependenciesForTransformation() {
    const dependencies = new Set(this.getDependencies());
    const visited = new Set<SegmentDependency>();

    dependencies.forEach((dependency) => {
      if (!this.dependencies.has(dependency)) {
        dependencies.delete(dependency);
      }
    });

    if (this.isComponentVariable()) {
      this.filterDependenciesByScope(
        this.getMutationDependencies(new Set()),
      ).forEach((dependency) => {
        dependencies.add(dependency);
      });

      this.component.findDependents(this).forEach((dependent) => {
        const mutationDependencies =
          dependent.isComponentVariable() &&
          dependent.getMutationDependencies();
        if (mutationDependencies) {
          for (const dependencyOfMutation of mutationDependencies) {
            if (visited.has(dependencyOfMutation)) {
              continue;
            }
            if (dependencyOfMutation.componentVariable !== this) {
              dependencies.add(dependencyOfMutation);
            }
          }
        }
      });
    }

    return dependencies;
  }

  protected makeDependencyCondition() {
    return makeDependencyCondition(this);
  }

  protected filterDependenciesByScope(dependencies: Set<SegmentDependency>) {
    const newDependencies = new Set<SegmentDependency>(dependencies);

    dependencies.forEach((dependency) => {
      const isInSameScope = dependency.isInTheScopeOf(this.path);

      if (!isInSameScope) {
        newDependencies.delete(dependency);
      }
    });

    return newDependencies;
  }

  protected makeSegmentCallStatement(
    transformation: SegmentTransformationResult,
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
        ]),
      );

      updateStatements.push(
        // if customCallVariable not equal to null, return it
        t.ifStatement(
          t.binaryExpression(
            "!==",
            customCallVariable,
            this.component.getCacheNullIdentifier(),
          ),
          t.blockStatement([t.returnStatement(customCallVariable)]),
        ),
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
              t.blockStatement(updateStatements),
            ),
          ]
        : updateStatements;

    return callStatementWithCondition;
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
