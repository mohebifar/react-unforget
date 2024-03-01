import * as babel from "@babel/core";
import * as t from "@babel/types";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";
import { declarationToAssignments } from "~/ast-factories/declaration-to-assignments";
import {
  getArgumentOfControlFlowStatement,
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
import { ComponentSegmentDependency } from "./ComponentSegmentDependency";
import { ComponentVariable } from "./ComponentVariable";

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

  getDependencies(visited = new Set<ComponentSegmentDependency>()) {
    const allDependencies = new Set(super.getDependencies(visited));

    return this.filterDependenciesByScope(allDependencies);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  markAsMutating(_mutater: ComponentVariable) {
    const path = this.path;

    const referencedVariables = getReferencedVariablesInside(path);
    referencedVariables.forEach((binding) => {
      const dependency = this.component.addComponentVariable(binding);
      if (dependency) {
        this.addDependency(dependency, t.identifier(binding.identifier.name));
      }
    });
  }

  computeDependencyGraph() {
    this.dependencies.clear();

    const path = this.path;

    if (path.isBlockStatement()) {
      // Step 1: Unwrap JSX elements and expressions
      {
        const jsxTransormations: (() => void)[] = [];

        const body = path.get("body");
        for (const child of body) {
          jsxTransormations.push(
            unwrapJsxExpressions(child, this.component, path)
          );
          jsxTransormations.push(
            unwrapJsxElements(child, this.component, path)
          );
        }
        jsxTransormations.forEach((apply) => apply());
      }

      // Step 2: Convert control flow bodies to blocks
      const body = path.get("body");
      for (const child of body) {
        const controlFlowBodies = getControlFlowBodies(child);
        const controlFlowReturnWithoutBlock = controlFlowBodies.find(
          (body) => body && body.isReturnStatement()
        ) as babel.NodePath<babel.types.ReturnStatement> | null;

        controlFlowReturnWithoutBlock?.replaceWith(
          t.blockStatement([controlFlowReturnWithoutBlock.node])
        );

        // Convert the for init variable to a scope variable
        if (child.isForStatement()) {
          const init = child.get("init");
          const loopBody = child.get("body");

          const pathScope = path.scope;
          const loopScope = loopBody.scope;

          if (init.isVariableDeclaration()) {
            const result = declarationToAssignments(init, "let", pathScope);

            const oldBindings = result.declarations.map((declaration) =>
              loopScope.getBinding(
                (declaration.declarations[0]!.id as t.Identifier).name
              )
            );

            const newPaths = child.insertBefore(result.declarations);
            init.replaceWith(
              result.assignmentExpressions.length > 1
                ? t.sequenceExpression(result.assignmentExpressions)
                : result.assignmentExpressions[0]!
            );

            newPaths.forEach((newPath, index) => {
              const oldBinding = oldBindings[index];
              if (oldBinding) {
                oldBinding.path = newPath;
                oldBinding.scope = pathScope;
              }
            });
          }
        }
      }

      // Final Step: Compute dependencies
      {
        const body = path.get("body");
        for (const statement of body) {
          if (this.blockReturnStatement) {
            return;
          }

          if (statement.isReturnStatement()) {
            this.blockReturnStatement = statement;

            getReferencedVariablesInside(statement).forEach((binding) => {
              this.component.addComponentVariable(binding);
            });
          } else {
            // Create segment for each statement
            this.component.addRunnableSegment(statement);
          }
        }
      }
    }

    // Step 4: Create segment for inner blocks of control flow statements
    else if (isControlFlowStatement(path)) {
      const argument = getArgumentOfControlFlowStatement(path);

      const controlFlowBodies = getControlFlowBodies(path);
      controlFlowBodies.forEach((body) => {
        this.component.addRunnableSegment(body);
      });

      if (argument) {
        getReferencedVariablesInside(argument).forEach((binding, innerPath) => {
          const variable = this.component.addComponentVariable(binding);

          if (variable) {
            this.addDependency(variable, innerPath.node);
          }
        });
      }
    }

    // Step 5: If the statement is not a block, or control flow, and references a hook, add the compute dependencies
    else {
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
  }

  applyTransformation() {
    const path = this.path;

    const visited = new Set<ComponentMutableSegment>();

    const transformationsToPerform: (() =>
      | babel.NodePath<t.Statement>[]
      | null)[] = [];
    const callables: babel.types.Statement[] = [];

    const visitChildren = () => {
      this.children.forEach((child) => {
        if (!visited.has(child)) {
          child.applyTransformation({ parent: this });
        }
      });
    };

    if (path.isBlockStatement()) {
      const statements = path.get("body");

      const segmentsMap = this.component.getStatementsToMutableSegmentMap();

      const reorderedStatements = reorderByTopology(statements, segmentsMap);

      reorderedStatements.forEach((statement) => {
        const segment = segmentsMap.get(statement);

        if (segment) {
          visited.add(segment);
        }

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

      visitChildren();

      const newNodes = transformationsToPerform
        .flatMap(
          (transformation) => transformation()?.map(({ node }) => node) ?? []
        )
        .concat(callables);

      path.node.body = newNodes;

      return null;
    }

    visitChildren();

    const hasHookCall = this.hasHookCall();

    const dependencyConditions = this.makeDependencyCondition();

    const { performTransformation, segmentCallableId } =
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
      hasReturnStatement: this.hasReturnStatement,
    } satisfies SegmentTransformationResult;
  }

  getParentStatement() {
    return this.path;
  }

  get path() {
    return this.statement;
  }
}
