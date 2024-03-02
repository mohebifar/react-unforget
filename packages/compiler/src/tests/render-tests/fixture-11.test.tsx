import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
// @ts-expect-error No type declaration
import TestComponent from "../fixtures/fixture_11";

describe("Fixture 11 - Simple alias analysis problem", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
