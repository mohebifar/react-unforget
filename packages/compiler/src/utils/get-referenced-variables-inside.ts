import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";
import { isReferenceIdentifier } from "./is-reference-identifier";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>
) {
  const map = new Map<babel.NodePath<babel.types.Node>, Binding>();

  path.traverse({
    Identifier(innerPath) {
      if (isReferenceIdentifier(innerPath)) {
        const name = innerPath.node.name;

        const binding = path.scope.getBinding(name);
        if (binding) {
          map.set(innerPath, binding);
        }
      }
    },
  });

  return map;
}
