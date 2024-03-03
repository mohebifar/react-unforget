import type * as babel from "@babel/core";
import { isHookCall } from "~/utils/ast-tools/is-hook-call";
import { isInTheSameFunctionScope } from "./is-in-the-same-function-scope";

export function hasHookCall(
  path: babel.NodePath<babel.types.Node>,
  componentPath: babel.NodePath<babel.types.Function>
) {
  let hasHookCall = false;
  path.traverse({
    CallExpression: (innerPath) => {
      if (
        isHookCall(innerPath) &&
        isInTheSameFunctionScope(innerPath, componentPath)
      ) {
        hasHookCall = true;
        return;
      }
    },
  });

  return hasHookCall;
}
