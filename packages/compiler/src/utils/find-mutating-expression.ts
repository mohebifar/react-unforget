import { MUTATING_METHODS } from "./constants";

export function findMutatingExpression(path: babel.NodePath<babel.types.Node>) {
  const result = path.find((innerPath) => {
    if (innerPath.isStatement()) {
      return true;
    }

    if (innerPath.isAssignmentExpression()) {
      return true;
    }

    if (innerPath.isUpdateExpression()) {
      return true;
    }

    if (innerPath.isCallExpression()) {
      const callee = innerPath.get("callee");

      if (callee.isMemberExpression()) {
        const property = callee.get("property");

        if (property.isIdentifier()) {
          if (MUTATING_METHODS.includes(property.node.name)) {
            return true;
          }
        }
      }
    }

    return false;
  });

  if (result?.isStatement()) {
    return null;
  }

  return result as babel.NodePath<babel.types.Expression>;
}
