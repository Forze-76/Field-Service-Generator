import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDetailsScope,
  ensureDetailsScope,
  makeEmptyDetails,
  resetDetailsScopes,
  setDetailsScope,
  updateDetails,
  updateDetailsInScope,
} from "./fsrDetails";

beforeEach(() => {
  resetDetailsScopes();
});

describe("updateDetails", () => {
  it("updates the work summary without mutating the original", () => {
    const initial = makeEmptyDetails();
    const result = updateDetails(initial, { type: "setWorkSummary", value: "Cleared alarms" });

    expect(result.workSummary).toBe("Cleared alarms");
    expect(initial.workSummary).toBe("");
  });

  it("adds and removes installed parts", () => {
    const afterAdd = updateDetails(undefined, { type: "addPartInstalled", value: "Hydraulic pump" });
    expect(afterAdd.partsInstalled).toHaveLength(1);
    expect(afterAdd.partsInstalled[0].text).toBe("Hydraulic pump");
    expect(afterAdd.partsInstalled[0].id).toBeTruthy();

    const partId = afterAdd.partsInstalled[0].id;
    const afterRemove = updateDetails(afterAdd, { type: "removePartInstalled", id: partId });
    expect(afterRemove.partsInstalled).toHaveLength(0);
    expect(afterAdd.partsInstalled).toHaveLength(1);
  });

  it("handles needed parts queue", () => {
    const next = updateDetails(undefined, { type: "addPartNeeded", value: "Sensor" });
    expect(next.partsNeeded[0].text).toBe("Sensor");

    const trimmed = updateDetails(next, { type: "addPartNeeded", value: "  Control board " });
    expect(trimmed.partsNeeded.map((p) => p.text)).toEqual(["Sensor", "Control board"]);

    const removed = updateDetails(trimmed, { type: "removePartNeeded", id: trimmed.partsNeeded[0].id });
    expect(removed.partsNeeded.map((p) => p.text)).toEqual(["Control board"]);
  });
});

describe("scoped fsrDetails", () => {
  it("reuses the same details object within a scope", () => {
    const a = ensureDetailsScope("job-1");
    a.workSummary = "Initial";

    const again = ensureDetailsScope("job-1");
    expect(again).toBe(a);
    expect(again.workSummary).toBe("Initial");

    const other = ensureDetailsScope("job-2");
    expect(other).not.toBe(a);
  });

  it("sets, updates, and clears scoped details", () => {
    const stored = setDetailsScope("job-3", { workSummary: "Checked hydraulics" });
    expect(stored.workSummary).toBe("Checked hydraulics");

    const next = updateDetailsInScope("job-3", { type: "addPartInstalled", value: "Pump" });
    expect(next.partsInstalled).toHaveLength(1);
    expect(ensureDetailsScope("job-3")).toBe(next);

    clearDetailsScope("job-3");
    const afterClear = ensureDetailsScope("job-3");
    expect(afterClear).not.toBe(next);
    expect(afterClear.partsInstalled).toHaveLength(0);
  });
});
