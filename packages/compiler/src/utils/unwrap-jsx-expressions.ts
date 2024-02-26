import * as babel from "@babel/core";
import * as t from "@babel/types";
import { DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME } from "./constants";
import { unwrapGenericExpression } from "./unwrap-generic-expression";

export function unwrapJsxExpressions(fn: babel.NodePath<t.Function>) {
  fn.traverse({
    JSXExpressionContainer(path) {
      const expressionPath = path.get("expression");
      const expression = expressionPath.node;

      if (
        t.isJSXEmptyExpression(expression) ||
        t.isIdentifier(expression) ||
        t.isLiteral(expression)
      ) {
        return;
      }

      unwrapGenericExpression(
        fn,
        expressionPath as babel.NodePath<t.Expression>,
        DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME
      );
    },
  });
}
