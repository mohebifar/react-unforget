import type * as babel from "@babel/core";
import type { Binding } from "@babel/traverse";

export function getReferencedVariablesInside(
  path: babel.NodePath<babel.types.Node>
) {
  const references = new Set<string>();

  path.traverse({
    Identifier(innerPath) {
      // Check if the identifier is a reference to a variable
      // Skip over keys in object properties, function/method names, etc.
      if (
        objectPropsCheck(innerPath) &&
        functionIdCheck(innerPath) &&
        classDeclarationCheck(innerPath) &&
        variableDeclaratorCheck(innerPath) &&
        memberExpressionCheck(innerPath)
      ) {
        references.add(innerPath.node.name);
      }
    },
  });

  const bindings: Binding[] = [];

  references.forEach((name) => {
    const binding = path.scope.getBinding(name);
    if (binding) {
      bindings.push(binding);
    }
  });

  return bindings;
}

function variableDeclaratorCheck(path: babel.NodePath<babel.types.Identifier>) {
  if (
    path.parentPath.isVariableDeclarator({
      id: path.node,
    })
  ) {
    return false;
  }

  // For array patterns and object patterns, we want to check if the identifier is part of the id not init
  const parentVariableDeclarator = path.findParent((p) =>
    p.isVariableDeclarator()
  );
  const parentVariableDeclaratorId = parentVariableDeclarator?.get("id") as
    | babel.NodePath<babel.types.Node>
    | undefined;

  return (
    !parentVariableDeclaratorId ||
    !path.isDescendant(parentVariableDeclaratorId)
  );
}

function memberExpressionCheck(path: babel.NodePath<babel.types.Identifier>) {
  return !path.parentPath.isMemberExpression({
    property: path.node,
    computed: false,
  });
}

function functionIdCheck(path: babel.NodePath<babel.types.Identifier>) {
  return (
    !path.parentPath.isFunctionDeclaration({
      id: path.node,
    }) &&
    !path.parentPath.isFunctionExpression({
      id: path.node,
    })
  );
}

function classDeclarationCheck(path: babel.NodePath<babel.types.Identifier>) {
  return !path.parentPath.isClassDeclaration({
    id: path.node,
  });
}

function objectPropsCheck(path: babel.NodePath<babel.types.Identifier>) {
  return (
    !path.parentPath.isClassProperty({
      key: path.node,
      computed: false,
    }) &&
    !path.parentPath.isObjectProperty({ key: path.node, computed: false }) &&
    !path.parentPath.isClassMethod({ key: path.node, computed: false }) &&
    !path.parentPath.isObjectMethod({ key: path.node, computed: false }) &&
    !path.parentPath.isClassPrivateProperty({
      key: path.node,
      computed: false,
    })
  );
}
