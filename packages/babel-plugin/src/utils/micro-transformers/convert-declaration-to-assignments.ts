import * as t from "@babel/types";
import { DEFAULT_UNWRAPPED_VARIABLE_NAME } from "~/utils/constants";
import { unwrapPatternAssignment } from "~/utils/micro-transformers/unwrap-pattern-assignment";

export function convertDeclarationToAssignments(
  declaration: babel.NodePath<babel.types.VariableDeclaration>,
  kind: "let" | "const" | "var" = "let",
  newVariablesScope = declaration.scope
) {
  const result = declaration.get("declarations").map((declarator) => {
    return convertDeclaratorToAssignments(
      declarator,
      kind,
      null,
      newVariablesScope
    );
  });

  return {
    declarations: result.flatMap((item) => item.declarations),
    assignmentExpressions: result.flatMap((item) => item.assignmentExpressions),
  };
}

export function convertDeclaratorToAssignments(
  declarator: babel.NodePath<babel.types.VariableDeclarator>,
  kind: "let" | "const" | "var" = "let",
  declarationDefaultValue: t.Expression | undefined | null = null,
  newVariablesScope = declarator.scope
) {
  const id = declarator.get("id");
  const originalInit = declarator.get("init");

  const unwrappedForDeclarations = unwrapPatternAssignment(
    id,
    declarationDefaultValue
  );

  const declarations = unwrappedForDeclarations.map((item) =>
    t.variableDeclaration(kind, [t.variableDeclarator(item.id, item.value)])
  );

  let assignmentValue = originalInit.node;

  if (declarations.length > 1) {
    const tempVariable = newVariablesScope.generateUidIdentifier(
      DEFAULT_UNWRAPPED_VARIABLE_NAME
    );

    const tempDeclaration = t.variableDeclaration("const", [
      t.variableDeclarator(tempVariable, originalInit.node),
    ]);

    assignmentValue = tempVariable;

    declarations.unshift(tempDeclaration);
  }

  const unwrappedForAssignment = unwrapPatternAssignment(
    declarator.get("id"),
    assignmentValue
  );

  const assignmentExpressions = unwrappedForAssignment
    .map((item) =>
      item.value
        ? t.assignmentExpression(
            "=",
            item.id,
            item.value ?? t.identifier("undefined")
          )
        : null
    )
    .filter((v): v is t.AssignmentExpression => Boolean(v));

  return {
    declarations,
    assignmentExpressions,
  };
}
