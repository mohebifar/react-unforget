import type * as babel from "@babel/core";
import { visitProgram } from "~/visit-program";
import { findComponents } from "~/utils/path-tools/find-components";
import type { Options } from "~/models/TransformationContext";
import { makeTransformationContext } from "~/models/TransformationContext";

export { visitProgram, findComponents };

export default function unforgetBabelPlugin(
  _: object,
  options: Options,
): babel.PluginObj {
  const transformationContext = makeTransformationContext({
    throwOnFailure: options.throwOnFailure ?? false,
    skipComponents: options.skipComponents ?? [],
    skipComponentsWithMutation: options.skipComponentsWithMutation ?? false,
  });
  return {
    visitor: {
      Program(path: babel.NodePath<babel.types.Program>) {
        visitProgram(path, transformationContext);
      },
    },
  };
}
