import type * as babel from "@babel/core";
import { getReferencedVariablesInside } from "../get-referenced-variables-inside";
import { parse } from "../testing";

const parseCodeForTest = (code: string) => {
  const programPath = parse(code);

  const programBody = programPath.get("body");

  return programBody;
};

const getFunctionFromBodyPath = (
  programBody: babel.NodePath<babel.types.Statement>[],
  componentName = "MyComponent"
) => {
  const fn = programBody.find(
    (p) => p.isFunctionDeclaration() && p.node.id?.name === componentName
  ) as babel.NodePath<babel.types.FunctionDeclaration>;

  return fn;
};

const getReturnStatement = (fn: babel.NodePath<babel.types.Function>) => {
  return fn.get("body.body").find((p) => {
    return p.isReturnStatement();
  });
};

describe("getReferencedVariablesInside", () => {
  it("basic example", () => {
    const body = parseCodeForTest(`
  const myVariable = 2;
  function MyComponent() {
    return myVariable;
  };
  `);

    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.path).toEqual(body.at(0)?.get("declarations.0"));
  });

  it("returns referenced values inside the given node only", () => {
    const body = parseCodeForTest(`
  const myVariable = 2;
  function MyComponent() {
    const derivedValue = myVariable * 2;
    return derivedValue;
  };
  `);

    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.identifier.name).toStrictEqual("derivedValue");
    expect(bindings[0]?.path).toStrictEqual(
      fn.get("body.body.0.declarations.0")
    );
  });

  it("returns multiple referenced values inside the given node only", () => {
    const body = parseCodeForTest(`
  const myVariable = 2;
  function MyComponent() {
    const derivedValue = myVariable * 2;
    return derivedValue + myVariable;
  };
  `);

    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings).toHaveLength(2);
    expect(bindings[0]?.identifier.name).toStrictEqual("derivedValue");
    expect(bindings[0]?.path).toStrictEqual(
      fn.get("body.body.0.declarations.0")
    );
    expect(bindings[1]?.identifier.name).toStrictEqual("myVariable");
    expect(bindings[1]?.path).toStrictEqual(body.at(0)?.get("declarations.0"));
  });

  it("properly handles member expressions", () => {
    const body = parseCodeForTest(`
const key = "key";
const num = 2;
const obj = {};
function MyComponent() {
  return obj.foo[key].bar[num];
};
  `);
    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings.map((b) => b.identifier.name)).toStrictEqual([
      "obj",
      "key",
      "num",
    ]);
  });

  it("properly handles call expressions", () => {
    const body = parseCodeForTest(`
const key = "key";
const num = 2;
const fn = {};
function MyComponent() {
  return fn(key, num);
};
  `);
    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings).toHaveLength(3);
    expect(bindings.map((b) => b.identifier.name)).toStrictEqual([
      "fn",
      "key",
      "num",
    ]);
  });

  it("properly handles call expressions with member expression callee", () => {
    const body = parseCodeForTest(`
const key = "key";
const num = 2;
const fn = {};
function MyComponent() {
  return fn.useHook(key, num);
};
  `);
    const fn = getFunctionFromBodyPath(body);
    const returnStatement = getReturnStatement(fn)!;
    const variables = getReferencedVariablesInside(returnStatement);
    const bindings = Array.from(variables.values());

    expect(bindings).toHaveLength(3);
    expect(bindings.map((b) => b.identifier.name)).toStrictEqual([
      "fn",
      "key",
      "num",
    ]);
  });

  describe("exclusion", () => {
    it("does not count function delcaration", () => {
      const body = parseCodeForTest(`
function MyComponent() {
  function innerComponent() {}
};
    `);

      const fn = getFunctionFromBodyPath(body);
      const variables = getReferencedVariablesInside(fn);
      const bindings = Array.from(variables.values());

      expect(bindings).toHaveLength(0);
    });

    it("does not count variable declarator ids", () => {
      const body = parseCodeForTest(`
function MyComponent() {
  const declaredVar = 2;
  const [a, b] = [1, 2];
  const { c, d } = { c: 1, d: 2 };
};
    `);

      const fn = getFunctionFromBodyPath(body);
      const variables = getReferencedVariablesInside(fn);
      const bindings = Array.from(variables.values());

      expect(bindings).toHaveLength(0);
    });

    it("does not count class, and its properties and methods", () => {
      const body = parseCodeForTest(`
const property = "dummy-value";
const method = "dummy-value";
const computedProperty = "dummy-value";
const computedMethod = "dummy-value";

function MyComponent() {
  class MyClass {
    method() {}
    property = 2;
    [computedProperty] = 3;
    [computedMethod]() {}
  }
};
    `);

      const fn = getFunctionFromBodyPath(body);
      const variables = getReferencedVariablesInside(fn);
      const bindings = Array.from(variables.values());

      expect(bindings.map((b) => b.identifier.name)).toStrictEqual([
        "computedProperty",
        "computedMethod",
      ]);
    });

    it("does not count object property keys", () => {
      const body = parseCodeForTest(`
const property = "dummy-value";
const method = "dummy-value";
const computedProperty = "dummy-value";
const computedMethod = "dummy-value";
const referencedValue = "dummy-value";

function MyComponent() {
  const obj = {
    method() {},
    property: 2,
    [computedProperty]: 3,
    [computedMethod]() {},
    prop: referencedValue.test
  };
};
    `);

      const fn = getFunctionFromBodyPath(body);
      const variables = getReferencedVariablesInside(fn);
      const bindings = Array.from(variables.values());

      expect(bindings.map((b) => b.identifier.name)).toStrictEqual([
        "computedProperty",
        "computedMethod",
        "referencedValue",
      ]);
    });
  });
});
