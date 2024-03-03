export class CircularDependencyError extends Error {
  constructor(from: babel.NodePath, to: babel.NodePath) {
    super(
      "Circular dependency detected - from: " +
        from.toString() +
        " to: " +
        to.toString(),
    );
  }
}
