import * as t from "@babel/types";
import { ComponentMutableSegment } from "~/classes/ComponentMutableSegment";
import { isReferenceIdentifier } from "~/utils/is-reference-identifier";
import { memberExpressionToDotNotation } from "~/utils/member-expression-to-dot-notation";

export function makeDependencyCondition(
  mutableSegment: ComponentMutableSegment
): t.Expression | null {
  const dependencies = mutableSegment.getDependencies();
  const isNotSetCondition: t.Expression | null =
    mutableSegment.isComponentVariable()
      ? mutableSegment.getCacheIsNotSetAccessExpression()
      : null;

  const comparisonsMap = new Map<
    string,
    [babel.types.Expression, babel.types.Expression]
  >();

  const allDependencies = [
    ...dependencies.values(),
    // ...mutableSegment.getSideEffectDependencies(),
  ].filter((dependency) => dependency !== mutableSegment);

  allDependencies.forEach((dependency) => {
    if (!dependency.isComponentVariable()) {
      return;
    }

    const dependencyId = t.identifier(dependency.name);

    // When the variable is used in a member expression, we should optimize comparisons to the last member of member expression as well
    const path = mutableSegment.path;
    const parentPath = path.find((p) => p.isStatement());
    const componentScope = parentPath?.scope;

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
        mutableSegment.component.getComponentVariable(reference.node.name);

      // The reference is not a component variable
      if (!actualDependencyForThisReference) {
        return;
      }

      const dependencyCacheValueAccessor =
        actualDependencyForThisReference.getCacheValueAccessExpression();

      const makeSimpleIdComparison = () => {
        const id = memberExpressionToDotNotation(reference.node);

        if (!comparisonsMap.has(id)) {
          comparisonsMap.set(id, [
            reference.node,
            dependencyCacheValueAccessor,
          ]);
        }
      };

      if (refParent.isMemberExpression()) {
        const memberObject = refParent.get("object");
        const memberProperty = refParent.get("property");

        if (
          memberObject.isIdentifier() &&
          memberObject.node.name === dependencyId.name
        ) {
          const parentOfMemberExpression = refParent.parentPath;
          // When member expression is used in a call expression, we should ignore it
          // This is because this can be a prototype method call and the object not being bound to the method can cause problems
          if (parentOfMemberExpression.isCallExpression()) {
            return makeSimpleIdComparison();
          }

          let mustSkipDueToMismatchProperty = false;
          const checkIdForMismatchingVariableReference = (
            innerPath: babel.NodePath<babel.types.Identifier>,
            skipOnMismatch = false
          ) => {
            const parent = innerPath.parentPath;

            if (!parent.isMemberExpression()) {
              return;
            }

            if (
              parent.node.computed &&
              parent.scope.getOwnBinding(innerPath.node.name) !==
                componentScope?.getOwnBinding(innerPath.node.name)
            ) {
              mustSkipDueToMismatchProperty = true;
              if (skipOnMismatch) {
                innerPath.skip();
              }
            }
          };

          if (memberProperty.isIdentifier()) {
            checkIdForMismatchingVariableReference(memberProperty);
          }

          memberProperty.traverse({
            Identifier: (innerPath) =>
              checkIdForMismatchingVariableReference(innerPath, true),
          });

          if (mustSkipDueToMismatchProperty) {
            return makeSimpleIdComparison();
          }

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
        return makeSimpleIdComparison();
      }
    });
  });

  return Array.from(comparisonsMap.values()).reduce(
    (condition, [left, right]) => {
      const binaryExpression = t.binaryExpression("!==", left, right);

      return condition
        ? t.logicalExpression("||", condition, binaryExpression)
        : binaryExpression;
    },
    isNotSetCondition as babel.types.Expression | null
  );
}
