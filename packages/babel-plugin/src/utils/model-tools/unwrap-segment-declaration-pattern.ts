import type { Binding, Scope } from "@babel/traverse";
import * as t from "@babel/types";
import {
  ComponentSegmentFlags,
  type ComponentSegment,
} from "~/models/segment/ComponentSegment";
import { unwrapPatternAssignment } from "../micro-transformers/unwrap-pattern-assignment";
import {
  DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME,
  DEFAULT_UNWRAPPED_VARIABLE_NAME,
} from "../constants";
import { preserveReferences } from "../scope-tools/preserve-references";

/**
 * This method unwraps the declaration node if it is an object pattern or array pattern
 */
export function unwrapSegmentDeclarationPattern(thisSegment: ComponentSegment) {
  if (thisSegment.hasUnwrappedVariableDeclaration()) {
    return [thisSegment];
  }

  const markAsUnwrapped = (segment: ComponentSegment = thisSegment) =>
    segment.setFlag(ComponentSegmentFlags.UNWRAPPED_VARIABLE_DECLARATION);

  const thisPath: babel.NodePath = thisSegment.getPath();

  if (thisSegment.isVariableDeclaration()) {
    thisPath.assertVariableDeclaration();

    const forStatementInitOldAndNewMap = new Map<string, string>();

    const currentKind = thisPath.node.kind;
    const variableDeclarators = thisPath.get("declarations");
    const isInForStatementInit = thisPath.parentPath?.isForStatement();

    if (
      variableDeclarators.length === 1 &&
      t.isIdentifier(variableDeclarators.at(0)?.node.id) &&
      !isInForStatementInit
    ) {
      markAsUnwrapped();
      return [thisSegment];
    }

    thisSegment.destroy(true);

    const pathToInsertBefore = isInForStatementInit
      ? thisPath.parentPath!
      : thisPath;

    let restoreBindings: ((newScope?: Scope) => void)[] = [];

    const createdPathsAndBindings = variableDeclarators.flatMap(
      (
        declarator,
        index,
      ): [
        binding: Binding | null,
        path: babel.NodePath,
        isVariableUnwrapper: boolean,
      ][] => {
        const isLastDeclarator = index === variableDeclarators.length - 1;
        const oldIdPath = declarator.get("id");
        const oldInitNode = declarator.get("init").node;

        let unwrappedItems = unwrapPatternAssignment(oldIdPath, oldInitNode);
        let intermediateBinding: Binding | undefined = undefined;
        let intermediateVariableDeclarationPath: babel.NodePath<t.VariableDeclaration> | null =
          null;

        if (unwrappedItems.length > 1) {
          const intermediateId = oldInitNode
            ? thisPath.scope.generateUidIdentifier(
                DEFAULT_UNWRAPPED_VARIABLE_NAME,
              )
            : null;

          unwrappedItems = unwrapPatternAssignment(
            oldIdPath,
            oldInitNode,
            intermediateId,
          );

          if (intermediateId) {
            [intermediateVariableDeclarationPath] =
              pathToInsertBefore.insertBefore(
                t.variableDeclaration("const", [
                  t.variableDeclarator(intermediateId, oldInitNode),
                ]),
              );

            const scope = pathToInsertBefore.find((p) =>
              p.isBlockStatement(),
            )?.scope;

            scope?.registerDeclaration(intermediateVariableDeclarationPath);

            intermediateBinding = scope?.getBinding(intermediateId.name);
          }
        }

        const createdPathsForDeclarator: [Binding, babel.NodePath, boolean][] =
          intermediateVariableDeclarationPath && intermediateBinding
            ? [[intermediateBinding, intermediateVariableDeclarationPath, true]]
            : [];

        let createdNodesForPatternElements = unwrappedItems.map(
          (unwrappedItem) =>
            t.variableDeclaration(currentKind, [
              t.variableDeclarator(unwrappedItem.id, unwrappedItem.value),
            ]),
        );

        restoreBindings = restoreBindings.concat(
          unwrappedItems.flatMap(({ binding }) =>
            binding ? [preserveReferences(binding)] : [],
          ),
        );

        let createdPathsForPatternElements: babel.NodePath<t.VariableDeclaration>[] =
          [];

        if (isInForStatementInit) {
          createdNodesForPatternElements = createdNodesForPatternElements.map(
            (node) => {
              const newId = pathToInsertBefore.scope.generateUidIdentifier(
                DEFAULT_UNWRAPPED_VARIABLE_NAME,
              );
              const currentDeclaration = node.declarations[0]!;
              const oldName = (currentDeclaration?.id as t.Identifier).name;

              forStatementInitOldAndNewMap.set(oldName, newId.name);

              currentDeclaration.id = newId;
              return node;
            },
          );
        }

        const names = createdNodesForPatternElements.map((node) => {
          const declaration = node.declarations[0]!;
          return (declaration.id as t.Identifier).name;
        });

        if (isInForStatementInit || !isLastDeclarator) {
          createdPathsForPatternElements = pathToInsertBefore.insertBefore(
            createdNodesForPatternElements,
          );
        } else {
          createdPathsForPatternElements =
            pathToInsertBefore.replaceWithMultiple(
              createdNodesForPatternElements,
            );
        }

        createdPathsForPatternElements.forEach((newPath) => {
          const newDeclarator = newPath.get(
            "declarations.0",
          ) as babel.NodePath<t.VariableDeclarator>;

          newPath.scope.registerDeclaration(newPath);

          const scope = intermediateBinding?.scope ?? thisPath.scope;
          const binding = scope.getOwnBinding(
            (newDeclarator.node.id as t.Identifier).name,
          );

          if (binding) {
            binding.path = newDeclarator;
          }

          intermediateBinding?.reference(newPath);

          return newPath;
        });

        return createdPathsForDeclarator.concat(
          createdPathsForPatternElements.map((newPath, i) => {
            const binding = newPath.scope.getBinding(names[i]!)!;

            return [binding, newPath, false] as const;
          }),
        );
      },
    );

    let pathNeedingForInitFlag: babel.NodePath | null = null;

    if (isInForStatementInit) {
      const oldToNewMapEntries = Array.from(
        forStatementInitOldAndNewMap.entries(),
      );

      const [newForInitPath] = thisPath.replaceWith(
        t.variableDeclaration(
          "let",
          oldToNewMapEntries.map(([oldId, newId]) =>
            t.variableDeclarator(t.identifier(oldId), t.identifier(newId)),
          ),
        ),
      );

      thisPath.scope.registerDeclaration(newForInitPath);

      oldToNewMapEntries.forEach(([, newId]) => {
        const bindingWithNewId = thisPath.parentPath.scope.getBinding(newId);

        if (!bindingWithNewId) {
          throw new Error("Binding not found");
        }
        bindingWithNewId?.reference(newForInitPath);
      });

      pathNeedingForInitFlag = newForInitPath;

      createdPathsAndBindings.push([null, newForInitPath, true]);
    }

    const newSegments = createdPathsAndBindings.map(
      ([binding, newPath, isUnwrapper]) => {
        const newSegment =
          thisSegment.component.createComponentSegment(newPath);
        if (isUnwrapper) {
          newSegment.setFlag(ComponentSegmentFlags.IS_UNWRAPPER);
        }
        if (newPath === pathNeedingForInitFlag) {
          newSegment.setFlag(ComponentSegmentFlags.IS_FOR_INIT);
        }
        if (binding) {
          newSegment.binding = binding;
        }
        markAsUnwrapped(newSegment);
        newSegment.analyze();

        return newSegment;
      },
    );

    return newSegments;
  } else if (thisPath.isFunctionDeclaration()) {
    const variableDeclaration = t.variableDeclaration("var", [
      t.variableDeclarator(
        thisPath.node.id as t.Identifier,
        t.functionExpression(
          thisPath.node.id as t.Identifier,
          thisPath.node.params,
          thisPath.node.body,
          thisPath.node.generator,
          thisPath.node.async,
        ),
      ),
    ]);

    const [newPath] = thisPath.replaceWith(variableDeclaration);
    thisSegment._unsafe_setPath(newPath);
    return [thisSegment];
  } else if (thisSegment.isFlagSet(ComponentSegmentFlags.IS_ARGUMENT)) {
    if (!thisPath.isPattern()) {
      return [thisSegment];
    }

    const intermediateId = t.identifier(DEFAULT_UNWRAPPED_PROPS_VARIABLE_NAME);

    const unwrappedItems = unwrapPatternAssignment(
      thisPath,
      null,
      intermediateId,
    );

    const restoreBindings = unwrappedItems.flatMap(({ binding }) =>
      binding ? [preserveReferences(binding)] : [],
    );

    const [newPath] = thisPath.replaceWith(intermediateId);
    thisSegment._unsafe_setPath(newPath);

    newPath.scope.registerBinding("param", newPath);

    const newParamBinding = newPath.scope.getBinding(intermediateId.name)!;

    const newDeclarations = unwrappedItems.map((unwrappedItem) =>
      t.variableDeclaration("let", [
        t.variableDeclarator(unwrappedItem.id, unwrappedItem.value),
      ]),
    );

    const componentBody = thisSegment.component.getFunctionBody();
    const createdPaths = componentBody.unshiftContainer(
      "body",
      newDeclarations,
    );

    createdPaths.forEach((newPath) => {
      newParamBinding.reference(newPath);
      thisPath.scope.registerDeclaration(newPath);
    });

    restoreBindings.forEach((restoreBinding) => restoreBinding());
    markAsUnwrapped();

    return [
      thisSegment,
      ...createdPaths.map((newPath) => {
        const newSegment =
          thisSegment.component.createComponentSegment(newPath);
        markAsUnwrapped(newSegment);
        newSegment.analyze();

        return newSegment;
      }),
    ];
  }
}
