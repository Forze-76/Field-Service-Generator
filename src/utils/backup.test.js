import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  createBackupPayload,
  parseBackup,
  serializeBackup,
} from "./backup";

const report = {
  id: "report-1",
  jobNo: "J#20021",
  documents: [],
  photos: [{ id: "photo-1", imageUrl: "data:image/jpeg;base64,d29ybGQ=" }],
};

describe("report backup", () => {
  it("round-trips reports and embedded photos", () => {
    const parsed = parseBackup(serializeBackup({ reports: [report], technician: { name: "Tech" } }));
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(parsed.reports).toEqual([report]);
    expect(parsed.reportCount).toBe(1);
  });

  it("does not retain mutable references", () => {
    const payload = createBackupPayload({ reports: [report] });
    payload.reports[0].jobNo = "J#99999";
    expect(report.jobNo).toBe("J#20021");
  });

  it("rejects unrelated or newer backup files", () => {
    expect(() => parseBackup('{"reports":[]}')).toThrow(/not a Field Service Generator backup/i);
    expect(() =>
      parseBackup(
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: BACKUP_SCHEMA_VERSION + 1,
          reports: [],
        }),
      ),
    ).toThrow(/newer version/i);
  });

  it("rejects malformed report records", () => {
    expect(() =>
      parseBackup(
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: BACKUP_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          reports: [{ id: "broken" }],
        }),
      ),
    ).toThrow(/job number/i);
  });

  it("rejects backups with an invalid export date", () => {
    const payload = createBackupPayload({ reports: [] });
    payload.exportedAt = "not-a-date";

    expect(() => parseBackup(JSON.stringify(payload))).toThrow(/invalid export date/i);
  });
});
