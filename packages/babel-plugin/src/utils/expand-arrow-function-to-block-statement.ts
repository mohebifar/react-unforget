import * as t from "@babel/types";

export function expandArrowFunctionToBlockStatement(
  path: babel.NodePath<t.Function>,
) {
  if (!path.isArrowFunctionExpression()) {
    return;
  }

  const pathBody = path.get("body");

  if (pathBody.isBlockStatement()) {
    return;
  }

  pathBody.replaceWith(
    t.blockStatement([t.returnStatement(pathBody.node as t.Expression)]),
  );
}
