import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  it("keeps contact editing collapsed and preserves edits after closing it", async () => {
    renderServiceSummary();
    const user = userEvent.setup();
    const toggle = screen.getByText("Edit contact details");
    const section = toggle.closest("details");
    expect(section).not.toHaveAttribute("open");
    await user.click(toggle);
    await user.type(screen.getByLabelText("Customer Contact"), "Jordan / 555-0100");
    await user.type(screen.getByLabelText("PM Contact"), "Taylor");
    await user.click(toggle);
    expect(section).not.toHaveAttribute("open");
    await user.click(toggle);
    expect(screen.getByLabelText("Customer Contact")).toHaveValue("Jordan / 555-0100");
    expect(screen.getByLabelText("PM Contact")).toHaveValue("Taylor");
  });

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

  it("keeps shared site fields in trip setup and offers a document preview", () => {
    renderServiceSummary();
    expect(screen.queryByText("Job Name")).toBeNull();
    expect(screen.getByRole("button", { name: /Preview Document/i })).toBeInTheDocument();
  });

  it("allows adding a day with its own signature control", async () => {
    renderServiceSummary();
    const user = userEvent.setup();
    expect(within(document.getElementById("service-time-log")).getAllByRole("button", { name: "Sign" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /\+ Add day/i }));
    expect(within(document.getElementById("service-time-log")).getAllByRole("button", { name: "Sign" })).toHaveLength(2);
  });
});
