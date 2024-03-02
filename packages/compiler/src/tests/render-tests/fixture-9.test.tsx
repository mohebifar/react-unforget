import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
// @ts-expect-error No type declaration
import TestComponent from "../fixtures/fixture_9";

describe("Fixture 9 - Filtering values in for loops", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    const toggleButton = screen.getByRole("button", {
      name: "Toggle even ones",
    });

    expect(screen.getByRole("list")).toHaveTextContent("13579");

    await userEvent.click(toggleButton);
    expect(screen.getByRole("list")).toHaveTextContent("26");

    await userEvent.click(toggleButton);
    expect(screen.getByRole("list")).toHaveTextContent("13579");

    await userEvent.click(toggleButton);
    expect(screen.getByRole("list")).toHaveTextContent("26");
  });
});
