import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceSummaryForm from "../ServiceSummaryForm.jsx";
import { makeEmptyServiceSummaryData } from "../../utils/fsr";

function renderServiceSummary({ model = "D" } = {}) {
  const Wrapper = () => {
    const [doc, setDoc] = useState({
      id: "doc-1",
      name: "Service Summary",
      done: false,
      data: makeEmptyServiceSummaryData(),
    });

    const report = {
      model,
      sharedSite: {},
    };

    return (
      <ServiceSummaryForm
        report={report}
        doc={doc}
        onUpdateReport={() => {}}
        onUpdateDoc={setDoc}
      />
    );
  };

  return render(<Wrapper />);
}

describe("ServiceSummaryForm", () => {
  it("does not render Model label/icon", () => {
    renderServiceSummary();
    expect(screen.queryByText(/Model:/i)).toBeNull();
  });

  it("does not show removed fields (Reason for visit, Parts replaced, PFlow Service Technician)", () => {
    renderServiceSummary();
    expect(screen.queryByLabelText(/Reason for visit/i)).toBeNull();
    expect(screen.queryByText(/Parts replaced/i)).toBeNull();
    expect(screen.queryByText(/PFlow Service Technician/i)).toBeNull();
  });

  it("renders Service performed and updates value", async () => {
    renderServiceSummary();
    const user = userEvent.setup();
    const labelEl = screen.getByText(/Service performed/i);
    const container = labelEl.parentElement?.parentElement || labelEl.parentElement;
    const serviceTextarea = container.querySelector('textarea');
    await user.type(serviceTextarea, "Checked sensors");
    expect(serviceTextarea).toHaveValue("Checked sensors");
  });

  it("renders SharedSiteBlock before Daily Time Log", () => {
    renderServiceSummary();
    const heading = screen.getByRole("heading", { name: /Daily Time Log/i });
    const jobName = screen.getByText("Job Name");
    const jobBeforeHeading = !!(jobName.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(jobBeforeHeading).toBe(true);
  });

  it("allows typing in time log and persists after adding a row", async () => {
    renderServiceSummary();
    const user = userEvent.setup();

    const sigInputs = screen.getAllByPlaceholderText(/name\/initials/i);
    expect(sigInputs.length).toBeGreaterThan(0);
    const sig = sigInputs[0];
    await user.click(sig);
    await user.type(sig, "AB");
    expect(sig).toHaveValue("AB");

    const addBtn = screen.getByRole("button", { name: /\+ Add day/i });
    await user.click(addBtn);

    const sigInputsAfter = screen.getAllByPlaceholderText(/name\/initials/i);
    expect(sigInputsAfter.length).toBe(sigInputs.length + 1);
    expect(sig).toHaveValue("AB");
  });
});
