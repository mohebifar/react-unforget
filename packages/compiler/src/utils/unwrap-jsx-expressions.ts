import * as babel from "@babel/core";
import * as t from "@babel/types";
import { DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME } from "./constants";
import { getFunctionParent } from "./get-function-parent";

export function unwrapJsxExpressions(fn: babel.NodePath<t.Function>) {
  fn.traverse({
    JSXExpressionContainer(path) {
      const expressionPath = path.get("expression");
      const expression = expressionPath.node;

      if (
        t.isIdentifier(expression) ||
        t.isJSXEmptyExpression(expression) ||
        t.isLiteral(expression)
      ) {
        return;
      }

      const parent = path.getStatementParent();

      if (!parent) {
        return;
      }

      const fnParent = getFunctionParent(parent);
      if (fnParent !== fn) {
        return;
      }

      const variableId = path.scope.generateUidIdentifier(
        DEFAULT_UNWRAPPED_JSX_EXPRESSION_VARIABLE_NAME
      );
      const variableName = variableId.name;

      const variableDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(variableId, expression),
      ]);

      const [referenceIdPath] = expressionPath.replaceWith(
        t.cloneNode(variableId)
      );
      const [declarationPath] = parent.insertBefore(variableDeclaration);

      fnParent.scope.registerDeclaration(declarationPath);

      fnParent.scope.getOwnBinding(variableName)!.reference(referenceIdPath);
    },
  });
}
