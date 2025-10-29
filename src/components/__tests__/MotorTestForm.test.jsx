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
  it("does not render job/model/serial/address UI and saves edits", async () => {
    renderMotorForm();

    // Meta fields should not be displayed here
    expect(screen.queryByText("Rocket Lift")).toBeNull();
    expect(screen.queryByText("M-200")).toBeNull();
    expect(screen.queryByText(/Model:\s*/i)).toBeNull();
    expect(screen.queryByText(/Site Street Address/i)).toBeNull();
    expect(screen.queryByText(/City/i)).toBeNull();
    expect(screen.queryByText(/State/i)).toBeNull();
    expect(screen.queryByText(/Zip/i)).toBeNull();

    // Other fields still work
    const ratedLoad = screen.getByLabelText("Rated load");
    fireEvent.change(ratedLoad, { target: { value: "5000 lbs" } });
    expect(ratedLoad).toHaveValue("5000 lbs");

    const currentInput = screen.getByLabelText("Up Unloaded T1");
    fireEvent.change(currentInput, { target: { value: "12.3" } });
    expect(currentInput).toHaveValue("12.3");
  });
});
