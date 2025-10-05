import { describe, expect, it } from "vitest";
import {
  addEntryWithEffects,
  buildReportHtml,
  computeDowntimeMinutes,
  ensureFsrDocData,
  mergePartsNeeded,
} from "./fsr";

const baseReportInfo = {
  id: "r1",
  jobNo: "J#1234",
  tripType: "Service",
  model: "M",
  startAt: new Date("2024-01-01T08:00:00Z").toISOString(),
  endAt: new Date("2024-01-01T10:00:00Z").toISOString(),
  serialTagImageUrl: "data:image/png;base64,serial",
  serialTagMissing: false,
};

const issueEntry = {
  id: "entry-issue",
  type: "issue",
  note: "Cleared alarms & checked <safety>",
  photos: [
    { id: "issue-photo-1", imageUrl: "data:image/png;base64,issue1" },
    { id: "issue-photo-2", imageUrl: "data:image/png;base64,issue2" },
  ],
  createdAt: new Date("2024-01-01T08:30:00Z").toISOString(),
  collapsed: false,
};

const correctionEntry = {
  id: "entry-correction",
  type: "correction",
  note: "Replaced limit switch and verified operation.",
  photos: [{ id: "correction-photo", imageUrl: "data:image/png;base64,correction" }],
  createdAt: new Date("2024-01-01T09:00:00Z").toISOString(),
  collapsed: false,
};

const orderPartsEntry = {
  id: "entry-parts",
  type: "orderParts",
  note: "Ship to job site.",
  parts: [
    { id: "part-1", partNo: "123", desc: "Photo eye", qty: "2" },
    { id: "part-2", partNo: "456", desc: "Controller", qty: "1" },
  ],
  createdAt: new Date("2024-01-01T09:15:00Z").toISOString(),
  collapsed: false,
};

const docRequestEntry = {
  id: "entry-doc",
  type: "docRequest",
  docKind: "pm",
  docNotes: "Need the most recent checklist.",
  createdAt: new Date("2024-01-01T09:20:00Z").toISOString(),
  collapsed: false,
};

const followUpEntry = {
  id: "entry-follow",
  type: "followUp",
  followUp: { title: "Schedule revisit", details: "Return in two weeks with replacement actuator." },
  createdAt: new Date("2024-01-01T09:30:00Z").toISOString(),
  collapsed: false,
};

const commentaryEntry = {
  id: "entry-commentary",
  type: "commentary",
  note: "Unit is operating smoothly after service.",
  createdAt: new Date("2024-01-01T09:45:00Z").toISOString(),
  collapsed: false,
};

const internalEntry = {
  id: "entry-internal",
  type: "internal",
  note: "Customer requested discount — do not include in export.",
  createdAt: new Date("2024-01-01T09:50:00Z").toISOString(),
  collapsed: false,
};

const makeReport = (entries) => ({
  ...baseReportInfo,
  documents: [
    {
      id: "d1",
      name: "Field Service Report",
      done: true,
      data: ensureFsrDocData({ entries }),
    },
  ],
  photos: [
    {
      id: "p1",
      imageUrl: "data:image/png;base64,photo",
      caption: "Overview of lift",
    },
  ],
});

describe("entry helpers", () => {
  it("adds entries of each type and updates details", () => {
    let data = ensureFsrDocData({});
    data = addEntryWithEffects(data, issueEntry);
    data = addEntryWithEffects(data, correctionEntry);
    data = addEntryWithEffects(data, orderPartsEntry);
    data = addEntryWithEffects(data, docRequestEntry);
    data = addEntryWithEffects(data, followUpEntry);
    data = addEntryWithEffects(data, commentaryEntry);
    data = addEntryWithEffects(data, internalEntry);

    expect(data.entries.map((entry) => entry.type)).toEqual([
      "issue",
      "correction",
      "orderParts",
      "docRequest",
      "followUp",
      "commentary",
      "internal",
    ]);
    expect(data.issues.length).toBe(1);
    expect(data.details.partsNeeded).toHaveLength(2);
    expect(data.details.partsNeeded.map((item) => item.text)).toContain("123 — Photo eye (Qty 2)");
    expect(data.details.partsNeeded.map((item) => item.text)).toContain("456 — Controller (Qty 1)");
  });
});

