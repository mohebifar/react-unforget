import type { ComponentSegment } from "~/models/segment/ComponentSegment";
import type { SegmentDependency } from "~/models/segment/SegmentDependency";

export function optimizeSegmentDependencies(dependencies: SegmentDependency[]) {
  const mapBySegment = new Map<ComponentSegment, SegmentDependency[]>();

  dependencies.forEach((dependency) => {
    const segment = dependency.segment;

    if (!mapBySegment.has(segment)) {
      mapBySegment.set(segment, []);
    }

    mapBySegment.get(segment)!.push(dependency);
  });

  const optimizedDependencies: SegmentDependency[] = [];

  mapBySegment.forEach((dependencies) => {
    const dependencyWithShortestString = dependencies.reduce(
      (shortest, current) => {
        if (shortest === null) {
          return current;
        }

        if (current.stringify().length < shortest.stringify().length) {
          return current;
        }

        return shortest;
      },
      null as SegmentDependency | null,
    );

    optimizedDependencies.push(dependencyWithShortestString!);
  });

  return optimizedDependencies;
  return optimizedDependencies.filter((dependency) =>
    dependency.segment.isTransformable(),
  );
}
