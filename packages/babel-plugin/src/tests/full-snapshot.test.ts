import { loadFixture, transformWithCore } from "~/utils/testing";

describe("Component fixtures", () => {
  describe("applyModification", () => {
    it.each(Array.from({ length: 13 }, (_, i) => `fixture_${i + 1}`))(
      "%s",
      (fixtureName) => {
        const code = transformWithCore(loadFixture(fixtureName));

        expect(code).toMatchSnapshot();
      },
    );
  });
});
