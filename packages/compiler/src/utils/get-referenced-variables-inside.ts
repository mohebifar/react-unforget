import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";
import { isReferenceIdentifier } from "./is-reference-identifier";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>
) {
  const references = new Set<string>();

  path.traverse({
    Identifier(innerPath) {
      if (isReferenceIdentifier(innerPath)) {
        references.add(innerPath.node.name);
      }
    },
  });

  const bindings: Binding[] = [];

  references.forEach((name) => {
    const binding = path.scope.getBinding(name);
    if (binding) {
      bindings.push(binding);
    }
  });

  return bindings;
}
