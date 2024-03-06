import type * as babel from "@babel/core";
import type { Binding, Scope } from "@babel/traverse";
import * as t from "@babel/types";
import type { AccessorNode } from "~/utils/ast-tools/is-accessor-node";
import { isAccessorNode } from "~/utils/ast-tools/is-accessor-node";
import {
  DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME,
  DEFAULT_UNWRAPPED_VARIABLE_NAME,
} from "~/utils/constants";
import { unwrapJsxElements } from "~/utils/micro-transformers/unwrap-jsx-elements";
import { unwrapJsxExpressions } from "~/utils/micro-transformers/unwrap-jsx-expressions";
import { unwrapPatternAssignment } from "~/utils/micro-transformers/unwrap-pattern-assignment";
import {
  getArgumentOfControlFlowStatement,
  getControlFlowBodies,
  isControlFlowStatement,
} from "~/utils/path-tools/control-flow-utils";
import { getReferencedVariablesInside } from "~/utils/path-tools/get-referenced-variables-inside";
import { preserveReferences } from "~/utils/scope-tools/preserve-references";
import type { Component } from "../Component";
import { SegmentDependency } from "./SegmentDependency";

export type SegmentTransformationResult = {
  performTransformation: () => babel.NodePath<babel.types.Statement>[] | null;
  segmentCallableId: babel.types.Identifier;
  dependencyConditions: babel.types.Expression | null;
  hasHookCall: boolean;
  hasReturnStatement?: boolean;
  updateCache?: babel.types.Statement | null;
} | null;

export enum ComponentSegmentFlags {
  // Whether or not the variable declaration is a component variable
  IS_COMPONENT_VARIABLE = 1 << 0,
  // Whether or not the variable declaration is unwrapped
  UNWRAPPED_VARIABLE_DECLARATION = 1 << 1,
  // Whether or not the JSX elements are unwrapped
  UNWRAPPED_JSX_ELEMENTS = 1 << 2,
  // Whether or not the JSX expressions are unwrapped
  UNWRAPPED_JSX_EXPRESSIONS = 1 << 3,
  // Whether or not one of the return statements traces back to this segment
  IS_IN_RETURN_NETWORK = 1 << 4,
  // Whether or not the segment is a function argument
  IS_ARGUMENT = 1 << 5,
  // Whether or not the segment is the init part of a for statement
  IS_FOR_INIT = 1 << 6,
}

export class ComponentSegment {
  private appliedTransformation = false;

  private parent: ComponentSegment | null = null;

  private children = new Set<ComponentSegment>();

  private dependencies = new Set<SegmentDependency>();

  private flags = 0;

  constructor(
    public component: Component,
    private path: babel.NodePath<t.Node>
  ) {
    if (this.isComponentParameter()) {
      this.setFlag(ComponentSegmentFlags.IS_ARGUMENT);
    }
  }

  getPathAsStatement() {
    this.path.assertStatement();
    return this.path;
  }

  getPath() {
    return this.path;
  }

  /* Flags methods */
  setFlag(flag: ComponentSegmentFlags): void {
    this.flags |= flag;
  }

  unsetFlag(flag: ComponentSegmentFlags): void {
    this.flags &= ~flag;
  }

  isFlagSet(flag: ComponentSegmentFlags) {
    return (this.flags & flag) === flag;
  }

  isComponentVariable() {
    return this.isFlagSet(ComponentSegmentFlags.IS_COMPONENT_VARIABLE);
  }

  hasUnwrappedVariableDeclaration() {
    return this.isFlagSet(ComponentSegmentFlags.UNWRAPPED_VARIABLE_DECLARATION);
  }

  /* Parent methods */
  getParent() {
    return this.parent;
  }

  setParent(parent: ComponentSegment | null) {
    this.parent?.removeChild(this);
    this.parent = parent;
    parent?.addChild(this);
  }

  removeChild(child: ComponentSegment) {
    this.children.delete(child);
  }

  addChild(child: ComponentSegment) {
    this.children.add(child);
  }

  getChildren() {
    return this.children;
  }

