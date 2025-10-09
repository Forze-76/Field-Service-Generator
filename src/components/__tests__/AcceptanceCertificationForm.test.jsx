import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AcceptanceCertificationForm from "../AcceptanceCertificationForm.jsx";
import { ACCEPTANCE_CERT_DOC_NAME, makeEmptyAcceptanceCertificationData } from "../../utils/fsr";

function renderAcceptanceForm({ model = "B" } = {}) {
  const Wrapper = () => {
    const [doc, setDoc] = useState({
      id: "doc-1",
      name: ACCEPTANCE_CERT_DOC_NAME,
      done: false,
      data: makeEmptyAcceptanceCertificationData(),
    });

    const report = {
      model,
      sharedSite: {
        jobName: "Zenith Tower",
        serialNumberText: "SN-123",
        siteStreetAddress: "100 Main St",
        siteMailingAddress: "PO Box 100",
        siteCity: "Milwaukee",
        siteState: "WI",
        siteZip: "53202",
      },
    };

    return <AcceptanceCertificationForm report={report} doc={doc} onUpdateDoc={setDoc} />;
  };

  return render(<Wrapper />);
}

describe("AcceptanceCertificationForm", () => {
  it("prefills shared values, renders the model badge, and saves edits", async () => {
    renderAcceptanceForm();

    expect(await screen.findByText("Zenith Tower")).toBeInTheDocument();
    expect(screen.getByText("SN-123")).toBeInTheDocument();

    expect(screen.getByText("Model: B")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    const contactInput = screen.getByPlaceholderText("Contact name");
    fireEvent.change(contactInput, { target: { value: "Jamie Fox" } });
    expect(contactInput).toHaveValue("Jamie Fox");

    const percentInput = screen.getByLabelText("Percent of lift capacity");
    fireEvent.change(percentInput, { target: { value: "75%" } });
    expect(percentInput).toHaveValue("75%");

    const yesButtons = screen.getAllByRole("button", { name: "Yes" });
    fireEvent.click(yesButtons[0]);
    expect(yesButtons[0]).toHaveAttribute("aria-pressed", "true");

    const notesArea = screen.getByPlaceholderText("Additional notes");
    fireEvent.change(notesArea, { target: { value: "All acceptance steps complete." } });
    expect(notesArea).toHaveValue("All acceptance steps complete.");

    const gateNaButton = screen.getByRole("button", { name: "N/A" });
    fireEvent.click(gateNaButton);
    expect(gateNaButton).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to '-' when the report lacks a model", async () => {
    renderAcceptanceForm({ model: "" });

    expect(await screen.findByText("Zenith Tower")).toBeInTheDocument();
    expect(screen.getByText("Model: -")).toBeInTheDocument();
  });
});
