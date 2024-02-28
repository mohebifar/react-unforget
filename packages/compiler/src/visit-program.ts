import * as t from "@babel/types";
import { findComponents } from "./utils/find-components";
import {
  RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME,
  RUNTIME_MODULE_NAME,
} from "./utils/constants";

export function visitProgram(path: babel.NodePath<babel.types.Program>) {
  const components = findComponents(path);

  components.forEach((component) => {
    component.computeComponentSegments();
    component.applyTransformation();
  });

  const useCacheHookIdentifier = t.identifier(
    RUNTIME_MODULE_CREATE_CACHE_HOOK_NAME
  );

  const moduleNameLiteral = t.stringLiteral(RUNTIME_MODULE_NAME);

  const importStatement = t.importDeclaration(
    [t.importSpecifier(useCacheHookIdentifier, useCacheHookIdentifier)],
    moduleNameLiteral
  );

  path.node.body.unshift(importStatement);
}