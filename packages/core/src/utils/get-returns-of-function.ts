import t from "@babel/types";
import traverse from "@babel/traverse";
import { getFunctionParent } from "./get-function-parent";

export function getReturnsOfFunction(fn: babel.NodePath<t.Function>) {
  const returns: babel.NodePath<t.ReturnStatement>[] = [];

  fn.traverse({
    ReturnStatement(path) {
      if (getFunctionParent(path)?.node === fn.node) {
        returns.push(path);
      }
    },
  });

  return returns;
}
