import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { getStoredTemplate, identifyTemplate, listStoredTemplates, saveTemplateFile, templatesForTrip } from "./templateStore";

describe("native document template storage", () => {
  let indexedDBImpl;

  beforeEach(() => {
    indexedDBImpl = new IDBFactory();
  });

  it("identifies each supported native format", () => {
    expect(identifyTemplate("2026 Service Summary Form.pdf")?.id).toBe("service-summary");
    expect(identifyTemplate("INTERNAL ONLY Field Service Report.docx")?.id).toBe("internal-field-service-report");
    expect(identifyTemplate("2026.MM.DD Inspection Template.xlsx")?.id).toBe("inspection-workbook");
  });

  it("stores template bytes in IndexedDB", async () => {
    const file = new File(["template-bytes"], "2026 Acceptance Certification.pdf", { type: "application/pdf" });
    await saveTemplateFile(file, indexedDBImpl);

    const records = await listStoredTemplates(indexedDBImpl);
    const stored = await getStoredTemplate("acceptance-certification", indexedDBImpl);
    expect(records).toHaveLength(1);
    expect(stored.filename).toBe(file.name);
    expect(stored.size).toBe(file.size);
  });

  it("keeps copies of the same template separate for each trip type", async () => {
    const service = new File(["service"], "2026 Service Summary Form.pdf", { type: "application/pdf" });
    const startup = new File(["startup"], "2026 Service Summary Form.pdf", { type: "application/pdf" });
    await saveTemplateFile(service, indexedDBImpl, { tripType: "Service" });
    await saveTemplateFile(startup, indexedDBImpl, { tripType: "Start Up" });

    const records = await listStoredTemplates(indexedDBImpl);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.id).sort()).toEqual([
      "service:service-summary",
      "start up:service-summary",
    ]);
  });

  it("returns the five native documents used by Start Up", () => {
    expect(templatesForTrip("Start Up").map((template) => template.id)).toEqual([
      "service-summary",
      "acceptance-certification",
      "motor-test",
      "field-service-report",
      "internal-field-service-report",
    ]);
  });
});
