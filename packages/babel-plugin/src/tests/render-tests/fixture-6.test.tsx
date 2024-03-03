import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import TestComponent from "../fixtures/fixture_6";

describe("Fixture 6 - Counter with extra component and mutation tracking", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    const incrementButton = screen.getByRole("button", {
      name: "Increment",
    });

    const statePrinterElement = screen.getByTestId("state-printer");

    expect(statePrinterElement).toHaveTextContent(
      "Count: 0 The number is: even"
    );

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent(
      "Count: 1 The number is: odd"
    );

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent(
      "Count: 2 The number is: even"
    );

    await userEvent.click(incrementButton);
    expect(statePrinterElement).toHaveTextContent(
      "Count: 3 The number is: odd"
    );
  });
});
