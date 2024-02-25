import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { makeCacheEnqueueCallStatement } from "~/ast-factories/make-cache-enqueue-call-statement";
import { makeUnwrappedDeclarations } from "~/ast-factories/make-unwrapped-declarations";
import {
  DEFAULT_UNWRAPPED_VARIABLE_NAME,
  RUNTIME_MODULE_CACHE_IS_NOT_SET_PROP_NAME,
  RUNTIME_MODULE_CACHE_VALUE_PROP_NAME,
} from "~/utils/constants";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { isHookCall } from "~/utils/is-hook-call";
import { UnwrappedAssignmentEntry } from "~/utils/unwrap-pattern-assignment";
import { getDeclaredIdentifiersInLVal } from "../utils/get-declared-identifiers-in-lval";
import { Component } from "./Component";

export class ComponentVariable {
  private appliedModification = false;

  private computedDependencyGraph = false;

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

    // TODO: Check if the param is positioned in the first position
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

  updateBinding(binding: Binding) {
    this.binding = binding;

    if (this.computedDependencyGraph) {
      this.computeDependencyGraph();
    }
  }

  computeDependencyGraph() {
    this.dependencies.clear();
    this.dependents.clear();
    this.sideEffects.clear();

    const visitDependencies = (dependencyIds: string[]) => {
      dependencyIds.forEach((id) => {
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
      } else if (referencePath.isIdentifier()) {
        const referenceParent = referencePath.parentPath;

        if (
          referenceParent.isFunction() &&
          referenceParent.get("params").at(0) === referencePath
        ) {
          visitDependencies([referencePath.node.name]);
        }
      } else {
        // TODO: Side effect calculation
      }
    });

    const referencedVariablesInDeclaration = getReferencedVariablesInside(
      this.binding.path
    );

    referencedVariablesInDeclaration.forEach((binding) => {
      this.component.addComponentVariable(binding);
    });

    this.computedDependencyGraph = true;
  }

  isDerived() {
    return this.dependencies.size > 0;
  }

  isHook() {
    if (this.isDerived()) {
      return false;
    }

    const variableDeclaratorCheck = (
      p: babel.NodePath<babel.types.Node>
    ): p is babel.NodePath<babel.types.VariableDeclarator> =>
      p.isVariableDeclarator() && this.component.isTheFunctionParentOf(p);

    const path = this.binding.path;

    const parentVariableDeclarator = variableDeclaratorCheck(path)
      ? path
      : (path.findParent(
          variableDeclaratorCheck
        ) as babel.NodePath<babel.types.VariableDeclarator> | null);

    if (!parentVariableDeclarator) {
      return false;
    }

    const init = parentVariableDeclarator.get("init");

    if (!init.isCallExpression()) {
      return false;
    }

    return isHookCall(init);
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

    if (
      this.binding.kind === "const" ||
      this.binding.kind === "let" ||
      this.binding.kind === "var"
    ) {
      const variableDeclaration =
        this.getParentStatement() as babel.NodePath<babel.types.VariableDeclaration>;

      if (this.isHook()) {
        variableDeclaration.insertAfter(cacheUpdateEnqueueStatement);
        return;
      }

      const dependencyConditions = this.makeDependencyCondition();
      variableDeclaration.insertBefore(valueDeclarationWithCache);
      variableDeclaration.replaceWith(
        t.ifStatement(
          dependencyConditions,
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.identifier(this.name),
                (
                  variableDeclaration.get(
                    "declarations.0.init"
                  ) as babel.NodePath<babel.types.Expression>
                ).node
              )
            ),
            cacheUpdateEnqueueStatement,
          ])
        )
      );
    }

    if (this.binding.kind === "param") {
      // TODO: Do we need to handle this?
    }

    this.appliedModification = true;
  }

  private makeDependencyCondition() {
    const isNotSetCondition = this.getCacheIsNotSetAccessExpression();

    return Array.from(this.dependencies.values()).reduce(
      (condition, dependency) => {
        const id = t.identifier(dependency.name);
        const binaryExpression = t.binaryExpression(
          "!==",
          dependency.getCacheValueAccessExpression(),
          id
        );

        return t.logicalExpression("||", condition, binaryExpression);
      },
      isNotSetCondition as babel.types.Expression
    );
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

  private getParentStatement() {
    return this.binding.path.getStatementParent();
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
