import { describe, expect, it } from "vitest";
import { buildReportHtml } from "./fsr";

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
      data: {
        issues: [
          {
            id: "i1",
            note: "Cleared alarms & checked <safety>",
            imageUrl: "data:image/png;base64,issue",
            createdAt: new Date("2024-01-01T08:30:00Z").toISOString(),
          },
        ],
      },
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
    expect(html).toContain("Cleared alarms &amp; checked &lt;safety&gt;");
  });
});
