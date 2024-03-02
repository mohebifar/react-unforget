import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
// @ts-expect-error No type declaration
import TestComponent from "../fixtures/fixture_12";

describe("Fixture 12 - Alias analysis", () => {
  test("renders without errors", () => {
    expect(() => render(<TestComponent />)).not.toThrow();
  });

  test("increment button works", async () => {
    render(<TestComponent />);

    const button = screen.getByRole("button");

    expect(screen.getByText("n: 3,2")).toBeInTheDocument();

    await userEvent.click(button);

    expect(screen.getByText("n: 3,3")).toBeInTheDocument();

    await userEvent.click(button);

    expect(screen.getByText("n: 3,4")).toBeInTheDocument();
  });
});
