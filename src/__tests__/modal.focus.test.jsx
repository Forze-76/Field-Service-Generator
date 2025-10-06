import { describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useRef, useState } from "react";

import { ReportSetup } from "../App.jsx";
import FsrEntriesSection from "../components/FsrEntriesSection.jsx";

describe("modal input focus", () => {
  it("keeps focus in the Create Report modal while typing", async () => {
    const controls = {};
    const user = userEvent.setup();

    function Harness({ expose }) {
      const [open, setOpen] = useState(false);
      const [tick, setTick] = useState(false);
      const triggerRef = useRef(null);

      const handleCreate = () => {};

      if (expose) {
        expose({
          openModal: () => setOpen(true),
          triggerExternalUpdate: () => setTick((prev) => !prev),
        });
      }

      return (
        <div>
          <button ref={triggerRef} onClick={() => setOpen(true)}>
            Open setup
          </button>
          <span aria-hidden="true">{tick ? "on" : "off"}</span>
          <ReportSetup
            open={open}
            onClose={() => setOpen(false)}
            types={["Service", "Maintenance"]}
            onCreate={handleCreate}
            returnFocusRef={triggerRef}
          />
        </div>
      );
    }

    render(<Harness expose={(api) => Object.assign(controls, api)} />);

    await act(async () => {
      controls.openModal();
    });

    const jobInput = await screen.findByLabelText(/job/i);
    await user.clear(jobInput);
    await user.type(jobInput, "12345");
    expect(jobInput).toHaveValue("J#12345");
    expect(document.activeElement).toBe(jobInput);

    await act(async () => {
      controls.triggerExternalUpdate();
    });

    expect(jobInput).toHaveValue("J#12345");
    expect(document.activeElement).toBe(jobInput);
  });

  it("keeps focus in the Add Entry modal while typing", async () => {
    const controls = {};
    const user = userEvent.setup();

    function Harness({ expose }) {
      const [entries, setEntries] = useState([]);
      const [extras, setExtras] = useState([]);

      const handleAddEntry = (entry) => {
        setEntries((prev) => [...prev, { ...entry, id: entry.id || `entry-${prev.length}` }]);
      };

      const noop = () => {};

      if (expose) {
        expose({
          addExternalItem: () => setExtras((prev) => [...prev, prev.length]),
        });
      }

      return (
        <div>
          <FsrEntriesSection
            entries={entries}
            onAddEntry={handleAddEntry}
            onUpdateEntry={noop}
            onRemoveEntry={noop}
            onMoveEntry={noop}
            onCollapseAll={noop}
            readyForIssue
          />
          <ul aria-hidden="true">
            {extras.map((item) => (
              <li key={item}>extra-{item}</li>
            ))}
          </ul>
        </div>
      );
    }

    render(<Harness expose={(api) => Object.assign(controls, api)} />);

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    const dialogs = await screen.findAllByRole("dialog");
    const dialog = dialogs[dialogs.length - 1];
    await user.click(within(dialog).getByRole("button", { name: /issue/i }));

    const textarea = within(dialog).getByPlaceholderText(/what happened/i);
    await user.type(textarea, "abcdef");
    expect(textarea).toHaveValue("abcdef");
    expect(document.activeElement).toBe(textarea);

    await act(async () => {
      controls.addExternalItem();
    });

    expect(textarea).toHaveValue("abcdef");
    expect(document.activeElement).toBe(textarea);
  });
});
