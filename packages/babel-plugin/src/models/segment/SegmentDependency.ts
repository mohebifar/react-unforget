import * as t from "@babel/types";
import type { AccessorNode } from "~/utils/ast-tools/is-accessor-node";
import { isAccessorNode } from "~/utils/ast-tools/is-accessor-node";
import type { ComponentSegment } from "./ComponentSegment";

/**
 * A singly linked list of member expressions
 */
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

// When the variable is used in a member expression, we should optimize comparisons to the last member of member expression as well
export class SegmentDependency {
  private root: AccessChainItem;

  constructor(
    public segment: ComponentSegment,
    public accessorNode: AccessorNode
  ) {
    let currentAccessChainItem: AccessChainItem | null = null;

    // Start from the root of member expression
    let currentAccessorNode: AccessorNode | null = accessorNode;

    let nextComputed = false;

    do {
      let newAccessChainItem: AccessChainItem | null = null;
      let currentComputed = false;

      if (
        t.isMemberExpression(currentAccessorNode) ||
        t.isOptionalMemberExpression(currentAccessorNode)
      ) {
        const property = currentAccessorNode.property;
        let name = "";

        currentComputed = currentAccessorNode.computed;

        if (t.isIdentifier(property)) {
          name = property.name;
        } else if (t.isStringLiteral(property)) {
          name = property.value;
          currentComputed = false;
        } else if (t.isNumericLiteral(property)) {
          name = property.value.toString();
          currentComputed = false;
        } else if (t.isPrivateName(property)) {
          name = "#" + property.id.name;
          currentComputed = false;
        } else if (t.isBigIntLiteral(property)) {
          name = property.value + "n";
          currentComputed = false;
        } else if (
          t.isTemplateLiteral(property) &&
          property.expressions.length === 0 &&
          property.quasis.length === 1
        ) {
          name = property.quasis[0]!.value.raw;
          currentComputed = false;
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

        newAccessChainItem.nextComputed = nextComputed;
      }

      nextComputed = currentComputed;

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

  equals(other: SegmentDependency) {
    return (
      this.segment === other.segment && this.stringify() === other.stringify()
    );
  }

  getDependencyValueReadExpression(newBaseObjectId: t.Expression) {
    let endOfChain: AccessChainItem | null = this.root;

    while (endOfChain.right) {
      if (endOfChain.nextComputed) {
        break;
      }
      endOfChain = endOfChain.right;
    }

    const endOfChainExpression = t.cloneNode(endOfChain.idExpression);

    if (
      t.isMemberExpression(endOfChainExpression) ||
      t.isOptionalMemberExpression(endOfChainExpression)
    ) {
      endOfChainExpression.object = newBaseObjectId;
      return endOfChainExpression;
    }

    return newBaseObjectId;
  }
}
