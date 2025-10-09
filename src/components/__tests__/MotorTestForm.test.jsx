import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MotorTestForm from "../MotorTestForm.jsx";
import { MOTOR_TEST_DOC_NAME, makeEmptyMotorTestData } from "../../utils/fsr";

function renderMotorForm({ model = "MQ" } = {}) {
  const Wrapper = () => {
    const [doc, setDoc] = useState({
      id: "doc-1",
      name: MOTOR_TEST_DOC_NAME,
      done: false,
      data: makeEmptyMotorTestData(),
    });

    const report = {
      model,
      sharedSite: {
        jobName: "Rocket Lift",
        serialNumberText: "M-200",
        siteStreetAddress: "200 Oak St",
        siteCity: "Chicago",
        siteState: "IL",
        siteZip: "60601",
      },
    };

    return <MotorTestForm report={report} doc={doc} onUpdateDoc={setDoc} />;
  };

  return render(<Wrapper />);
}

describe("MotorTestForm", () => {
  it("prefills shared values, renders the model badge, and saves edits", async () => {
    renderMotorForm();

    // Prefill values appear after effect-driven update.
    expect(await screen.findByText("Rocket Lift")).toBeInTheDocument();
    expect(screen.getByText("M-200")).toBeInTheDocument();

    expect(screen.getByText("Model: MQ")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    const ratedLoad = screen.getByLabelText("Rated load");
    fireEvent.change(ratedLoad, { target: { value: "5000 lbs" } });
    expect(ratedLoad).toHaveValue("5000 lbs");

    const currentInput = screen.getByLabelText("Up Unloaded T1");
    fireEvent.change(currentInput, { target: { value: "12.3" } });
    expect(currentInput).toHaveValue("12.3");
  });

  it("shows '-' when the report has no model", async () => {
    renderMotorForm({ model: "" });

    expect(await screen.findByText("Rocket Lift")).toBeInTheDocument();
    expect(screen.getByText("Model: -")).toBeInTheDocument();
  });
});
