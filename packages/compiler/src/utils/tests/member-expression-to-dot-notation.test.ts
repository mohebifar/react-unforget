import * as babel from "@babel/core";
import { memberExpressionToDotNotation } from "../member-expression-to-dot-notation";
import { parse } from "../testing";

function parseExpression(code: string) {
  const ast = parse(code);
  return (
    ast.get("body.0.expression") as babel.NodePath<babel.types.Expression>
  ).node;
}

describe("memberExpressionToDotNotation", () => {
  it("should handle Identifier", () => {
    const node = parseExpression("foo.bar");
    expect(memberExpressionToDotNotation(node)).toBe("foo.bar");
  });

  it("should handle Literal", () => {
    const node = parseExpression("foo[123]");
    expect(memberExpressionToDotNotation(node)).toBe("foo[123]");
  });

  it("should handle nested MemberExpression", () => {
    const node = parseExpression("foo.bar.baz");
    expect(memberExpressionToDotNotation(node)).toBe("foo.bar.baz");
  });

  it("should handle computed MemberExpression", () => {
    const node = parseExpression("foo[bar.baz]");
    expect(memberExpressionToDotNotation(node)).toBe("foo[bar.baz]");
  });

  it("should handle ThisExpression", () => {
    const node = parseExpression("this.foo");
    expect(memberExpressionToDotNotation(node)).toBe("this.foo");
  });

  it("should handle computed ThisExpression", () => {
    const node = parseExpression("this[foo]");
    expect(memberExpressionToDotNotation(node)).toBe("this[foo]");
  });

  it("should handle computed string literal", () => {
    const node = parseExpression("test['foo']");
    expect(memberExpressionToDotNotation(node)).toBe('test["foo"]');
  });

  it("should handle computed string template", () => {
    const node = parseExpression("test[`foo`]");
    expect(memberExpressionToDotNotation(node)).toBe("test[`foo`]");
  });

  it("should handle bigint literal", () => {
    const node = parseExpression("test[123n]");
    expect(memberExpressionToDotNotation(node)).toBe("test[123n]");
  });
});
