import type * as babel from "@babel/core";
import * as t from "@babel/types";

export function unwrapGenericExpression(
  expressionPath: babel.NodePath<t.Expression>,
  defaultVariableName: string,
  wrapReplacement: (replacement: t.Expression) => t.Node = (replacement) =>
    replacement,
) {
  const expression = expressionPath.node;
  const parent = expressionPath.getStatementParent();

  if (!parent) {
    return null;
  }

  return () => {
    const variableId =
      expressionPath.scope.generateUidIdentifier(defaultVariableName);
    const variableName = variableId.name;

    const variableDeclaration = t.variableDeclaration("const", [
      t.variableDeclarator(variableId, expression),
    ]);

    const [referenceIdPath] = expressionPath.replaceWith(
      wrapReplacement(t.cloneNode(variableId)),
    );
    const [declarationPath] = parent.insertBefore(variableDeclaration);

    expressionPath.scope.registerDeclaration(declarationPath);

    expressionPath.scope.getBinding(variableName)!.reference(referenceIdPath);
  };
}
