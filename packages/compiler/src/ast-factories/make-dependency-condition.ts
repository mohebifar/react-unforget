import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { ComponentVariable } from "~/classes/ComponentVariable";

export function makeDependencyCondition(
  dependencies: ComponentVariable[],
  isNotSetCondition: t.Expression
) {
  return dependencies.reduce((condition, dependency) => {
    const id = t.identifier(dependency.name);
    const binaryExpression = t.binaryExpression(
      "!==",
      dependency.getCacheValueAccessExpression(),
      id
    );

    return t.logicalExpression("||", condition, binaryExpression);
  }, isNotSetCondition as babel.types.Expression);
}
