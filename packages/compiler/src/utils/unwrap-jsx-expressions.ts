import * as babel from "@babel/core";
import * as t from "@babel/types";
import { Component } from "~/classes/Component";
import { DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME } from "./constants";
import { isInTheSameFunctionScope } from "./is-in-the-same-function-scope";
import { unwrapGenericExpression } from "./unwrap-generic-expression";
import { getParentBlockStatement } from "./ast-tools";

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
