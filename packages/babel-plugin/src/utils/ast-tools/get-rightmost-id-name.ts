import * as t from "@babel/types";
import { RightmostIdNotFound } from "~/utils/errors/RightmostIdNotFound";

export function getRightmostIdName(
  node: t.Expression | t.V8IntrinsicIdentifier
): string {
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    const property = node.property;

    if (t.isStringLiteral(property)) {
      return property.value;
    } else if (t.isIdentifier(property) && !node.computed) {
      return property.name;
    } else if (t.isNumericLiteral(property)) {
      return property.value.toString();
    }
  } else if (t.isIdentifier(node)) {
    return node.name;
  }

  throw new RightmostIdNotFound(node);
}
