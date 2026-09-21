import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  ensureAcceptanceCertificationData,
  ensureMotorTestData,
  makeEmptyServiceSummaryData,
} from "./fsr.js";

const text = (value) => String(value ?? "").trim();
const blobBytes = (blob) => {
  if (typeof blob?.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Unable to read template file"));
    reader.readAsArrayBuffer(blob);
  });
};
const dateDisplay = (value) => {
  if (!value) return "";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : String(value);
};
const findDoc = (report, name) =>
  (report.documents || []).find((doc) => (doc.name || "").toLowerCase() === name.toLowerCase());
const shared = (report) => report.sharedSite || {};

const safeSetText = (form, name, value) => {
  try {
    form.getTextField(name).setText(text(value));
  } catch {
    // Template revisions can omit optional fields.
  }
};
const safeCheck = (form, name, checked) => {
  try {
    const field = form.getCheckBox(name);
    if (checked) field.check();
    else field.uncheck();
  } catch {
    // Template revisions can omit optional fields.
  }
};

const modelFields = ["B", "D", "DB", "F", "M", "MQ", "21", "CV"];
const fillCommonPdf = (form, report) => {
  const site = shared(report);
  safeSetText(form, "PFlow Serial Number", site.serialNumberText || report.serialNumber || "");
  safeSetText(form, "Job Name", site.jobName || report.jobNo);
  safeSetText(form, "Site Street Address", site.siteStreetAddress);
  safeSetText(form, "Site Mailing Address", site.siteMailingAddress);
  safeSetText(form, "Site City", site.siteCity);
  safeSetText(form, "State", site.siteState);
  safeSetText(form, "Zip Code", site.siteZip);
  modelFields.forEach((model) => safeCheck(form, model, report.model === model));
  if (!modelFields.includes(report.model)) safeSetText(form, "Other", report.model);
  if (!modelFields.includes(report.model)) safeSetText(form, "Other Model", report.model);
};

const fillServiceSummary = (form, report, user) => {
  fillCommonPdf(form, report);
  const data = { ...makeEmptyServiceSummaryData(), ...(findDoc(report, "Service Summary")?.data || {}) };
  (data.timeLogs || []).slice(0, 7).forEach((row, index) => {
    const suffix = index === 0 ? "" : `_${index + 1}`;
    safeSetText(form, `Date${suffix}`, dateDisplay(row.date));
    safeSetText(form, `Time in${suffix}`, row.timeIn);
    safeSetText(form, `Time out${suffix}`, row.timeOut);
    safeSetText(form, `Travel time${suffix}`, row.travelTime);
  });
  safeSetText(form, "Reason for visit", report.tripType);
  safeSetText(form, "Service performed", data.servicePerformed);
  safeSetText(form, "Additional notes", data.additionalNotes);
  safeSetText(form, "PM Contact", data.pmContact || data.supervisorNameEmail);
  safeSetText(form, "Customer Contact", data.customerContact || data.managerNameEmail);
  safeSetText(form, "Acceptance date", dateDisplay(data.acceptanceDate));
  safeSetText(form, "Tech 1", user?.name || "F. Madera");
};

