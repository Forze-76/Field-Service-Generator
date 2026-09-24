import { exportHeader, exportFsrData, entryText } from "./exportData.js";
import { ensureAcceptanceCertificationData, ensureMotorTestData, makeEmptyServiceSummaryData } from "./fsr.js";

const present = (value) => value === true || (typeof value !== "boolean" && String(value ?? "").trim().length > 0);
const findDoc = (report, name) => (report?.documents || []).find((doc) => (doc.name || "").toLowerCase() === name.toLowerCase());
const site = (report) => report?.sharedSite || {};
const item = (label, value, documentName, selector) => ({ label, value, target: { documentName, selector } });
const commonFields = (report, user) => {
  const header = exportHeader(report, user);
  return [
    item("Job number", header.serial, null, "#report-job-number"),
    item("Model", header.model, null, "#report-model"),
    item("Report date", header.date, null, "#report-start-date"),
    item("Technician", header.technician, null, "#report-technician"),
  ];
};
const documentFields = (templateId, report) => {
  if (["field-service-report", "internal-field-service-report"].includes(templateId)) {
    const data = exportFsrData(report, templateId === "internal-field-service-report");
    return [item("Company name", site(report).jobName, "Service Summary", "#shared-job-name"), item("Site address", site(report).siteStreetAddress, "Service Summary", "#shared-site-address"), item("Report details", present(data.details.workSummary) || data.entries.some((entry) => present(entryText(entry)) || entry.photos?.length), "Field Service Report", "#fsr-add-entry")];
  }
  if (templateId === "service-summary") {
    const data = { ...makeEmptyServiceSummaryData(), ...(findDoc(report, "Service Summary")?.data || {}) };
    return [item("Company name", site(report).jobName, "Service Summary", "#shared-job-name"), item("Service performed", data.servicePerformed, "Service Summary", "#service-performed"), item("Time log", (data.timeLogs || []).some((row) => present(row.date) && present(row.timeIn) && present(row.timeOut)), "Service Summary", "#service-time-log")];
  }
  if (templateId === "acceptance-certification") {
    const data = ensureAcceptanceCertificationData(findDoc(report, "Acceptance Certificate")?.data);
    return [item("Customer contact", data.customerContactName, "Acceptance Certificate", "#acceptance-customer-contact"), item("Load capacity", data.loadCapacity, "Acceptance Certificate", "#acceptance-load-capacity"), item("Startup date", data.startupDate, "Acceptance Certificate", "#acceptance-startup-date"), item("Accepted by", data.acceptedByName, "Acceptance Certificate", "#acceptance-accepted-by"), item("Acceptance date", data.acceptanceDate, "Acceptance Certificate", "#acceptance-date")];
  }
  if (templateId === "motor-test") {
    const data = ensureMotorTestData(findDoc(report, "Motor Test Data")?.data);
    return [item("Motor manufacturer", data.motor.manufacturer, "Motor Test Data", "[aria-label='Motor manufacturer']"), item("Motor serial number", data.motor.serialNumber, "Motor Test Data", "[aria-label='Motor serial number']"), item("Motor HP", data.motor.hp, "Motor Test Data", "[aria-label='Motor HP']"), item("Motor VAC", data.motor.vac, "Motor Test Data", "[aria-label='Motor voltage']"), item("Motor RPM", data.motor.rpm, "Motor Test Data", "[aria-label='Motor RPM']"), item("Motor FLA", data.motor.fla, "Motor Test Data", "[aria-label='Motor FLA']"), item("Rated load", data.ratedLoad, "Motor Test Data", "[aria-label='Rated load']"), item("Tested load", data.testedLoad, "Motor Test Data", "[aria-label='Tested load']"), item("Test date", data.testDate, "Motor Test Data", "[aria-label='Test date']")];
  }
  if (templateId === "inspection-workbook") return [item("Company name", site(report).jobName, "Service Summary", "#shared-job-name"), item("Location", site(report).siteCity || site(report).siteState, "Service Summary", "#shared-city")];
  return [];
};
const documentNameForTemplate = (id) => ({ "field-service-report": "Field Service Report", "internal-field-service-report": "Field Service Report", "service-summary": "Service Summary", "acceptance-certification": "Acceptance Certificate", "motor-test": "Motor Test Data", "inspection-workbook": "Inspection Sheet" })[id];
export const missingItemsForTemplate = (id, report, user) => [...commonFields(report, user), ...documentFields(id, report)].filter(({ value }) => !present(value));
export const missingFieldsForTemplate = (id, report, user) => missingItemsForTemplate(id, report, user).map(({ label }) => label);
export const templateReadiness = (definition, record, report, user) => {
  if (!record) return { status: "missing-template", ready: false, missing: [], missingItems: [] };
  const missingItems = missingItemsForTemplate(definition.id, report, user);
  const source = findDoc(report, documentNameForTemplate(definition.id));
  const status = missingItems.length ? "incomplete" : source?.done ? "completed" : "draft";
  return { status, ready: missingItems.length === 0, missing: missingItems.map(({ label }) => label), missingItems };
};
