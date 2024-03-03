export function getParentBlockStatement(path: babel.NodePath) {
  return path.findParent((p) =>
    p.isBlockStatement()
  ) as babel.NodePath<babel.types.BlockStatement> | null;
}
