import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { unwrapPatternAssignment } from "~/utils/unwrap-pattern-assignment";

export function makeUnwrappedDeclarations(
  id: babel.NodePath<babel.types.LVal>,
  kind: "const" | "let" | "var",
  tempVariableId: babel.types.Identifier
) {
  const unwrappedEntries = unwrapPatternAssignment(id, tempVariableId);

  const unwrappedDeclarations = unwrappedEntries.map((entry) => {
    return t.variableDeclaration(kind, [
      t.variableDeclarator(entry.id, entry.value),
    ]);
  });

  return {
    unwrappedDeclarations,
    unwrappedEntries,
  };
}
