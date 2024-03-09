import * as t from "@babel/types";
import { unwrapPatternAssignment } from "../micro-transformers/unwrap-pattern-assignment";

export function splitVariableDeclaration(
  statement: babel.NodePath<babel.types.Statement>,
  componentPath: babel.NodePath<t.Function>,
  {
    initialValue,
  }: {
    initialValue?: t.Expression;
  },
) {
  const parentDeclaration = statement;
  if (!parentDeclaration.isVariableDeclaration()) {
    return {
      declaration: null,
      conditionalStatements: [statement.node],
    };
  }
  const newKind = parentDeclaration.node.kind === "var" ? "var" : "let";

  const assignmentExpressionStatements = parentDeclaration.node.declarations
    .map((declarator) => {
      return declarator.init
        ? t.expressionStatement(
            t.assignmentExpression("=", declarator.id, declarator.init),
          )
        : null;
    })
    .filter((v): v is t.ExpressionStatement => Boolean(v));

  parentDeclaration.node.kind = newKind;
  parentDeclaration.node.declarations = parentDeclaration
    .get("declarations")
    .flatMap((declaration) => {
      if (declaration.get("id").isIdentifier()) {
        declaration.node.init = initialValue;
        return declaration.node;
      }

      return unwrapPatternAssignment(declaration.get("id")).map((entry) => {
        return t.variableDeclarator(entry.id, initialValue);
      });
    });

  return {
    declaration: parentDeclaration.node,
    conditionalStatements: assignmentExpressionStatements,
  };
}
