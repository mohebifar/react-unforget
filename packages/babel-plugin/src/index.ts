import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import { visitProgram } from "@react-unforget/compiler";

export interface Options {}

export default function asyncBabelPlugin() {
  return {
    visitor: {
      Program(path: NodePath<t.Program>) {
        visitProgram(path);
      },
    },
  };
}
