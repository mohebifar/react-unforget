import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
// @ts-expect-error No type declaration
import TestComponent from "../fixtures/fixture_4";

describe("Fixture 4 - Simple counter", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    const incrementButton = screen.getByRole("button", {
      name: "Increment",
    });

    const statePrinterElement = screen.getByTestId("state-printer");

    expect(statePrinterElement).toHaveTextContent("Count: 0");

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent("Count: 1");

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent("Count: 2");

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent("Count: 3");
  });
});
