import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import TestComponent from "../fixtures/fixture_14";

describe("Fixture 14 - Alias analysis", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });
});
