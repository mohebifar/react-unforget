import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { Component } from "~/models/Component";
import { doesMatchHookName } from "~/utils/ast-tools/is-hook-call";
import type { TransformationContext } from "~/models/TransformationContext";
import { getReturnsOfFunction } from "./get-returns-of-function";

export function findComponents(
  program: babel.NodePath<babel.types.Program>,
  transformationContext?: TransformationContext,
) {
  const components: Component[] = [];

  program.traverse({
    Function(path) {
      let id: babel.types.Identifier | null | undefined = null;

      if (path.isFunctionDeclaration()) {
        id = path.node.id;
      }

      if (
        (path.isFunctionExpression() || path.isArrowFunctionExpression()) &&
        path.parentPath.isVariableDeclarator()
      ) {
        const varIdPath = path.parentPath.get("id");
        if (varIdPath.isIdentifier()) {
          id = varIdPath.node;
        }
      }

      const name = id?.name;
      const nameMatchesComponentName = name && doesIdMatchComponentName(name);
      const nameMatchesHook = name && doesMatchHookName(name);

      if (!name) {
        return;
      }

      if (!nameMatchesComponentName && !nameMatchesHook) {
        return;
      }

      if (transformationContext?.shouldSkipComponent(name)) {
        return;
      }

      if (path.isArrowFunctionExpression()) {
        const body = path.get("body");
        if (!body.isBlockStatement() && isComponentReturnType(body.node)) {
          components.push(
            new Component(
              path as babel.NodePath<babel.types.Function>,
              name,
              transformationContext,
            ),
          );
          return;
        }
      }

      const returns = getReturnsOfFunction(path);

      if (returns.length === 0) {
        return;
      }

      if (nameMatchesHook) {
        components.push(
          new Component(
            path as babel.NodePath<babel.types.Function>,
            name,
            transformationContext,
          ),
        );
      }

      const allReturnsMatch = returns.every((returnStatement) => {
        const argument = returnStatement.get("argument");
        if (isComponentReturnType(argument.node)) {
          return true;
        }

        // TODO: Recursively follow re-assignments of the variable
        if (argument.isIdentifier()) {
          const binding = argument.scope.getBinding(argument.node.name);
          const variableDeclarator = binding?.path.find((bindingPath) =>
            bindingPath.isVariableDeclarator(),
          ) as babel.NodePath<babel.types.VariableDeclarator> | undefined;

          if (variableDeclarator) {
            const init = variableDeclarator.node;
            if (init && isComponentReturnType(init)) {
              return true;
            }
          }
        }
      });

      if (allReturnsMatch) {
        components.push(
          new Component(
            path as babel.NodePath<babel.types.Function>,
            name,
            transformationContext,
          ),
        );
      }
    },
  });

  return components;
}

function doesIdMatchComponentName(name: string) {
  return /^_?[A-Z]/.test(name);
}

function isComponentReturnType(node: babel.types.Node | null | undefined) {
  return t.isJSXElement(node) || t.isJSXFragment(node) || t.isNullLiteral(node);
}
