import { findComponents } from "~/utils/find-component";
import { parseFixture } from "~/utils/testing";

const parseCodeAndRun = (fixtureName: string) => {
  const programPath = parseFixture(fixtureName);
  const [component] = findComponents(programPath);

  return [component!, programPath] as const;
};

// TODO: Re-enable these tests
// Due to frequent changes in the compiler, these tests are disabled for now
describe.skip("ComponentVariable", () => {
  describe("computeDependencyGraph", () => {
    it("basic example", () => {
      const [component] = parseCodeAndRun("fixture_1");
      component.computeComponentSegments();

      const componentVariables = component.__debug_getComponentVariables();

      expect(componentVariables.size).toStrictEqual(4);
      expect([...componentVariables.keys()]).toStrictEqual([
        "myDerivedVariable",
        "state",
        "_unwrapped",
        "setState",
      ]);

      // // state depends on nothing
      // expect([
      //   ...componentVariables.get("state")!.getDependencies().keys(),
      // ]).toStrictEqual(["_unwrapped"]);

      // // myDerivedVariable depends on state
      // expect([
      //   ...componentVariables
      //     .get("myDerivedVariable")!
      //     .getDependencies()
      //     .keys(),
      // ]).toStrictEqual(["state"]);

    });

    describe("getRootComponentVariables", () => {
      it("returns all root component variables", () => {
        const [component] = parseCodeAndRun("fixture_2");
        component.computeComponentSegments();

        const rootComponentVariables = component.getRootComponentVariables();

        expect(
          rootComponentVariables.map((v) => v.binding.identifier.name)
        ).toEqual(["_unwrapped", "_props"]);
      });
    });
  });
});
