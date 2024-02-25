import type * as babel from "@babel/core";
import { RightmostIdNotFound } from "./errors/RightmostIdNotFound";

export function getRightmostIdName(
  path: babel.NodePath<
    babel.types.Expression | babel.types.V8IntrinsicIdentifier
  >
): string {
  if (path.isMemberExpression()) {
    const property = path.get("property");

    if (property.isStringLiteral()) {
      return property.node.value;
    } else if (property.isIdentifier() && !path.node.computed) {
      return property.node.name;
    } else if (property.isNumericLiteral()) {
      return property.node.value.toString();
    }
  } else if (path.isIdentifier()) {
    return path.node.name;
  }

  throw new RightmostIdNotFound(path);
}
