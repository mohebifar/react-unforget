import traverse from "@babel/traverse";
import { getReturnsOfFunction } from "./utils/get-returns-of-function";

function doesIdMatchComponentName(name: string) {
  return /^_?[A-Z][a-z0-9_]*+$/.test(name);
}

export function findComponent(program: babel.types.Program) {
  const components: babel.NodePath<babel.types.Function>[] = [];

  traverse(program, {
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

      if (id && !doesIdMatchComponentName(id.name)) {
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
        components.push(path);
      }
    },
  });

  return components;
}
