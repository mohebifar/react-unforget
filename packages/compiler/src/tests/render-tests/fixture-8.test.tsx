import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import TestComponent from "../fixtures/fixture_8";

describe("Fixture 8 - Simple counter with mutating value", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    expect(screen.getByText("Count: 1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Increment",
      })
    );

    expect(
      screen.getByText("We're inside the early return")
    ).toBeInTheDocument();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
