import * as t from "@babel/types";

// Convert a member expression to dot notation
// This is used to make an identifier from a member expression
export function memberExpressionToDotNotation(node: t.Expression) {
  // Recursive function to handle nested member expressions
  function traverse(node: t.Expression | t.PrivateName): string {
    if (node.type === "ThisExpression") {
      return "this";
    } else if (node.type === "Identifier") {
      // Base case: if the node is an identifier, prepend its name to the dotNotation string
      return node.name;
    } else if (t.isLiteral(node)) {
      switch (node.type) {
        case "StringLiteral":
          return `"${node.value}"`;
        case "BigIntLiteral":
          return `${node.value}n`;
        case "NullLiteral":
          return "null";
        case "TemplateLiteral":
          return `\`${node.quasis?.[0]?.value.raw}\``;
        case "RegExpLiteral":
          return `/${node.pattern}/${node.flags}`;
        default:
          return String(node.value);
      }
    } else if (node.type === "MemberExpression") {
      // Handle non-computed member expressions

      const propsPrefix = node.computed ? `[` : ".";
      const propsSuffix = node.computed ? `]` : "";

      const propsNotation = propsPrefix + traverse(node.property) + propsSuffix;

      return traverse(node.object) + propsNotation;
    }

    throw new Error("Node type not supported");
  }

  // Start the traversal with the given node
  return traverse(node);
}
