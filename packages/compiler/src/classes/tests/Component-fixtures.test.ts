import { visitProgram } from "~/visit-program";
import { parseFixture } from "~/utils/testing";

const parseCodeAndRun = (fixtureName: string) => {
  const programPath = parseFixture(fixtureName);
  const components = visitProgram(programPath);

  return [components, programPath] as const;
};

describe("Component fixtures", () => {
  describe("applyModification", () => {
    it.each(Array.from({ length: 14 }, (_, i) => `fixture_${i + 1}`))(
      "%s",
      (fixtureName) => {
        const [, program] = parseCodeAndRun(fixtureName);

        const codeAfter = program.toString();

        expect(codeAfter).toMatchSnapshot();
      }
    );
  });
});
