import type * as babel from "@babel/core";
import { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_NULL_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
} from "~/utils/constants";
import { getReferencedVariablesInside } from "~/utils/get-referenced-variables-inside";
import { getReturnsOfFunction } from "~/utils/get-returns-of-function";
import { unwrapJsxElements } from "~/utils/unwrap-jsx-elements";
import { unwrapJsxExpressions } from "~/utils/unwrap-jsx-expressions";
import { getFunctionParent } from "../utils/get-function-parent";
import { ComponentSideEffect } from "./ComponentSideEffect";
import { ComponentVariable } from "./ComponentVariable";
import {
  ComponentMutableSegment,
  SegmentTransformationResult,
} from "./ComponentMutableSegment";
import { hasHookCall } from "~/utils/is-hook-call";
import { convertStatementToSegmentCallable } from "~/ast-factories/convert-statement-to-segment-callable";

export class Component {
  private sideEffects = new Map<
    babel.NodePath<babel.types.Statement>,
    ComponentSideEffect
  >();
  private componentVariables = new Map<string, ComponentVariable>();
  private componentVariablesByPath = new Map<
    babel.NodePath<babel.types.Node>,
    ComponentVariable
  >();
  private cacheValueIdentifier: t.Identifier;
  private cacheCommitIdentifier: t.Identifier;
  private cacheNullIdentifier: t.Identifier;
  private mapOfReturnStatementToReferencedBindings = new Map<
    babel.NodePath<babel.types.ReturnStatement>,
    Binding[]
  >();

  constructor(public path: babel.NodePath<babel.types.Function>) {
    path.assertFunction();

    this.cacheValueIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_VARIABLE_NAME
    );

