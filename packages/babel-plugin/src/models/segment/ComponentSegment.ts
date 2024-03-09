import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import type { AccessorNode } from "~/utils/ast-tools/is-accessor-node";
import { isAccessorNode } from "~/utils/ast-tools/is-accessor-node";
import {
  RUNTIME_MODULE_CACHE_IS_NOT_SET_PROP_NAME,
  RUNTIME_MODULE_CACHE_VALUE_PROP_NAME,
} from "~/utils/constants";
import { unwrapJsxElements } from "~/utils/micro-transformers/unwrap-jsx-elements";
import { unwrapJsxExpressions } from "~/utils/micro-transformers/unwrap-jsx-expressions";
import { unwrapSegmentDeclarationPattern } from "~/utils/model-tools/unwrap-segment-declaration-pattern";
import {
  getArgumentOfControlFlowStatement,
  getControlFlowBodies,
  isControlFlowStatement,
} from "~/utils/path-tools/control-flow-utils";
import { findMutatingExpressions } from "~/utils/path-tools/find-mutating-expressions";
import { getReferencedVariablesInside } from "~/utils/path-tools/get-referenced-variables-inside";
import { hasHookCall } from "~/utils/path-tools/has-hook-call";
import { makeDependencyCondition } from "~/utils/ast-factories/make-dependency-condition";
import { makeCacheEnqueueCallStatement } from "~/utils/ast-factories/make-cache-enqueue-call-statement";
import { reorderByTopology } from "~/utils/path-tools/reorder-by-topology";
import { splitVariableDeclaration } from "~/utils/path-tools/split-variable-declaration";
import { findAliases } from "~/utils/path-tools/find-aliases";
import { isInTheSameFunctionScope } from "~/utils/path-tools/is-in-the-same-function-scope";
import type { Component } from "../Component";
import { SegmentDependency } from "./SegmentDependency";

export type SegmentTransformationResult = {
  newNodes: t.Statement[];
  dependencyConditions: t.Expression | null;
  hasHookCall: boolean;
  updateCache?: t.Statement | null;
} | null;

export enum ComponentSegmentFlags {
  // Whether or not the variable declaration is a component variable
  IS_COMPONENT_VARIABLE = 1 << 0,
  // Whether or not the variable declaration is unwrapped
  UNWRAPPED_VARIABLE_DECLARATION = 1 << 1,

  IS_UNWRAPPER = 1 << 2,
  // Whether or not one of the return statements traces back to this segment
  IS_IN_RETURN_NETWORK = 1 << 4,
  // Whether or not the segment is a function argument
  IS_ARGUMENT = 1 << 5,
  // Whether or not the segment is the init part of a for statement
  IS_FOR_INIT = 1 << 6,
  // Whether or not the segment is destroyed
  IS_DESTROYED = 1 << 7,
}

export class ComponentSegment {
  private appliedTransformation = false;

  private parent: ComponentSegment | null = null;

  public binding: Binding | null = null;

  private children = new Set<ComponentSegment>();

  private dependencies = new Set<SegmentDependency>();

  private mutationDependencies = new Set<ComponentSegment>();

  private aliases = new Set<ComponentSegment>();

  private cacheLocation: number | null = null;

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

  getDeclaredBinding() {
    if (!this.binding) {
      const node = this.path.node;
      if (
        t.isVariableDeclaration(node) &&
        t.isIdentifier(node.declarations[0]?.id)
      ) {
        const binding = this.path.scope.getBinding(
          node.declarations[0].id.name
        );
        if (binding) {
          this.binding = binding;
        }
      }
    }

    return this.binding;
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
  addAlias(segment: ComponentSegment) {
    this.aliases.add(segment);
  }

  getAliases() {
    return new Set(this.aliases);
  }

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

    if (this.isFlagSet(ComponentSegmentFlags.IS_IN_RETURN_NETWORK)) {
      newDependency.segment.markAsInReturnNetwork();
    }

    this.dependencies.add(newDependency);
  }

  hasDependencies() {
    return this.dependencies.size > 0;
  }

  getDirectDependencies() {
    return new Set(this.dependencies);
  }

