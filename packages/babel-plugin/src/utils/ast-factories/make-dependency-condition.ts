import * as t from "@babel/types";
import type { ComponentSegment } from "~/models/segment/ComponentSegment";
import { optimizeSegmentDependencies } from "../model-tools/optimize-segment-dependencies";

export function makeDependencyCondition(
  mutableSegment: ComponentSegment
): t.Expression | null {
  const dependencies = mutableSegment.getDependenciesForTransformation();

  const comparisonTuples = new Set<
    [left: babel.types.Expression, right: babel.types.Expression]
  >();

  const allDependencies = [...dependencies.values()];

  const optimizedDependencies = optimizeSegmentDependencies(allDependencies);

  optimizedDependencies.forEach((dependency) => {
    const name = dependency.segment.getDeclaredBinding()?.identifier.name;

    if (!name) {
      return;
    }

    comparisonTuples.add([
      dependency.getDependencyValueReadExpression(t.identifier(name)),
      dependency.getDependencyValueReadExpression(
        dependency.segment.getCacheValueAccessExpression()
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