describe("mergePartsNeeded", () => {
  it("dedupes parts by part number and description and sums quantity", () => {
    const existing = [{ id: "manual-1", text: "Custom shim" }];
    const entries = [
      {
        type: "orderParts",
        parts: [
          { id: "p1", partNo: "100", desc: "Sensor", qty: "1" },
          { id: "p2", partNo: "200", desc: "Controller", qty: "2" },
        ],
      },
      {
        type: "orderParts",
        parts: [{ id: "p3", partNo: "100", desc: "Sensor", qty: "2" }],
      },
    ];

    const merged = mergePartsNeeded(existing, entries);
    expect(merged).toHaveLength(3);
    expect(merged[0].text).toBe("100 — Sensor (Qty 3)");
    expect(merged[1].text).toBe("200 — Controller (Qty 2)");
    expect(merged[2].text).toBe("Custom shim");

    const rerun = mergePartsNeeded(merged, entries);
    expect(rerun[0].text).toBe("100 — Sensor (Qty 3)");
    expect(rerun).toHaveLength(3);
  });
});

describe("computeDowntimeMinutes", () => {
  it("handles DST spring forward without negative values", () => {
    const start = "2024-03-10T01:30:00-06:00"; // CST before DST jump
    const end = "2024-03-10T03:30:00-05:00"; // CDT after jump
    const minutes = computeDowntimeMinutes(start, end);
    expect(minutes).toBe(60);
    expect(Number.isInteger(minutes)).toBe(true);
    expect(minutes).toBeGreaterThanOrEqual(0);
  });
});

describe("buildReportHtml", () => {
  it("creates a printable document with key sections", () => {
    const report = makeReport([
      issueEntry,
      correctionEntry,
      orderPartsEntry,
      docRequestEntry,
      followUpEntry,
      commentaryEntry,
    ]);

    const html = buildReportHtml(report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Field Service Report");
    expect(html).toContain(report.jobNo);
    expect(html).toContain("Documents");
    expect(html).toContain("Core Details");
    expect(html).toContain("Parts Needed");
    expect(html).toContain("Corrections");
    expect(html).toContain("Document Requests");
    expect(html).toContain("Follow-Ups");
    expect(html).toContain("Issues");
    expect(html).toContain("Field Pictures");
    expect(html).toContain("<td>123</td>");
    expect(html).toContain("<td>Photo eye</td>");
    expect(html).toContain("Cleared alarms &amp; checked &lt;safety&gt;");
  });

  it("excludes internal entries from export output", () => {
    const report = makeReport([commentaryEntry, internalEntry, issueEntry]);
    const html = buildReportHtml(report);

    expect(html).toContain("Commentary #1");
    expect(html).not.toContain("Customer requested discount");
  });

  it("renders multiple photos for a single issue entry", () => {
    const report = makeReport([issueEntry]);
    const html = buildReportHtml(report);
    const photoMatches = html.match(/Issue photo \d+/g) || [];
    expect(photoMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a photo grid for corrections with multiple photos", () => {
    const multiCorrection = {
      ...correctionEntry,
      id: "entry-correction-grid",
      photos: [
        { id: "corr-1", imageUrl: "data:image/png;base64,corr1" },
        { id: "corr-2", imageUrl: "data:image/png;base64,corr2" },
      ],
    };
    const report = makeReport([multiCorrection]);
    const html = buildReportHtml(report);
    const matches = html.match(/Correction photo \d+/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("injects current user details into the header", () => {
    const report = makeReport([]);
    const html = buildReportHtml(report, { name: "Alex Tech", email: "alex@pflow.com" });
    expect(html).toContain("Alex Tech — Field Service Tech");
    expect(html).toContain("alex@pflow.com");
  });
});
