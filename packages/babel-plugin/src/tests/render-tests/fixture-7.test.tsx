import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import TestComponent from "../fixtures/fixture_7";

describe("Fixture 7 - Counter with early return", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    expect(
      screen.getByText("We're inside the early return"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Increment",
      }),
    );

    expect(screen.getByText("Count: 1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Increment",
      }),
    );

    expect(
      screen.getByText("We're inside the early return"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Increment",
      }),
    );

    expect(screen.getByText("Count: 3")).toBeInTheDocument();
  });
});
