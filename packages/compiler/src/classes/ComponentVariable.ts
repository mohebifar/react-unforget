import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { convertStatementToSegmentCallable } from "~/utils/micro-transformers/convert-statement-to-segment-callable";
import { makeCacheEnqueueCallStatement } from "~/utils/ast-factories/make-cache-enqueue-call-statement";
import { makeUnwrappedDeclarations } from "~/utils/ast-factories/make-unwrapped-declarations";
import {
  DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME,
  DEFAULT_UNWRAPPED_VARIABLE_NAME,
  RUNTIME_MODULE_CACHE_IS_NOT_SET_PROP_NAME,
  RUNTIME_MODULE_CACHE_VALUE_PROP_NAME,
} from "~/utils/constants";
import { findMutatingExpression } from "~/utils/path-tools/find-mutating-expression";
import { getReferencedVariablesInside } from "~/utils/path-tools/get-referenced-variables-inside";
import { UnwrappedAssignmentEntry } from "~/utils/micro-transformers/unwrap-pattern-assignment";
import { getDeclaredIdentifiersInLVal } from "../utils/path-tools/get-declared-identifiers-in-lval";
import { Component } from "./Component";
import {
  ComponentMutableSegment,
  SegmentTransformationResult,
} from "./ComponentMutableSegment";
import type { ComponentRunnableSegment } from "./ComponentRunnableSegment";
import { ComponentSegmentDependency } from "./ComponentSegmentDependency";
import { isForStatementInit } from "~/utils/path-tools/control-flow-utils";

export class ComponentVariable extends ComponentMutableSegment {
  private runnableSegmentsMutatingThis = new Set<ComponentMutableSegment>();

