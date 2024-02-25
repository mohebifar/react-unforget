import type * as babel from "@babel/core";
import * as t from "@babel/types";

export function variableDeclarationToAssignment(
  declaration: babel.NodePath<babel.types.VariableDeclaration>
) {
  const declarations = declaration.get("declarations");
  const assignments = declarations.map((declaration) => {
    const id = declaration.get("id");
    const init = declaration.get("init");

    return t.expressionStatement(
      t.assignmentExpression("=", id.node, init.node!)
    );
  });

  return assignments;
}
