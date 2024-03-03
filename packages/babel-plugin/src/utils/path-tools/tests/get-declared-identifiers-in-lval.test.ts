import type * as babel from "@babel/core";
import { getDeclaredIdentifiersInLVal } from "../get-declared-identifiers-in-lval";
import { parse } from "../../testing";

const parseCodeAndRun = (code: string) => {
  const path = parse(code);
  return getDeclaredIdentifiersInLVal(
    path.get("body.0.declarations.0.id") as babel.NodePath<babel.types.LVal>,
  );
};

describe("getDeclaredIdentifiersInLVal", () => {
  it("with basic identifier", () => {
    const ids = parseCodeAndRun(`const myVariable = 2;`);

    expect(ids).toStrictEqual(["myVariable"]);
  });

  it("with array pattern", () => {
    const ids = parseCodeAndRun(`const [a, b, [c]] = useValue();`);

    expect(ids).toStrictEqual(["a", "b", "c"]);
  });

  it("with array pattern and default value assignment", () => {
    const ids = parseCodeAndRun(`const [a, b = z, [c = d]] = useValue();`);

    expect(ids).toStrictEqual(["a", "b", "c"]);
  });

  it("with object pattern", () => {
    const ids = parseCodeAndRun(`const {a, b, c} = useValue();`);

    expect(ids).toStrictEqual(["a", "b", "c"]);
  });

  it("with object pattern and default value assignment", () => {
    const ids = parseCodeAndRun(`const {a, b = z, c = d} = useValue();`);

    expect(ids).toStrictEqual(["a", "b", "c"]);
  });

  it("ultimate example", () => {
    const ids = parseCodeAndRun(
      `const [
        a,
        b = z,
        [c = d],
        {
            testKey1: testValue = defaultVal,
            testKey2,
            testValue3: [l, m, n]}
        ] = useValue();`,
    );

    expect(ids).toStrictEqual([
      "a",
      "b",
      "c",
      "testValue",
      "testKey2",
      "l",
      "m",
      "n",
    ]);
  });
});
