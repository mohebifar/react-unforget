import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { getDeclaredIdentifiersInLVal } from "../utils/get-declared-identifiers-in-lval";
import { Component } from "./Component";
import { getRightmostIdName } from "~/utils/get-rightmost-id-name";
import { isHookCall } from "~/utils/is-hook-call";

export class ComponentVariable {
  // The side effects of this variable
  private sideEffects = new Set<babel.NodePath<babel.types.Node>>();

  // ComponentVariables that reference this
  private dependents = new Map<string, ComponentVariable>();

  // ComponentVariables that this depends on
  private dependencies = new Map<string, ComponentVariable>();

  constructor(
    public binding: Binding,
    public component: Component,
    private index: number
  ) {}

  get name() {
    return this.binding.identifier.name;
  }

  getIndex() {
    return this.index;
  }

  addSideEffect(path: babel.NodePath<babel.types.Node>) {
    this.sideEffects.add(path);
  }

  addDependency(componentVariable: ComponentVariable) {
    this.dependencies.set(componentVariable.name, componentVariable);
  }

  computeDependencyGraph() {
    this.binding.referencePaths.forEach((referencePath) => {
      const parentVariableDeclarator = referencePath.findParent(
        (p) =>
          p.isVariableDeclarator() && this.component.isTheFunctionParentOf(p)
      ) as babel.NodePath<babel.types.VariableDeclarator> | null;

      if (parentVariableDeclarator) {
        const lval = parentVariableDeclarator.get("id");

        const ids = getDeclaredIdentifiersInLVal(lval);

        ids.forEach((id) => {
          let dependent = this.component.getComponentVariable(id);

          if (!dependent) {
            const binding = this.component.path.scope.getBinding(id);

            if (binding) {
              dependent = this.component.addComponentVariable(binding);
            }
          }

          if (dependent) {
            this.dependents.set(id, dependent);
            dependent.addDependency(this);
          }
        });
      } else {
        // TODO: Side effect calculation
        // console.log("reference parent ->", referencePath.parentPath?.node);
      }
    });

    // console.log("this.binding.path.node", this.binding.path.node);

    const referencedVariablesInDeclaration = getReferencedVariablesInside(
      this.binding.path
    );

    referencedVariablesInDeclaration.forEach((binding) => {
      this.component.addComponentVariable(binding);
    });
  }

  isDerived() {
    return this.dependencies.size > 0;
  }

  isHook() {
    if (this.isDerived()) {
      return false;
    }

    const parentVariableDeclarator = this.binding.path.findParent(
      (p) => p.isVariableDeclarator() && this.component.isTheFunctionParentOf(p)
    ) as babel.NodePath<babel.types.VariableDeclarator> | null;

    if (!parentVariableDeclarator) {
      return false;
    }

    // return true if init is a call expression of hooks

    const init = parentVariableDeclarator.get("init");

    if (!init.isCallExpression()) {
      return false;
    }

    return isHookCall(init);
  }

  private getCacheAccessorExpression() {
    t.memberExpression(
      this.component.getCacheVariableIdentifier(),
      t.numericLiteral(this.index)
    );
  }

  // --- DEBUGGING ---
  __debug_getDependents() {
    return this.dependents;
  }

  __debug_getDependencies() {
    return this.dependencies;
  }

  __debug_getSideEffects() {
    return this.sideEffects;
  }
}
