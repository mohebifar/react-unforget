import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";
import { isReferenceIdentifier } from "./is-reference-identifier";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>,
  unique = true
) {
  const visited = new Set<Binding>();
  const map = new Map<babel.NodePath<babel.types.Node>, Binding>();

  function visitIdentifier(innerPath: babel.NodePath<babel.types.Identifier>) {
    if (isReferenceIdentifier(innerPath)) {
      const name = innerPath.node.name;

      const binding = path.scope.getBinding(name);
      if (binding && (!unique || !visited.has(binding))) {
        visited.add(binding);
        map.set(innerPath, binding);
      }
      // If binding is not found here, that means that it's either a global variable or a variable defined in the inner scope which we don't care about
    }
  }

  if (path.isIdentifier()) {
    visitIdentifier(path);
  }

  path.traverse({
    Identifier: visitIdentifier,
  });

  return map;
}
