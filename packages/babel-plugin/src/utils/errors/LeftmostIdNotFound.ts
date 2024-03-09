import type * as t from "@babel/types";

export class LeftmostIdNotFound extends Error {
  constructor(node: t.Node) {
    super("Could not find leftmost identifier name for " + node.type);
  }
}
