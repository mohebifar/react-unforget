import type * as babel from "@babel/core";
import { getReturnsOfFunction } from "./utils/get-returns-of-function";
import { Component } from "./classes/Component";

function doesIdMatchComponentName(name: string) {
  return /^_?[A-Z]/.test(name);
}

export function findComponents(program: babel.NodePath<babel.types.Program>) {
  const components: Component[] = [];

  program.traverse({
    Function(path) {
      let id: babel.types.Identifier | null | undefined = null;

      if (path.isFunctionDeclaration()) {
        id = path.node.id;
      }

      if (
        path.isFunctionExpression() &&
        path.parentPath.isVariableDeclarator()
      ) {
        const varIdPath = path.parentPath.get("id");
        if (varIdPath.isIdentifier()) {
          id = varIdPath.node;
        }
      }

      if (!id || !doesIdMatchComponentName(id.name)) {
        return;
      }

      const returns = getReturnsOfFunction(path);

      if (returns.length === 0) {
        return;
      }

      const allReturnsMatch = returns.every((ret) => {
        return (
          ret.get("argument").isNullLiteral() ||
          ret.get("argument").isJSXElement()
        );
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
