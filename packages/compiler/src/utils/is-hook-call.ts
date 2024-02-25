import type * as babel from "@babel/core";
import { getRightmostIdName } from "./get-rightmost-id-name";

export function isHookCall(path: babel.NodePath<babel.types.CallExpression>) {
  path.assertCallExpression();

  const callee = path.get("callee");

  let rightmostId = "";

  try {
    rightmostId = getRightmostIdName(callee);
  } catch {
    // We pessimistically assume that it's a hook if we can't identify the rightmost id
    // TODO: Make this configurable / throw an error / or log a warning
    return true;
  }

  return /^use[A-Z]/.test(rightmostId);
}
