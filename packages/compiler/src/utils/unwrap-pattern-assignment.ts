import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { DEFAULT_UNUSED_VARIABLE_NAME } from "./constants";

export type UnwrappedAssignmentEntry = {
  id: babel.types.LVal;
  value?: babel.types.Expression | null;
  name: string;
};

// Unwraps a pattern assignment, e.g. `const { a = 1 } = temp` => `const a = temp.a === void 0 ? 1 : temp.a;`
export function unwrapPatternAssignment(
  lval: babel.NodePath<babel.types.LVal>,
  rval?: babel.types.Expression | null
): UnwrappedAssignmentEntry[] {
  if (lval.isIdentifier()) {
    return [
      {
        id: t.cloneNode(lval.node),
        value: rval && t.cloneNode(rval),
        name: lval.node.name,
      },
    ];
  }

  if (lval.isArrayPattern()) {
    const elements = lval.get("elements");

    return elements.flatMap((element, index) => {
      if (element.isRestElement()) {
        const arg = element.get("argument");
        if (arg.isIdentifier()) {
          return [
            {
              id: t.arrayPattern(
                Array.from(
                  { length: index },
                  () =>
                    lval.scope.generateUidIdentifier(
                      DEFAULT_UNUSED_VARIABLE_NAME
                    ) as babel.types.Identifier | babel.types.RestElement
                ).concat([element.node as babel.types.RestElement])
              ),
              value: rval && t.cloneNode(rval),
              name: arg.node.name,
            },
          ];
        }
      }

      return unwrapPatternAssignment(
        element as babel.NodePath<babel.types.LVal>,
        rval && t.memberExpression(rval, t.numericLiteral(index), true)
      );
    });
  }

  if (lval.isObjectPattern()) {
    const properties = lval.get("properties");

    return properties.flatMap((property, index) => {
      if (property.isObjectProperty()) {
        const key = property.get("key");
        const value = property.get("value");

        if (key.isIdentifier()) {
          return unwrapPatternAssignment(
            value as babel.NodePath<babel.types.LVal>,
            rval &&
              t.memberExpression(
                rval,
                t.cloneNode(key.node),
                property.node.computed
              )
          );
        }

        if (key.isStringLiteral()) {
          return unwrapPatternAssignment(
            value as babel.NodePath<babel.types.LVal>,
            rval &&
              t.memberExpression(rval, t.stringLiteral(key.node.value), true)
          );
        }
      }

      if (property.isRestElement()) {
        const arg = property.get("argument");
        if (arg.isIdentifier()) {
          return [
            {
              id: t.objectPattern(
                properties
                  .slice(0, index)
                  .map<babel.types.ObjectProperty | babel.types.RestElement>(
                    (prop) => {
                      const objectProp =
                        prop.node as babel.types.ObjectProperty;

                      return t.objectProperty(
                        t.cloneNode(objectProp).key,
                        t.identifier(
                          prop.scope.generateUid(DEFAULT_UNUSED_VARIABLE_NAME)
                        ),
                        objectProp.computed
                      );
                    }
                  )
                  .concat([property.node as babel.types.RestElement])
              ),
              value: rval && t.cloneNode(rval),
              name: arg.node.name,
            },
          ];
        }
      }

      return [];
    });
  }

  if (lval.isAssignmentPattern()) {
    return unwrapPatternAssignment(
      lval.get("left") as babel.NodePath<babel.types.LVal>,
      rval &&
        t.conditionalExpression(
          t.binaryExpression("===", rval, t.identifier("void 0")),
          lval.get("right").node,
          rval
        )
    );
  }

  return [];
}
