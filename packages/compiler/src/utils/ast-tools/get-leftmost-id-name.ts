import * as t from "@babel/types";
import { LeftmostIdNotFound } from "../errors/LeftmostIdNotFound";

export function getLeftmostIdName(
  node: babel.types.LVal | babel.types.Expression
): string {
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    const object = node.object;

    return getLeftmostIdName(object);
  } else if (t.isIdentifier(node)) {
    return node.name;
  }

  throw new LeftmostIdNotFound(node);
}
