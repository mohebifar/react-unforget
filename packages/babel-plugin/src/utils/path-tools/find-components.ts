import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { Component } from "../../classes/Component";
import { getReturnsOfFunction } from "./get-returns-of-function";
import { doesMatchHookName } from "../ast-tools/is-hook-call";
import { expandArrowFunctionToBlockStatement } from "../expand-arrow-function-to-block-statement";

export function findComponents(program: babel.NodePath<babel.types.Program>) {
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

      const nameMatchesComponentName = id && doesIdMatchComponentName(id.name);
      const nameMatchesHook = id && doesMatchHookName(id.name);

      if (!nameMatchesComponentName && !nameMatchesHook) {
        return;
      }

      expandArrowFunctionToBlockStatement(path);

      const returns = getReturnsOfFunction(path);

      if (returns.length === 0) {
        return;
      }

      if (nameMatchesHook) {
        components.push(
          new Component(path as babel.NodePath<babel.types.Function>)
        );
      }

      const allReturnsMatch = returns.every((ret) => {
        const argument = ret.get("argument");
        if (isComponentReturnType(argument.node)) {
          return true;
        }

        if (argument.isIdentifier()) {
          const binding = argument.scope.getBinding(argument.node.name);
          const variableDeclarator = binding?.path.find((bindingPath) =>
            bindingPath.isVariableDeclarator()
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
          new Component(path as babel.NodePath<babel.types.Function>)
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
