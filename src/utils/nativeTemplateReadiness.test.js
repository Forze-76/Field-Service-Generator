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
    expect(templateReadiness({ id: "field-service-report" }, { id: "start up:field-service-report" }, report, { name: "F. Madera" })).toEqual({
      status: "ready",
      ready: true,
      missing: [],
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

  it("distinguishes an unavailable template from an incomplete document", () => {
    expect(templateReadiness({ id: "service-summary" }, null, report, { name: "F. Madera" }).status).toBe("missing-template");
  });
});
