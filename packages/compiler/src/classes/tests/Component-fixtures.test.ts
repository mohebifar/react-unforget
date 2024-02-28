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
  describe("applyModification", () => {
    it.each(Array.from({ length: 12 }, (_, i) => `fixture_${i + 1}`))(
      "%s",
      (fixtureName) => {
        const [, program] = parseCodeAndRun(fixtureName);

        const codeAfter = program.toString();

        expect(codeAfter).toMatchSnapshot();
      }
    );
  });
});
