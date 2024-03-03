import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { Component } from "~/models/Component";
import { DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME } from "~/utils/constants";
import { getParentBlockStatement } from "~/utils/path-tools/get-parent-block-statement";
import { isInTheSameFunctionScope } from "~/utils/path-tools/is-in-the-same-function-scope";
import { unwrapGenericExpression } from "./unwrap-generic-expression";

export function unwrapJsxExpressions(
  statement: babel.NodePath<t.Statement>,
  component: Component,
  blockStatement: babel.NodePath<t.BlockStatement>
) {
  const performTransformation: ((() => void) | null)[] = [];
  statement.traverse({
    JSXExpressionContainer(path) {
      const expressionPath = path.get("expression");
      const expression = expressionPath.node;

      if (getParentBlockStatement(expressionPath) !== blockStatement) {
        return;
      }

      if (!isInTheSameFunctionScope(expressionPath, component.path)) {
        return;
      }

      if (
        t.isJSXEmptyExpression(expression) ||
        t.isIdentifier(expression) ||
        t.isLiteral(expression)
      ) {
        return;
      }

      const transform = unwrapGenericExpression(
        expressionPath as babel.NodePath<t.Expression>,
        DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME
      );
      performTransformation.push(transform);
    },
  });

  return () =>
    performTransformation.forEach((transformation) => transformation?.());
}
