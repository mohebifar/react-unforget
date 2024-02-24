import { Component } from "~/classes/Component";
import { parse } from "~/utils/testing";

const parseCodeAndRun = (code: string, key: string) => {
  const path = parse(code);
  return path.get(key) as babel.NodePath<babel.types.Function>;
};

const FIXTURE_1 = `
function MyComponent() {
  const [state, setState] = useState(0);

  const myDerivedVariable = state + 1;

  const unusedVariable = 1;

  return <div>{myDerivedVariable}</div>;
}
`;

const FIXTURE_2 = `
function MyComponent({someProp}) {
  const [state, setState] = useState(0);

  const myDerivedVariable = state + 1;

  const unusedVariable = 1;

  return <div>{myDerivedVariable} {someProp}</div>;
}
`;

describe("ComponentVariable", () => {
  describe("computeDependencyGraph", () => {
    it("basic example", () => {
      const fn = parseCodeAndRun(FIXTURE_1, "body.0");

      const component = new Component(fn);

      const componentVariables = component.__debug_getComponentVariables();

      expect(componentVariables.size).toStrictEqual(3);
      expect([...componentVariables.keys()]).toStrictEqual([
        "myDerivedVariable",
        "state",
        "setState",
      ]);

      // state has myDerivedVariable as dependent
      expect([
        ...componentVariables.get("state")!.__debug_getDependents().keys(),
      ]).toStrictEqual(["myDerivedVariable"]);

      // state depends on nothing
      expect([
        ...componentVariables.get("state")!.__debug_getDependencies().keys(),
      ]).toStrictEqual([]);

      // setState depends on nothing
      expect([
        ...componentVariables.get("setState")!.__debug_getDependencies().keys(),
      ]).toStrictEqual([]);

      // myDerivedVariable depends on state
      expect([
        ...componentVariables
          .get("myDerivedVariable")!
          .__debug_getDependencies()
          .keys(),
      ]).toStrictEqual(["state"]);

      // myDerivedVariable has no dependents
      expect([
        ...componentVariables
          .get("myDerivedVariable")!
          .__debug_getDependents()
          .keys(),
      ]).toStrictEqual([]);
    });
  });

  describe("getRootComponentVariables", () => {
    it("returns all root component variables", () => {
      const fn = parseCodeAndRun(FIXTURE_2, "body.0");

      const component = new Component(fn);

      const rootComponentVariables = component.getRootComponentVariables();

      expect(
        rootComponentVariables.map((v) => v.binding.identifier.name)
      ).toEqual(["state", "setState", "someProp"]);
    });
  });

  describe("applyModification", () => {
    it("adds a cache variable declaration", () => {
      const fn = parseCodeAndRun(FIXTURE_2, "body.0");

      const component = new Component(fn);

      component.applyModification();

      const code = component.path.toString();

      expect(code).toMatchSnapshot();
    });
  });
});
