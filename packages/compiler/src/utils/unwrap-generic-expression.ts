import * as babel from "@babel/core";
import * as t from "@babel/types";
import { getFunctionParent } from "./get-function-parent";

export function unwrapGenericExpression(
  fn: babel.NodePath<t.Function>,
  expressionPath: babel.NodePath<t.Expression>,
  defaultVariableName: string,
  wrapReplacement: (replacement: t.Expression) => t.Node = (
    replacement
  ) => replacement
) {
  const expression = expressionPath.node;
  const parent = expressionPath.getStatementParent();

  if (!parent) {
    return null;
  }

  const fnParent = getFunctionParent(parent);
  if (fnParent !== fn) {
    return null;
  }

  const variableId =
    expressionPath.scope.generateUidIdentifier(defaultVariableName);
  const variableName = variableId.name;

  const variableDeclaration = t.variableDeclaration("const", [
    t.variableDeclarator(variableId, expression),
  ]);

  const [referenceIdPath] = expressionPath.replaceWith(
    wrapReplacement(t.cloneNode(variableId))
  );
  const [declarationPath] = parent.insertBefore(variableDeclaration);

  fnParent.scope.registerDeclaration(declarationPath);

  fnParent.scope.getOwnBinding(variableName)!.reference(referenceIdPath);

  return [declarationPath] as const;
}