const fillAcceptance = (form, report, user) => {
  fillCommonPdf(form, report);
  const data = ensureAcceptanceCertificationData(findDoc(report, "Acceptance Certificate")?.data);
  safeSetText(form, "Customer Contact Name", data.customerContactName);
  safeSetText(form, "Customer Title", data.customerContactTitle);
  safeSetText(form, "Phone", data.customerContactPhone);
  safeSetText(form, "Extension", data.customerContactExt);
  safeSetText(form, "EMail", data.customerContactEmail);
  safeSetText(form, "Load Capacity", data.loadCapacity);
  safeSetText(form, "Startup Date", dateDisplay(data.startupDate));
  safeSetText(form, "Percentage", data.loadTest.percent);
  safeCheck(form, "Load Test Y", data.loadTest.yes);
  safeCheck(form, "1", !data.loadTest.yes);
  safeCheck(form, "Op Test Y", data.operationTestYes);
  safeCheck(form, "Op Test N", !data.operationTestYes);
  safeCheck(form, "Gate Op Y", data.gateInterlock === "yes");
  safeCheck(form, "Gate Op N", data.gateInterlock === "no");
  safeCheck(form, "Gate Op NA", data.gateInterlock === "na");
  safeSetText(form, "Customer initials", data.customerInitials);
  safeSetText(form, "Comments", data.operationComments);
  safeSetText(form, "Other Test", data.otherTest1);
  safeSetText(form, "Other Test_2", data.otherTest2);
  safeSetText(form, "Name", data.instructed1.name);
  safeSetText(form, "Company_3", data.instructed1.company);
  safeSetText(form, "Name_2", data.instructed2.name);
  safeSetText(form, "Company_4", data.instructed2.company);
  safeSetText(form, "Customer Name and Phone", [data.acceptedByName, data.customerContactPhone].filter(Boolean).join(" / "));
  safeSetText(form, "Customer Job Title", data.acceptedByTitle);
  safeSetText(form, "Customer Company", data.acceptedByCompany || data.customerCompany);
  safeSetText(form, "Acceptance Date", dateDisplay(data.acceptanceDate));
  safeSetText(form, "Name_3", data.pflowRepName || user?.name || "F. Madera");
  safeSetText(form, "Company_5", "PFlow Industries");
  safeSetText(form, "Acceptance Notes", data.acceptanceNotes);
};

const fillMotorTest = (form, report, user) => {
  fillCommonPdf(form, report);
  safeSetText(form, "CustomerUser", shared(report).jobName || report.jobNo);
  if (!["B", "D", "DB", "F", "M", "MQ", "21", "CV"].includes(report.model)) {
    safeSetText(form, "Text9", report.model);
  }
  ["B", "D", "DB", "F", "M", "MQ", "21", "CV"].forEach((model, index) =>
    safeCheck(form, `Check Box${index + 1}`, report.model === model),
  );
  const data = ensureMotorTestData(findDoc(report, "Motor Test Data")?.data);
  const map = {
    Manufacturer: data.motor.manufacturer, "Serial Number": data.motor.serialNumber,
    "Schematic Number": data.motor.schematicNumber, HP: data.motor.hp, VAC: data.motor.vac,
    RPM: data.motor.rpm, FLA: data.motor.fla, "Rated Load": data.ratedLoad,
    "Tested Load": data.testedLoad, Date: dateDisplay(data.testDate),
    Name: data.testedByName || user?.name || "F. Madera", Title: data.testedByTitle || "Field Service Tech",
    "Service Company": data.serviceCompany || "PFlow Industries",
    "L1-L2": data.voltIncoming.l1l2, "L1-L3": data.voltIncoming.l1l3,
    "L2-L3": data.voltIncoming.l2l3, "L1-GND": data.voltIncoming.l1g,
    "L2-GND": data.voltIncoming.l2g, "L3-GND": data.voltIncoming.l3g,
    "L1-L2 AFD": data.voltAfd.l1l2, "L1-L3 AFD": data.voltAfd.l1l3,
    "L2-L3 AFD": data.voltAfd.l2l3, "L1-GND AFD": data.voltAfd.l1g,
    "L2-GND AFD": data.voltAfd.l2g, "L3-GND AFD": data.voltAfd.l3g,
    "Up T1": data.currents.up.unloaded.t1, "Up T2": data.currents.up.unloaded.t2,
    "Up T3": data.currents.up.unloaded.t3, "FL UP T1": data.currents.up.full.t1,
    "FL UP T2": data.currents.up.full.t2, "FL UP T3": data.currents.up.full.t3,
    "Down T1": data.currents.down.unloaded.t1, "Down T2": data.currents.down.unloaded.t2,
    "Down T3": data.currents.down.unloaded.t3, "FL Down T1": data.currents.down.full.t1,
    "FL Down T2": data.currents.down.full.t2, "FL Down T3": data.currents.down.full.t3,
  };
  Object.entries(map).forEach(([name, value]) => safeSetText(form, name, value));
};

