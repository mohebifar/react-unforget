import type * as babel from "@babel/core";

export class RightmostIdNotFound extends Error {
  constructor(path: babel.NodePath) {
    super("Could not find rightmost identifier name for" + path.toString());
  }
}
