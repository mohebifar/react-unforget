import { getFunctionParent } from "./get-function-parent";

export function getReturnsOfFunction(fn: babel.NodePath<babel.types.Function>) {
  const returns: babel.NodePath<babel.types.ReturnStatement>[] = [];

  fn.traverse({
    ReturnStatement(path) {
      if (getFunctionParent(path)?.node === fn.node) {
        returns.push(path);
      }
    },
  });

  return returns;
}
