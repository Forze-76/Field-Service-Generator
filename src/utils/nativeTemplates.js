import { PDFDocument, PDFTextField, PDFCheckBox, PDFSignature, PDFName, StandardFonts } from "pdf-lib";
import { createDocxExport } from "./docxExport.js";
import { exportHeader, partsLaborRows, templateIdentifier, dateDisplay, findExportDoc as findDoc } from "./exportData.js";
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
const shared = (report) => report.sharedSite || {};

const pdfContexts = new WeakMap();
const wrapPdfText = (value, font, size, width) => {
  const lines = [];
  for (const source of String(value).split(/\r?\n/)) {
    let line = '';
    for (const word of source.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
};
const safeSetText = (form, name, value) => {
  const valueText = text(value);
  const field = form.getFieldMaybe(name);
  const context = pdfContexts.get(form);
  if (!(field instanceof PDFTextField)) {
    if (valueText) context?.extra.push([name, valueText]);
    return;
  }
  // Optional fields may be absent; real encoding/length errors must not be hidden.
  field.setMaxLength(undefined);
  const rectangles = field.acroField.getWidgets().map(widget => widget.getRectangle());
  const fitsAt = size => rectangles.every(rect => {
    const width = Math.max(1, rect.width - 6);
    const lines = wrapPdfText(valueText, context.font, size, width);
    return field.isMultiline() ? lines.length * (size + 1) <= rect.height : lines.length === 1;
  });
  const size = fitsAt(9) ? 9 : 8;
  if (valueText && !fitsAt(size)) {
    context.extra.push([name, valueText]);
    const marker = rectangles.every(rect => context.font.widthOfTextAtSize('See continuation', 8) <= rect.width - 4) ? 'See continuation' : '*';
    field.setText(marker);
    context.sizes.set(name, 8);
    field.setFontSize(8);
  } else {
    field.setText(valueText);
    context.sizes.set(name, size);
    field.setFontSize(size);
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
  safeSetText(form, "PFlow Serial Number", exportHeader(report).serial);
  if (form.getFieldMaybe("Job Name")) safeSetText(form, "Job Name", site.jobName || "");
  safeSetText(form, "Site Street Address", site.siteStreetAddress);
  if (form.getFieldMaybe("Site Mailing Address")) safeSetText(form, "Site Mailing Address", site.siteMailingAddress);
  safeSetText(form, "Site City", site.siteCity);
  safeSetText(form, "State", site.siteState);
  safeSetText(form, "Zip Code", site.siteZip);
  if (!form.getFieldMaybe('Check Box1')) {
    const supported = modelFields.filter(model => form.getFieldMaybe(model) instanceof PDFCheckBox);
    supported.forEach(model => safeCheck(form, model, report.model === model));
    if (!supported.includes(report.model)) {
      const other = ['Other', 'Other Model'].find(name => form.getFieldMaybe(name));
      if (other) safeSetText(form, other, report.model);
    }
  }
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
  safeSetText(form, "Tech 1", user?.name || "");
  safeSetText(form, "Parts replaced", partsLaborRows(report).filter(row => row.action === "Installed").map(row => row.description).join("\n"));
};

const fillAcceptance = (form, report, user) => {
  fillCommonPdf(form, report);
  const data = ensureAcceptanceCertificationData(findDoc(report, "Acceptance Certificate")?.data);
  safeSetText(form, "Customer Contact Name", data.customerContactName);
  safeSetText(form, "Customer Title", data.customerContactTitle);
  const phone = text(data.customerContactPhone).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  safeSetText(form, "Area Code", phone.length === 10 ? phone.slice(0,3) : '');
  safeSetText(form, "Phone", phone.length === 10 ? `${phone.slice(3,6)}-${phone.slice(6)}` : data.customerContactPhone);
  safeSetText(form, "Extension", data.customerContactExt);
  safeSetText(form, "EMail", data.customerContactEmail);
  safeSetText(form, "Load Capacity", data.loadCapacity);
  safeSetText(form, "Startup Date", dateDisplay(data.startupDate));
  safeSetText(form, "Percentage", data.loadTest.percent);
  safeCheck(form, "Load Test Y", data.loadTest.yes);
  safeCheck(form, "Check Box9.0.1", findDoc(report, "Acceptance Certificate")?.data?.loadTest?.yes === false);
  safeCheck(form, "Op Test Y", data.operationTestYes);
  safeCheck(form, "Op Test N", findDoc(report, "Acceptance Certificate")?.data?.operationTestYes === false);
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
  safeSetText(form, "Name_3", data.pflowRepName || user?.name || "");
  safeSetText(form, "Company_5", "PFlow Industries");
  safeSetText(form, "Acceptance Notes", data.acceptanceNotes);
};

const fillMotorTest = (form, report, user) => {
  fillCommonPdf(form, report);
  safeSetText(form, "CustomerUser", shared(report).jobName || "");
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
    Name: data.testedByName || user?.name || "", Title: data.testedByTitle || "Field Service Tech",
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
  if (!['service-summary', 'acceptance-certification', 'motor-test'].includes(templateId)) throw new Error('Unsupported PDF template. Synchronize the approved templates again.');
  const pdf = await PDFDocument.load(await blobBytes(blob));
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const extra = [];
  pdfContexts.set(form, { font, extra, sizes: new Map() });
  for (const field of form.getFields()) {
    if (field instanceof PDFSignature && field.acroField.dict.has(PDFName.of('V'))) throw new Error('Use an unsigned blank PDF template; signed documents cannot be used as templates.');
    if (field instanceof PDFTextField) { field.setMaxLength(undefined); field.setText(''); }
    if (field instanceof PDFCheckBox) field.uncheck();
  }
  if (templateId === 'service-summary') {
    fillServiceSummary(form, report, user);
    const data = findDoc(report, 'Service Summary')?.data || {};
    (data.timeLogs || []).forEach((row, index) => {
      if (index >= 7 && [row.date,row.timeIn,row.timeOut,row.travelTime,row.signature].some(text)) extra.push([`Time log ${index + 1}`, [dateDisplay(row.date), `Time in: ${row.timeIn || ''}`, `Time out: ${row.timeOut || ''}`, `Travel time: ${row.travelTime || ''}`].join(' | ')]);
      // Text initials are retained without impersonating a cryptographic signature.
      if (text(row.signature)) extra.push([`Time log ${index + 1} typed name/initials`, `${dateDisplay(row.date)} - ${row.signature}`]);
    });
  }
  if (templateId === 'acceptance-certification') fillAcceptance(form, report, user);
  if (templateId === 'motor-test') fillMotorTest(form, report, user);
  const h = exportHeader(report,user);
  const contextLine = `Job: ${h.jobNo} | Report date: ${h.date} | Technician: ${h.technician}`;
  // The motor form clips its upper margin; use its clear band below the letterhead.
  for (const page of pdf.getPages()) {
    const crop = page.getCropBox();
    const lines = wrapPdfText(contextLine,font,8,crop.width-48);
    lines.forEach((line,i) => page.drawText(line,{ x:crop.x+24,y:crop.y+crop.height-(templateId === 'motor-test' ? 82 : 12)-i*9,size:8,font }));
  }
  let page, y;
  const newPage = () => {
    page=pdf.addPage([612,792]); y=752;
    page.drawText('Service document continuation',{x:42,y,size:14,font}); y-=22;
    for(const line of wrapPdfText(`${h.jobNo} | Serial: ${h.serial} | Model: ${h.model} | ${h.date}`,font,10,528)) {page.drawText(line,{x:42,y,size:10,font});y-=14;}
    y-=14;
  };
  for (const [label,value] of extra) {
    if (!page || y < 90) newPage();
    for(const line of wrapPdfText(`${label}: ${value}`,font,10,528)) {
      if(y<48) newPage();
      page.drawText(line,{x:42,y,size:10,font}); y-=14;
    }
    y-=10;
  }
  for (const field of form.getFields()) if (field instanceof PDFTextField) {
    const size = pdfContexts.get(form).sizes.get(field.getName()) || 9;
    field.acroField.setDefaultAppearance(`/${font.name} ${size} Tf 0 g`);
    for (const widget of field.acroField.getWidgets()) widget.setDefaultAppearance(`/${font.name} ${size} Tf 0 g`);
  }
  form.updateFieldAppearances(font);
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

export async function fillDocxTemplate(blob, report, user, options = {}) {
  return createDocxExport(await blobBytes(blob), report, user, options);
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
    G9: user?.name || "",
  };
  Object.entries(values).forEach(([cell, value]) => setCellInlineString(sheet, cell, value));
  zip.file(sheetPath, new XMLSerializer().serializeToString(sheet));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function buildNativeDocument(record, report, user) {
  const templateId = templateIdentifier(record);
  if (record.format === "pdf") return fillPdfTemplate(record.blob, templateId, report, user);
  if (record.format === "docx") return fillDocxTemplate(record.blob, report, user, { internal: templateId.startsWith("internal-") });
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

export async function shareOrDownloadDocuments(documents) {
  const files = documents.map(({ blob, filename }) =>
    new File([blob], filename, { type: blob.type || "application/octet-stream" }));
  if (navigator.share && navigator.canShare?.({ files })) {
    await navigator.share({ title: "Field service documents", files });
    return;
  }
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export const outputFilename = (record, report) => {
  const date = String(report.startAt || new Date().toISOString()).slice(0, 10).replace(/-/g, ".");
  const job = text(report.jobNo || "JXXXXX").replace(/[^A-Za-z0-9#-]/g, "-");
  return `${date} ${record.label} - ${job}.${record.format}`;
};
