import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";
import * as t from "@babel/types";
import { DEFAULT_UNUSED_VARIABLE_NAME } from "~/utils/constants";

export type UnwrappedAssignmentEntry = {
  binding?: Binding;
  id: babel.types.LVal;
  value?: babel.types.Expression | null;
  name: string;
};

/**
 * Unwraps a pattern assignment, e.g. `const { a = 1 } = temp` => `const a = temp.a === void 0 ? 1 : temp.a;`
 */
export function unwrapPatternAssignment(
  lval: babel.NodePath<babel.types.LVal>,
  originalRightValue?: babel.types.Expression | null,
  replacementRightValue?: babel.types.Expression | null,
  level = 0
): UnwrappedAssignmentEntry[] {
  const newRValToUse =
    level === 0 && replacementRightValue
      ? replacementRightValue
      : originalRightValue;
  const nextLevel = level + 1;

  if (lval.isIdentifier()) {
    return [
      {
        binding: lval.scope.getBinding(lval.node.name),
        id: t.cloneNode(lval.node),
        value: newRValToUse,
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
          const newLVal = t.arrayPattern(
            Array.from(
              { length: index },
              () =>
                lval.scope.generateUidIdentifier(
                  DEFAULT_UNUSED_VARIABLE_NAME
                ) as babel.types.Identifier | babel.types.RestElement
            ).concat([element.node as babel.types.RestElement])
          );

          return [
            {
              binding: lval.scope.getBinding(arg.node.name),
              id: newLVal,
              value: newRValToUse,
              name: arg.node.name,
            },
          ];
        }
      }

      const nextRVal = newRValToUse
        ? t.memberExpression(newRValToUse, t.numericLiteral(index), true)
        : null;

      return unwrapPatternAssignment(
        element as babel.NodePath<babel.types.LVal>,
        nextRVal,
        replacementRightValue,
        nextLevel
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
          const nextRVal = newRValToUse
            ? t.memberExpression(
                newRValToUse,
                t.cloneNode(key.node),
                property.node.computed
              )
            : null;

          return unwrapPatternAssignment(
            value as babel.NodePath<babel.types.LVal>,
            nextRVal,
            replacementRightValue,
            nextLevel
          );
        }

        if (key.isStringLiteral()) {
          const nextRVal = newRValToUse
            ? t.memberExpression(
                newRValToUse,
                t.stringLiteral(key.node.value),
                true
              )
            : null;

          return unwrapPatternAssignment(
            value as babel.NodePath<babel.types.LVal>,
            nextRVal,
            replacementRightValue,
            nextLevel
          );
        }
      }

      if (property.isRestElement()) {
        const arg = property.get("argument");
        if (arg.isIdentifier()) {
          const newLVal = t.objectPattern(
            properties
              .slice(0, index)
              .map<babel.types.ObjectProperty | babel.types.RestElement>(
                (prop) => {
                  const objectProp = prop.node as babel.types.ObjectProperty;

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
          );

          return [
            {
              binding: lval.scope.getBinding(arg.node.name),
              id: newLVal,
              value: newRValToUse,
              name: arg.node.name,
            },
          ];
        }
      }

      return [];
    });
  }

  if (lval.isAssignmentPattern()) {
    const nextRVal = newRValToUse
      ? t.conditionalExpression(
          t.binaryExpression("===", newRValToUse, t.identifier("void 0")),
          lval.get("right").node,
          newRValToUse
        )
      : null;

    return unwrapPatternAssignment(
      lval.get("left") as babel.NodePath<babel.types.LVal>,
      nextRVal,
      replacementRightValue,
      nextLevel
    );
  }

  return [];
}
