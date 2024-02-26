import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { Component } from "./Component";
import { ComponentMutableSegment } from "./ComponentMutableSegment";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";

export class ComponentSideEffect extends ComponentMutableSegment {
  private appliedModification = false;

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

  applyModification() {
    if (this.appliedModification) {
      return;
    }

    const dependenciesCondition = this.makeDependencyCondition();

    if (dependenciesCondition) {
      this.path.replaceWithMultiple([
        t.ifStatement(
          dependenciesCondition,
          t.blockStatement([this.path.node])
        ),
      ]);
    }

    this.appliedModification = true;
  }

  get path() {
    return this._path;
  }
}
