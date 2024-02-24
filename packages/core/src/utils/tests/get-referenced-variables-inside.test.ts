import { getReferencedVariablesInside } from "../get-referenced-variables-inside";
import { parse } from "../testing";

describe("getReferencedVariablesInside", () => {
  it("basic example", () => {
    const path = parse(`
  const myVariable = 2;
  const MyComponent = () => {
    return myVariable;
  };
  `);

    const bindings = getReferencedVariablesInside(
      path.get("body.1.declarations.0.init.body") as any
    );

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.path).toStrictEqual(path.get("body.0.declarations.0"));
  });

  it("returns referenced values inside the given node only", () => {
    const path = parse(`
  const myVariable = 2;
  const MyComponent = () => {
    const derivedValue = myVariable * 2;
    return derivedValue;
  };
  `);

    const functionBody = path.get("body.1.declarations.0.init.body") as any;

    const returnStatement = functionBody.get("body.1") as any;

    const bindings = getReferencedVariablesInside(returnStatement);

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.identifier.name).toStrictEqual("derivedValue");
    expect(bindings[0]?.path).toStrictEqual(
      functionBody.get("body.0.declarations.0")
    );
  });

  it("returns multiple referenced values inside the given node only", () => {
    const path = parse(`
  const myVariable = 2;
  const MyComponent = () => {
    const derivedValue = myVariable * 2;
    return derivedValue + myVariable;
  };
  `);

    const functionBody = path.get("body.1.declarations.0.init.body") as any;

    const returnStatement = functionBody.get("body.1") as any;

    const bindings = getReferencedVariablesInside(returnStatement);

    expect(bindings).toHaveLength(2);
    expect(bindings[0]?.identifier.name).toStrictEqual("derivedValue");
    expect(bindings[0]?.path).toStrictEqual(
      functionBody.get("body.0.declarations.0")
    );
    expect(bindings[1]?.identifier.name).toStrictEqual("myVariable");
    expect(bindings[1]?.path).toStrictEqual(path.get("body.0.declarations.0"));
  });
});
