import type * as babel from "@babel/core";
import { makeDependencyCondition } from "~/ast-factories/make-dependency-condition";
import { isHookCall } from "~/utils/is-hook-call";
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

export abstract class ComponentMutableSegment {
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

  protected makeDependencyCondition() {
    return makeDependencyCondition(this);
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDependencies() {
    return this.dependencies;
  }

  computeDependencyGraph() {
    throw new Error("Not implemented");
  }

  getSideEffectDependencies() {
    const result = Array.from(this.sideEffects.values()).flatMap((sideEffect) =>
      Array.from(sideEffect.getDependencies().values())
    );

    return result;
  }

  hasHookCall() {
    if (this.hasDependencies()) {
      return false;
    }

    let hasHookCall = false;
    this.path.traverse({
      CallExpression: (innerPath) => {
        if (
          isHookCall(innerPath) &&
          this.component.isTheFunctionParentOf(innerPath)
        ) {
          hasHookCall = true;
          return;
        }
      },
    });

    return hasHookCall;
  }

  getParentStatement() {
    return this.path.getStatementParent();
  }

  get path(): babel.NodePath<babel.types.Node> {
    throw new Error("Not implemented");
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
