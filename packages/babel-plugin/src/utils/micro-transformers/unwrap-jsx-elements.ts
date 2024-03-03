import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { Component } from "~/models/Component";
import { DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME } from "../constants";
import { getParentBlockStatement } from "../path-tools/get-parent-block-statement";
import { isInTheSameFunctionScope } from "../path-tools/is-in-the-same-function-scope";
import { unwrapGenericExpression } from "./unwrap-generic-expression";

type JSXChild = t.JSXElement["children"][number];

export function unwrapJsxElements(
  statement: babel.NodePath<t.Statement>,
  component: Component,
  blockStatement: babel.NodePath<t.BlockStatement>
) {
  const performTransformation: ((() => void) | null)[] = [];

  function traverseJSXElement(path: babel.NodePath<JSXChild>, nested = false) {
      if (getParentBlockStatement(path) !== blockStatement) {
      return;
    }

    if (!isInTheSameFunctionScope(path, component.path)) {
      return;
    }

    if (path.isJSXElement() || path.isJSXFragment()) {
      const childrenPath = path.get("children") as babel.NodePath<
        t.JSXElement["children"][number]
      >[];

      childrenPath.forEach((childPath) => {
        traverseJSXElement(childPath, true);
      });

      const transform = unwrapGenericExpression(
        path as babel.NodePath<t.Expression>,
        DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME,
        (replacement) =>
          nested ? t.jsxExpressionContainer(replacement) : replacement
      );

      performTransformation.push(transform);
    }
  }

  statement.traverse({
    JSXElement(path) {
      traverseJSXElement(path);
      path.skip();
    },
    JSXFragment(path) {
      traverseJSXElement(path);
      path.skip();
    },
  });

  return () =>
    performTransformation.forEach((transformation) => transformation?.());
}
