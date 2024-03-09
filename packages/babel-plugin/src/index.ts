import type * as babel from "@babel/core";
import type { Options } from "~/models/TransformationContext";
import { makeTransformationContext } from "~/models/TransformationContext";
import { findComponents } from "~/utils/path-tools/find-components";
import { visitProgram } from "~/visit-program";
export { mermaidGraphFromComponent } from "~/utils/misc/mermaid-graph-from-component";

export { findComponents, visitProgram };

export default function unforgetBabelPlugin(
  _: object,
  options: Options,
): babel.PluginObj {
  const transformationContext = makeTransformationContext({
    throwOnFailure: options.throwOnFailure ?? false,
    skipComponents: options.skipComponents ?? [],
    skipComponentsWithMutation: options.skipComponentsWithMutation ?? false,
    _debug_onComponentAnalysisFinished:
      options._debug_onComponentAnalysisFinished,
  });
  return {
    visitor: {
      Program(path: babel.NodePath<babel.types.Program>) {
        visitProgram(path, transformationContext);
      },
    },
  };
}
