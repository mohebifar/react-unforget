import type * as babel from "@babel/core";
import { RightmostIdNotFound } from "../../errors/RightmostIdNotFound";
import { getRightmostIdName } from "../get-rightmost-id-name";
import { parse } from "../../testing";

const parseCodeAndRun = (code: string) => {
  const path = parse(code);
  return getRightmostIdName(
    (
      path.get(
        "body.0.declarations.0.init",
      ) as babel.NodePath<babel.types.Expression>
    ).node,
  );
};

describe("getRightmostIdName", () => {
  it("with basic identifier", () => {
    expect(parseCodeAndRun(`const val = foo`)).toStrictEqual("foo");
  });

  it("with member expression", () => {
    expect(parseCodeAndRun(`const val = foo.bar`)).toStrictEqual("bar");
  });

  it("with member expression and string literal", () => {
    expect(parseCodeAndRun(`const val = foo.bar["test"]`)).toStrictEqual(
      "test",
    );
  });

  it("with member expression and numeric literal", () => {
    expect(parseCodeAndRun(`const val = foo.bar["test"][2]`)).toStrictEqual(
      "2",
    );
  });

  it("throws when prop access is computed", () => {
    expect(() => parseCodeAndRun(`const val = foo.bar[myVar]`)).toThrow(
      RightmostIdNotFound,
    );
  });

  it("throws when prop access is not id-able", () => {
    expect(() => parseCodeAndRun(`const val = foo.bar[() => {}]`)).toThrow(
      RightmostIdNotFound,
    );
  });
});
