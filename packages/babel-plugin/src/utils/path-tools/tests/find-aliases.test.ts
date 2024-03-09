import { parse } from "~/utils/testing";
import { findAliases } from "../find-aliases";

describe("findAliases", () => {
  it("should find direct aliases through assignment", () => {
    const code = `const b = 2; const a = b;`;
    const nodePath = parse(code);
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a");
    expect(bindings).toBeDefined();
    expect(bindings!.length).toBeGreaterThan(0);
    expect(bindings![0]!.identifier.name).toBe("b");
  });

  it("should handle conditional expressions", () => {
    const code = `const b = 1; const c = 3; const a = condition ? b : c;`;
    const nodePath = parse(code);
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a");
    expect(bindings).toBeDefined();
    expect(
      bindings!.some(
        (binding) =>
          binding.identifier.name === "b" || binding.identifier.name === "c",
      ),
    ).toBeTruthy();
  });

  it("should handle function calls returning identifiers", () => {
    const code = `
        const b = 1;
        const c = 2;
        function getB() { return b; }
        const a = getB();
      `;
    const nodePath = parse(code).get("body.3") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a");
    expect(bindings).toHaveLength(1);
    expect(
      bindings!.some((binding) => binding.identifier.name === "b"),
    ).toBeTruthy();
  });

  it("should handle arrow function calls returning identifiers", () => {
    const code = `
        const b = 1;
        const c = 2;
        const getB = () => { return b; }
        const a = getB();
      `;
    const nodePath = parse(code).get("body.3") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(1);
    expect(
      bindings.some((binding) => binding.identifier.name === "b"),
    ).toBeTruthy();
  });

  it("should handle arrow function calls returning multiple identifiers conditionally", () => {
    const code = `
        const b = 1;
        const c = 2;
        const getB = () => { if (c) { return b; } else { return c; }}
        const a = getB();
      `;
    const nodePath = parse(code).get("body.3") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(2);
    expect(
      bindings.some((binding) => binding.identifier.name === "b"),
    ).toBeTruthy();
    expect(
      bindings.some((binding) => binding.identifier.name === "c"),
    ).toBeTruthy();
  });

  it("should handle immediate function calls", () => {
    const code = `
        const b = 1;
        const c = 2;
        const a = (() => { if (c) { return b; } else { return c; }})()
      `;
    const nodePath = parse(code).get("body.2") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(2);
    expect(
      bindings.some((binding) => binding.identifier.name === "b"),
    ).toBeTruthy();
    expect(
      bindings.some((binding) => binding.identifier.name === "c"),
    ).toBeTruthy();
  });

  it("should handle && logical expression", () => {
    const code = `
        const b = 1;
        const c = 2;
        const a = b && c;
      `;

    const nodePath = parse(code).get("body.2") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(1);
    expect(
      bindings.some((binding) => binding.identifier.name === "c"),
    ).toBeTruthy();
  });

  it("should handle && logical expression more complex", () => {
    const code = `
        const b = 1;
        const c = 2;
        const z = 5;
        const a = b && (b || c) && zz && c;
      `;

    const nodePath = parse(code).get("body.3") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(1);
    expect(
      bindings.some((binding) => binding.identifier.name === "c"),
    ).toBeTruthy();
  });

  it("should handle || logical expression", () => {
    const code = `
        const b = 1;
        const c = 2;
        const z = 5;
        const a = b || c;
      `;

    const nodePath = parse(code).get("body.3") as babel.NodePath;
    const filterFn = jest.fn().mockReturnValue(true);

    const aliases = findAliases(nodePath, filterFn);

    expect(aliases.has("a")).toBeTruthy();
    const bindings = aliases.get("a")!;
    expect(bindings).toHaveLength(2);
    expect(
      bindings.some((binding) => binding.identifier.name === "c"),
    ).toBeTruthy();
    expect(
      bindings.some((binding) => binding.identifier.name === "b"),
    ).toBeTruthy();
  });
});
