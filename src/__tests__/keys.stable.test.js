import { describe, expect, it } from "vitest";
import { ensureFsrDocData, makeEmptyServiceSummaryData } from "../utils/fsr";

describe("creation helpers assign stable ids", () => {
  it("ensures parts rows always receive ids", () => {
    const data = ensureFsrDocData({
      entries: [
        {
          type: "orderParts",
          parts: [
            { partNo: "123", desc: "Sensor", qty: "1" },
            { id: "known", partNo: "456", desc: "Controller", qty: "2" },
          ],
        },
      ],
    });
    const parts = data.entries[0].parts;
    expect(parts).toHaveLength(2);
    const ids = parts.map((part) => part.id);
    ids.forEach((id) => expect(typeof id).toBe("string"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns ids to entry photos without ids", () => {
    const normalized = ensureFsrDocData({
      entries: [
        {
          type: "issue",
          note: "Checked sensors",
          photos: [{ imageUrl: "data:image/png;base64,abc" }],
        },
      ],
    });
    const photos = normalized.entries[0].photos;
    expect(photos).toHaveLength(1);
    expect(typeof photos[0].id).toBe("string");
    expect(photos[0].id.length).toBeGreaterThan(0);
  });

  it("initializes service summary time log rows with ids", () => {
    const summary = makeEmptyServiceSummaryData();
    expect(summary.timeLogs.length).toBeGreaterThan(0);
    expect(summary.timeLogs.every((row) => typeof row.id === "string" && row.id.length > 0)).toBe(true);
  });
});
