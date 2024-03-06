import type * as babel from "@babel/core";
import type * as t from "@babel/types";
import {
  DEFAULT_CACHE_COMMIT_VARIABLE_NAME,
  DEFAULT_CACHE_NULL_VARIABLE_NAME,
  DEFAULT_CACHE_VARIABLE_NAME,
} from "~/utils/constants";
import { expandArrowFunctionToBlockStatement } from "~/utils/micro-transformers/expand-arrow-function-to-block-statement";
import type { Binding } from "@babel/traverse";
import { isControlFlowStatement } from "~/utils/path-tools/control-flow-utils";
import { isInTheSameFunctionScope } from "~/utils/path-tools/is-in-the-same-function-scope";
import { ComponentSegment } from "./segment/ComponentSegment";

export class Component {
  /* Cache props */
  private cacheValueIdentifier: t.Identifier;
  private cacheCommitIdentifier: t.Identifier;
  private cacheNullIdentifier: t.Identifier;
  private cacheSize = 0;

  /* Segments map */
  private segmentsMap = new Map<babel.NodePath<t.Node>, ComponentSegment>();

  private rootSegment: ComponentSegment | null = null;
  private paramsSegment: ComponentSegment[] = [];

  constructor(public path: babel.NodePath<t.Function>) {
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

  createComponentSegment(
    segmentPath: babel.NodePath<t.Node>
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
    path: babel.NodePath<babel.types.Node>
  ): ComponentSegment | null {
    const blockOrControlFlowStatement = path.findParent(
      (innerPath) =>
        (innerPath.isBlockStatement() || isControlFlowStatement(innerPath)) &&
        innerPath.isDescendant(this.path) &&
        isInTheSameFunctionScope(innerPath, this.path)
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

  /**
   * Allocate a space in cache for a new variable
   */
  allocateCacheSpace() {
    return this.cacheSize++;
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
