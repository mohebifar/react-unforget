import { findComponents } from "~/find-component";
import { parseFixture } from "~/utils/testing";

const parseCodeAndRun = (fixtureName: string) => {
  const programPath = parseFixture(fixtureName);
  const [component] = findComponents(programPath);

  return [component!, programPath] as const;
};

describe("Component fixtures", () => {
  describe.only("applyModification", () => {
    it.each(["fixture_1", "fixture_2", "fixture_4", "fixture_3"])(
      "%s",
      (fixtureName) => {
        const [component, program] = parseCodeAndRun(fixtureName);
        component.computeComponentVariables();
        component.applyModification();

        const codeAfter = program.toString();

        expect(codeAfter).toMatchSnapshot();
      }
    );
  });
});
