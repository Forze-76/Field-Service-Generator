import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { fillPdfTemplate, outputFilename } from "./nativeTemplates";

describe("native template exports", () => {
  it("fills a PDF field while preserving a native PDF form", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage();
    const field = source.getForm().createTextField("Job Name");
    field.addToPage(page, { x: 20, y: 20, width: 200, height: 20 });
    const blob = new Blob([await source.save()], { type: "application/pdf" });

    const result = await fillPdfTemplate(blob, "service-summary", {
      jobNo: "J#12345",
      model: "M",
      sharedSite: { jobName: "Test Startup" },
      documents: [],
    }, { name: "F. Madera" });

    const bytes = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(result);
    });
    const completed = await PDFDocument.load(bytes);
    expect(completed.getForm().getTextField("Job Name").getText()).toBe("Test Startup");
    expect(completed.getForm().getFields()).toHaveLength(1);
  });

  it("creates a native-format filename", () => {
    expect(outputFilename({ label: "Motor Test Data Sheet", format: "pdf" }, {
      startAt: "2026-09-21T08:00",
      jobNo: "J#12345",
    })).toBe("2026.09.21 Motor Test Data Sheet - J#12345.pdf");
  });
});
