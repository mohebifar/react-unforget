import { Scope } from "@babel/traverse";

type ControlFlowStatement =
  | babel.NodePath<babel.types.IfStatement>
  | babel.NodePath<babel.types.WhileStatement>
  | babel.NodePath<babel.types.DoWhileStatement>
  | babel.NodePath<babel.types.ForStatement>
  | babel.NodePath<babel.types.ForXStatement>
  | babel.NodePath<babel.types.TryStatement>;

export function getArgumentOfControlFlowStatement(
  statement: babel.NodePath<babel.types.Statement>
) {
  if (statement.isIfStatement()) {
    return statement.get("test");
  }

  if (statement.isWhileStatement()) {
    return statement.get("test");
  }

  if (statement.isDoWhileStatement()) {
    return statement.get("test");
  }

  if (statement.isForStatement()) {
    return statement.get("test") as babel.NodePath<babel.types.Expression>;
  }

  if (statement.isForOfStatement()) {
    return statement.get("right");
  }

  if (statement.isForInStatement()) {
    return statement.get("right");
  }

  return null;
}

export function isControlFlowStatement(
  statement: babel.NodePath
): statement is ControlFlowStatement {
  return (
    statement.isIfStatement() ||
    statement.isWhileStatement() ||
    statement.isDoWhileStatement() ||
    statement.isForStatement() ||
    statement.isForXStatement() ||
    statement.isTryStatement()
  );
}

export function getControlFlowBodies(
  statement: babel.NodePath<babel.types.Statement>
) {
  if (statement.isTryStatement()) {
    const block = statement.get("block");

    if (block.isBlockStatement()) {
      return [block];
    }
  }

  if (statement.isSwitchStatement()) {
    const cases = statement.get("cases");

    const blockStatements: babel.NodePath<babel.types.BlockStatement>[] = [];

    cases.forEach((c) => {
      const consequent = c.get("consequent");

      if (consequent.length > 0) {
        consequent.forEach((consequentStatement) => {
          if (consequentStatement.isBlockStatement()) {
            blockStatements.push(consequentStatement);
          }
        });
      }
    });

    return blockStatements;
  }

  if (statement.isIfStatement()) {
    const alternate = statement.get("alternate");
    const consequent = statement.get("consequent");

    return [consequent].concat(alternate.isStatement() ? [alternate] : []);
  }

  // I had to repeat the if statement here because of an issue in the type guarding
  if (statement.isWhileStatement()) {
    return [statement.get("body")];
  }

  if (statement.isDoWhileStatement()) {
    return [statement.get("body")];
  }

  if (statement.isForStatement()) {
    return [statement.get("body")];
  }

  if (statement.isForXStatement()) {
    return [statement.get("body")];
  }

  return [];
}

export function getBlockStatementsOfPath(
  path: babel.NodePath<babel.types.Statement>
) {
  const bodies = getControlFlowBodies(path);

  return bodies.filter(
    (body): body is babel.NodePath<babel.types.BlockStatement> => {
      return body.isBlockStatement();
    }
  );
}

export function isChildOfScope(parent: Scope, child: Scope) {
  let currentScope = child;

  while (currentScope) {
    if (currentScope === parent) {
      return true;
    }

    currentScope = currentScope.parent;
  }

  return false;
}
export function getParentBlockStatement(path: babel.NodePath) {
  return path.findParent((p) =>
    p.isBlockStatement()
  ) as babel.NodePath<babel.types.BlockStatement> | null;
}

export function isForStatementInit(
  potentialInit: babel.NodePath<babel.types.Node>
) {
  const forParent = potentialInit.findParent((p) =>
    p.isForStatement()
  ) as babel.NodePath<babel.types.ForStatement> | null;

  if (!forParent) {
    return false;
  }

  const variableDeclaration = potentialInit.findParent((p) =>
    p.isVariableDeclaration()
  ) as babel.NodePath<babel.types.VariableDeclaration> | null;

  if (!variableDeclaration) {
    return false;
  }

  return variableDeclaration === forParent.get("init");
}
