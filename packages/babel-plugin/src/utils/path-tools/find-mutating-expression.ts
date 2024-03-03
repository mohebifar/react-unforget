import { MUTATING_METHODS } from "~/utils/constants";
import { getLeftmostIdName } from "~/utils/ast-tools/get-leftmost-id-name";
import { getRightmostIdName } from "~/utils/ast-tools/get-rightmost-id-name";
import { getDeclaredIdentifiersInLVal } from "./get-declared-identifiers-in-lval";

export function findMutatingExpression(
  path: babel.NodePath<babel.types.Node>,
  name: string
) {
  const result = path.find((innerPath) => {
    if (innerPath.isStatement()) {
      return true;
    }

    if (innerPath.isAssignmentExpression()) {
      const left = innerPath.node.left;
      const leftMostIds = innerPath.isLVal()
        ? getDeclaredIdentifiersInLVal(innerPath)
        : [getLeftmostIdName(left)];

      return leftMostIds.includes(name);
    }

    if (innerPath.isUpdateExpression()) {
      return getLeftmostIdName(innerPath.node.argument) === name;
    }

    if (innerPath.isCallExpression()) {
      const callee = innerPath.get("callee");

      if (callee.isMemberExpression()) {
        const leftMostId = getLeftmostIdName(callee.node);
        const rightmostId = getRightmostIdName(callee.node);

        if (MUTATING_METHODS.includes(rightmostId)) {
          return leftMostId === name;
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
