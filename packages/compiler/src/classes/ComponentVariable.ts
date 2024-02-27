import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";
import { makeCacheEnqueueCallStatement } from "~/ast-factories/make-cache-enqueue-call-statement";
import { makeUnwrappedDeclarations } from "~/ast-factories/make-unwrapped-declarations";
import {
  DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME,
  DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME,
  DEFAULT_UNWRAPPED_VARIABLE_NAME,
  RUNTIME_MODULE_CACHE_IS_NOT_SET_PROP_NAME,
  RUNTIME_MODULE_CACHE_VALUE_PROP_NAME,
} from "~/utils/constants";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { UnwrappedAssignmentEntry } from "~/utils/unwrap-pattern-assignment";
import { getDeclaredIdentifiersInLVal } from "../utils/get-declared-identifiers-in-lval";
import { Component } from "./Component";
import { ComponentMutableSegment } from "./ComponentMutableSegment";

export class ComponentVariable extends ComponentMutableSegment {
  private variableSideEffects = new Set<ComponentVariable>();

  private segmentCallableId: t.Identifier | null = null;

  constructor(
    public binding: Binding,
    component: Component,
    private index: number
  ) {
    super(component, "ComponentVariable");
  }

  get name() {
    return this.binding.identifier.name;
  }

  getIndex() {
    return this.index;
  }

  unwrapAssignmentPatterns() {
    const { path, scope } = this.binding;

    const newPaths: babel.NodePath<babel.types.Node>[] = [];
    let unwrappedEntries: UnwrappedAssignmentEntry[] = [];
    let unwrapVariableId: t.Identifier | null = null;

    let initPath: babel.NodePath<babel.types.Node> | null = null;

    if (path.isVariableDeclarator()) {
      const id = path.get("id");
      const parentPath =
        this.getParentStatement() as babel.NodePath<babel.types.VariableDeclaration>;
      const kind = parentPath.node.kind;

      if (id.isIdentifier()) {
        return;
      }

      unwrapVariableId = scope.generateUidIdentifierBasedOnNode(
        id.node,
        DEFAULT_UNWRAPPED_VARIABLE_NAME
      );

      const tempVariableDeclarator = t.variableDeclarator(
        unwrapVariableId,
        path.get("init").node
      );

      const unwrapResult = makeUnwrappedDeclarations(
        id,
        kind as "const" | "let" | "var",
        unwrapVariableId
      );

      const initDeclaration = t.variableDeclaration("const", [
        tempVariableDeclarator,
      ]);

      [initPath] = parentPath.replaceWith(initDeclaration);

      unwrapResult.unwrappedDeclarations.forEach(([newNode, binding]) => {
        if (!initPath) {
          return;
        }

        const [newPath] = initPath.insertAfter(newNode);
        newPaths.push(newPath);
        if (binding) {
          binding.kind = newNode.kind as "const" | "let" | "var";
          binding.path = newPath;
        }
      });

      scope.registerDeclaration(initPath);

      unwrappedEntries = unwrapResult.unwrappedEntries;
    }

    if (this.binding.kind === "param") {
      const componentBlock = this.component.getFunctionBlockStatement();

      if (path.isIdentifier() || !componentBlock) {
        return;
      }

      unwrapVariableId = scope.generateUidIdentifier(
        DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME
      );

      const unwrapResult = makeUnwrappedDeclarations(
        path as babel.NodePath<babel.types.LVal>,
        "let",
        unwrapVariableId
      );

      [initPath] = path.replaceWith(unwrapVariableId);

      scope.registerBinding("param", initPath);

      unwrapResult.unwrappedDeclarations.forEach(([newNode, binding]) => {
        const [newPath] = componentBlock.unshiftContainer("body", newNode);
        newPaths.push(newPath);
        if (binding) {
          binding.kind = newNode.kind as "const" | "let" | "var";
          binding.path = newPath;
        }
      });

      this.binding.kind = "let";

      unwrappedEntries = unwrapResult.unwrappedEntries;
    }

    newPaths.forEach((newPath, index) => {
      const name = unwrappedEntries[index]?.name;
      const binding = name ? scope.getOwnBinding(name) : null;

      if (binding) {
        binding.path = newPath.get(
          "declarations.0"
        ) as babel.NodePath<babel.types.Node>;

        if (initPath) {
          // TODO: Refactor this
          const initId = initPath.isVariableDeclaration()
            ? (initPath.get("declarations.0.id") as any)
            : initPath.isIdentifier()
              ? initPath
              : null;

          const initName = initId?.node.name;

          if (initId) {
            // TODO: Refactor this
            scope
              .getBinding(initName)
              ?.reference(
                newPath.isVariableDeclaration()
                  ? (newPath.get("declarations.0.id") as any)
                  : newPath
              );
          }
        }
      }
    });
  }

