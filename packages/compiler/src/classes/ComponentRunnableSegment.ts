import * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";
import { getBlockStatementsOfPath } from "~/utils/get-block-statements-of-path";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { Component } from "./Component";
import {
  ComponentMutableSegment,
  SegmentTransformationResult,
} from "./ComponentMutableSegment";

export class ComponentRunnableSegment extends ComponentMutableSegment {
  private mapOfReturnStatementToReferencedBindings = new Map<
    babel.NodePath<babel.types.ReturnStatement>,
    Binding[]
  >();

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

  get hasReturnStatement() {
    return !!this.blockReturnStatement;
  }

  computeDependencyGraph() {
    this.dependencies.clear();

    const path = this.path;

    const blockStatementChildren = getBlockStatementsOfPath(path);

    blockStatementChildren.forEach((blockStatement) => {
      this.component.addRunnableSegment(blockStatement);
    });

    blockStatementChildren.forEach((currentPath) => {
      const statements = currentPath.get("body");

      if (path.isBlockStatement() && currentPath === path) {
        statements.forEach((statement) => {
          const returnStatement = statement;
          if (this.hasReturnStatement) {
            return;
          }

          if (returnStatement.isReturnStatement()) {
            this.blockReturnStatement = returnStatement;

            const bindings = Array.from(
              getReferencedVariablesInside(returnStatement).values()
            ).filter((binding) =>
              this.component.isBindingInComponentScope(binding)
            );

            this.mapOfReturnStatementToReferencedBindings.set(
              returnStatement,
              bindings
            );

            bindings.forEach((binding) => {
              this.component.addComponentVariable(binding);
            });
          } else {
            this.component.addRunnableSegment(statement);
          }
        });
      } else {
        this.component.addRunnableSegment(currentPath);
      }
    });
  }

  applyTransformation(performReplacement = true) {
    const path = this.path;

    const transformationsToPerform: (() => void)[] = [];

    if (path.isBlockStatement()) {
      const statements = path.get("body");

      const segmentsMap = this.component.getStatementsToMutableSegmentMap();

      statements.forEach((statement) => {
        const segment = segmentsMap.get(statement);

        const transformation = segment?.applyTransformation();
        if (transformation) {
          const callStatement = this.makeSegmentCallStatement(transformation);

          transformationsToPerform.push(() => {
            transformation.prformTransformation();
          });

          if (callStatement) {
            if (this.blockReturnStatement) {
              this.blockReturnStatement.insertBefore(callStatement);
            } else {
              path.pushContainer("body", callStatement);
            }
          }
        }
      });

      this.children.forEach((child) => {
        child.applyTransformation();
      });

      transformationsToPerform.forEach((transformation) => {
        transformation();
      });

      return null;
    }

    const anyChildrenHasReturnStatement = Array.from(this.children).some(
      (child) => child.isComponentRunnableSegment() && child.hasReturnStatement
    );

    const hasHookCall = this.hasHookCall();

    const dependencyConditions = this.makeDependencyCondition();

    const { prformTransformation, segmentCallableId, replacements } =
      convertStatementToSegmentCallable(path, {
        performReplacement,
        segmentCallableId: this.getSegmentCallableId(),
      });

    return {
      dependencyConditions,
      hasHookCall,
      prformTransformation,
      segmentCallableId,
      replacements,
      hasReturnStatement: anyChildrenHasReturnStatement,
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