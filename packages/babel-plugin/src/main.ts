import type * as babel from "@babel/core";
import { visitProgram } from "~/visit-program";
import { findComponents } from "~/utils/path-tools/find-components";

export { visitProgram, findComponents };

export interface Options {}

export default function asyncBabelPlugin() {
  return {
    visitor: {
      Program(path: babel.NodePath<babel.types.Program>) {
        visitProgram(path);
      },
    },
  };
}
