import type { Component } from "./Component";

export interface Options {
  throwOnFailure?: boolean;
  skipComponents?: string[];
  skipComponentsWithMutation?: boolean;
  _debug_onComponentAnalysisFinished?: (component: Component) => void;
}

export function makeTransformationContext({
  throwOnFailure = true,
  skipComponents = [],
  skipComponentsWithMutation = false,
  _debug_onComponentAnalysisFinished,
}: Options = {}) {
  return {
    throwOnFailure,
    skipComponents,
    skipComponentsWithMutation,
    _debug_onComponentAnalysisFinished,
    shouldSkipComponent(componentName: string) {
      return skipComponents.includes(componentName);
    },
  };
}

export type TransformationContext = ReturnType<
  typeof makeTransformationContext
>;
