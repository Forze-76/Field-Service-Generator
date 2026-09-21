import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SaveStatus from "../SaveStatus";

afterEach(cleanup);

describe("SaveStatus", () => {
  it.each([
    ["loading", "Loading"],
    ["saving", "Saving"],
    ["saved", "Saved on iPad"],
    ["error", "Save failed"],
  ])("shows the %s state", (state, label) => {
    render(<SaveStatus state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });
});
