import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>,
  unique = true,
) {
  const visited = new Set<Binding>();
  const map = new Map<
    babel.NodePath<babel.types.Identifier | babel.types.JSXIdentifier>,
    Binding
  >();

  path.traverse({
    ReferencedIdentifier(innerPath) {
      const name = innerPath.node.name;
      const binding = path.scope.getBinding(name);
      if (binding && (!unique || !visited.has(binding))) {
        visited.add(binding);
        map.set(innerPath, binding);
      }
    },
  });

  return map;
}
