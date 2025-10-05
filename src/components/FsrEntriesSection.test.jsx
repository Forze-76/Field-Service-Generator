import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FsrEntriesSection from "./FsrEntriesSection.jsx";

function Wrapper() {
  const [entries, setEntries] = React.useState([
    {
      id: "entry-1",
      type: "orderParts",
      createdAt: new Date().toISOString(),
      collapsed: false,
      parts: [],
      note: "",
    },
  ]);

  const handleUpdateEntry = React.useCallback((id, updater) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const nextValue = typeof updater === "function" ? updater(entry) : updater;
        if (!nextValue) return entry;
        return { ...entry, ...nextValue };
      }),
    );
  }, []);

  return (
    <FsrEntriesSection
      entries={entries}
      onAddEntry={() => {}}
      onUpdateEntry={handleUpdateEntry}
      onRemoveEntry={() => {}}
      onMoveEntry={() => {}}
      onCollapseAll={() => {}}
      readyForIssue
    />
  );
}

describe("FsrEntriesSection", () => {
  it("keeps focus on order parts inputs while typing", () => {
    render(<Wrapper />);

    const partInput = screen.getByPlaceholderText("e.g., 12345");
    partInput.focus();
    expect(document.activeElement).toBe(partInput);

    fireEvent.change(partInput, { target: { value: "12" } });

    const updatedInput = screen.getByPlaceholderText("e.g., 12345");
    expect(updatedInput.value).toBe("12");
    expect(document.activeElement).toBe(updatedInput);
  });
});
