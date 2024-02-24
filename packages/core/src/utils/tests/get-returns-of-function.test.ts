import { getReturnsOfFunction } from "../get-returns-of-function";
import { parse } from "../testing";

describe("getReturnTypesOfFunction", () => {
  it("should return the return statement for basic arrow function", () => {
    const path = parse(`
const MyComponent = () => {
  return <div />;
};
`);

    const returns = getReturnsOfFunction(
      path.get("body.0.declarations.0.init") as any
    );

    expect(returns).toHaveLength(1);
    expect(returns[0]?.get("argument").isJSXElement()).toStrictEqual(true);
  });

  it("should return multiple return statements for basic arrow function", () => {
    const path = parse(`
const MyComponent = () => {
  if (true) {
    return <button />;
  }
  return <div />;
};
`);

    const returns = getReturnsOfFunction(
      path.get("body.0.declarations.0.init") as any
    );

    expect(returns).toHaveLength(2);
    expect(returns[0]?.get("argument").isJSXElement()).toStrictEqual(true);
    expect(returns[1]?.get("argument").isJSXElement()).toStrictEqual(true);
  });

  it("should not count inner closure returns", () => {
    const path = parse(`
const MyComponent = () => {
  if (true) {
    return <button />;
  }

  const callback = () => {
    return 1;
  };

  return <div />;
};
`);

    const returns = getReturnsOfFunction(
      path.get("body.0.declarations.0.init") as any
    );

    expect(returns).toHaveLength(2);
    expect(returns[0]?.get("argument").isJSXElement()).toStrictEqual(true);
    expect(returns[1]?.get("argument").isJSXElement()).toStrictEqual(true);
  });
});
