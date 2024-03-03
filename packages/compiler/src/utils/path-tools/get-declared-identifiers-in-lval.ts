import type * as babel from "@babel/core";

export function getDeclaredIdentifiersInLVal(
  lval: babel.NodePath<babel.types.LVal | null>,
  identifiers: Set<string> = new Set()
) {
  if (lval.isIdentifier()) {
    identifiers.add(lval.node.name);
  } else if (lval.isRestElement()) {
    getDeclaredIdentifiersInLVal(lval.get("argument"), identifiers);
  } else if (lval.isObjectPattern()) {
    for (const prop of lval.get("properties")) {
      if (prop.isObjectProperty()) {
        const value = prop.get("value") as babel.NodePath<babel.types.LVal>;
        getDeclaredIdentifiersInLVal(value, identifiers);
      } else if (prop.isRestElement()) {
        getDeclaredIdentifiersInLVal(prop, identifiers);
      }
    }
  } else if (lval.isArrayPattern()) {
    for (const elem of lval.get("elements")) {
      if (elem.isIdentifier()) {
        identifiers.add(elem.node.name);
      } else {
        getDeclaredIdentifiersInLVal(elem, identifiers);
      }
    }
  } else if (lval.isAssignmentPattern()) {
    getDeclaredIdentifiersInLVal(lval.get("left"), identifiers);
  } else {
    console.warn("Unknown LVal type");
  }

  return Array.from(identifiers);
}
