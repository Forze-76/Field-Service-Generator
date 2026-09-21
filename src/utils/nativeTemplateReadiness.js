import {
  ensureAcceptanceCertificationData,
  ensureMotorTestData,
  makeEmptyServiceSummaryData,
} from "./fsr.js";

const present = (value) => value === true || (
  typeof value !== "boolean" && String(value ?? "").trim().length > 0
);
const findDoc = (report, name) =>
  (report?.documents || []).find((doc) => (doc.name || "").toLowerCase() === name.toLowerCase());
const site = (report) => report?.sharedSite || {};

const commonFields = (report) => [
  ["Job number", report?.jobNo],
  ["Serial number", site(report).serialNumberText || report?.serialNumber],
  ["Model", report?.model],
  ["Report date", report?.startAt],
];

const documentFields = (templateId, report, user) => {
  if (templateId === "field-service-report" || templateId === "internal-field-service-report") {
    const entries = findDoc(report, "Field Service Report")?.data?.entries || [];
    return [
      ["Company name", site(report).jobName],
      ["Site address", site(report).siteStreetAddress],
      ["Report details", entries.some((entry) => present(entry.note || entry.followUp?.details || entry.documentRequest?.note || entry.commentary || entry.title))],
    ];
  }
  if (templateId === "service-summary") {
    const data = { ...makeEmptyServiceSummaryData(), ...(findDoc(report, "Service Summary")?.data || {}) };
    return [
      ["Company name", site(report).jobName],
      ["Service performed", data.servicePerformed],
      ["Time log", (data.timeLogs || []).some((row) => present(row.date) && present(row.timeIn) && present(row.timeOut))],
    ];
  }
  if (templateId === "acceptance-certification") {
    const data = ensureAcceptanceCertificationData(findDoc(report, "Acceptance Certificate")?.data);
    return [
      ["Customer contact", data.customerContactName],
      ["Load capacity", data.loadCapacity],
      ["Startup date", data.startupDate],
      ["Accepted by", data.acceptedByName],
      ["Acceptance date", data.acceptanceDate],
    ];
  }
  if (templateId === "motor-test") {
    const data = ensureMotorTestData(findDoc(report, "Motor Test Data")?.data);
    return [
      ["Motor manufacturer", data.motor.manufacturer],
      ["Motor serial number", data.motor.serialNumber],
      ["Motor HP", data.motor.hp],
      ["Motor VAC", data.motor.vac],
      ["Motor RPM", data.motor.rpm],
      ["Motor FLA", data.motor.fla],
      ["Rated load", data.ratedLoad],
      ["Tested load", data.testedLoad],
      ["Test date", data.testDate],
    ];
  }
  if (templateId === "inspection-workbook") {
    return [
      ["Company name", site(report).jobName],
      ["Location", site(report).siteCity || site(report).siteState],
      ["Performed by", user?.name],
    ];
  }
  return [];
};

export const missingFieldsForTemplate = (templateId, report, user) =>
  [...commonFields(report), ...documentFields(templateId, report, user)]
    .filter(([, value]) => !present(value))
    .map(([label]) => label);

export const templateReadiness = (definition, record, report, user) => {
  if (!record) return { status: "missing-template", ready: false, missing: [] };
  const missing = missingFieldsForTemplate(definition.id, report, user);
  return { status: missing.length ? "incomplete" : "ready", ready: missing.length === 0, missing };
};
