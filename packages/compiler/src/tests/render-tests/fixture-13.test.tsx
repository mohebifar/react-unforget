import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
// @ts-expect-error No type declaration
import TestComponent from "../fixtures/fixture_13";

describe("Fixture 13 - Alias analysis", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    const button = screen.getByRole("button");

    const outputPrinter = screen.getByTestId("output-printer");

    expect(outputPrinter).toHaveTextContent("x: [0]y: [0]");

    await userEvent.click(button);
    expect(outputPrinter).toHaveTextContent("x: []y: [1]");

    await userEvent.click(button);
    expect(outputPrinter).toHaveTextContent("x: [2]y: [2]");

    await userEvent.click(button);
    expect(outputPrinter).toHaveTextContent("x: []y: [3]");
  });
});
