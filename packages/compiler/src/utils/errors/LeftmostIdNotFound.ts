import type * as t from "@babel/types";

export class LeftmostIdNotFound extends Error {
  constructor(path: t.Node) {
    super("Could not find leftmost identifier name for" + path.toString());
  }
}
