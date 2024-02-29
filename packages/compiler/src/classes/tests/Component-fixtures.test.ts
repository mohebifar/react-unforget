import { loadFixture, transformWithStandalone } from "~/utils/testing";

describe("Component fixtures", () => {
  describe("applyModification", () => {
    it.each(Array.from({ length: 8 }, (_, i) => `fixture_${i + 1}`))(
      "%s",
      (fixtureName) => {
        const code = transformWithStandalone(loadFixture(fixtureName));

        expect(code).toMatchSnapshot();
      }
    );
  });
});
