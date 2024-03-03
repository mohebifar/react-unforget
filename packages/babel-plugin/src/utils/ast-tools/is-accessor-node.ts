import * as t from "@babel/types";

export type AccessorNode =
  | t.MemberExpression
  | t.OptionalMemberExpression
  | t.Identifier
  | t.PrivateName;

export function isAccessorNode(node: t.Node): node is AccessorNode {
  return (
    t.isMemberExpression(node) ||
    t.isOptionalMemberExpression(node) ||
    t.isIdentifier(node) ||
    t.isPrivateName(node)
  );
}
