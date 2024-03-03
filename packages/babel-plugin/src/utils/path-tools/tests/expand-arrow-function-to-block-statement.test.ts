import type * as babel from "@babel/core";
import { parse } from "../../testing";
import { expandArrowFunctionToBlockStatement } from "../../expand-arrow-function-to-block-statement";

const parseCodeAndGetFirstDeclarator = (code: string) => {
  const path = parse(code);

  return [
    path.get(
      "body.0.declarations.0.init",
    ) as babel.NodePath<babel.types.ArrowFunctionExpression>,
    path,
  ] as const;
};

describe("expandArrowFunctionToBlockStatement", () => {
  it("expands inline return to a block statement", () => {
    const src = `const MyArrowFn = () => <div />;`;
    const expectedOutput = `const MyArrowFn = () => {
  return <div />;
};`;
    const [arrowFunction, program] = parseCodeAndGetFirstDeclarator(src);

    expandArrowFunctionToBlockStatement(arrowFunction);

    expect(String(program)).toStrictEqual(expectedOutput);
  });

  it("does not touch arrow function with block statement", () => {
    const src = `const MyArrowFn = () => {
  return <div />;
};`;
    const [arrowFunction, program] = parseCodeAndGetFirstDeclarator(src);

    expandArrowFunctionToBlockStatement(arrowFunction);

    expect(String(program)).toStrictEqual(src);
  });
});
