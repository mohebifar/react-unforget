import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import TestComponent from "../fixtures/fixture_3";

describe("Fixture 3", () => {
  test("renders without errors", async () => {
    render(<TestComponent />);

    expect(screen.getByText("Hello world!")).toBeTruthy();
  });
});