  computeDependencyGraph() {
    this.dependencies.clear();
    this.sideEffects.clear();

    const visitDependencies = (dependencyIds: string[]) => {
      dependencyIds.forEach((id) => {
        let dependent = this.component.getComponentVariable(id);

        if (!dependent) {
          const binding = this.component.path.scope.getBinding(id);

          if (binding) {
            const newComponentVariable =
              this.component.addComponentVariable(binding);
            if (newComponentVariable) {
              dependent = newComponentVariable;
            }
          }
        }

        if (dependent) {
          dependent.addDependency(this);
        }
      });
    };

    this.binding.referencePaths.forEach((referencePath) => {
      const parentVariableDeclarator = referencePath.findParent(
        (p) =>
          p.isVariableDeclarator() && this.component.isTheFunctionParentOf(p)
      ) as babel.NodePath<babel.types.VariableDeclarator> | null;

      if (parentVariableDeclarator) {
        const lval = parentVariableDeclarator.get("id");

        const ids = getDeclaredIdentifiersInLVal(lval);

        visitDependencies(ids);
      } else {
      }
    });

    const referencedVariablesInDeclaration = getReferencedVariablesInside(
      this.binding.path
    );

    referencedVariablesInDeclaration.forEach((binding) => {
      this.component.addComponentVariable(binding);
    });
  }

  getCacheUpdateEnqueueStatement() {
    return makeCacheEnqueueCallStatement(
      this.getCacheAccessorExpression(),
      this.name
    );
  }

  getSegmentCallableId() {
    if (!this.segmentCallableId) {
      this.segmentCallableId = this.component.path.scope.generateUidIdentifier(
        DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME
      );
    }

    return this.segmentCallableId;
  }

  applyTransformation(performReplacement = true) {
    if (this.appliedTransformation) {
      return null;
    }

    const cacheUpdateEnqueueStatement = this.getCacheUpdateEnqueueStatement();

    switch (this.binding.kind) {
      case "const":
      case "let":
      case "var": {
        const hasHookCall = this.hasHookCall();
        const variableDeclaration = this.path.find((p) =>
          p.isVariableDeclaration()
        ) as babel.NodePath<babel.types.VariableDeclaration>;

        const cacheValueAccessExpression = this.getCacheValueAccessExpression();

        const dependencyConditions = this.makeDependencyCondition();

        const { newPaths, segmentCallableId, replacements } =
          convertStatementToSegmentCallable(variableDeclaration, {
            initialValue: cacheValueAccessExpression,
            performReplacement,
            segmentCallableId: this.getSegmentCallableId(),
          });

        this.appliedTransformation = true;

        const newId = newPaths?.[0]?.get(
          "declarations.0.id"
        ) as babel.NodePath<babel.types.LVal>;

        if (newId) {
          this.binding.path = newId;
        }

        return {
          replacements,
          segmentCallableId,
          dependencyConditions,
          newPaths,
          hasHookCall,
          updateCache: cacheUpdateEnqueueStatement,
        };
      }

      case "param": {
        this.component
          .getFunctionBlockStatement()
          ?.unshiftContainer("body", cacheUpdateEnqueueStatement);
        this.appliedTransformation = true;
        break;
      }
    }

    this.appliedTransformation = true;

    return null;
  }

  private getCacheAccessorExpression() {
    return t.memberExpression(
      this.component.getCacheVariableIdentifier(),
      t.numericLiteral(this.index),
      true
    );
  }

  getCacheValueAccessExpression() {
    return t.memberExpression(
      this.getCacheAccessorExpression(),
      t.identifier(RUNTIME_MODULE_CACHE_VALUE_PROP_NAME)
    );
  }

  getCacheIsNotSetAccessExpression() {
    return t.memberExpression(
      this.getCacheAccessorExpression(),
      t.identifier(RUNTIME_MODULE_CACHE_IS_NOT_SET_PROP_NAME)
    );
  }

  addVariableSideEffect(componentVariable: ComponentVariable) {
    this.variableSideEffects.add(componentVariable);
  }

  getVariableSideEffects() {
    return this.variableSideEffects;
  }

  get path() {
    return this.binding.path;
  }
}
