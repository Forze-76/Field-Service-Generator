import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useCallback, useState } from "react";
import ServiceSummaryForm from "../components/ServiceSummaryForm.jsx";
import FsrEntriesSection from "../components/FsrEntriesSection.jsx";
import {
  addEntryWithEffects,
  ensureFsrDocData,
  makeEmptyServiceSummaryData,
  moveEntryInFsrData,
  removeEntryFromFsrData,
  setEntriesCollapsedState,
  uid,
  updateEntryInFsrData,
} from "../utils/fsr";

function FocusHarness({ expose }) {
  const [report, setReport] = useState({
    id: "r1",
    jobNo: "J#1",
    tripType: "Service",
    model: "M",
    sharedSite: {},
    documents: [],
    photos: [],
  });
  const [serviceSummaryDoc, setServiceSummaryDoc] = useState({
    id: "doc-ss",
    name: "Service Summary",
    done: false,
    data: makeEmptyServiceSummaryData(),
  });
  const [fsrData, setFsrData] = useState(() =>
    ensureFsrDocData({
      entries: [
        {
          id: "entry-order",
          type: "orderParts",
          collapsed: false,
          note: "",
          parts: [{ id: "part-1", partNo: "", desc: "", qty: "" }],
        },
        {
          id: "entry-issue",
          type: "issue",
          collapsed: false,
          note: "",
          photos: [],
        },
      ],
    }),
  );

  const handleUpdateReport = useCallback((patch) => {
    setReport((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdateServiceDoc = useCallback((nextDoc) => {
    setServiceSummaryDoc(nextDoc);
  }, []);

  const handleAddEntry = useCallback(
    (entry) => {
      setFsrData((prev) => addEntryWithEffects(prev, entry));
    },
    [],
  );

  const handleUpdateEntry = useCallback(
    (id, updater) => {
      setFsrData((prev) => updateEntryInFsrData(prev, id, updater));
    },
    [],
  );

  const handleRemoveEntry = useCallback(
    (id) => {
      setFsrData((prev) => removeEntryFromFsrData(prev, id));
    },
    [],
  );

  const handleMoveEntry = useCallback(
    (id, direction) => {
      setFsrData((prev) => moveEntryInFsrData(prev, id, direction));
    },
    [],
  );

  const handleCollapseAll = useCallback(
    (collapsed) => {
      setFsrData((prev) => setEntriesCollapsedState(prev, collapsed));
    },
    [],
  );

  const insertPartAbove = useCallback(() => {
    setFsrData((prev) =>
      updateEntryInFsrData(prev, "entry-order", (entry) => ({
        ...entry,
        parts: [{ id: uid(), partNo: "", desc: "", qty: "" }, ...(entry.parts || [])],
      })),
    );
  }, []);

  const removeFirstPart = useCallback(() => {
    setFsrData((prev) =>
      updateEntryInFsrData(prev, "entry-order", (entry) => {
        const nextParts = (entry.parts || []).length > 1 ? entry.parts.slice(1) : entry.parts;
        return { ...entry, parts: nextParts };
      }),
    );
  }, []);

  if (expose) {
    expose({ insertPartAbove, removeFirstPart });
  }

  return (
    <div>
      <ServiceSummaryForm
        report={report}
        doc={serviceSummaryDoc}
        onUpdateReport={handleUpdateReport}
        onUpdateDoc={handleUpdateServiceDoc}
      />
      <FsrEntriesSection
        entries={fsrData.entries}
        onAddEntry={handleAddEntry}
        onUpdateEntry={handleUpdateEntry}
        onRemoveEntry={handleRemoveEntry}
        onMoveEntry={handleMoveEntry}
        onCollapseAll={handleCollapseAll}
        readyForIssue
      />
    </div>
  );
}

describe("focus stability", () => {
  it("keeps focus while typing in critical editors", async () => {
    const user = userEvent.setup();
    const controls = {};
    render(<FocusHarness expose={(api) => Object.assign(controls, api)} />);

    const reasonTextarea = screen.getByLabelText("Reason for visit");
    await user.type(reasonTextarea, "abc");
    expect(reasonTextarea).toHaveValue("abc");
    expect(document.activeElement).toBe(reasonTextarea);

    const issueTextarea = screen.getByPlaceholderText(/what happened/i);
    await user.type(issueTextarea, "abc");
    expect(issueTextarea).toHaveValue("abc");
    expect(document.activeElement).toBe(issueTextarea);

    const partInput = screen.getAllByPlaceholderText("e.g., 12345")[0];
    partInput.focus();
    await user.type(partInput, "a");
    expect(document.activeElement).toBe(partInput);

    await act(async () => {
      controls.insertPartAbove();
    });
    expect(document.activeElement).toBe(partInput);

    await user.type(partInput, "bc");
    expect(partInput).toHaveValue("abc");
    expect(document.activeElement).toBe(partInput);

    await act(async () => {
      controls.removeFirstPart();
    });
    expect(partInput).toHaveValue("abc");
    expect(document.activeElement).toBe(partInput);
  });
});
