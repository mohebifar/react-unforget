import { findComponents } from "~/utils/find-component";
import { parseFixture } from "~/utils/testing";

const parseCodeAndRun = (fixtureName: string) => {
  const programPath = parseFixture(fixtureName);
  const components = findComponents(programPath);

  components.forEach((component) => {
    component.computeComponentSegments();
    component.applyTransformation();
  });

  return [components, programPath] as const;
};

describe("Component fixtures", () => {
  describe.only("applyModification", () => {
    it.each([
      // "fixture_1", "fixture_2", "fixture_4", "fixture_3",
      // "fixture_10",
      "fixture_5",
      // "fixture_7",
      // "fixture_8",
      // "fixture_9",
    ])("%s", (fixtureName) => {
      const [, program] = parseCodeAndRun(fixtureName);

      const codeAfter = program.toString();

      console.log(codeAfter);

      expect(codeAfter).toMatchSnapshot();
    });
  });
});
