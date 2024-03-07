import type { ComponentSegment } from "~/models/segment/ComponentSegment";
import { CircularDependencyError } from "~/utils/errors/CircularDependencyError";

type StatementPath = babel.NodePath<babel.types.Statement>;

export function reorderByTopology(
  statements: StatementPath[] | Set<StatementPath>,
  map: Map<StatementPath, ComponentSegment>
) {
  const stack: StatementPath[] = [];
  const visited = new Set<StatementPath>();
  const recursionStack = new Set<StatementPath>();

  function dfs(statement: StatementPath) {
    if (visited.has(statement)) {
      return;
    }

    visited.add(statement);
    recursionStack.add(statement);

    const dependencies = map.get(statement)?.getDirectDependencies();

    // Visit all the dependent nodes
    dependencies?.forEach(({ segment }) => {
      const dependencyStatement = segment.getPathAsStatement();

      // If the dependent node is in the recursion stack, we have a cycle
      if (dependencyStatement === statement) {
        return;
      }

      if (recursionStack.has(dependencyStatement)) {
        throw new CircularDependencyError(statement, dependencyStatement);
      }

      dfs(dependencyStatement);
    });

    stack.push(statement);
    recursionStack.delete(statement);
  }

  statements.forEach((statement) => {
    if (map.get(statement)?.getDirectDependencies().size === 0) {
      stack.push(statement);
      visited.add(statement);
    }
  });

  statements.forEach((statement) => {
    if (!visited.has(statement)) {
      dfs(statement);
    }
  });

  return stack;
}
