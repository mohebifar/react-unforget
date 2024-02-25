import * as t from "@babel/types";
import { ComponentVariable } from "~/classes/ComponentVariable";
import { isReferenceIdentifier } from "~/utils/is-reference-identifier";
import { memberExpressionToDotNotation } from "~/utils/member-expression-to-dot-notation";

export function makeDependencyCondition(componentVariable: ComponentVariable) {
  const dependencies = componentVariable.getDependencies();
  const isNotSetCondition =
    componentVariable.getCacheIsNotSetAccessExpression();

  const comparisonsMap = new Map<
    string,
    [babel.types.Expression, babel.types.Expression]
  >();

  dependencies.forEach((dependency) => {
    const dependencyId = t.identifier(dependency.name);

    // When the variable is used in a member expression, we should optimize comparisons to the last member of member expression as well
    const path = componentVariable.binding.path;
    const parentPath = path.find((p) => p.isStatement());

    const references = new Set<babel.NodePath<babel.types.Identifier>>();

    parentPath?.traverse({
      Identifier(innerPath) {
        if (isReferenceIdentifier(innerPath)) {
          references.add(innerPath);
        }
      },
    });

    references.forEach((reference) => {
      const refParent = reference.parentPath;
      const actualDependencyForThisReference =
        componentVariable.component.getComponentVariable(reference.node.name);

      // The reference is not a component variable
      if (!actualDependencyForThisReference) {
        return;
      }

      const dependencyCacheValueAccessor =
        actualDependencyForThisReference.getCacheValueAccessExpression();

      if (refParent.isMemberExpression()) {
        const memberObject = refParent.get("object");
        if (
          memberObject.isIdentifier() &&
          memberObject.node.name === dependencyId.name
        ) {
          const makeMemberExpressionForCheck = (id: babel.types.Expression) =>
            t.memberExpression(
              id,
              refParent.node.property,
              refParent.node.computed
            );

          const referenceMemberExpression = makeMemberExpressionForCheck(
            reference.node
          );
          const id = memberExpressionToDotNotation(referenceMemberExpression);

          if (!comparisonsMap.has(id)) {
            const cacheMemberExpression = makeMemberExpressionForCheck(
              dependencyCacheValueAccessor
            );
            comparisonsMap.set(id, [
              referenceMemberExpression,
              cacheMemberExpression,
            ]);
          }
        }
      } else {
        const id = memberExpressionToDotNotation(reference.node);

        if (!comparisonsMap.has(id)) {
          comparisonsMap.set(id, [
            reference.node,
            dependencyCacheValueAccessor,
          ]);
        }
      }
    });
  });

  return Array.from(comparisonsMap.values()).reduce(
    (condition, [left, right]) => {
      const binaryExpression = t.binaryExpression("!==", left, right);

      return t.logicalExpression("||", condition, binaryExpression);
    },
    isNotSetCondition as babel.types.Expression
  );
}
