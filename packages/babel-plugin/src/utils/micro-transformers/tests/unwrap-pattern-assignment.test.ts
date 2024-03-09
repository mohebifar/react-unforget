import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { generate, parse } from "../../testing";
import { unwrapPatternAssignment } from "../unwrap-pattern-assignment";

const parseCodeAndRun = (code: string, newReplacement?: t.Expression) => {
  const path = parse(code);
  const newAst = unwrapPatternAssignment(
    path.get("body.0.declarations.0.id") as babel.NodePath<babel.types.LVal>,
    (
      path.get(
        "body.0.declarations.0.init",
      ) as babel.NodePath<babel.types.Expression>
    ).node,
    newReplacement,
  );

  const newAstWithVarDeclaration = newAst.map((entry) => {
    return t.variableDeclaration("const", [
      t.variableDeclarator(entry.id, entry.value),
    ]);
  });

  return generate(t.program(newAstWithVarDeclaration));
};

describe("unwrapPatternAssignment", () => {
  it("with basic identifier", () => {
    expect(parseCodeAndRun(`const val = foo;`)).toStrictEqual(
      `const val = foo;`,
    );
  });

  describe("with array pattern", () => {
    it("basic", () => {
      expect(parseCodeAndRun(`const [a] = foo;`)).toStrictEqual(
        `const a = foo[0];`,
      );
    });

    it("with value assignment", () => {
      expect(parseCodeAndRun(`const [a = 1] = foo;`)).toStrictEqual(
        `const a = foo[0] === void 0 ? 1 : foo[0];`,
      );
    });

    it("with multiple items", () => {
      expect(parseCodeAndRun(`const [a, b, c] = foo;`)).toStrictEqual(
        `const a = foo[0];
const b = foo[1];
const c = foo[2];`,
      );
    });

    it("with rest element", () => {
      expect(parseCodeAndRun(`const [a, b, ...rest] = foo;`)).toStrictEqual(
        `const a = foo[0];
const b = foo[1];
const [_unused, _unused2, ...rest] = foo;`,
      );
    });
  });

  describe("with object pattern", () => {
    it("with basic object pattern", () => {
      expect(parseCodeAndRun(`const {a} = foo;`)).toStrictEqual(
        `const a = foo.a;`,
      );
    });

    it("pattern and default value assignment", () => {
      expect(parseCodeAndRun(`const {a = 1} = foo;`)).toStrictEqual(
        `const a = foo.a === void 0 ? 1 : foo.a;`,
      );
    });

    it("pattern with multiple item accesses", () => {
      expect(parseCodeAndRun(`const {a, b, c} = foo;`)).toStrictEqual(
        `const a = foo.a;
const b = foo.b;
const c = foo.c;`,
      );
    });

    it("pattern with different custom key assignment", () => {
      expect(parseCodeAndRun(`const {a, b, c: d} = foo;`)).toStrictEqual(
        `const a = foo.a;
const b = foo.b;
const d = foo.c;`,
      );
    });

    it("pattern with different custom key assignment using string literal", () => {
      expect(
        parseCodeAndRun(`const {a, b, "aria-label": d} = foo;`),
      ).toStrictEqual(
        `const a = foo.a;
const b = foo.b;
const d = foo["aria-label"];`,
      );
    });

    it("pattern with different custom key assignment using any computed value", () => {
      expect(parseCodeAndRun(`const {a, b, [myVar]: d} = foo;`)).toStrictEqual(
        `const a = foo.a;
const b = foo.b;
const d = foo[myVar];`,
      );
    });

    it("with rest element", () => {
      expect(parseCodeAndRun(`const {a, ...rest} = foo;`)).toStrictEqual(
        `const a = foo.a;
const {
  a: _unused,
  ...rest
} = foo;`,
      );
    });
  });

  describe("complex combinations", () => {
    it("with complex array pattern and object pattern", () => {
      expect(
        parseCodeAndRun(`const [{a, b, c}, {d}, [{"key": e}]] = foo;`),
      ).toStrictEqual(
        `const a = foo[0].a;
const b = foo[0].b;
const c = foo[0].c;
const d = foo[1].d;
const e = foo[2][0]["key"];`,
      );
    });
  });

  it("with complex array pattern and object pattern and default assignment", () => {
    expect(
      parseCodeAndRun(`const [{a, b, c}, {d}, [{"key": e = 2}]] = foo;`),
    ).toStrictEqual(
      `const a = foo[0].a;
const b = foo[0].b;
const c = foo[0].c;
const d = foo[1].d;
const e = foo[2][0]["key"] === void 0 ? 2 : foo[2][0]["key"];`,
    );
  });

  describe("with base replacement", () => {
    it("with basic identifier", () => {
      expect(
        parseCodeAndRun(`const val = foo;`, t.identifier("bar")),
      ).toStrictEqual(`const val = bar;`);
    });

    it("with array pattern", () => {
      expect(
        parseCodeAndRun(`const [a] = foo;`, t.identifier("bar")),
      ).toStrictEqual(`const a = bar[0];`);
    });

    it("with object pattern", () => {
      expect(
        parseCodeAndRun(`const {a} = foo;`, t.identifier("bar")),
      ).toStrictEqual(`const a = bar.a;`);
    });

    it("with complex array pattern and object pattern", () => {
      expect(
        parseCodeAndRun(
          `const [{a, b, c}, {d}, [{"key": e}]] = foo;`,
          t.identifier("bar"),
        ),
      ).toStrictEqual(`const a = bar[0].a;
const b = bar[0].b;
const c = bar[0].c;
const d = bar[1].d;
const e = bar[2][0]["key"];`);
    });
  });
});