export async function fillPdfTemplate(blob, templateId, report, user) {
  const pdf = await PDFDocument.load(await blobBytes(blob));
  const form = pdf.getForm();
  if (templateId === "service-summary") fillServiceSummary(form, report, user);
  if (templateId === "acceptance-certification") fillAcceptance(form, report, user);
  if (templateId === "motor-test") fillMotorTest(form, report, user);
  form.updateFieldAppearances();
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

const replaceAcrossTextNodes = (nodes, needle, value) => {
  const parts = nodes.map((node) => node.textContent || "");
  const combined = parts.join("");
  const start = combined.indexOf(needle);
  if (start < 0) return false;
  const end = start + needle.length;
  let offset = 0;
  let startNode = -1;
  let endNode = -1;
  let startOffset = 0;
  let endOffset = 0;

  parts.forEach((part, index) => {
    const next = offset + part.length;
    if (startNode < 0 && start >= offset && start < next) {
      startNode = index;
      startOffset = start - offset;
    }
    if (endNode < 0 && end > offset && end <= next) {
      endNode = index;
      endOffset = end - offset;
    }
    offset = next;
  });
  if (startNode < 0 || endNode < 0) return false;

  if (startNode === endNode) {
    nodes[startNode].textContent = `${parts[startNode].slice(0, startOffset)}${value}${parts[startNode].slice(endOffset)}`;
    return true;
  }
  nodes[startNode].textContent = `${parts[startNode].slice(0, startOffset)}${value}`;
  for (let index = startNode + 1; index < endNode; index += 1) nodes[index].textContent = "";
  nodes[endNode].textContent = parts[endNode].slice(endOffset);
  return true;
};

const setParagraphText = (document, needle, value, { exact = false, all = false } = {}) => {
  const paragraphs = [...document.getElementsByTagNameNS("*", "p")];
  const matches = paragraphs.filter((item) => {
    if (item.getElementsByTagNameNS("*", "p").length) return false;
    const current = [...item.getElementsByTagNameNS("*", "t")].map((node) => node.textContent || "").join("");
    return exact ? current.trim() === needle : current.includes(needle);
  });
  let changed = false;
  for (const paragraph of matches) {
    const nodes = [...paragraph.getElementsByTagNameNS("*", "t")];
    const current = nodes.map((node) => node.textContent || "").join("");
    changed = replaceAcrossTextNodes(nodes, exact ? current : needle, value) || changed;
    if (!all) break;
  }
  return changed;
};

const setExactTextNodes = (document, needle, value) => {
  let changed = false;
  [...document.getElementsByTagNameNS("*", "t")].forEach((node) => {
    if ((node.textContent || "").trim() === needle) {
      node.textContent = value;
      changed = true;
    }
  });
  return changed;
};

export async function fillDocxTemplate(blob, report, user, { internal = false } = {}) {
  const zip = await JSZip.loadAsync(await blobBytes(blob));
  const path = "word/document.xml";
  const xml = await zip.file(path).async("text");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const site = shared(report);
  const entries = findDoc(report, "Field Service Report")?.data?.entries || [];
  const details = entries.map((entry, index) => {
    const value = entry.note || entry.followUp?.details || entry.documentRequest?.note || entry.commentary || entry.title;
    return value ? `${index + 1}. ${text(value)}` : "";
  }).filter(Boolean).join("\n");
  setExactTextNodes(document, "MM/DD/YY", dateDisplay(report.startAt));
  const replacements = [
    ["Name of Company", site.jobName || report.jobNo],
    ["Address", site.siteStreetAddress],
    ["City, State, Zip", [site.siteCity, site.siteState, site.siteZip].filter(Boolean).join(", ")],
    ["Contact Name | Title | Contact Phone", site.customerContact || ""],
    ["Name#1 & Name#2", user?.name || "F. Madera", { all: true }],
    ["Serial Number: XXXXX & XXXXX", `Serial Number: ${site.serialNumberText || ""}`, { all: true }],
    ["Model Type: X", `Model Type: ${report.model || ""}`, { all: true }],
    ["To Inspect/PM/Service J#XXXXX & XXXXX", `${report.tripType || "Service"} ${report.jobNo || ""}`],
    ["MM/DD/YY J#XXXXX", `${dateDisplay(report.startAt)} ${report.jobNo || ""}`, { all: true }],
    ["Detail", details || "No report details entered.", { exact: true }],
    ["Mini Description", internal ? "Internal field service notes" : "Summary of Parts and/or Labor"],
  ];
  replacements.forEach(([needle, value, options]) => setParagraphText(document, needle, value, options));
  zip.file(path, new XMLSerializer().serializeToString(document));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

const setCellInlineString = (sheet, reference, value) => {
  const cells = [...sheet.getElementsByTagNameNS("*", "c")];
  const cell = cells.find((item) => item.getAttribute("r") === reference);
  if (!cell) return;
  cell.setAttribute("t", "inlineStr");
  [...cell.children].forEach((child) => {
    if (["v", "f", "is"].includes(child.localName)) cell.removeChild(child);
  });
  const ns = cell.namespaceURI;
  const inline = sheet.createElementNS(ns, "is");
  const node = sheet.createElementNS(ns, "t");
  node.textContent = text(value);
  inline.appendChild(node);
  cell.appendChild(inline);
};

export async function fillXlsxTemplate(blob, report, user) {
  const zip = await JSZip.loadAsync(await blobBytes(blob));
  const workbook = new DOMParser().parseFromString(await zip.file("xl/workbook.xml").async("text"), "application/xml");
  const rels = new DOMParser().parseFromString(await zip.file("xl/_rels/workbook.xml.rels").async("text"), "application/xml");
  const sheetNode = [...workbook.getElementsByTagNameNS("*", "sheet")].find((sheet) => sheet.getAttribute("name") === "General Inspection");
  const relId = sheetNode?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const relationship = [...rels.getElementsByTagNameNS("*", "Relationship")].find((rel) => rel.getAttribute("Id") === relId);
  if (!relationship) throw new Error("General Inspection worksheet was not found.");
  const target = relationship.getAttribute("Target").replace(/^\//, "");
  const sheetPath = target.startsWith("xl/") ? target : `xl/${target}`;
  const sheet = new DOMParser().parseFromString(await zip.file(sheetPath).async("text"), "application/xml");
  const site = shared(report);
  const values = {
    C6: dateDisplay(report.startAt), B9: report.jobNo, C9: report.model,
    D9: site.jobName, E9: [site.siteCity, site.siteState].filter(Boolean).join(", "),
    G9: user?.name || "F. Madera",
  };
  Object.entries(values).forEach(([cell, value]) => setCellInlineString(sheet, cell, value));
  zip.file(sheetPath, new XMLSerializer().serializeToString(sheet));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function buildNativeDocument(record, report, user) {
  if (record.format === "pdf") return fillPdfTemplate(record.blob, record.id, report, user);
  if (record.format === "docx") return fillDocxTemplate(record.blob, report, user, { internal: record.id.startsWith("internal-") });
  if (record.format === "xlsx") return fillXlsxTemplate(record.blob, report, user);
  throw new Error(`Unsupported template format: ${record.format}`);
}

export async function shareOrDownloadDocument(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: filename, files: [file] });
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const outputFilename = (record, report) => {
  const date = String(report.startAt || new Date().toISOString()).slice(0, 10).replace(/-/g, ".");
  const job = text(report.jobNo || "JXXXXX").replace(/[^A-Za-z0-9#-]/g, "-");
  return `${date} ${record.label} - ${job}.${record.format}`;
};