  hasDirectDependencyOn(segment: ComponentSegment) {
    return Array.from(this.dependencies).some(
      (dependency) => dependency.segment === segment
    );
  }

  addMutationDependency(segment: ComponentSegment) {
    this.mutationDependencies.add(segment);
  }

  getMutationDependencies() {
    return new Set(this.mutationDependencies);
  }

  traverseDependencies(
    callback: (dependency: SegmentDependency) => void,
    visited: Set<SegmentDependency> = new Set(),
    stop = false
  ) {
    this.dependencies.forEach((dependency) => {
      if (visited.has(dependency)) {
        return;
      }

      visited.add(dependency);

      if (
        stop &&
        dependency.segment.isFlagSet(ComponentSegmentFlags.IS_UNWRAPPER)
      ) {
        return;
      }
      callback(dependency);
      dependency.segment.traverseDependencies(callback, visited, stop);
    });
  }

  getDeepDependencies() {
    const dependencies = new Set<SegmentDependency>();

    this.traverseDependencies(
      (dependency) => {
        dependencies.add(dependency);
      },
      new Set(),
      true
    );

    return dependencies;
  }

  getDependenciesForTransformation({
    filterByScope = true,
    visited = new Set(),
    traverseUpwardsUntil = null,
  }: {
    filterByScope?: boolean;
    visited?: Set<ComponentSegment>;
    traverseUpwardsUntil?: ComponentSegment | null;
  } = {}) {
    const directDependencies = this.getDirectDependencies();

    const parentOrChildDependencies = new Set<SegmentDependency>();

    if (traverseUpwardsUntil && this !== traverseUpwardsUntil) {
      this.parent
        ?.getDependenciesForTransformation({
          filterByScope: false,
          visited,
          traverseUpwardsUntil: traverseUpwardsUntil,
        })
        .forEach((dependency) => {
          parentOrChildDependencies.add(dependency);
        });
    } else {
      this.children.forEach((segment) => {
        if (visited.has(segment)) {
          return;
        }

        visited.add(segment);

        const innerDependencies = segment.getDependenciesForTransformation({
          filterByScope: false,
          visited,
        });

        innerDependencies.forEach((dependency) => {
          parentOrChildDependencies.add(dependency);
        });
      });
    }

    const mutationDependencies = new Set<SegmentDependency>();

    const segmentsToFollowForMutation = new Set<ComponentSegment>();
    const visitedForMutation = new Set<ComponentSegment>();

    const visitAlias = (segment: ComponentSegment) => {
      if (visitedForMutation.has(segment)) {
        return;
      }
      visitedForMutation.add(segment);

      segmentsToFollowForMutation.add(segment);

      segment.getAliases().forEach((alias) => {
        visitAlias(alias);
      });
    };

    visitAlias(this);

    segmentsToFollowForMutation.forEach((aliasSegment) => {
      aliasSegment.getMutationDependencies().forEach((mutationSegment) => {
        mutationSegment
          .getDependenciesForTransformation({
            visited,
            traverseUpwardsUntil: this,
            filterByScope: false,
          })
          .forEach((dependency) => {
            mutationDependencies.add(dependency);
          });
      });
    });

    const allDependencies = new Set([
      ...directDependencies,
      ...parentOrChildDependencies,
      ...mutationDependencies,
    ]);

    this.component.getDependentsOfSegment(this).forEach((dependent) => {
      allDependencies.forEach((dependency) => {
        if (dependency.segment === dependent) {
          allDependencies.delete(dependency);
        }
      });
    });

    return filterByScope
      ? new Set(
          Array.from(allDependencies).filter((dependency) => {
            return (
              dependency.segment !== this &&
              dependency.segment.isViewableInTheScopeOf(this.path) &&
              !dependency.segment.isFlagSet(ComponentSegmentFlags.IS_FOR_INIT)
            );
          })
        )
      : allDependencies;
  }

  traverseDependents(
    callback: (dependent: ComponentSegment) => void,
    visited = new Set()
  ) {
    this.component.getDependentsOfSegment(this).forEach((dependent) => {
      if (visited.has(dependent)) {
        return;
      }

      visited.add(dependent);

      callback(dependent);
      dependent.traverseDependents(callback, visited);
    });
  }

