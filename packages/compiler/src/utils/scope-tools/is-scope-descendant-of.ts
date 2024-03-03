import { Scope } from "@babel/traverse";

export function isChildOfScope(parent: Scope, child: Scope) {
  let currentScope = child;

  while (currentScope) {
    if (currentScope === parent) {
      return true;
    }

    currentScope = currentScope.parent;
  }

  return false;
}
