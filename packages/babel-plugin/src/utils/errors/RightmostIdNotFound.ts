import type * as t from "@babel/types";

export class RightmostIdNotFound extends Error {
  constructor(node: t.Node) {
    super("Could not find rightmost identifier name for " + node.type);
  }
}
