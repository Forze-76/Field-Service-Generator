import { describe, expect, it } from "vitest";
import {
  buildReportHtml,
  computeDowntimeMinutes,
  makeEmptyFSRData,
  mergeFsrData,
  entriesToLegacyIssues,
  mergePartsNeededFromEntry,
} from "./fsr";

const sampleReport = {
  id: "r1",
  jobNo: "J#1234",
  tripType: "Service",
  model: "M",
  startAt: new Date("2024-01-01T08:00:00Z").toISOString(),
  endAt: new Date("2024-01-01T10:00:00Z").toISOString(),
  serialTagImageUrl: "data:image/png;base64,serial",
  serialTagMissing: false,
  documents: [
    {
      id: "d1",
      name: "Field Service Report",
      done: true,
      data: (() => {
        const data = makeEmptyFSRData();
        data.details.workSummary = "Checked hydraulics";
        data.details.correctionsMade = "Replaced solenoid";
        data.details.enabled.partsInstalled = true;
        data.details.partsInstalled = [{ id: "p1", text: "Hydraulic pump" }];
        data.entries = [
          {
            id: "e1",
            type: "issue",
            note: "Cleared alarms & checked <safety>",
            photos: [
              { id: "ph1", imageUrl: "data:image/png;base64,issue" },
              { id: "ph2", imageUrl: "data:image/png;base64,issue2" },
            ],
            createdAt: new Date("2024-01-01T08:30:00Z").toISOString(),
            collapsed: false,
          },
        ];
        data.issues = entriesToLegacyIssues(data.entries);
        return data;
      })(),
    },
  ],
  photos: [
    {
      id: "p1",
      imageUrl: "data:image/png;base64,photo",
      caption: "Overview of lift",
    },
  ],
};

