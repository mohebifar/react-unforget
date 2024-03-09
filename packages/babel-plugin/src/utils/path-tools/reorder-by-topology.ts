import type { ComponentSegment } from "~/models/segment/ComponentSegment";
import { CircularDependencyError } from "~/utils/errors/CircularDependencyError";

type StatementPath = babel.NodePath<babel.types.Statement>;

export function reorderByTopology(
  statements: StatementPath[],
  map: Map<babel.NodePath, ComponentSegment>
) {
  const stack: StatementPath[] = [];
  const visited = new Set<babel.NodePath>();
  const recursionStack = new Set<babel.NodePath>();

  function dfs(statement: babel.NodePath) {
    if (visited.has(statement)) {
      return;
    }

    visited.add(statement);
    recursionStack.add(statement);

    const dependencies = map.get(statement)?.getDependenciesForTransformation();

    // Visit all the dependent nodes
    dependencies?.forEach(({ segment }) => {
      const dependencyStatement = segment.getPath();

      // If the dependent node is in the recursion stack, we have a cycle
      if (dependencyStatement === statement) {
        return;
      }

      if (recursionStack.has(dependencyStatement)) {
        throw new CircularDependencyError(statement, dependencyStatement);
      }

      dfs(dependencyStatement);
    });

    if (statements.includes(statement as StatementPath)) {
      stack.push(statement as StatementPath);
    }
    recursionStack.delete(statement);
  }

  statements.forEach((statement) => {
    if (map.get(statement)?.getDependenciesForTransformation().size === 0) {
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
