import * as babel from "@babel/core";
import * as t from "@babel/types";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";
import {
  getArgumentOfControlFlowStatement,
  getBlockStatementsOfPath,
  getControlFlowBodies,
  isControlFlowStatement,
} from "~/utils/ast-tools";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { reorderByTopology } from "~/utils/reorder-by-topology";
import { unwrapJsxElements } from "~/utils/unwrap-jsx-elements";
import { unwrapJsxExpressions } from "~/utils/unwrap-jsx-expressions";
import { Component } from "./Component";
import {
  ComponentMutableSegment,
  SegmentTransformationResult,
} from "./ComponentMutableSegment";

export class ComponentRunnableSegment extends ComponentMutableSegment {
  private blockReturnStatement: babel.NodePath<babel.types.ReturnStatement> | null =
    null;

  constructor(
    component: Component,
    parent: ComponentMutableSegment | null = null,
    private statement: babel.NodePath<babel.types.Statement>
  ) {
    super(component, parent, "ComponentRunnableSegment");
  }

  isRoot() {
    return this.parent === null;
  }

  get hasReturnStatement(): boolean {
    return Boolean(
      this.blockReturnStatement ||
        Array.from(this.children).some(
          (child) =>
            child.isComponentRunnableSegment() && child.hasReturnStatement
        )
    );
  }

  getDependencies() {
    const allDependencies = new Set(super.getDependencies());

    this.children.forEach((child) => {
      child.getDependencies().forEach((dependency) => {
        if (dependency.componentVariable.isDefinedInRunnableSegment(this)) {
          allDependencies.add(dependency);
        }
      });
    });

    return allDependencies;
  }

  computeDependencyGraph() {
    this.dependencies.clear();

    const path = this.path;

    const blockStatementChildren = getBlockStatementsOfPath(path);

    if (blockStatementChildren.length === 0) {
      const isParentRoot =
        this.parent?.isComponentRunnableSegment() && this.parent.isRoot();
      const componentScope = this.component.path.scope;

      if (isParentRoot && this.hasHookCall()) {
        const allBindingsOfComponent = Object.values(
          componentScope.getAllBindings()
        ).filter((binding) => binding.scope === componentScope);

        const referencedVariables = getReferencedVariablesInside(path);
        referencedVariables.forEach((binding) => {
          if (allBindingsOfComponent.includes(binding)) {
            const dependency = this.component.addComponentVariable(binding);
            if (dependency) {
              this.addDependency(
                dependency,
                t.identifier(binding.identifier.name)
              );
            }
          }
        });
      }
    }

    const jsxTransormations: (() => void)[] = [];

    blockStatementChildren.forEach((blockStatement) => {
      if (blockStatement !== path) {
        return;
      }
      const body = blockStatement.get("body");
      for (const child of body) {
        jsxTransormations.push(
          unwrapJsxExpressions(child, this.component, blockStatement)
        );
        jsxTransormations.push(
          unwrapJsxElements(child, this.component, blockStatement)
        );
      }
    });

    jsxTransormations.forEach((apply) => apply());

    blockStatementChildren.forEach((blockStatement) => {
      const body = blockStatement.get("body");
      for (const child of body) {
        const controlFlowBodies = getControlFlowBodies(child);
        const controlFlowReturnWithoutBlock = controlFlowBodies.find(
          (body) => body && body.isReturnStatement()
        ) as babel.NodePath<babel.types.ReturnStatement> | null;

        controlFlowReturnWithoutBlock?.replaceWith(
          t.blockStatement([controlFlowReturnWithoutBlock.node])
        );
      }
    });

    blockStatementChildren.forEach((blockStatement) => {
      if (blockStatement !== path) {
        this.component.addRunnableSegment(blockStatement);
      }
    });

    blockStatementChildren.forEach((currentPath) => {
      const statements = currentPath.get("body");

      if (path.isBlockStatement() && currentPath === path) {
        statements.forEach((statement) => {
          const returnStatement = statement;
          if (this.blockReturnStatement) {
            return;
          }

          if (returnStatement.isReturnStatement()) {
            this.blockReturnStatement = returnStatement;

            getReferencedVariablesInside(returnStatement).forEach((binding) => {
              this.component.addComponentVariable(binding);
            });
          } else {
            if (isControlFlowStatement(statement)) {
              const argument = getArgumentOfControlFlowStatement(statement);

              if (argument) {
                getReferencedVariablesInside(argument).forEach((binding) => {
                  this.component.addComponentVariable(binding);
                });
              }
            }
            const child = this.component.addRunnableSegment(statement);
            if (child !== this) {
              this.children.add(child);
            }
          }
        });
      } else {
        const child = this.component.addRunnableSegment(currentPath);
        this.children.add(child);
      }
    });
  }

  applyTransformation() {
    const path = this.path;

    const transformationsToPerform: (() =>
      | babel.NodePath<t.Statement>[]
      | null)[] = [];
    const callables: babel.types.Statement[] = [];

    if (path.isBlockStatement()) {
      const statements = path.get("body");

      const segmentsMap = this.component.getStatementsToMutableSegmentMap();

      const reorderedStatements = reorderByTopology(statements, segmentsMap);

      reorderedStatements.forEach((statement) => {
        const segment = segmentsMap.get(statement);

        const transformation = segment?.applyTransformation({ parent: this });
        if (transformation) {
          const callStatement = this.makeSegmentCallStatement(transformation);

          transformationsToPerform.push(() =>
            transformation.performTransformation()
          );

          if (callStatement) {
            callables.push(...callStatement);
          }
        } else if (statement && t.isReturnStatement(statement.node)) {
          const callCommit = t.expressionStatement(
            t.callExpression(this.component.getCacheCommitIdentifier(), [])
          );

          callables.push(callCommit);
          callables.push(statement.node);
        }
      });

      this.children.forEach((child) => {
        child.applyTransformation({ parent: this });
      });

      const newNodes = transformationsToPerform
        .flatMap(
          (transformation) => transformation()?.map(({ node }) => node) ?? []
        )
        .concat(callables);

      path.node.body = newNodes;

      return null;
    }

    const hasHookCall = this.hasHookCall();

    const dependencyConditions = this.makeDependencyCondition();

    const { performTransformation, segmentCallableId, replacements } =
      convertStatementToSegmentCallable(path, {
        segmentCallableId: this.getSegmentCallableId(),
        cacheNullValue: this.hasReturnStatement
          ? this.component.getCacheNullIdentifier()
          : undefined,
      });

    return {
      dependencyConditions,
      hasHookCall,
      performTransformation,
      segmentCallableId,
      replacements,
      hasReturnStatement: this.hasReturnStatement,
    } satisfies SegmentTransformationResult;
  }

  getParentStatement() {
    return this.path;
  }

  getBlockStatements() {
    return getBlockStatementsOfPath(this.path);
  }

  get path() {
    return this.statement;
  }
}
