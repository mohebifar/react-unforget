import * as t from "@babel/types";
import type { ComponentMutableSegment } from "~/models/ComponentMutableSegment";

export function makeDependencyCondition(
  mutableSegment: ComponentMutableSegment
): t.Expression | null {
  const dependencies = mutableSegment.getDependenciesForTransformation();

  const eligibleForConditionalRun = Array.from(dependencies.values()).every(
    (dependency) => !dependency.componentVariable.isForLoopArgumentVariable()
  );

  if (!eligibleForConditionalRun) {
    return null;
  }

  const comparisonTuples = new Set<
    [left: babel.types.Expression, right: babel.types.Expression]
  >();

  const allDependencies = [...dependencies.values()];

  allDependencies.forEach((dependency) => {
    const dependencyId = dependency.componentVariable
      ? t.identifier(dependency.componentVariable.name)
      : null;

    if (!dependencyId) {
      return;
    }

    comparisonTuples.add([
      dependency.getMemberExpression(
        t.identifier(dependency.componentVariable.name)
      ),
      dependency.getMemberExpression(
        dependency.componentVariable.getCacheValueAccessExpression()
      ),
    ]);
  });

  const isNotSetCondition: t.Expression | null =
    mutableSegment.isComponentVariable()
      ? mutableSegment.getCacheIsNotSetAccessExpression()
      : null;

  return Array.from(comparisonTuples.values()).reduce(
    (condition, [left, right]) => {
      const binaryExpression = t.binaryExpression("!==", left, right);

      return condition
        ? t.logicalExpression("||", condition, binaryExpression)
        : binaryExpression;
    },
    isNotSetCondition as babel.types.Expression | null
  );
}
