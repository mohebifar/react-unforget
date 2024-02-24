import { RightmostIdNotFound } from "./errors/RightmostIdNotFound";

export function getRightmostIdName(
  path: babel.NodePath<
    babel.types.Expression | babel.types.V8IntrinsicIdentifier
  >
): string {
  let currentPath = path;

  if (currentPath.isMemberExpression()) {
    const property = currentPath.get("property");

    if (property.isStringLiteral()) {
      return property.node.value;
    } else if (property.isIdentifier() && !currentPath.node.computed) {
      return property.node.name;
    } else if (property.isNumericLiteral()) {
      return property.node.value.toString();
    }
  } else if (currentPath.isIdentifier()) {
    return currentPath.node.name;
  }

  throw new RightmostIdNotFound(currentPath);
}