describe("buildReportHtml", () => {
  it("creates a printable document with key sections", () => {
    const html = buildReportHtml(sampleReport);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Field Service Report");
    expect(html).toContain(sampleReport.jobNo);
    expect(html).toContain("Field Service Report – Issues");
    expect(html).toContain("Field Pictures");
    expect(html).toContain("Report Details (Core)");
    expect(html).toContain("Cleared alarms &amp; checked &lt;safety&gt;");
    expect((html.match(/Entry photo/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("computeDowntimeMinutes", () => {
  it("calculates whole minutes when end is after start", () => {
    const start = "2024-01-01T08:00";
    const end = "2024-01-01T09:30";
    expect(computeDowntimeMinutes(start, end)).toBe(90);
  });

  it("returns zero when end precedes start", () => {
    const start = "2024-01-01T10:00";
    const end = "2024-01-01T09:00";
    expect(computeDowntimeMinutes(start, end)).toBe(0);
  });

  it("returns zero when values are missing", () => {
    expect(computeDowntimeMinutes("", "")).toBe(0);
    expect(computeDowntimeMinutes(undefined, "2024-01-01T09:00")).toBe(0);
  });
});

describe("entries helpers", () => {
  it("converts legacy issues into entries during merge", () => {
    const legacyIssue = {
      id: "legacy1",
      note: "Legacy issue",
      imageUrl: "data:image/png;base64,legacy",
      createdAt: new Date("2024-02-01T10:00:00Z").toISOString(),
    };
    const merged = mergeFsrData({ issues: [legacyIssue] });
    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0].photos).toHaveLength(1);
    expect(merged.entries[0].photos[0].imageUrl).toBe(legacyIssue.imageUrl);
    const roundTrip = entriesToLegacyIssues(merged.entries);
    expect(roundTrip).toHaveLength(1);
    expect(roundTrip[0].imageUrl).toBe(legacyIssue.imageUrl);
  });

  it("merges order parts entry rows into details", () => {
    const details = makeEmptyFSRData().details;
    const entryParts = [
      { id: "row1", partNo: "PN-100", desc: "Hydraulic valve", qty: "2" },
      { id: "row2", partNo: "PN-200", desc: "Sensor", qty: "1" },
    ];
    const mergedDetails = mergePartsNeededFromEntry(details, "entry-1", entryParts);
    expect(mergedDetails.partsNeeded).toHaveLength(2);
    expect(mergedDetails.partsNeeded[0]).toMatchObject({ entryId: "entry-1", partNumber: "PN-100", description: "Hydraulic valve" });
    expect(mergedDetails.enabled.partsNeeded).toBe(true);

    const cleared = mergePartsNeededFromEntry(mergedDetails, "entry-1", []);
    expect(cleared.partsNeeded.some((row) => row.entryId === "entry-1")).toBe(false);
  });
});

describe("export visibility", () => {
  const makeReportWithDetails = (configure) => {
    const base = JSON.parse(JSON.stringify(sampleReport));
    const fsrDoc = base.documents[0];
    const fsrData = makeEmptyFSRData();
    fsrData.details.partsInstalled = [{ id: "p1", text: "Hydraulic pump" }];
    fsrData.details.enabled.partsInstalled = false;
    fsrData.details.enabled.partsNeeded = false;
    fsrData.details.enabled.measurements = false;
    fsrData.details.enabled.downtime = false;
    fsrData.details.enabled.siteRequestsRich = false;
    fsrData.details.enabled.followUps = false;
    fsrData.details.enabled.customerAck = false;
    fsrData.issues = [];
    configure(fsrData.details);
    fsrDoc.data = fsrData;
    return base;
  };

  it("omits disabled modules", () => {
    const report = makeReportWithDetails((details) => {
      details.enabled.partsInstalled = false;
    });
    const html = buildReportHtml(report);
    expect(html).not.toContain("Parts Installed</b>");
  });

  it("omits enabled but empty modules", () => {
    const report = makeReportWithDetails((details) => {
      details.enabled.partsInstalled = true;
      details.partsInstalled = [];
    });
    const html = buildReportHtml(report);
    expect(html).not.toContain("Parts Installed</b>");
  });

  it("includes enabled and populated modules", () => {
    const report = makeReportWithDetails((details) => {
      details.enabled.partsInstalled = true;
    });
    const html = buildReportHtml(report);
    expect(html).toContain("Parts Installed</b>");
    expect(html).toContain("Hydraulic pump");
  });

  it("excludes internal entries from the export output", () => {
    const report = makeReportWithDetails(() => {});
    const fsrDoc = report.documents[0];
    const createdAt = new Date("2024-03-01T09:00:00Z").toISOString();
    fsrDoc.data.entries = [
      { id: "internal1", type: "internal", note: "Technician-only notes", createdAt },
      { id: "comment1", type: "commentary", note: "Customer saw normal wear", createdAt },
    ];
    fsrDoc.data.issues = entriesToLegacyIssues(fsrDoc.data.entries);
    const html = buildReportHtml(report);
    expect(html).toContain("Commentary");
    expect(html).toContain("Customer saw normal wear");
    expect(html).not.toContain("Technician-only notes");
  });

  it("includes entry sections when present", () => {
    const report = makeReportWithDetails(() => {});
    const fsrDoc = report.documents[0];
    const createdAt = new Date("2024-04-01T10:00:00Z").toISOString();
    fsrDoc.data.entries = [
      {
        id: "cor1",
        type: "correction",
        note: "Replaced worn rollers",
        photos: [{ id: "pc1", imageUrl: "data:image/png;base64,cor" }],
        createdAt,
      },
      {
        id: "doc1",
        type: "docRequest",
        docKind: "pm",
        docNotes: "Send latest checklist",
        createdAt,
      },
      {
        id: "follow1",
        type: "followUp",
        followUp: { title: "Schedule return visit", details: "Verify alignment" },
        createdAt,
      },
      { id: "internal1", type: "internal", note: "Do not share", createdAt },
      {
        id: "commentary1",
        type: "commentary",
        note: "Customer happy with adjustments",
        createdAt,
      },
      {
        id: "parts1",
        type: "orderParts",
        parts: [{ id: "op1", partNo: "PN-123", desc: "Lift chain", qty: "2" }],
        createdAt,
      },
      {
        id: "issue1",
        type: "issue",
        note: "Hydraulic leak at base",
        photos: [
          { id: "iss1", imageUrl: "data:image/png;base64,issue-a" },
          { id: "iss2", imageUrl: "data:image/png;base64,issue-b" },
        ],
        createdAt,
      },
    ];
    fsrDoc.data.issues = entriesToLegacyIssues(fsrDoc.data.entries);
    const html = buildReportHtml(report);
    expect(html).toContain("Corrections");
    expect(html).toContain("Correction #1");
    expect(html).toContain("Document Requests");
    expect(html).toContain("PM Checklists");
    expect(html).toContain("Follow-Up Items");
    expect(html).toContain("Schedule return visit");
    expect(html).toContain("Commentary");
    expect(html).toContain("Customer happy with adjustments");
    expect(html).toContain("Order Parts Entries");
    expect(html).toContain("Lift chain");
    expect(html).toContain("Field Service Report – Issues");
    expect((html.match(/Entry photo/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain("Do not share");
  });
});
