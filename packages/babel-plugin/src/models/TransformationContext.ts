export interface Options {
  throwOnFailure?: boolean;
  skipComponents?: string[];
  skipComponentsWithMutation?: boolean;
}

export function makeTransformationContext({
  throwOnFailure = true,
  skipComponents = [],
  skipComponentsWithMutation = false,
}: Options = {}) {
  return {
    throwOnFailure,
    skipComponents,
    skipComponentsWithMutation,
    shouldSkipComponent(componentName: string) {
      return skipComponents.includes(componentName);
    },
  };
}

export type TransformationContext = ReturnType<
  typeof makeTransformationContext
>;