  constructor(
    component: Component,
    parent: ComponentMutableSegment | null = null,
    public binding: Binding,
    private index: number
  ) {
    super(component, parent, "ComponentVariable");
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
        this.path.getStatementParent() as babel.NodePath<babel.types.VariableDeclaration>;
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
      scope.registerDeclaration(initPath);

      const initBinding = scope.getBinding(unwrapVariableId.name);

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

        initBinding?.reference(
          newPath.get("declarations.0.id") as babel.NodePath
        );
      });

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
          binding.identifier = (
            binding.path.get(
              "declarations.0.id"
            ) as babel.NodePath<babel.types.Identifier>
          ).node;
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
            ? (initPath.get(
                "declarations.0.id"
              ) as babel.NodePath<babel.types.Identifier>)
            : initPath.isIdentifier()
              ? initPath
              : null;

          const initName = initId?.node.name;

          if (initName) {
            const newRefId = newPath.isVariableDeclaration()
              ? (newPath.get(
                  "declarations.0.id"
                ) as babel.NodePath<babel.types.Identifier>)
              : newPath;

            scope.getBinding(initName)?.reference(newRefId);
          }
        }
      }
    });
  }

  isDefinedInRunnableSegment(runnableSegment: ComponentRunnableSegment) {
    let path: babel.NodePath | null = this.path;

    do {
      // const parentBlockStatement = path.find((p) => p.isBlockStatement());
      const parentBlockStatement = path.find((p) =>
        p.isBlockStatement()
      ) as babel.NodePath<babel.types.BlockStatement>;

      if (parentBlockStatement === runnableSegment.path) {
        return true;
      }

      path = parentBlockStatement?.parentPath ?? null;
    } while (path);
    return false;
  }

  getDependencies(visited = new Set<ComponentSegmentDependency>()) {
    const allDependencies = new Set(super.getDependencies(visited));

    this.getMutationDependencies(visited).forEach((dependency) => {
      allDependencies.add(dependency);
    });

    return this.filterDependenciesByScope(allDependencies);
  }

  isForLoopArgumentVariable() {
    return isForStatementInit(this.path);
  }

  isMutatedBy(runnableSegment: ComponentRunnableSegment) {
    for (const runnableItem of this.runnableSegmentsMutatingThis) {
      if (runnableItem === runnableSegment) {
        return true;
      }
    }

    return false;
  }

  getMutationDependencies(visited = new Set<ComponentSegmentDependency>()) {
    const mutatingDependencies = new Set<ComponentSegmentDependency>();
    this.runnableSegmentsMutatingThis.forEach((runnableSegment) => {
      runnableSegment.getDependencies(visited).forEach((dependency) => {
        mutatingDependencies.add(dependency);
      });
    });

    return mutatingDependencies;
  }

  computeDependencyGraph() {
    this.dependencies.clear();

    const getAccessorPath = (referencePath: babel.NodePath) => {
      const statementParent = referencePath.getStatementParent();

      let accessorPath =
        referencePath.find(
          (path) =>
            (path.isMemberExpression() || path.isOptionalMemberExpression()) &&
            path.isDescendant(statementParent!)
        ) ?? referencePath;

      if (
        accessorPath.isOptionalMemberExpression() ||
        accessorPath.isMemberExpression()
      ) {
        if (accessorPath.parentPath.isCallExpression()) {
          accessorPath = accessorPath.get(
            "object"
          ) as babel.NodePath<babel.types.Expression>;
        }
      }

      return accessorPath;
    };

    this.binding.referencePaths.forEach((mainReferencePath) => {
      const statementParent = mainReferencePath.getStatementParent();
      const referencePath = mainReferencePath.isJSXExpressionContainer()
        ? mainReferencePath.get("expression")
        : mainReferencePath;

      const accessorPath = getAccessorPath(referencePath);

      const accessorNode = accessorPath.node as t.Expression;

      if (statementParent?.isVariableDeclaration()) {
        const parentVariableDeclarator = referencePath.find((p) =>
          p.isVariableDeclarator()
        ) as babel.NodePath<babel.types.VariableDeclarator>;

        const lval = parentVariableDeclarator.get("id");

        const dependentIds = getDeclaredIdentifiersInLVal(lval);

        dependentIds.forEach((id) => {
          const binding = this.path.scope.getBinding(id);
          if (!binding) {
            return;
          }

          const dependent = this.component.addComponentVariable(binding);

          if (dependent) {
            dependent.addDependency(this, accessorNode);
          }
        });
        return;
      }

      // TODO: Add assignment pattern support here - an edge case

      if (statementParent && !statementParent?.isReturnStatement()) {
        const dependent = this.component.addRunnableSegment(statementParent);

        if (dependent) {
          dependent.addDependency(this, accessorNode);
          dependent.markAsMutating(this);

          const mutatingExpressions = findMutatingExpression(
            referencePath,
            this.name
          );

          if (mutatingExpressions) {
            this.runnableSegmentsMutatingThis.add(dependent);
            dependent.computeDependencyGraph();
          }
        }
      }
    });

    const variableDeclarator = this.path.find((p) =>
      p.isVariableDeclarator()
    ) as babel.NodePath<babel.types.VariableDeclarator> | null;

    if (variableDeclarator) {
      const initPath = variableDeclarator.get("init");

      if (initPath.isExpression()) {
        const referencedVariablesInInit =
          getReferencedVariablesInside(initPath);

        referencedVariablesInInit.forEach((binding, innerPath) => {
          const newComponentVariable =
            this.component.addComponentVariable(binding);

          if (newComponentVariable) {
            const accessorPath = getAccessorPath(innerPath);
            const accessorNode = accessorPath.node as t.Expression;
            this.addDependency(newComponentVariable, accessorNode);
          }
        });
      }
    }
  }

  getCacheUpdateEnqueueStatement() {
    return makeCacheEnqueueCallStatement(
      this.getCacheAccessorExpression(),
      this.name
    );
  }

  applyTransformation({
    parent = null,
  }: { parent?: ComponentRunnableSegment | null } = {}) {
    if (this.appliedTransformation) {
      return null;
    }

    if (this.isForLoopArgumentVariable()) {
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

        // If the variable is declared in the parent block, we don't need to convert it to a segment callable
        // Only add callable
        if (parent && !this.isDefinedInRunnableSegment(parent)) {
          return {
            segmentCallableId: this.getSegmentCallableId(),
            dependencyConditions,
            performTransformation: () => [],
            hasHookCall,
            updateCache: cacheUpdateEnqueueStatement,
          } satisfies SegmentTransformationResult;
        }

        const { performTransformation, segmentCallableId } =
          convertStatementToSegmentCallable(variableDeclaration, {
            initialValue: cacheValueAccessExpression,
            segmentCallableId: this.getSegmentCallableId(),
          });

        this.appliedTransformation = true;

        return {
          segmentCallableId,
          dependencyConditions,
          performTransformation,
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

  get path() {
    return this.binding.path;
  }
}