  makeDependencyCondition() {
    return makeDependencyCondition(this);
  }

  /* Destruction methods */
  destroy(preserveNode = false) {
    this.parent?.removeChild(this);
    this.component.removeSegment(this);
    this.setFlag(ComponentSegmentFlags.IS_DESTROYED);
    if (!preserveNode) {
      this.path.remove();
    }
  }

  isDestroyed() {
    return this.isFlagSet(ComponentSegmentFlags.IS_DESTROYED);
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

      const controlFlowArguments = getArgumentOfControlFlowStatement(path);

      controlFlowArguments?.forEach((flowArgument) => {
        const referencedVariablesInsideArgument = flowArgument.isIdentifier()
          ? new Map([
              [
                flowArgument,
                flowArgument.scope.getBinding(flowArgument.node.name)!,
              ],
            ])
          : getReferencedVariablesInside(flowArgument);
        referencedVariablesInsideArgument.forEach((binding, innerPath) => {
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
        });
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
      const mutatingExpressions = findMutatingExpressions(path);

      mutatingExpressions.forEach(({ binding }) => {
        const segment = this.component.getDeclarationSegmentByBinding(binding);
        if (!segment) {
          throw new Error(
            "The segment could not be found for the given binding"
          );
        }

        segment.addMutationDependency(this);
      });

      const isReturnStatement = path.isReturnStatement();

      const referencedVariables = getReferencedVariablesInside(path, false);

      referencedVariables.forEach((_binding, innerPath) => {
        const binding = innerPath.scope.getBinding(innerPath.node.name)!;

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
        if (isReturnStatement) {
          this.markAsInReturnNetwork();
        }
      });
    }
  }

  markAsInReturnNetwork() {
    if (this.isFlagSet(ComponentSegmentFlags.IS_IN_RETURN_NETWORK)) {
      return;
    }

    this.setFlag(ComponentSegmentFlags.IS_IN_RETURN_NETWORK);

    this.component.getDependentsOfSegment(this).forEach((dependent) => {
      dependent.markAsInReturnNetwork();
    });

    this.traverseDependencies((dependency) => {
      dependency.segment.markAsInReturnNetwork();
    });
  }

  isInReturnNetwork() {
    return this.isFlagSet(ComponentSegmentFlags.IS_IN_RETURN_NETWORK);
  }

  hasHookCall() {
    return hasHookCall(this.path, this.component.path);
  }

  isTransformable() {
    return !this.hasHookCall() && this.isInReturnNetwork();
  }

  /**
   * Apply the transformation to the segment
   */
  applyTransformation(): t.Statement[] | null {
    if (this.appliedTransformation) {
      return null;
    }

    if (this.isFlagSet(ComponentSegmentFlags.IS_FOR_INIT)) {
      this.appliedTransformation = true;
      return null;
    }

    if (this.path === this.component.path) {
      this.children.forEach((child) => {
        child.applyTransformation();
      });

      this.appliedTransformation = true;
      return null;
    }

    const thisPath = this.path;

    const visited = new Set<ComponentSegment>();

    if (thisPath.isBlockStatement()) {
      const statements = thisPath.get("body");

      const reorderedStatements = reorderByTopology(
        statements,
        this.component.getSegmentsMap() as Map<
          babel.NodePath<t.Statement>,
          ComponentSegment
        >
      );

      const newNodes = reorderedStatements.flatMap((statement) => {
        const segment = this.component.getSegmentByPath(statement);

        if (segment) {
          visited.add(segment);
          return segment?.applyTransformation() ?? [];
        }

        return [];
      });

      thisPath.replaceWith(t.blockStatement(newNodes));

      return null;
    }

    this.children.forEach((child) => {
      if (!visited.has(child)) {
        child.applyTransformation();
      }
    });

    if (this.isComponentParameter()) {
      this.appliedTransformation = true;

      this.component
        .getFunctionBody()
        ?.unshiftContainer("body", this.getCacheUpdateEnqueueStatement());

      return null;
    }

    const nodes: t.Statement[] = [];
    if (this.path.isReturnStatement()) {
      return [
        t.expressionStatement(
          t.callExpression(this.component.getCacheCommitIdentifier(), [])
        ),
        this.getPathAsStatement().node,
      ];
    }

    const dependencyConditions =
      this.isInReturnNetwork() && !this.hasHookCall()
        ? this.makeDependencyCondition()
        : null;

    const isTransformableVariable =
      this.isComponentVariable() && this.isInReturnNetwork();

    const splitDeclaration = splitVariableDeclaration(
      this.getPathAsStatement(),
      {
        initialValue: isTransformableVariable
          ? this.getCacheValueAccessExpression()
          : undefined,
      }
    );
    const cacheEnqueue = isTransformableVariable
      ? [this.getCacheUpdateEnqueueStatement()]
      : [];

    if (splitDeclaration.declaration) {
      nodes.push(splitDeclaration.declaration);
    }

    if (dependencyConditions) {
      nodes.push(
        t.ifStatement(
          dependencyConditions,
          t.blockStatement([
            ...splitDeclaration.conditionalStatements,
            ...cacheEnqueue,
          ])
        )
      );
    } else {
      nodes.push(...splitDeclaration.conditionalStatements);

      nodes.push(...cacheEnqueue);
    }

    this.appliedTransformation = true;

    return nodes;
  }

  allocateCacheLocation() {
    if (this.cacheLocation === null) {
      this.cacheLocation = this.component.allocateCacheSpace(
        this.getDeclaredBinding()?.identifier.name ?? "unknown"
      );
    }

    return this.cacheLocation;
  }

  ensureComponentVariable(binding: Binding) {
    if (this.isComponentVariable()) {
      return this;
    }

    const unwrappedDeclarations = this.unwrapDeclarationPattern();
    const properSegment = unwrappedDeclarations?.find((declaration) => {
      return declaration.declaresBinding(binding);
    });

    const newBinding = properSegment?.path.scope.getBinding(
      binding.identifier.name
    );

    if (!properSegment) {
      throw new Error("The proper segment could not be found");
    }

    properSegment.binding = newBinding ?? null;

    if (!properSegment.isFlagSet(ComponentSegmentFlags.IS_FOR_INIT)) {
      properSegment.setFlag(ComponentSegmentFlags.IS_COMPONENT_VARIABLE);
    }

    findAliases(properSegment.path, (p) =>
      isInTheSameFunctionScope(p, this.component.path)
    ).forEach((bindings) => {
      bindings.forEach((binding) => {
        const segment = this.component.getDeclarationSegmentByBinding(binding);
        if (!segment) {
          throw new Error(
            "The segment could not be found for the given binding"
          );
        }

        segment.addAlias(properSegment);
      });
    });

    return properSegment;
  }

  isVariableDeclaration() {
    return this.path.isVariableDeclaration();
  }

  isComponentParameter() {
    const parentPath = this.path.parentPath;

    if (!parentPath?.isFunction() || parentPath !== this.component.path) {
      return false;
    }

    const params = parentPath.get("params");

    return params.some((param) => param === this.path);
  }

  unwrapDeclarationPattern() {
    return unwrapSegmentDeclarationPattern(this);
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

  isViewableInTheScopeOf(path: babel.NodePath<t.Node>) {
    if (!this.isComponentVariable()) {
      return false;
    }

    // Check if the scope of the given path sees the segment
    const isInSameScope = Object.values(
      path.find((p) => p.isBlockStatement())?.scope.getAllBindings() ?? {}
    ).some((binding) => binding === this.getDeclaredBinding());

    return isInSameScope;
  }

  printCode() {
    return this.path.toString();
  }

  private getCacheAccessorExpression() {
    return t.memberExpression(
      this.component.getCacheValueIdentifier(),
      t.numericLiteral(this.allocateCacheLocation()),
      true
    );
  }

  getCacheUpdateEnqueueStatement() {
    const binding = this.getDeclaredBinding();
    if (!binding) {
      throw new Error("The binding is not set" + this.printCode());
    }
    return makeCacheEnqueueCallStatement(
      this.getCacheAccessorExpression(),
      binding.identifier.name
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

  _unsafe_setPath(path: babel.NodePath<t.Node>) {
    this.path = path;
  }
}
