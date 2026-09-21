export const BACKUP_FORMAT = "field-service-generator-backup";
export const BACKUP_SCHEMA_VERSION = 1;

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

export function createBackupPayload({ reports, technician } = {}) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    technician: technician
      ? { name: technician.name || "", email: technician.email || "" }
      : null,
    reportCount: Array.isArray(reports) ? reports.length : 0,
    reports: cloneJson(Array.isArray(reports) ? reports : []),
  };
}

export function serializeBackup(options) {
  return JSON.stringify(createBackupPayload(options), null, 2);
}

const validateReport = (report, index) => {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`Report ${index + 1} is not a valid report object.`);
  }
  if (typeof report.id !== "string" || !report.id) {
    throw new Error(`Report ${index + 1} is missing its identifier.`);
  }
  if (typeof report.jobNo !== "string") {
    throw new Error(`Report ${index + 1} is missing its job number.`);
  }
  if (!Array.isArray(report.documents)) {
    throw new Error(`Report ${index + 1} has invalid document data.`);
  }
};

export function parseBackup(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!payload || payload.format !== BACKUP_FORMAT) {
    throw new Error("This is not a Field Service Generator backup.");
  }
  if (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 1) {
    throw new Error("The backup has an invalid schema version.");
  }
  if (payload.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error("This backup was created by a newer version of the app.");
  }
  if (!Array.isArray(payload.reports)) {
    throw new Error("The backup does not contain a valid reports list.");
  }
  if (
    typeof payload.exportedAt !== "string" ||
    Number.isNaN(Date.parse(payload.exportedAt))
  ) {
    throw new Error("The backup has an invalid export date.");
  }
  payload.reports.forEach(validateReport);

  return {
    ...payload,
    reports: cloneJson(payload.reports),
    reportCount: payload.reports.length,
  };
}

const backupFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `field-service-backup-${date}.json`;
};

export async function shareOrDownloadBackup(options) {
  const json = serializeBackup(options);
  const filename = backupFilename();
  const file = new File([json], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Field Service Generator backup",
      text: "Complete report backup, including report photos.",
      files: [file],
    });
    return { method: "share", filename };
  }

  const url = URL.createObjectURL(file);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { method: "download", filename };
}
