import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("renders the read-only model badge without checkboxes", () => {
    renderServiceSummary();

    expect(screen.getByText("Model: D")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("shows '-' when the report has no model", () => {
    renderServiceSummary({ model: "" });

    expect(screen.getByText("Model: -")).toBeInTheDocument();
  });
});
