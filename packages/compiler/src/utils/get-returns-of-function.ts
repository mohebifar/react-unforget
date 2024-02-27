import type * as babel from "@babel/core";
import { isInTheSameFunctionScope } from "./is-in-the-same-function-scope";

export function getReturnsOfFunction(fn: babel.NodePath<babel.types.Function>) {
  const returns: babel.NodePath<babel.types.ReturnStatement>[] = [];

  fn.traverse({
    ReturnStatement(path) {
      if (isInTheSameFunctionScope(path, fn)) {
        returns.push(path);
      }
    },
  });

  return returns;
}
