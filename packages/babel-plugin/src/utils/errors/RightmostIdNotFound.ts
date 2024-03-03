import * as t from "@babel/types";

export class RightmostIdNotFound extends Error {
  constructor(path: t.Node) {
    super("Could not find rightmost identifier name for" + path.toString());
  }
}
