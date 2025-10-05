import { describe, expect, it } from "vitest";
import { buildReportHtml, computeDowntimeMinutes, makeEmptyFSRData } from "./fsr";

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
        data.issues = [
          {
            id: "i1",
            note: "Cleared alarms & checked <safety>",
            imageUrl: "data:image/png;base64,issue",
            createdAt: new Date("2024-01-01T08:30:00Z").toISOString(),
          },
        ];
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
});
