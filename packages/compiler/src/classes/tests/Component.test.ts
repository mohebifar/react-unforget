import type * as babel from "@babel/core";
import { Component } from "~/classes/Component";
import { parse } from "~/utils/testing";

const parseCodeAndRun = (code: string, componentName = "MyComponent") => {
  const programPath = parse(code);

  const programBody = programPath.get("body");
  const fn = programBody.find(
    (p) => p.isFunctionDeclaration() && p.node.id?.name === componentName
  ) as babel.NodePath<babel.types.Function>;

  const component = new Component(fn);

  return [component, programPath] as const;
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

const FIXTURE_3 = `
const varDefinedOutside = 1;
const generateValue = () => 2;

function MyComponent({someProp}) {
  const [state, setState] = useState(0);

  const handleIncrement = () => {
    setState(state + 1);
    console.log('current state', state);
  }

  const myDerivedVariable = state + 1;

  const propDerivedVariable = someProp + "_" + someProp;

  const someGeneratedValue = generateValue();

  const unusedVariable = 1;
  const valueDerivedFromDefinedOutside = varDefinedOutside * 10;

  return (
    <button onClick={handleIncrement}>
      Test {myDerivedVariable} {propDerivedVariable} {varDefinedOutside} {valueDerivedFromDefinedOutside} {someGeneratedValue}
    </button>
  );
}
`;

const FIXTURE_4 = `
function double(n) {
  return n * 2;
}

function MyComponent({someProp}) {
  const [count, setCount] = useState(0);

  const doubleCount = double(count);

  return (
    <div>
      Hello! Current count is {count} and its double is {doubleCount}
      <br />
      The prop is {someProp}
      <br />
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
`;

describe("ComponentVariable", () => {
  describe("computeDependencyGraph", () => {
    it("basic example", () => {
      const [component] = parseCodeAndRun(FIXTURE_1);
      component.computeComponentVariables();

      const componentVariables = component.__debug_getComponentVariables();

      expect(componentVariables.size).toStrictEqual(3);
      expect([...componentVariables.keys()]).toStrictEqual([
        "myDerivedVariable",
        "state",
        "_temp",
      ]);

      // state has myDerivedVariable as dependent
      expect([
        ...componentVariables.get("state")!.__debug_getDependents().keys(),
      ]).toStrictEqual(["myDerivedVariable"]);

      // state depends on nothing
      expect([
        ...componentVariables.get("state")!.getDependencies().keys(),
      ]).toStrictEqual([]);

      // myDerivedVariable depends on state
      expect([
        ...componentVariables
          .get("myDerivedVariable")!
          .getDependencies()
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

    describe("getRootComponentVariables", () => {
      it("returns all root component variables", () => {
        const [component] = parseCodeAndRun(FIXTURE_2);
        component.computeComponentVariables();

        const rootComponentVariables = component.getRootComponentVariables();

        expect(
          rootComponentVariables.map((v) => v.binding.identifier.name)
        ).toEqual(["state", "_temp", "someProp"]);
      });
    });
  });

  describe.only("applyModification", () => {
    it.each([
      ["Fixture 1", FIXTURE_1],
      ["Fixture 2", FIXTURE_2],
      ["Fixture 4", FIXTURE_4],
      ["Fixture 3", FIXTURE_3],
    ])("%s", (_, code) => {
      const [component, program] = parseCodeAndRun(code);
      component.computeComponentVariables();
      component.applyModification();

      const codeAfter = program.toString();

      expect(codeAfter).toMatchSnapshot();
    });
  });
});
