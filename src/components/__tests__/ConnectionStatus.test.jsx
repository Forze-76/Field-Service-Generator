import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ConnectionStatus from "../ConnectionStatus";

afterEach(cleanup);

describe("ConnectionStatus", () => {
  it("updates when the browser goes offline and online", () => {
    render(<ConnectionStatus />);

    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.getByRole("status")).toHaveTextContent("Online");
  });
});
