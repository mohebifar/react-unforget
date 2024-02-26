import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { makeCacheEnqueueCallStatement } from "~/ast-factories/make-cache-enqueue-call-statement";
import { makeUnwrappedDeclarations } from "~/ast-factories/make-unwrapped-declarations";
import { variableDeclarationToAssignment } from "~/ast-factories/variable-declaration-to-assignment";
import {
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
  private appliedModification = false;

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

    let newPaths: babel.NodePath<babel.types.Node>[] = [];
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

      const allNewPaths = parentPath.replaceWithMultiple([
        initDeclaration,
        ...unwrapResult.unwrappedDeclarations,
      ]);

      initPath = allNewPaths[0];
      newPaths = allNewPaths.slice(1);

      scope.registerDeclaration(initPath);

      unwrappedEntries = unwrapResult.unwrappedEntries;
    }

    if (this.binding.kind === "param") {
      const componentBlock = this.component.getFunctionBlockStatement();

      if (path.isIdentifier() || !componentBlock) {
        return;
      }

      unwrapVariableId = scope.generateUidIdentifier("props");

      const unwrapResult = makeUnwrappedDeclarations(
        path as babel.NodePath<babel.types.LVal>,
        "let",
        unwrapVariableId
      );

      [initPath] = path.replaceWith(unwrapVariableId);

      scope.registerBinding("param", initPath);

      newPaths = componentBlock.unshiftContainer(
        "body",
        unwrapResult.unwrappedDeclarations
      );

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
        // TODO: Side effect calculation
        const parentStatement = referencePath.find(
          (p) =>
            p.isStatement() && p.parentPath === this.component.path.get("body")
        ) as babel.NodePath<babel.types.Statement> | null;

        if (
          !parentStatement ||
          // Skip variable declarations for side effects
          parentStatement.isVariableDeclaration() ||
          // Skip return statements for side effects
          parentStatement.isReturnStatement()
        ) {
          return;
        }

        const sideEffect = this.component.addSideEffect(parentStatement);

        if (sideEffect) {
          this.addSideEffect(sideEffect);
          sideEffect.addDependency(this);
        }
      }
    });

    const referencedVariablesInDeclaration = getReferencedVariablesInside(
      this.binding.path
    );

    referencedVariablesInDeclaration.forEach((binding) => {
      this.component.addComponentVariable(binding);
    });
  }

  applyModification() {
    if (this.appliedModification) {
      return;
    }

    const cacheUpdateEnqueueStatement = makeCacheEnqueueCallStatement(
      this.getCacheAccessorExpression(),
      this.name
    );

    const valueDeclarationWithCache = t.variableDeclaration("let", [
      t.variableDeclarator(
        t.identifier(this.name),
        this.getCacheValueAccessExpression()
      ),
    ]);

    switch (this.binding.kind) {
      case "const":
      case "let":
      case "var": {
        const variableDeclaration =
          this.getParentStatement() as babel.NodePath<babel.types.VariableDeclaration>;

        if (this.hasHookCall()) {
          variableDeclaration.insertAfter(cacheUpdateEnqueueStatement);
          return;
        }

        const dependencyConditions = this.makeDependencyCondition();
        if (dependencyConditions) {
          variableDeclaration.insertBefore(valueDeclarationWithCache);
          variableDeclaration.replaceWith(
            t.ifStatement(
              dependencyConditions,
              t.blockStatement([
                ...variableDeclarationToAssignment(variableDeclaration),
                cacheUpdateEnqueueStatement,
              ])
            )
          );
        }
        break;
      }

      case "param": {
        this.component
          .getFunctionBlockStatement()
          ?.unshiftContainer("body", cacheUpdateEnqueueStatement);
        break;
      }
    }

    this.appliedModification = true;
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

  get path() {
    return this.binding.path;
  }
}
