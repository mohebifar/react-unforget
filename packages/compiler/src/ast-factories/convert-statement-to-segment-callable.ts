import * as t from "@babel/types";
import { DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME } from "~/utils/constants";
import { unwrapPatternAssignment } from "~/utils/unwrap-pattern-assignment";

export function convertStatementToSegmentCallable(
  statement: babel.NodePath<babel.types.Statement>,
  {
    initialValue,
    cacheNullValue,
    segmentCallableId = statement.scope.generateUidIdentifier(
      DEFAULT_SEGMENT_CALLABLE_VARIABLE_NAME
    ),
  }: {
    initialValue?: t.Expression;
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

    const assignmentExpressionStatements = parentDeclaration.node.declarations
      .map((declarator) => {
        return declarator.init
          ? t.expressionStatement(
              t.assignmentExpression("=", declarator.id, declarator.init)
            )
          : null;
      })
      .filter((v): v is t.ExpressionStatement => Boolean(v));

    return {
      segmentCallableId,
      replacements,
      performTransformation: () => {
        parentDeclaration.node.kind = newKind;
        parentDeclaration.node.declarations = parentDeclaration
          .get("declarations")
          .flatMap((declaration) => {
            if (declaration.get("id").isIdentifier()) {
              declaration.node.init = initialValue;
              return declaration.node;
            }

            return unwrapPatternAssignment(declaration.get("id")).map(
              (entry) => {
                return t.variableDeclarator(entry.id, initialValue);
              }
            );
          });

        return [
          parentDeclaration,
          parentDeclaration.insertAfter(
            makeSegmentCallable(assignmentExpressionStatements)
          ) as babel.NodePath<t.Statement>[],
        ].flat();
      },
    };
  } else {
    return {
      segmentCallableId,
      replacements,
      performTransformation: () => {
        replacements = [makeSegmentCallable([statement.node])];
        if (!replacements) {
          return null;
        }

        return statement.replaceWithMultiple(
          replacements
        ) as babel.NodePath<t.Statement>[];
      },
    };
  }
}
