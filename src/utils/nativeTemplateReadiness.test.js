import { describe, expect, it } from "vitest";
import { missingFieldsForTemplate, templateReadiness } from "./nativeTemplateReadiness";

const report = {
  jobNo: "J12345",
  model: "F",
  startAt: "2026-09-21T08:00",
  sharedSite: {
    serialNumberText: "21136",
    jobName: "Startup Site",
    siteStreetAddress: "1 Main St",
    siteCity: "Johnstown",
    siteState: "PA",
  },
  documents: [{
    name: "Field Service Report",
    data: { entries: [{ note: "Startup completed." }] },
  }],
};

describe("native template readiness", () => {
  it("marks a populated field service report ready", () => {
    expect(templateReadiness({ id: "field-service-report" }, { id: "start up:field-service-report" }, report, { name: "F. Madera" })).toMatchObject({
      status: "draft",
      ready: true,
      missing: [],
      missingItems: [],
    });
  });

  it("lists actionable missing motor-test fields", () => {
    const missing = missingFieldsForTemplate("motor-test", report, { name: "F. Madera" });
    expect(missing).toContain("Motor manufacturer");
    expect(missing).toContain("Test date");
    expect(missing).not.toContain("Job number");
  });

  it("requires report details when the FSR has no populated entries", () => {
    const empty = {
      ...report,
      documents: [{ name: "Field Service Report", data: { entries: [] } }],
    };
    expect(missingFieldsForTemplate("field-service-report", empty, { name: "F. Madera" })).toContain("Report details");
  });

  it("distinguishes unavailable, incomplete, draft, and completed documents", () => {
    expect(templateReadiness({ id: "service-summary" }, null, report, { name: "F. Madera" }).status).toBe("missing-template");
    expect(templateReadiness({ id: "motor-test" }, { id: "motor" }, report, { name: "F. Madera" }).status).toBe("incomplete");
    const completed = { ...report, documents: report.documents.map((doc) => ({ ...doc, done: true })) };
    expect(templateReadiness({ id: "field-service-report" }, { id: "fsr" }, completed, { name: "F. Madera" }).status).toBe("completed");
  });

  it("returns navigation targets and uses only numeric lift serials accepted by export", () => {
    const invalidSerial = { ...report, sharedSite: { ...report.sharedSite, serialNumberText: "M-21136" } };
    const readiness = templateReadiness({ id: "field-service-report" }, { id: "fsr" }, invalidSerial, { name: "F. Madera" });
    expect(readiness.missing).toContain("Serial number");
    expect(readiness.missingItems.find((entry) => entry.label === "Serial number").target).toEqual({
      documentName: "Service Summary",
      selector: "#shared-serial-number",
    });
  });
});