  /* Dependency methods */
  addDependency(
    segment: ComponentSegment,
    binding: Binding,
    accessorNode: AccessorNode
  ) {
    let duplicateDependencyFound = null;

    // We first ensure that the segment is a component variable
    const segmentsEnsuredVariable = segment.ensureComponentVariable(binding);
    if (!segmentsEnsuredVariable) {
      throw new Error(
        `The segment could not be ensured as a component variable ${binding.identifier.name} in ${segment.path.toString()}`
      );
    }

    const newDependency = new SegmentDependency(
      segmentsEnsuredVariable,
      accessorNode
    );

    this.dependencies.forEach((dependency) => {
      if (dependency.equals(newDependency)) {
        duplicateDependencyFound = dependency;
      }
    });

    if (duplicateDependencyFound) {
      return duplicateDependencyFound;
    }

    newDependency.segment.analyze();

    this.dependencies.add(newDependency);
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDependencies(visited: Set<SegmentDependency> = new Set()) {
    const allDependencies = new Set(this.dependencies);

    return allDependencies;
  }

  traverseDependencies(
    callback: (dependency: SegmentDependency) => void,
    visited: Set<SegmentDependency> = new Set()
  ) {
    this.dependencies.forEach((dependency) => {
      if (visited.has(dependency)) {
        return;
      }

      visited.add(dependency);
      callback(dependency);
      dependency.segment.traverseDependencies(callback, visited);
    });
  }

  /**
   * Compute the dependency graph of the segment
   */
  analyze() {
    const path = this.path;
    if (path === this.component.path) {
      this.children.forEach((child) => {
        if (!child.isComponentParameter()) {
          child.analyze();
        }
      });
    } else if (path.isBlockStatement()) {
      let statementsPath = path.get("body");

      // => Unwrap JSX elements
      {
        const jsxUnwrapMicroTransformations: ((() => void) | null)[] = [];

        for (const child of statementsPath) {
          jsxUnwrapMicroTransformations.push(
            unwrapJsxExpressions(child, this.component, path)
          );

          jsxUnwrapMicroTransformations.push(
            unwrapJsxElements(child, this.component, path)
          );
        }

        jsxUnwrapMicroTransformations.forEach((transform) => {
          transform?.();
        });

        statementsPath = path.get("body");
      }

      // => Visit each statement
      {
        for (const child of statementsPath) {
          const segment = this.component.createComponentSegment(child);
          segment.setParent(this);

          segment.analyze();
        }
      }

      // End of the block statement analysis
    } else if (isControlFlowStatement(path)) {
      const controlFlowBodies = getControlFlowBodies(path);

      if (path.isForStatement()) {
        const init = path.get("init");
        if (init.isExpression() || init.isVariableDeclaration()) {
          const segment = this.component.createComponentSegment(init);
          segment.setFlag(ComponentSegmentFlags.IS_FOR_INIT);
          segment.analyze();
        }
      }

      const flowArguments = getArgumentOfControlFlowStatement(path);

      flowArguments?.forEach((flowArgument) => {
        getReferencedVariablesInside(flowArgument).forEach(
          (binding, innerPath) => {
            if (!this.component.inTheSameFunctionScope(binding.path)) {
              return;
            }

            const segment =
              this.component.getDeclarationSegmentByBinding(binding);
            if (!segment) {
              throw new Error(
                "The segment could not be found for the given binding"
              );
            }

            const accessorNode = innerPath.node;

            if (!isAccessorNode(accessorNode)) {
              throw new Error("Could not find the accessor node");
            }

            this.addDependency(segment, binding, accessorNode);
          }
        );
      });

      controlFlowBodies.forEach((body: babel.NodePath<t.Statement>) => {
        if (!body.isBlockStatement()) {
          [body] = body.replaceWith(t.blockStatement([body.node]));
        }

        body.assertBlockStatement();

        const segment = this.component.createComponentSegment(body);
        segment.analyze();
      });
    } else {
      const referencedVariables = getReferencedVariablesInside(path);
      referencedVariables.forEach((binding, innerPath) => {
        if (!this.component.inTheSameFunctionScope(binding.path)) {
          return;
        }
        const segment = this.component.getDeclarationSegmentByBinding(binding);
        if (!segment) {
          throw new Error(
            "The segment could not be found for the given binding"
          );
        }

        const accessorNode = innerPath.node;

        if (!isAccessorNode(accessorNode)) {
          throw new Error("Could not find the accessor node");
        }

        this.addDependency(segment, binding, accessorNode);
      });
    }
  }

  /**
   * Apply the transformation to the segment
   */
  applyTransformation(): SegmentTransformationResult {
    return null;
  }

  ensureComponentVariable(binding: Binding) {
    if (this.isComponentVariable()) {
      return this;
    }

    const unwrappedDeclarations = this.unwrapDeclarationPattern();
    const properSegment = unwrappedDeclarations?.find((declaration) => {
      return declaration.declaresBinding(binding);
    });

    properSegment?.setFlag(ComponentSegmentFlags.IS_COMPONENT_VARIABLE);

    return properSegment;
  }

  private isVariableDeclaration() {
    return this.path.isVariableDeclaration();
  }

  private isComponentParameter() {
    const parentPath = this.path.parentPath;

    if (!parentPath?.isFunction() || parentPath !== this.component.path) {
      return false;
    }

    const params = parentPath.get("params");

    return params.some((param) => param === this.path);
  }

  /**
   * This method unwraps the declaration node if it is an object pattern or array pattern
   */
  unwrapDeclarationPattern() {
    if (this.hasUnwrappedVariableDeclaration()) {
      return [this];
    }

    const markAsUnwrapped = (segment: ComponentSegment = this) =>
      segment.setFlag(ComponentSegmentFlags.UNWRAPPED_VARIABLE_DECLARATION);

    const thisPath: babel.NodePath = this.path;

    if (this.isVariableDeclaration()) {
      thisPath.assertVariableDeclaration();

      const forStatementInitOldAndNewMap = new Map<string, string>();

      const currentKind = thisPath.node.kind;
      const variableDeclarators = thisPath.get("declarations");
      const isInForStatementInit = thisPath.parentPath?.isForStatement();

      if (
        variableDeclarators.length === 1 &&
        t.isIdentifier(variableDeclarators.at(0)?.node.id) &&
        !isInForStatementInit
      ) {
        markAsUnwrapped();
        return [this];
      }

      this.destroy(true);

      const pathToInsertBefore = isInForStatementInit
        ? thisPath.parentPath!
        : thisPath;

      let restoreBindings: ((newScope?: Scope) => void)[] = [];

      const createdPaths = variableDeclarators.flatMap((declarator, index) => {
        const isLastDeclarator = index === variableDeclarators.length - 1;
        const oldIdPath = declarator.get("id");
        const oldInitNode = declarator.get("init").node;

        let unwrappedItems = unwrapPatternAssignment(oldIdPath, oldInitNode);

        // if (
        //   unwrappedItems.length === 1 &&
        //   variableDeclarators.length === 1 &&
        //   !isInForStatementInit
        // ) {
        //   return [];
        // }

        let intermediateBinding: Binding | undefined = undefined;
        let intermediateVariableDeclarationPath: babel.NodePath<t.VariableDeclaration> | null =
          null;

        if (unwrappedItems.length > 1) {
          const intermediateId = oldInitNode
            ? thisPath.scope.generateUidIdentifier(
                DEFAULT_UNWRAPPED_VARIABLE_NAME
              )
            : null;

          unwrappedItems = unwrapPatternAssignment(
            oldIdPath,
            oldInitNode,
            intermediateId
          );

          if (intermediateId) {
            [intermediateVariableDeclarationPath] =
              pathToInsertBefore.insertBefore(
                t.variableDeclaration("const", [
                  t.variableDeclarator(intermediateId, oldInitNode),
                ])
              );

            const scope = pathToInsertBefore.find((p) =>
              p.isBlockStatement()
            )?.scope;

            scope?.registerDeclaration(intermediateVariableDeclarationPath);

            intermediateBinding = scope?.getBinding(intermediateId.name);
          }
        }

        const createdPathsForDeclarator = intermediateVariableDeclarationPath
          ? [intermediateVariableDeclarationPath]
          : [];

        const createdNodesForPatternElements = unwrappedItems.map(
          (unwrappedItem) =>
            t.variableDeclaration(currentKind, [
              t.variableDeclarator(unwrappedItem.id, unwrappedItem.value),
            ])
        );

        restoreBindings = restoreBindings.concat(
          unwrappedItems.flatMap(({ binding }) =>
            binding ? [preserveReferences(binding)] : []
          )
        );

        let createdPathsForPatternElements: babel.NodePath<t.VariableDeclaration>[] =
          [];

        if (isInForStatementInit) {
          createdPathsForPatternElements = pathToInsertBefore.insertBefore(
            createdNodesForPatternElements.map((node) => {
              const newId = pathToInsertBefore.scope.generateUidIdentifier(
                DEFAULT_UNWRAPPED_VARIABLE_NAME
              );
              const currentDeclaration = node.declarations[0]!;
              const oldName = (currentDeclaration?.id as t.Identifier).name;

              forStatementInitOldAndNewMap.set(oldName, newId.name);

              currentDeclaration.id = newId;
              return node;
            })
          );
        } else {
          if (isLastDeclarator) {
            createdPathsForPatternElements =
              pathToInsertBefore.replaceWithMultiple(
                createdNodesForPatternElements
              );
          } else {
            createdPathsForPatternElements = pathToInsertBefore.insertBefore(
              createdNodesForPatternElements
            );
          }
        }

        createdPathsForPatternElements.forEach((newPath) => {
          const newDeclarator = newPath.get(
            "declarations.0"
          ) as babel.NodePath<t.VariableDeclarator>;

          thisPath.scope.registerDeclaration(newPath);

          const binding = declarator.scope.getBinding(
            (newDeclarator.node.id as t.Identifier).name
          );

          if (binding) {
            binding.path = newDeclarator;
          }

          intermediateBinding?.reference(newPath);

          return newPath;
        });

        return createdPathsForDeclarator.concat(createdPathsForPatternElements);
      });

      if (isInForStatementInit) {
        const oldToNewMapEntries = Array.from(
          forStatementInitOldAndNewMap.entries()
        );

        const [newForInitPath] = thisPath.replaceWith(
          t.variableDeclaration(
            "let",
            oldToNewMapEntries.map(([oldId, newId]) =>
              t.variableDeclarator(t.identifier(oldId), t.identifier(newId))
            )
          )
        );

        thisPath.scope.registerDeclaration(newForInitPath);

        oldToNewMapEntries.forEach(([, newId]) => {
          const bindingWithNewId = thisPath.parentPath.scope.getBinding(newId);

          if (!bindingWithNewId) {
            throw new Error("Binding not found");
          }
          bindingWithNewId?.reference(newForInitPath);
        });

        createdPaths.push(newForInitPath);
      }

      const newSegments = createdPaths.map((newPath) => {
        const newSegment = this.component.createComponentSegment(newPath);
        markAsUnwrapped(newSegment);

        return newSegment;
      });

      return newSegments;
    } else if (this.isFlagSet(ComponentSegmentFlags.IS_ARGUMENT)) {
      if (!thisPath.isPattern()) {
        return [this];
      }

      const intermediateId = t.identifier(
        DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME
      );

      const unwrappedItems = unwrapPatternAssignment(
        thisPath,
        null,
        intermediateId
      );

      const restoreBindings = unwrappedItems.flatMap(({ binding }) =>
        binding ? [preserveReferences(binding)] : []
      );

      const [newPath] = thisPath.replaceWith(intermediateId);
      this.path = newPath;

      newPath.scope.registerBinding("param", newPath);

      const newParamBinding = newPath.scope.getBinding(intermediateId.name)!;

      const newDeclarations = unwrappedItems.map((unwrappedItem) =>
        t.variableDeclaration("let", [
          t.variableDeclarator(unwrappedItem.id, unwrappedItem.value),
        ])
      );

      const componentBody = this.component.getFunctionBody();
      const createdPaths = componentBody.unshiftContainer(
        "body",
        newDeclarations
      );

      createdPaths.forEach((newPath) => {
        newParamBinding.reference(newPath);
        thisPath.scope.registerDeclaration(newPath);
      });

      restoreBindings.forEach((restoreBinding) => restoreBinding());
      markAsUnwrapped();

      return [
        this,
        ...createdPaths.map((newPath) => {
          const newSegment = this.component.createComponentSegment(newPath);
          markAsUnwrapped(newSegment);

          return newSegment;
        }),
      ];
    }
  }

  declaresBinding(binding: Binding) {
    const bindingPath = binding.path;
    const thisPath = this.path;

    if (thisPath.isVariableDeclaration()) {
      return thisPath.get("declarations").some((declarator) => {
        const decId = declarator.get("id");
        return (
          decId.isIdentifier() && decId.node.name === binding.identifier.name
        );
      });
    }
    if (binding.kind === "param") {
      return (
        thisPath.isIdentifier() &&
        thisPath.node.name === binding.identifier.name
      );
    }

    return thisPath === bindingPath;
  }

  destroy(preserveNode = false) {
    this.parent?.removeChild(this);
    this.component.removeSegment(this);
    if (!preserveNode) {
      this.path.remove();
    }
  }

  printCode() {
    return this.path.toString();
  }
}
