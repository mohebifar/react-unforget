import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { Component } from "./Component";
import { ComponentMutableSegment } from "./ComponentMutableSegment";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";

export class ComponentSideEffect extends ComponentMutableSegment {
  constructor(
    component: Component,
    private _path: babel.NodePath<babel.types.Statement>
  ) {
    super(component, "ComponentSideEffect");
  }

  computeDependencyGraph() {
    this.dependencies.clear();
    this.sideEffects.clear();

    const referencesInThisPath = getReferencedVariablesInside(this.path);

    referencesInThisPath.forEach((binding) => {
      const dependent = this.component.addComponentVariable(binding);

      if (dependent) {
        this.addDependency(dependent);
        dependent.addSideEffect(this);
      }
    });
  }

  applyTransformation(performReplacement = true) {
    if (this.appliedTransformation) {
      return null;
    }

    const hasHookCall = this.hasHookCall();

    const { segmentCallableId, newPaths, replacements } =
      convertStatementToSegmentCallable(this.path, { performReplacement });
    this.appliedTransformation = true;

    return {
      replacements,
      segmentCallableId,
      newPaths,
      hasHookCall,
      dependencyConditions: this.makeDependencyCondition(),
    };
  }

  get path() {
    return this._path;
  }
}
