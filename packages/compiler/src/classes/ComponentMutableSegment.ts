import type * as babel from "@babel/core";
import { makeDependencyCondition } from "~/ast-factories/make-dependency-condition";
import { hasHookCall } from "~/utils/is-hook-call";
import { Component } from "./Component";
import type { ComponentSideEffect } from "./ComponentSideEffect";
import type { ComponentVariable } from "./ComponentVariable";

export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE = "Unset";
export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE =
  "ComponentVariable";
export const COMPONENT_MUTABLE_SEGMENT_COMPONENT_SIDE_EFFECT_TYPE =
  "ComponentSideEffect";

type ComponentMutableSegmentType =
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE
  | typeof COMPONENT_MUTABLE_SEGMENT_COMPONENT_SIDE_EFFECT_TYPE;

export type SegmentTransformationResult = {
  segmentCallableId: babel.types.Identifier;
  dependencyConditions: babel.types.Expression | null;
  newPaths: babel.NodePath<babel.types.Node>[] | null;
  hasHookCall: boolean;
  returnDescendant?: babel.NodePath<babel.types.Node> | null;
  updateCache?: babel.types.Statement | null;
  replacements: babel.types.Node[] | null;
} | null;

export abstract class ComponentMutableSegment {
  protected appliedTransformation = false;

  // The side effects of this segment
  protected sideEffects = new Map<
    babel.NodePath<babel.types.Statement>,
    ComponentSideEffect
  >();

  // Mutable code segments that this depends on this
  protected dependencies = new Map<string, ComponentMutableSegment>();

  constructor(
    public component: Component,
    protected type: ComponentMutableSegmentType = COMPONENT_MUTABLE_SEGMENT_COMPONENT_UNSET_TYPE
  ) {}

  addSideEffect(sideEffect: ComponentSideEffect) {
    this.sideEffects.set(sideEffect.path, sideEffect);
  }

  addDependency(componentVariable: ComponentVariable) {
    this.dependencies.set(componentVariable.name, componentVariable);
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDependencies() {
    return this.dependencies;
  }

  abstract computeDependencyGraph(): void;

  abstract get path(): babel.NodePath<babel.types.Node>;

  abstract applyTransformation(
    performReplacement?: boolean
  ): SegmentTransformationResult;

  protected makeDependencyCondition() {
    return makeDependencyCondition(this);
  }

  getSideEffectDependencies() {
    const result = Array.from(this.sideEffects.values()).flatMap((sideEffect) =>
      Array.from(sideEffect.getDependencies().values())
    );

    return result;
  }

  hasHookCall() {
    return hasHookCall(this.path, this.component.path);
  }

  getParentStatement() {
    const parentStatement = this.path.find(
      (p) => p.isStatement() && p.parentPath === this.component.path.get("body")
    ) as babel.NodePath<babel.types.Statement> | null;

    return parentStatement;
  }

  isComponentVariable(): this is ComponentVariable {
    return this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_VARIABLE_TYPE;
  }

  isComponentSideEffect(): this is ComponentSideEffect {
    return this.type === COMPONENT_MUTABLE_SEGMENT_COMPONENT_SIDE_EFFECT_TYPE;
  }

  // --- DEBUGGING ---
  __debug_getSideEffects() {
    return this.sideEffects;
  }
}
