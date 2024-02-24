// The native NodePath#getFunctionParent does not recognize the parent of a function if it is a variable declarator.
export function getFunctionParent(path: babel.NodePath<babel.types.Node>) {
  const parent = path.findParent((p) => {
    if (p.isFunction()) {
      return true;
    }

    if (p.isBlockStatement() && p.parentPath.isVariableDeclarator()) {
      return p.parentPath.get("init").isFunction();
    }

    return false;
  });

  if (parent?.isFunction()) {
    return parent;
  }

  if (parent?.isBlockStatement()) {
    return parent.parentPath.get(
      "init"
    ) as babel.NodePath<babel.types.Function>;
  }
}
