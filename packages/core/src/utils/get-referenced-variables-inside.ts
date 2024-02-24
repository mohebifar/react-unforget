export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>
) {
  const variables: babel.NodePath<babel.types.Identifier>[] = [];

  path.traverse({
    Identifier(path) {
      if (path.isReferencedIdentifier()) {
        variables.push(path);
      }
    },
  });

  return variables;
}
