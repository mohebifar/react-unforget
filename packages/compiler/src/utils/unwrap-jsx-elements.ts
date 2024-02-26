import * as babel from "@babel/core";
import * as t from "@babel/types";
import { DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME } from "./constants";
import { unwrapGenericExpression } from "./unwrap-generic-expression";

type JSXChild = t.JSXElement["children"][number];

export function unwrapJsxElements(fn: babel.NodePath<t.Function>) {
  const createdDeclarationPaths = new Set<
    babel.NodePath<t.VariableDeclaration>
  >();

  function traverseJSXElement(path: babel.NodePath<JSXChild>, nested = false) {
    let alreadyUnwrapped = false;
    createdDeclarationPaths.forEach((createdDeclarationPath) => {
      if (!alreadyUnwrapped && path.isDescendant(createdDeclarationPath)) {
        alreadyUnwrapped = true;
      }
    });

    if (alreadyUnwrapped) {
      return;
    }

    if (path.isJSXElement() || path.isJSXFragment()) {
      const childrenPath = path.get("children") as babel.NodePath<
        t.JSXElement["children"][number]
      >[];

      childrenPath.forEach((childPath) => {
        traverseJSXElement(childPath, true);
      });

      const result = unwrapGenericExpression(
        fn,
        path as babel.NodePath<t.Expression>,
        DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME,
        (replacement) =>
          nested ? t.jsxExpressionContainer(replacement) : replacement
      );

      if (result) {
        const [createdDeclarationPath] = result;
        createdDeclarationPaths.add(createdDeclarationPath);
      }
    }
  }

  fn.traverse({
    JSXElement(path) {
      traverseJSXElement(path);
      path.skip();
    },
    JSXFragment(path) {
      traverseJSXElement(path);
      path.skip();
    },
  });
}
