import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { Component } from "~/models/Component";
import { DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME } from "../constants";
import { getParentBlockStatement } from "../path-tools/get-parent-block-statement";
import { isInTheSameFunctionScope } from "../path-tools/is-in-the-same-function-scope";
import { unwrapGenericExpression } from "./unwrap-generic-expression";

type JSXChild = t.JSXElement["children"][number];

export function unwrapJsxElements(
  statement: babel.NodePath<t.Statement>,
  component: Component,
  blockStatement: babel.NodePath<t.BlockStatement>,
) {
  const performTransformation: ((() => void) | null)[] = [];

  function handleExpression(
    expressionPath: babel.NodePath<t.Expression | t.JSXEmptyExpression>,
    conditions: t.Expression[],
  ) {
    switch (true) {
      case expressionPath.isJSXElement():
      case expressionPath.isJSXFragment():
        traverseJSXElement(expressionPath, false, conditions);
        break;

      case expressionPath.isConditionalExpression():
        const consequent = expressionPath.get("consequent");
        const alternate = expressionPath.get("alternate");

        handleExpression(consequent, [...conditions, expressionPath.node.test]);
        handleExpression(alternate, [
          ...conditions,
          t.unaryExpression("!", expressionPath.node.test),
        ]);
        break;

      case expressionPath.isLogicalExpression(): {
        if (expressionPath.node.operator === "&&") {
          handleExpression(expressionPath.get("right"), [
            ...conditions,
            expressionPath.node.left,
          ]);
          break;
        } else if (expressionPath.node.operator === "||") {
          handleExpression(expressionPath.get("left"), conditions);

          handleExpression(expressionPath.get("right"), [
            ...conditions,
            t.unaryExpression("!", expressionPath.node.left),
          ]);
          break;
        } else if (expressionPath.node.operator === "??") {
          handleExpression(expressionPath.get("right"), [
            ...conditions,
            t.binaryExpression("==", expressionPath.node.left, t.nullLiteral()),
          ]);
          break;
        }
      }

      case expressionPath.isJSXEmptyExpression():
      case expressionPath.isIdentifier():
      case expressionPath.isLiteral(): {
        if (conditions.length === 0) {
          break;
        }
      }

      default: {
        const transform = unwrapGenericExpression(
          expressionPath as babel.NodePath<t.Expression>,
          conditions,
          DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME,
        );

        performTransformation.push(transform);
      }
    }
  }

  function traverseJSXElement(
    path: babel.NodePath<JSXChild>,
    nested = false,
    conditions: t.Expression[] = [],
  ) {
    if (getParentBlockStatement(path) !== blockStatement) {
      return;
    }

    if (!isInTheSameFunctionScope(path, component.path)) {
      return;
    }

    if (path.isJSXElement() || path.isJSXFragment()) {
      const childrenPath = path.get("children") as babel.NodePath<
        t.JSXElement["children"][number]
      >[];

      const openingElement = path.isJSXElement()
        ? path.get("openingElement")
        : null;
      const openingElementAttributes = openingElement?.get("attributes");

      if (openingElementAttributes) {
        openingElementAttributes.forEach((attribute) => {
          if (!attribute.isJSXAttribute()) {
            return;
          }

          const value = attribute.get("value");
          if (value.isJSXExpressionContainer()) {
            const expressionPath = value.get("expression");
            handleExpression(expressionPath, conditions);
          }
        });
      }

      childrenPath.forEach((childPath) => {
        traverseJSXElement(childPath, true, conditions);
      });

      const transform = unwrapGenericExpression(
        path as babel.NodePath<t.Expression>,
        conditions,
        DEFAULT_UNWRAPPED_JSX_ELEMENT_VARIABLE_NAME,
        (replacement) =>
          nested ? t.jsxExpressionContainer(replacement) : replacement,
      );

      performTransformation.push(transform);
    } else if (path.isJSXExpressionContainer()) {
      const expressionPath = path.get("expression");
      handleExpression(expressionPath, conditions);
    }
  }

  statement.traverse({
    JSXElement(path) {
      traverseJSXElement(path);
      path.skip();
    },
    JSXFragment(path) {
      traverseJSXElement(path);
      path.skip();
    },
  });

  return performTransformation.length === 0
    ? null
    : () =>
        performTransformation.forEach((transformation) => transformation?.());
}
