import * as t from "@babel/types";
import { findComponents } from "./utils/path-tools/find-components";
import {
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
  RUNTIME_MODULE_NAME,
} from "./utils/constants";
import type { TransformationContext } from "./models/TransformationContext";

export function visitProgram(
  path: babel.NodePath<babel.types.Program>,
  context?: TransformationContext,
) {
  const components = findComponents(path, context);

  if (components.length === 0) {
    return;
  }

  components.forEach((component) => {
    try {
      component.analyze();
      component.applyTransformation();
    } catch (e) {
      if (!context || context?.throwOnFailure) {
        throw e;
      } else {
        console.warn(`Failed to transform component ${component.name}`, e);
      }
    }
  });

  const useCacheHookIdentifier = t.identifier(
    RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
  );

  const moduleNameLiteral = t.stringLiteral(RUNTIME_MODULE_NAME);

  const importStatement = t.importDeclaration(
    [t.importSpecifier(useCacheHookIdentifier, useCacheHookIdentifier)],
    moduleNameLiteral,
  );

  path.node.body.unshift(importStatement);
}
