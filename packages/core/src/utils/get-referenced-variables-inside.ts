import type { Binding } from "@babel/traverse";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>
) {
  const references = new Set<string>();

  path.traverse({
    Identifier(innerPath) {
      // Check if the identifier is a reference to a variable
      // Skip over keys in object properties and function/method names
      if (
        !innerPath.parentPath.isObjectProperty({ key: innerPath.node }) &&
        !innerPath.parentPath.isMemberExpression({
          property: innerPath.node,
        }) &&
        !innerPath.parentPath.isFunctionDeclaration({ id: innerPath.node }) &&
        !innerPath.parentPath.isFunctionExpression({ id: innerPath.node }) &&
        !innerPath.parentPath.isClassMethod({ key: innerPath.node }) &&
        !innerPath.parentPath.isClassProperty({ key: innerPath.node }) &&
        !innerPath.parentPath.isVariableDeclarator({ id: innerPath.node })
      ) {
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