    this.cacheCommitIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_COMMIT_VARIABLE_NAME
    );

    this.cacheNullIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_NULL_VARIABLE_NAME
    );
  }

  computeComponentVariables() {
    this.prepareComponentBody();
    getReturnsOfFunction(this.path).forEach((returnPath) => {
      const bindings = getReferencedVariablesInside(returnPath).filter(
        (binding) => this.isBindingInComponentScope(binding)
      );

      this.mapOfReturnStatementToReferencedBindings.set(returnPath, bindings);

      bindings.forEach((binding) => {
        this.addComponentVariable(binding);
      });
    });

    this.sideEffects.forEach((sideEffect) => {
      sideEffect.computeDependencyGraph();
    });
  }

  prepareComponentBody() {
    unwrapJsxExpressions(this.path);
    unwrapJsxElements(this.path);
  }

  hasComponentVariable(name: string) {
    return this.componentVariables.has(name);
  }

  getComponentVariable(name: string) {
    return this.componentVariables.get(name);
  }

  getComponentVariableByPath(path: babel.NodePath<babel.types.Node>) {
    return this.componentVariablesByPath.get(path);
  }

  addComponentVariable(binding: Binding) {
    const path = binding.path;

    // If the binding is not in the same function, ignore it i.e. it can't be a component variable
    if (binding.scope !== this.path.scope) {
      return null;
    }

    const name = binding.identifier.name;

    if (this.hasComponentVariable(name)) {
      const componentVariable = this.getComponentVariable(name)!;
      return componentVariable;
    }

    const componentVariable = new ComponentVariable(
      binding,
      this,
      this.componentVariables.size
    );

    this.componentVariables.set(name, componentVariable);

    componentVariable.unwrapAssignmentPatterns();
    componentVariable.computeDependencyGraph();

    this.componentVariablesByPath.set(path, componentVariable);

    return componentVariable;
  }

  addSideEffect(path: babel.NodePath<babel.types.Statement>) {
    if (this.sideEffects.has(path)) {
      return this.sideEffects.get(path);
    }

    const sideEffect = new ComponentSideEffect(this, path);
    this.sideEffects.set(path, sideEffect);

    return sideEffect;
  }

  isTheFunctionParentOf(path: babel.NodePath<babel.types.Node>) {
    return getFunctionParent(path) === this.path;
  }

  getRootComponentVariables() {
    return [...this.componentVariables.values()].filter(
      (componentVariable) => !componentVariable.hasDependencies()
    );
  }

  getCacheVariableIdentifier() {
    return t.cloneNode(this.cacheValueIdentifier);
  }

  getCacheCommitIdentifier() {
    return t.cloneNode(this.cacheCommitIdentifier);
  }

  applyTransformation() {
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();

    const body = this.path.get("body");

    if (!body.isBlockStatement()) {
      return;
    }

    const statementsToMutableSegmentMap = new Map<
      babel.NodePath<babel.types.Statement>,
      ComponentMutableSegment
    >();

    const statementsMapSet = (segment: ComponentMutableSegment) => {
      const parent = segment.getParentStatement();
      if (parent) {
        statementsToMutableSegmentMap.set(parent, segment);
      }
    };

    this.componentVariables.forEach(statementsMapSet);
    this.sideEffects.forEach(statementsMapSet);

    const statements = body.get("body");

    let lastStatementWithHookCallIdx = -1;

    for (let i = statements.length - 1; i >= 0; i--) {
      const currentStatement = statements[i]!;
      if (hasHookCall(currentStatement, this.path)) {
        lastStatementWithHookCallIdx = i;
        break;
      }
    }

    const clonedStatements = statements.slice();

    const getLastComponentVariableStatementIdx = (bindings: Binding[]) => {
      return bindings.reduce((lastStatement, binding) => {
        const componentVariable = this.getComponentVariable(
          binding.identifier.name
        );
        if (componentVariable) {
          const statement = componentVariable.getParentStatement();
          if (statement) {
            const index = clonedStatements.indexOf(statement);
            if (index > lastStatement) {
              return index;
            }
          }
        }

        return lastStatement;
      }, -1);
    };

    const transformStatement = (
      statement: babel.NodePath<babel.types.Statement>
    ) => {
      if (statement.isReturnStatement()) {
        return null;
      }

      const returnDescendant = Array.from(
        this.mapOfReturnStatementToReferencedBindings.keys()
      ).find((returnStatement) => returnStatement.isDescendant(statement));
      const shouldPerformReplacement = !returnDescendant;

      const segment = shouldPerformReplacement
        ? statementsToMutableSegmentMap.get(statement)
        : null;

      if (segment) {
        const transformationResult = segment.applyTransformation(
          shouldPerformReplacement
        );
        if (transformationResult) {
          return { ...transformationResult, returnDescendant };
        } else {
          return null;
        }
      }

      const hadHookCall = hasHookCall(statement, this.path);

      this.componentVariables.forEach((componentVariable) => {
        if (
          componentVariable.path.isDescendant(statement) &&
          statement !== componentVariable.path
        ) {
          const transformation = componentVariable.applyTransformation();
          const callStatement = this.makeSegmentCallStatement(transformation);
          if (callStatement && transformation) {
            const lastPath = transformation.newPaths?.pop();
            lastPath?.insertAfter(callStatement);
          }
        }
      });

      const { segmentCallableId, newPaths, replacements } =
        convertStatementToSegmentCallable(statement, {
          cacheNullValue: returnDescendant
            ? this.cacheNullIdentifier
            : undefined,
        });

      return {
        dependencyConditions: null,
        replacements,
        segmentCallableId,
        newPaths,
        hasHookCall: hadHookCall,
        returnDescendant,
      };
    };

    let currentIndex = -1;
    let currentScanIndex = 0;

    const returnsSize = this.mapOfReturnStatementToReferencedBindings.size;
    this.mapOfReturnStatementToReferencedBindings.forEach(
      (bindings, returnPath) => {
        currentIndex++;
        let maxIndex = -1;

        if (currentIndex === 0) {
          maxIndex = Math.max(lastStatementWithHookCallIdx, maxIndex);
        }

        maxIndex = Math.max(
          getLastComponentVariableStatementIdx(bindings),
          maxIndex
        );

        const statementsToTransform: babel.NodePath<babel.types.Statement>[] =
          [];

        if (currentIndex === returnsSize - 1) {
          statementsToTransform.push(...statements);
        } else {
          for (; currentScanIndex <= maxIndex; currentScanIndex++) {
            const statement = statements.shift();
            if (statement) {
              statementsToTransform.push(statement);
            }
          }
        }

        const returnStatement = returnPath.find(
          (p) => p.isStatement() && p.parentPath === body
        );

        statementsToTransform.forEach((statement) => {
          const transformation = transformStatement(statement);
          const callStatement = this.makeSegmentCallStatement(transformation);

          if (transformation && callStatement) {
            if (transformation.returnDescendant) {
              transformation.newPaths?.[0]?.insertAfter(callStatement);
            } else {
              returnStatement?.insertBefore(callStatement);
            }
          }
        });
      }
    );

    this.componentVariables.forEach((componentVariable) => {
      const transformation = componentVariable.applyTransformation();
      const callStatement = this.makeSegmentCallStatement(transformation);

      if (callStatement && transformation) {
        const lastNewPath = transformation.newPaths?.pop();
        lastNewPath?.insertAfter(callStatement);
      }
    });

    body.unshiftContainer("body", cacheVariableDeclaration);
  }

  getFunctionBlockStatement(): babel.NodePath<babel.types.BlockStatement> | null {
    const path = this.path;
    if (path.isFunctionExpression()) {
      return path.get("body");
    }
    // Need to duplicate the check because the type guard with || is not working
    else if (path.isFunctionDeclaration()) {
      return path.get("body");
    } else if (path.isArrowFunctionExpression()) {
      const body = path.get("body");
      if (body.isBlockStatement()) {
        return body;
      }
    }

    return null;
  }

  private makeCacheVariableDeclaration() {
    const sizeNumber = t.numericLiteral(this.componentVariables.size);
    const declaration = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.arrayPattern([
          this.cacheValueIdentifier,
          this.cacheCommitIdentifier,
          this.cacheNullIdentifier,
        ]),
        t.callExpression(t.identifier(RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME), [
          sizeNumber,
        ])
      ),
    ]);

    t.addComment(
      sizeNumber,
      "leading",
      "\n" +
        Array.from(this.componentVariables.values())
          .map((componentVariable) => {
            return `${componentVariable.getIndex()} => ${componentVariable.name}`;
          })
          .join("\n") +
        "\n"
    );

    return declaration;
  }

  // --- DEBUGGING ---
  __debug_getComponentVariables() {
    return this.componentVariables;
  }

  isBindingInComponentScope(binding: Binding) {
    return this.path.scope.getBinding(binding.identifier.name) === binding;
  }

  private makeSegmentCallStatement(
    transformation: SegmentTransformationResult
  ) {
    if (!transformation) {
      return null;
    }

    const {
      dependencyConditions,
      segmentCallableId,
      hasHookCall,
      updateCache,
      returnDescendant,
    } = transformation;

    const callSegmentCallable = t.callExpression(segmentCallableId, []);
    const updateStatements: t.Statement[] = [];

    if (returnDescendant) {
      const customCallVariable = this.path.scope.generateUidIdentifier();
      updateStatements.push(
        t.variableDeclaration("const", [
          t.variableDeclarator(customCallVariable, callSegmentCallable),
        ])
      );

      updateStatements.push(
        // if customCallVariable not equal to null, return it
        t.ifStatement(
          t.binaryExpression(
            "!==",
            customCallVariable,
            this.cacheNullIdentifier
          ),
          t.blockStatement([t.returnStatement(customCallVariable)])
        )
      );
    } else {
      updateStatements.push(t.expressionStatement(callSegmentCallable));
    }

    if (updateCache) {
      updateStatements.push(updateCache);
    }

    const callStatementWithCondition =
      dependencyConditions && !hasHookCall
        ? [
            t.ifStatement(
              dependencyConditions,
              t.blockStatement(updateStatements)
            ),
          ]
        : updateStatements;

    return callStatementWithCondition;
  }
}
