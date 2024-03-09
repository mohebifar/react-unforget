import type { Binding } from "@babel/traverse";
import { getLeftmostIdName } from "~/utils/ast-tools/get-leftmost-id-name";
import { getRightmostIdName } from "~/utils/ast-tools/get-rightmost-id-name";
import { MUTATING_METHODS } from "~/utils/constants";
import { getDeclaredIdentifiersInLVal } from "./get-declared-identifiers-in-lval";

export function findMutatingExpressions(
  path: babel.NodePath<babel.types.Node>,
) {
  const result: {
    binding: Binding;
    path: babel.NodePath<babel.types.Expression>;
  }[] = [];

  const pairExists = (
    binding: Binding,
    path: babel.NodePath<babel.types.Node>,
  ) => result.some((entry) => entry.binding === binding && entry.path === path);

  const push = (
    binding: Binding,
    path: babel.NodePath<babel.types.Expression>,
  ) => {
    if (!pairExists(binding, path)) {
      result.push({ binding, path });
    }
  };

  path.traverse({
    AssignmentExpression(assignmentPath) {
      const lval = assignmentPath.get("left");
      if (!lval.isLVal()) {
        return;
      }

      const statement = assignmentPath.getStatementParent();
      const leftMostIds = lval.isMemberExpression()
        ? [getLeftmostIdName(lval.node)]
        : getDeclaredIdentifiersInLVal(lval);

      if (leftMostIds.length === 0 || !statement) {
        return;
      }

      leftMostIds.forEach((name) => {
        const binding = statement.scope.getBinding(name);

        if (binding) {
          push(binding, assignmentPath);
        }
      });
    },
    UpdateExpression(updatePath) {
      const argument = updatePath.get("argument");

      const leftMostId = getLeftmostIdName(argument.node);

      const binding = argument.scope.getBinding(leftMostId);

      if (binding) {
        push(binding, updatePath);
      }
    },
    CallExpression(callPath) {
      const callee = callPath.get("callee");

      if (!callee.isMemberExpression()) {
        return;
      }
      try {
        const leftMostId = getLeftmostIdName(callee.node);
        const rightmostId = getRightmostIdName(callee.node);

        if (MUTATING_METHODS.includes(rightmostId)) {
          const binding = callee.scope.getBinding(leftMostId);

          if (binding) {
            push(binding, callPath);
          }
        }
      } catch {
        // The callee was not a member expression or identifier
      }
    },
  });

  return result;
}
