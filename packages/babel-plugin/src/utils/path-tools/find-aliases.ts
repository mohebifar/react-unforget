import type { Binding } from "@babel/traverse";
import * as t from "@babel/types";

export function findAliases(
  nodePath: babel.NodePath,
  filterFn: (path: babel.NodePath) => boolean,
) {
  const map = new Map<string, Binding[]>();

  nodePath.traverse({
    AssignmentExpression(assignmentPath) {
      const left = assignmentPath.get("left");
      const right = assignmentPath.get("right");
      if (!left.isIdentifier()) return;
      const name = left.node.name;
      map.set(name, extractAliasesFromRight(right, filterFn));
    },
    VariableDeclarator(declaratorPath) {
      const id: babel.NodePath = declaratorPath.get("id");
      const init = declaratorPath.get("init");

      if (!init.isExpression()) return;

      const name = t.isIdentifier(id.node) ? id.node.name : "unknown";

      map.set(name, extractAliasesFromRight(init, filterFn));
    },
  });

  return map;
}

function extractAliasesFromRight(
  nodePath: babel.NodePath<t.Expression>,
  filterFn: (path: babel.NodePath) => boolean,
) {
  const aliases: Binding[] = [];

  const handleFunction = (fn: babel.NodePath<t.Function>) => {
    const returnExpressions: babel.NodePath<t.Expression>[] = [];
    const body = fn.get("body");
    if (body.isBlockStatement()) {
      fn.traverse({
        ReturnStatement(returnPath) {
          const argumentPath = returnPath.get("argument");
          if (argumentPath.isExpression()) {
            returnExpressions.push(argumentPath);
          }
        },
      });
    } else if (body.isExpression()) {
      returnExpressions.push(body);
    }

    returnExpressions.forEach((returnExpression) => {
      handleExpression(returnExpression);
    });
  };

  const handleExpression = (expressionPath: babel.NodePath<t.Expression>) => {
    if (!expressionPath) return;

    switch (true) {
      case expressionPath.isIdentifier():
        // Direct alias
        const binding = nodePath.scope.getBinding(expressionPath.node.name);

        if (!binding || !filterFn(binding.path)) return;

        aliases.push(binding);
        // Check if this identifier is bound to a function, then evaluate that function
        const bindingPath = binding.path;
        if (bindingPath.isVariableDeclarator()) {
          const initPath = bindingPath.get("init");
          if (initPath.isExpression()) {
            handleExpression(initPath);
          }
        }
        break;
      case expressionPath.isCallExpression():
        // Evaluate the call expression to see if it returns a direct reference
        const calleePath = expressionPath.get("callee");
        if (calleePath.isIdentifier()) {
          const calleeBinding = nodePath.scope.getBinding(calleePath.node.name);
          if (calleeBinding && calleeBinding.path) {
            const calleePath = calleeBinding.path;

            let fn: babel.NodePath<t.Function> | null = null;

            if (calleePath.isFunction()) {
              fn = calleePath;
            }

            if (calleePath.isVariableDeclarator()) {
              const init = calleePath.get("init");
              if (init.isFunction()) {
                fn = init;
              }
            }

            if (fn) {
              handleFunction(fn);
            }
          }
        } else if (calleePath.isFunction()) {
          handleFunction(calleePath);
        }
        break;
      case expressionPath.isConditionalExpression():
        handleExpression(expressionPath.get("consequent"));
        handleExpression(expressionPath.get("alternate"));
        break;
      case expressionPath.isLogicalExpression():
        {
          if (expressionPath.node.operator === "&&") {
            handleExpression(expressionPath.get("right"));
          } else {
            handleExpression(expressionPath.get("left"));
            handleExpression(expressionPath.get("right"));
          }
        }
        break;
    }
  };

  handleExpression(nodePath);

  return aliases;
}
