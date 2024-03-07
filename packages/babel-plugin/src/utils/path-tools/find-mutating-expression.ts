import { MUTATING_METHODS } from "~/utils/constants";
import { getLeftmostIdName } from "~/utils/ast-tools/get-leftmost-id-name";
import { getRightmostIdName } from "~/utils/ast-tools/get-rightmost-id-name";
import type { Binding } from "@babel/traverse";
import { getDeclaredIdentifiersInLVal } from "./get-declared-identifiers-in-lval";
import { getReferencedVariablesInside } from "./get-referenced-variables-inside";

export function findMutatingExpressions(
  path: babel.NodePath<babel.types.Node>
) {
  const result: {
    binding: Binding;
    path: babel.NodePath<babel.types.Expression>;
  }[] = [];

  const referencedIds = getReferencedVariablesInside(path).entries();

  for (const [referencePath, binding] of referencedIds) {
    const name = binding.identifier.name;

    const found = referencePath.find((currentParentPath) => {
      if (currentParentPath.isStatement()) {
        return true;
      }

      if (currentParentPath.isAssignmentExpression()) {
        const left = currentParentPath.node.left;
        const leftMostIds = currentParentPath.isLVal()
          ? getDeclaredIdentifiersInLVal(currentParentPath)
          : [getLeftmostIdName(left)];

        return leftMostIds.includes(name);
      }

      if (currentParentPath.isUpdateExpression()) {
        return getLeftmostIdName(currentParentPath.node.argument) === name;
      }

      if (currentParentPath.isCallExpression()) {
        const callee = currentParentPath.get("callee");

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

    if (found?.isExpression()) {
      result.push({ binding, path: found });
    }
  }

  return result;
}
