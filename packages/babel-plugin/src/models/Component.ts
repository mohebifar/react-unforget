import type * as babel from "@babel/core";
import * as t from "@babel/types";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_NULL_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
} from "~/utils/constants";
import { expandArrowFunctionToBlockStatement } from "~/utils/micro-transformers/expand-arrow-function-to-block-statement";
import type { Binding } from "@babel/traverse";
import { isControlFlowStatement } from "~/utils/path-tools/control-flow-utils";
import { isInTheSameFunctionScope } from "~/utils/path-tools/is-in-the-same-function-scope";
import { ComponentSegment } from "./segment/ComponentSegment";
import type { TransformationContext } from "./TransformationContext";

export class Component {
  /* Cache props */
  private cacheValueIdentifier: t.Identifier;
  private cacheCommitIdentifier: t.Identifier;
  private cacheNullIdentifier: t.Identifier;
  private cacheSize = 0;

  /* Segments map */
  private segmentsMap = new Map<babel.NodePath<t.Node>, ComponentSegment>();

  private rootSegment: ComponentSegment | null = null;
  private cacheIdToName = new Map<number, string>();

  constructor(
    public path: babel.NodePath<t.Function>,
    public name: string,
    public transformationContext?: TransformationContext,
  ) {
    path.assertFunction();

    this.cacheValueIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_VARIABLE_NAME,
    );

    this.cacheCommitIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
    );

    this.cacheNullIdentifier = path.scope.generateUidIdentifier(
      DEFAULT_CACHE_NULL_VARIABLE_NAME,
    );

    this.init();
  }

  getRootSegment() {
    return this.rootSegment;
  }

  getFunctionBody() {
    let body: babel.NodePath<t.BlockStatement | t.Expression> =
      this.path.get("body");

    if (!body.isBlockStatement()) {
      expandArrowFunctionToBlockStatement(this.path);
      body = this.path.get("body");
    }

    body.assertBlockStatement();

    return body;
  }

  getFunctionParams() {
    return this.path.get("params");
  }

  private init() {
    const body = this.getFunctionBody();
    const params = this.getFunctionParams();

    this.rootSegment = this.createComponentSegment(this.path);

    params.forEach((param) => {
      const paramSegment = this.createComponentSegment(param);
      paramSegment.setParent(this.rootSegment);
    });

    const bodySegment = this.createComponentSegment(body);
    bodySegment.setParent(this.rootSegment);
  }

  private hasMutation() {
    return Array.from(this.segmentsMap.values()).some(
      (segment) => segment.getMutationDependencies().size > 0,
    );
  }

  applyTransformation() {
    if (
      this.transformationContext?.skipComponentsWithMutation &&
      this.hasMutation()
    ) {
      return;
    }

    this.rootSegment?.applyTransformation();
    const cacheVariableDeclaration = this.makeCacheVariableDeclaration();
    this.getFunctionBody().unshiftContainer("body", cacheVariableDeclaration);
  }

  private makeCacheVariableDeclaration() {
    const sizeNumber = t.numericLiteral(this.cacheSize);
    const declaration = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.arrayPattern([
          this.cacheValueIdentifier,
          this.cacheCommitIdentifier,
          this.cacheNullIdentifier,
        ]),
        t.callExpression(t.identifier(RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME), [
          sizeNumber,
        ]),
      ),
    ]);

    t.addComment(
      sizeNumber,
      "leading",
      "\n" +
        Array.from(this.cacheIdToName.entries())
          .map(([id, name]) => {
            return `${id} => ${name}`;
          })
          .join("\n") +
        "\n",
    );

    return declaration;
  }

  getSegmentsMap() {
    return new Map(this.segmentsMap);
  }

  getSegmentByPath(path: babel.NodePath<t.Node>) {
    return this.segmentsMap.get(path);
  }

  createComponentSegment(
    segmentPath: babel.NodePath<t.Node>,
  ): ComponentSegment {
    if (this.segmentsMap.has(segmentPath)) {
      return this.segmentsMap.get(segmentPath)!;
    }

    const foundParent = this.findPotentialParentForSegment(segmentPath);

    const runnableSegment = new ComponentSegment(this, segmentPath);

    runnableSegment.setParent(foundParent);

    this.segmentsMap.set(segmentPath, runnableSegment);

    return runnableSegment;
  }

  findPotentialParentForSegment(
    path: babel.NodePath<babel.types.Node>,
  ): ComponentSegment | null {
    const blockOrControlFlowStatement = path.findParent(
      (innerPath) =>
        (innerPath.isBlockStatement() || isControlFlowStatement(innerPath)) &&
        innerPath.isDescendant(this.path) &&
        isInTheSameFunctionScope(innerPath, this.path),
    ) as babel.NodePath<babel.types.BlockStatement> | null;

    if (!blockOrControlFlowStatement) {
      return null;
    }

    const foundParent =
      this.segmentsMap.get(blockOrControlFlowStatement) ?? null;

    const ensuredParent = foundParent
      ? foundParent
      : this.createComponentSegment(blockOrControlFlowStatement);

    return ensuredParent;
  }

  removeSegment(segment: ComponentSegment) {
    this.segmentsMap.delete(segment.getPathAsStatement());
  }

  getDeclarationSegmentByBinding(binding: Binding) {
    if (binding.path.isVariableDeclarator()) {
      return this.segmentsMap.get(binding.path.parentPath);
    }

    return this.segmentsMap.get(binding.path);
  }

  inTheSameFunctionScope(path: babel.NodePath<babel.types.Node>) {
    return isInTheSameFunctionScope(path, this.path);
  }

  getDependentsOfSegment(segment: ComponentSegment) {
    return Array.from(this.segmentsMap.values()).filter((s) =>
      s.hasDirectDependencyOn(segment),
    );
  }

  /**
   * Allocate a space in cache for a new variable
   */
  allocateCacheSpace(name: string) {
    const newId = this.cacheSize++;

    this.cacheIdToName.set(newId, name);

    return newId;
  }

  /* Methods for cache identifiers */
  getCacheValueIdentifier() {
    return this.cacheValueIdentifier;
  }

  getCacheCommitIdentifier() {
    return this.cacheCommitIdentifier;
  }

  getCacheNullIdentifier() {
    return this.cacheNullIdentifier;
  }

  /**
   * Start the analysis of the component
   */
  analyze() {
    this.rootSegment?.analyze();
  }
}
