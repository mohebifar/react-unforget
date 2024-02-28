import * as t from "@babel/types";
import { ComponentVariable } from "./ComponentVariable";

type AccessorNode =
  | t.MemberExpression
  | t.OptionalMemberExpression
  | t.Identifier
  | t.PrivateName;

export class AccessChainItem {
  public nextComputed = false;
  public right?: AccessChainItem = undefined;

  constructor(
    public id: string,
    public idExpression: t.Expression
  ) {}

  toString() {
    let currentString = this.id;
    if (this.right) {
      currentString += this.nextComputed
        ? `[${this.right.toString()}]`
        : `.${this.right.toString()}`;
    }
    return currentString;
  }
}

function isAccessorNode(node: t.Node): node is AccessorNode {
  return (
    t.isMemberExpression(node) ||
    t.isOptionalMemberExpression(node) ||
    t.isIdentifier(node) ||
    t.isPrivateName(node)
  );
}

// When the variable is used in a member expression, we should optimize comparisons to the last member of member expression as well
export class ComponentSegmentDependency {
  private root: AccessChainItem;

  constructor(
    public componentVariable: ComponentVariable,
    public accessorNode: AccessorNode
  ) {
    let currentAccessChainItem: AccessChainItem | null = null;

    // Start from the root of member expression
    let currentAccessorNode: AccessorNode | null = accessorNode;

    do {
      let newAccessChainItem: AccessChainItem | null = null;

      if (
        t.isMemberExpression(currentAccessorNode) ||
        t.isOptionalMemberExpression(currentAccessorNode)
      ) {
        if (currentAccessChainItem) {
          currentAccessChainItem.nextComputed = currentAccessorNode.computed;
        }

        const property = currentAccessorNode.property;
        let name = "";

        if (t.isIdentifier(property)) {
          name = property.name;
        } else if (t.isStringLiteral(property)) {
          name = property.value;
        } else if (t.isNumericLiteral(property)) {
          name = property.value.toString();
        } else if (t.isPrivateName(property)) {
          name = "#" + property.id.name;
        } else if (t.isBigIntLiteral(property)) {
          name = property.value + "n";
        } else if (
          t.isTemplateLiteral(property) &&
          property.expressions.length === 0 &&
          property.quasis.length === 1
        ) {
          name = property.quasis[0]!.value.raw;
        }

        if (name) {
          newAccessChainItem = new AccessChainItem(name, currentAccessorNode);

          if (isAccessorNode(currentAccessorNode.object)) {
            currentAccessorNode = currentAccessorNode.object;
          } else {
            currentAccessorNode = null;
          }
        } else {
          currentAccessorNode = null;
        }
      } else if (t.isIdentifier(currentAccessorNode)) {
        newAccessChainItem = new AccessChainItem(
          currentAccessorNode.name,
          currentAccessorNode
        );

        currentAccessorNode = null;
      }

      if (newAccessChainItem) {
        if (currentAccessChainItem) {
          newAccessChainItem.right = currentAccessChainItem;
        }
      }

      currentAccessChainItem = newAccessChainItem;
    } while (currentAccessorNode);

    this.root = currentAccessChainItem!;
  }

  getRootDependencyLink() {
    return this.root;
  }

  stringify() {
    return this.root.toString();
  }

  equals(other: ComponentSegmentDependency) {
    return (
      this.componentVariable === other.componentVariable &&
      this.stringify() === other.stringify()
    );
  }

  getMemberExpression(replacementId: t.Expression) {
    let endOfChaing: AccessChainItem | null = this.root;

    while (endOfChaing.right) {
      endOfChaing = endOfChaing.right;
    }

    const endOfChainExpression = t.cloneNode(endOfChaing.idExpression);

    if (
      t.isMemberExpression(endOfChainExpression) ||
      t.isOptionalMemberExpression(endOfChainExpression)
    ) {
      endOfChainExpression.object = replacementId;
      return endOfChainExpression;
    }

    return replacementId;
  }
}
