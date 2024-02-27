export function getBlockStatementsOfPath(
  path: babel.NodePath<babel.types.Statement>
): babel.NodePath<babel.types.BlockStatement>[] {
  if (path.isBlockStatement()) {
    return [path];
  }

  if (path.isIfStatement()) {
    const consequent = path.get("consequent");
    const alternate = path.get("alternate");

    if (consequent.isBlockStatement()) {
      return [consequent];
    }

    if (consequent.isIfStatement()) {
      return getBlockStatementsOfPath(consequent);
    }

    if (alternate && alternate.isBlockStatement()) {
      return [alternate];
    }

    if (alternate && alternate.isIfStatement()) {
      return getBlockStatementsOfPath(alternate);
    }
  }

  if (path.isWhileStatement()) {
    const body = path.get("body");

    if (body.isBlockStatement()) {
      return [body];
    }
  }

  if (path.isDoWhileStatement()) {
    const body = path.get("body");

    if (body.isBlockStatement()) {
      return [body];
    }
  }

  if (path.isForStatement()) {
    const body = path.get("body");

    if (body.isBlockStatement()) {
      return [body];
    }
  }

  if (path.isForInStatement()) {
    const body = path.get("body");

    if (body.isBlockStatement()) {
      return [body];
    }
  }

  if (path.isForOfStatement()) {
    const body = path.get("body");

    if (body.isBlockStatement()) {
      return [body];
    }
  }

  if (path.isSwitchStatement()) {
    const cases = path.get("cases");

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

  if (path.isTryStatement()) {
    const block = path.get("block");

    if (block.isBlockStatement()) {
      return [block];
    }
  }

  return [];
}
