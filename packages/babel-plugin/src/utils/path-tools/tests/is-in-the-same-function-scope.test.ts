import type * as babel from "@babel/core";
import { isInTheSameFunctionScope } from "../is-in-the-same-function-scope";
import { parse } from "../../testing";

describe("isInTheSameFunctionScope", () => {
  it("basic example", () => {
    const path = parse(`
  function testFunction() {
    return true;
  }
  `);

    const testFn = path.get("body.0") as babel.NodePath<babel.types.Function>;
    const returnStatement = testFn.get(
      "body.body.0",
    ) as babel.NodePath<babel.types.ReturnStatement>;

    expect(isInTheSameFunctionScope(returnStatement, testFn)).toStrictEqual(
      true,
    );
  });

  it("with node in an if statement block", () => {
    const path = parse(`
function testFunction() {
  if (true) {
    return true;
  }
}
  `);

    const testFn = path.get("body.0") as babel.NodePath<babel.types.Function>;
    const returnStatement = testFn.get(
      "body.body.0.consequent.body.0",
    ) as babel.NodePath<babel.types.ReturnStatement>;

    expect(isInTheSameFunctionScope(returnStatement, testFn)).toStrictEqual(
      true,
    );
  });

  it("detects when a path is not in the same function scope immediately", () => {
    const path = parse(`
function testFunction() {
  const callback = () => {
    return 'foo';
  }
  if (true) {
    return true;
  }
}
  `);

    const testFn = path.get("body.0") as babel.NodePath<babel.types.Function>;
    const callbackFn = testFn.get(
      "body.body.0.declarations.0.init",
    ) as babel.NodePath<babel.types.ArrowFunctionExpression>;
    const returnStatementInCallback = callbackFn.get(
      "body.body.0",
    ) as babel.NodePath<babel.types.ReturnStatement>;

    const returnStatement = testFn.get(
      "body.body.1.consequent.body.0",
    ) as babel.NodePath<babel.types.ReturnStatement>;

    expect(isInTheSameFunctionScope(returnStatement, testFn)).toStrictEqual(
      true,
    );
    expect(
      isInTheSameFunctionScope(returnStatementInCallback, testFn),
    ).toStrictEqual(false);
    expect(
      isInTheSameFunctionScope(returnStatementInCallback, callbackFn),
    ).toStrictEqual(true);
  });
});
