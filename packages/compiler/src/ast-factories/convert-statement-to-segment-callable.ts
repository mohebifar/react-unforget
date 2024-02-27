import * as t from "@babel/types";
import { DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME } from "~/utils/constants";

export function convertStatementToSegmentCallable(
  statement: babel.NodePath<babel.types.Statement>,
  {
    initialValue,
    performReplacement = true,
    cacheNullValue,
    segmentCallableId = statement.scope.generateUidIdentifier(
      DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME
    ),
  }: {
    initialValue?: t.Expression;
    performReplacement?: boolean;
    cacheNullValue?: t.Expression;
    segmentCallableId?: t.Identifier;
  }
) {
  const parentDeclaration = statement.find((p) =>
    p.isVariableDeclaration()
  ) as babel.NodePath<babel.types.VariableDeclaration> | null;

  const makeSegmentCallable = (statements: t.Statement[]) => {
    return t.variableDeclaration("const", [
      t.variableDeclarator(
        segmentCallableId,
        t.arrowFunctionExpression(
          [],
          t.blockStatement(
            statements.concat(
              cacheNullValue ? [t.returnStatement(cacheNullValue)] : []
            )
          )
        )
      ),
    ]);
  };

  let replacements: t.Node[] | null = null;
  if (parentDeclaration) {
    const newKind = parentDeclaration.node.kind === "var" ? "var" : "let";
    const newDeclaration = t.variableDeclaration(
      newKind,
      parentDeclaration.node.declarations.map((declaration) => {
        return t.variableDeclarator(declaration.id, initialValue);
      })
    );

    const assignmentExpressionStatements = parentDeclaration.node.declarations
      .map((declarator) => {
        return declarator.init
          ? t.expressionStatement(
              t.assignmentExpression("=", declarator.id, declarator.init)
            )
          : null;
      })
      .filter((v): v is t.ExpressionStatement => Boolean(v));

    if (performReplacement) {
      replacements = [
        newDeclaration,
        makeSegmentCallable(assignmentExpressionStatements),
      ];
    }
  } else {
    replacements = [makeSegmentCallable([statement.node])];
  }

  const newPaths =
    performReplacement && replacements
      ? statement.replaceWithMultiple(replacements)
      : null;

  return {
    segmentCallableId,
    replacements,
    newPaths,
  };
}
