import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { Scope } from "@babel/traverse";

// We need this to properly detect if return statements belong to the same function
export function isInTheSameFunctionScope(
  path: babel.NodePath<babel.types.Node>,
  fn: babel.NodePath<babel.types.Function>,
) {
  let currentScope: Scope | null = path.scope;
  do {
    if (t.isFunction(currentScope.block)) {
      return currentScope.block === fn.node;
    }
    currentScope = currentScope?.parent ?? null;
  } while (currentScope);

  return false;
}
