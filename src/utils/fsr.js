export const uid = () => Math.random().toString(36).slice(2);

export const fmtDateTime = (d) => new Date(d).toLocaleString();

export const toISOInput = (date) => {
  const dt = new Date(date);
  const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16); // yyyy-MM-ddTHH:mm
  return iso;
};

export const MODELS = ["M", "F", "FS", "21", "H", "ZON", "ZONXL", "POD", "SLAM", "Cartveyor"];

export const SS_MODEL_KEYS = ["B", "D", "DB", "F", "M", "MQ", "21", "CV"]; // plus Other text

export const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const makeEmptyFSRDetails = () => ({
  workSummary: "",
  correctionsMade: "",
  siteRequests: "",
  safetyNotes: "",
  equipmentStatus: "",
  returnVisitNeeded: false,
  targetReturnDate: "",
  partsInstalled: [],
  partsNeeded: [],
  enabled: {
    partsInstalled: false,
    partsNeeded: false,
    measurements: false,
    downtime: false,
    siteRequestsRich: false,
    followUps: false,
    customerAck: false,
  },
  measurements: [],
  downtime: { start: "", end: "", totalMin: "", reason: "" },
  siteRequestsRich: "",
  followUps: [],
  customerAck: { name: "", title: "", date: "", initials: "" },
});

export const makeEmptyFSRData = () => ({
  issues: [],
  details: makeEmptyFSRDetails(),
});

export const mergeFsrDetails = (details) => {
  const defaults = makeEmptyFSRDetails();
  const source = typeof details === "object" && details !== null ? details : {};
  return {
    ...defaults,
    ...source,
    enabled: {
      ...defaults.enabled,
      ...(typeof source.enabled === "object" && source.enabled !== null ? source.enabled : {}),
    },
    downtime: {
      ...defaults.downtime,
      ...(typeof source.downtime === "object" && source.downtime !== null ? source.downtime : {}),
    },
    customerAck: {
      ...defaults.customerAck,
      ...(typeof source.customerAck === "object" && source.customerAck !== null ? source.customerAck : {}),
    },
  };
};

export const mergeFsrData = (data) => {
  const defaults = makeEmptyFSRData();
  const source = typeof data === "object" && data !== null ? data : {};
  return {
    ...defaults,
    ...source,
    issues: Array.isArray(source.issues) ? source.issues : defaults.issues,
    details: mergeFsrDetails(source.details),
  };
};

export const computeDowntimeMinutes = (startISO, endISO) => {
  const start = startISO ? new Date(startISO) : null;
  const end = endISO ? new Date(endISO) : null;
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(diff / 60000);
};

export const loadTypes = () => {
  try {
    const raw = localStorage.getItem("fsr.tripTypes");
    if (!raw) return ["Service", "Warranty", "Start Up", "Inspection"];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : ["Service", "Warranty", "Start Up", "Inspection"];
  } catch {
    return ["Service", "Warranty", "Start Up", "Inspection"];
  }
};

export const saveTypes = (arr) => localStorage.setItem("fsr.tripTypes", JSON.stringify(arr));

export const loadReports = () => {
  try {
    const raw = localStorage.getItem("fsr.reports");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveReports = (arr) => localStorage.setItem("fsr.reports", JSON.stringify(arr));

export const isValidJob = (v) => {
  const t = v.trim().toUpperCase();
  if (!t.startsWith("J#")) return false;
  const digits = t.slice(2);
  if (digits.length < 2 || digits.length > 5) return false;
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (c < "0" || c > "9") return false;
  }
  return true;
};

export const clampJob = (raw) => {
  let v = raw.toUpperCase();
  if (!v.startsWith("J#")) v = "J#" + v;
  const onlyDigits = v
    .slice(2)
    .split("")
    .filter((ch) => ch >= "0" && ch <= "9")
    .join("");
  return "J#" + onlyDigits.slice(0, 5);
};

export function formatRange(startAt, endAt) {
  try {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const sameDay = s.toDateString() === e.toDateString();
    const dFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    const tFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
    if (sameDay) return `${dFmt.format(s)} • ${tFmt.format(s)} – ${tFmt.format(e)}`;
    return `${dFmt.format(s)} ${tFmt.format(s)} → ${dFmt.format(e)} ${tFmt.format(e)}`;
  } catch {
    return `${fmtDateTime(startAt)} → ${fmtDateTime(endAt)}`;
  }
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const defaultDocsByType = {
  Inspection: ["Field Service Report", "Inspection Sheet", "Service Summary"],
  Warranty: ["Field Service Report", "Service Summary"],
  Service: ["Field Service Report", "Service Summary"],
  "Start Up": ["Field Service Report", "Startup Checklist", "Service Summary"],
};

export const makeDocs = (type) =>
  (defaultDocsByType[type] || ["Field Service Report"]).map((n) =>
    n === "Field Service Report"
      ? { id: uid(), name: n, done: false, data: makeEmptyFSRData() }
      : n === "Service Summary"
      ? { id: uid(), name: n, done: false, data: makeEmptyServiceSummaryData() }
      : { id: uid(), name: n, done: false, data: {} },
  );

export function makeEmptyServiceSummaryData() {
  const model = {};
  SS_MODEL_KEYS.forEach((k) => (model[k] = false));
  return {
    serialNumberText: "",
    reasonForVisit: "",
    servicePerformed: "",
    partsReplaced: "",
    supervisorNameEmail: "",
    acceptanceDate: "",
    supervisorSignature: "",
    managerNameEmail: "",
    managerSignature: "",
    pflowServiceTechnician: "",
    tech1: "",
    tech2: "",
    pmContact: "",
    customerContact: "",
    additionalNotes: "",
    modelChecks: model,
    modelOther: "",
    timeLogs: [{ id: uid(), date: "", timeIn: "", timeOut: "", travelTime: "", signature: "" }],
  };
}

export function buildReportHtml(report) {
  const title = `Field Service Report`;
  const subtitle = `${report.jobNo} • ${report.tripType}${
    report.model ? ` • Model ${report.model}` : ``
  } — ${formatRange(report.startAt, report.endAt)}`;

  const company = {
    name: "PFlow Industries",
    techName: "F. Madera",
    techTitle: "Field Service Tech",
    email: "fernandocm@pflow.com",
    phone: "414-426-2643",
  };

  const docsHTML =
    (report.documents || [])
      .map((d) => `<div>${d.done ? "☑" : "☐"} ${esc(d.name || "Untitled document")}</div>`)
      .join("") || `<div>☐ Field Service Report</div>`;

  const serialHTML = report.serialTagImageUrl
    ? `<div class="serial"><div><b>Serial Tag</b><div class="note">Attached</div></div><img src="${report.serialTagImageUrl}" alt="Serial tag"/></div>`
    : `<div class="serial"><div><b>Serial Tag</b><div class="note">${
        report.serialTagMissing ? "Not available (checked)" : "Not provided"
      }</div></div></div>`;

  const fsrDoc = (report.documents || []).find((d) => (d.name || "").toLowerCase() === "field service report");
  const fsrData = mergeFsrData(fsrDoc?.data);
  const fsrDetails = fsrData.details || makeEmptyFSRData().details;

  const enabled = fsrDetails.enabled || {};

  const normalizePartText = (entry) => {
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    if (typeof entry.text === "string") return entry.text;
    return "";
  };

  const partsInstalledItems = (fsrDetails.partsInstalled || [])
    .map((entry) => normalizePartText(entry).trim())
    .filter(Boolean);

  const partsNeededRows = (fsrDetails.partsNeeded || [])
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        const text = normalizePartText(entry);
        return {
          partNumber: "",
          description: text,
          qty: "",
          priority: text ? "Normal" : "",
          needBy: "",
        };
      }
      const text = normalizePartText(entry);
      return {
        partNumber: entry.partNumber || "",
        description: entry.description || text,
        qty: entry.qty || "",
        priority: entry.priority || (text ? "Normal" : ""),
        needBy: entry.needBy || "",
      };
    })
    .filter((row) =>
      [row.partNumber, row.description, row.qty, row.priority, row.needBy].some((value) =>
        typeof value === "string" ? value.trim() : value,
      ),
    );

  const measurementRows = (fsrDetails.measurements || [])
    .map((row) => ({
      name: row?.name || "",
      before: row?.before || "",
      after: row?.after || "",
      units: row?.units || "",
      notes: row?.notes || "",
    }))
    .filter((row) => Object.values(row).some((value) => value && String(value).trim()));

  const downtime = fsrDetails.downtime || {};
  const downtimeMinutes = computeDowntimeMinutes(downtime.start, downtime.end);
  const downtimeHasData = [downtime.start, downtime.end, downtime.reason]
    .map((value) => (typeof value === "string" ? value.trim() : value))
    .some(Boolean);

  const siteRequestsRich = (fsrDetails.siteRequestsRich || "").trim();

  const followUpsRows = (fsrDetails.followUps || [])
    .map((row) => ({
      action: row?.action || "",
      owner: row?.owner || "",
      due: row?.due || "",
      done: !!row?.done,
    }))
    .filter((row) => [row.action, row.owner, row.due, row.done].some((value) =>
      typeof value === "string" ? value.trim() : value,
    ));

  const customerAck = fsrDetails.customerAck || {};
  const customerAckHasData = [customerAck.name, customerAck.title, customerAck.date, customerAck.initials]
    .map((value) => (typeof value === "string" ? value.trim() : value))
    .some(Boolean);

  const formatReturnVisit = () => {
    if (!fsrDetails.returnVisitNeeded) return "No";
    const date = fsrDetails.targetReturnDate;
    if (!date) return "Yes";
    const dt = new Date(date);
    const value = Number.isNaN(dt.getTime()) ? date : dt.toLocaleDateString();
    return `Yes — Target ${value}`;
  };

  const formatDateString = (value) => {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString();
  };

  const issuesHTML = fsrData.issues.length
    ? fsrData.issues
        .map(
          (iss, i) => `
      <div class="issue">
        <h3>Issue #${i + 1} — ${esc(fmtDateTime(iss.createdAt))}</h3>
        ${iss.imageUrl ? `<img src="${iss.imageUrl}" alt="Issue ${i + 1} image"/>` : ""}
        <div class="note">${esc(iss.note || "(No description)")}</div>
      </div>
    `,
        )
        .join("")
    : `<p class="empty">No issues recorded.</p>`;

  const photos = report.photos || [];
  const photosHTML = photos.length
    ? photos
        .map(
          (p, i) => `
      <div class="issue">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Photo ${i + 1}"/>` : ""}
        ${p.caption ? `<div class="note">${esc(p.caption)}</div>` : ""}
      </div>
    `,
        )
        .join("")
    : `<p class="empty">No field pictures.</p>`;

  const generatedAt = new Date().toLocaleString();

  const sections = [];

  sections.push(`
      <div class="section">
        <b>Documents to Fill</b>
        <div style="margin-top:6px;">${docsHTML}</div>
      </div>
  `);

  const coreCards = [
    { label: "Work Summary", value: fsrDetails.workSummary },
    { label: "Corrections Made", value: fsrDetails.correctionsMade },
    { label: "Site Requests", value: fsrDetails.siteRequests },
    { label: "Safety Notes", value: fsrDetails.safetyNotes },
    { label: "Equipment Status", value: fsrDetails.equipmentStatus },
    { label: "Return Visit Needed", value: formatReturnVisit() },
  ];

  sections.push(`
      <div class="section">
        <b>Report Details (Core)</b>
        <div class="grid2">
          ${coreCards
            .map(
              (card) => `
            <div class="card">
              <b>${esc(card.label)}</b>
              <div class="value">${card.value ? esc(card.value) : '<span class="empty">Not provided</span>'}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
  `);

  if (enabled.partsInstalled && partsInstalledItems.length) {
    sections.push(`
      <div class="section">
        <b>Parts Installed</b>
        <ul class="list">
          ${partsInstalledItems.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </div>
    `);
  }

  if (enabled.partsNeeded && partsNeededRows.length) {
    sections.push(`
      <div class="section">
        <b>Parts Needed to Order</b>
        <table class="table">
          <thead>
            <tr>
              <th>Part #</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Priority</th>
              <th>Need By</th>
            </tr>
          </thead>
          <tbody>
            ${partsNeededRows
              .map(
                (row) => `
                <tr>
                  <td>${esc(row.partNumber)}</td>
                  <td>${esc(row.description)}</td>
                  <td>${esc(row.qty)}</td>
                  <td>${esc(row.priority)}</td>
                  <td>${esc(formatDateString(row.needBy))}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  if (enabled.measurements && measurementRows.length) {
    sections.push(`
      <div class="section">
        <b>Measurements</b>
        <table class="table">
          <thead>
            <tr>
              <th>Measurement</th>
              <th>Before</th>
              <th>After</th>
              <th>Units</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${measurementRows
              .map(
                (row) => `
                <tr>
                  <td>${esc(row.name)}</td>
                  <td>${esc(row.before)}</td>
                  <td>${esc(row.after)}</td>
                  <td>${esc(row.units)}</td>
                  <td>${esc(row.notes)}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  if (enabled.downtime && (downtimeHasData || downtimeMinutes > 0)) {
    sections.push(`
      <div class="section">
        <b>Downtime</b>
        <div class="grid2">
          <div class="card">
            <b>Start</b>
            <div class="value">${downtime.start ? esc(fmtDateTime(downtime.start)) : '<span class="empty">Not provided</span>'}</div>
          </div>
          <div class="card">
            <b>End</b>
            <div class="value">${downtime.end ? esc(fmtDateTime(downtime.end)) : '<span class="empty">Not provided</span>'}</div>
          </div>
          <div class="card">
            <b>Total Minutes</b>
            <div class="value">${esc(String(downtimeMinutes))}</div>
          </div>
        </div>
        ${downtime.reason ? `<div class="note" style="margin-top:12px;"><b>Reason:</b> ${esc(downtime.reason)}</div>` : ""}
      </div>
    `);
  }

  if (enabled.siteRequestsRich && siteRequestsRich) {
    sections.push(`
      <div class="section">
        <b>Site Requests (Rich)</b>
        <div class="note">${esc(siteRequestsRich)}</div>
      </div>
    `);
  }

  if (enabled.followUps && followUpsRows.length) {
    sections.push(`
      <div class="section">
        <b>Follow-Ups</b>
        <table class="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${followUpsRows
              .map(
                (row) => `
                <tr>
                  <td>${esc(row.action)}</td>
                  <td>${esc(row.owner)}</td>
                  <td>${esc(formatDateString(row.due))}</td>
                  <td>${row.done ? "✓" : "✗"}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  sections.push(`
      <div class="section">
        <b>Field Service Report – Issues</b>
        ${issuesHTML}
      </div>
  `);

  sections.push(`
      <div class="section">
        <b>Field Pictures</b>
        ${photosHTML}
      </div>
  `);

  if (enabled.customerAck && customerAckHasData) {
    sections.push(`
      <div class="section">
        <b>Customer Acknowledgment</b>
        <div class="grid2">
          <div class="card"><b>Name</b><div class="value">${customerAck.name ? esc(customerAck.name) : '<span class="empty">Not provided</span>'}</div></div>
          <div class="card"><b>Title</b><div class="value">${customerAck.title ? esc(customerAck.title) : '<span class="empty">Not provided</span>'}</div></div>
          <div class="card"><b>Date</b><div class="value">${customerAck.date ? esc(formatDateString(customerAck.date)) : '<span class="empty">Not provided</span>'}</div></div>
          <div class="card"><b>Initials</b><div class="value">${customerAck.initials ? esc(customerAck.initials) : '<span class="empty">Not provided</span>'}</div></div>
        </div>
      </div>
    `);
  }

  const htmlSections = sections.join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
      .page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.5in; }
      .hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding-bottom:12px; }
      .title { font-size: 26px; font-weight: 800; }
      .subtitle { color:#666; margin-top:4px; font-size: 13px; }
      .tech { text-align:right; font-size: 12px; line-height: 1.35; }
      .serial { margin-top: 12px; display:flex; gap: 12px; align-items:flex-start; }
      .serial img { max-height: 140px; border:1px solid #eee; border-radius:8px; }
      .section { margin-top: 18px; padding-top: 12px; border-top: 1px solid #eee; }
      .section > b { font-size: 15px; }
      .issue { page-break-inside: avoid; margin-top: 12px; }
      .issue h3 { margin: 0 0 8px 0; font-size: 16px; }
      .issue img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 8px; }
      .note { margin-top: 8px; white-space: pre-wrap; font-size: 13px; }
      .grid2 { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin-top:12px; }
      .card { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#f9fafb; font-size:12px; }
      .card b { display:block; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:#6b7280; margin-bottom:6px; }
      .card .value { font-size:13px; color:#111827; white-space:pre-wrap; }
      .empty { color:#6b7280; font-style:italic; }
      .list { margin:12px 0 0 18px; font-size:13px; color:#111827; }
      table.table { width:100%; border-collapse:collapse; font-size:12px; margin-top:12px; }
      table.table th, table.table td { border:1px solid #e5e7eb; padding:6px 8px; text-align:left; vertical-align:top; }
      table.table th { background:#f3f4f6; font-weight:600; }
      .footer { text-align:center; color:#888; font-size: 11px; margin-top: 24px; }
      @media print { body { background: white; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hdr">
        <div>
          <div class="title">${esc(title)}</div>
          <div class="subtitle">${esc(subtitle)}</div>
        </div>
        <div class="tech">
          ${esc(company.name)}<br/>
          ${esc(`${company.techName} — ${company.techTitle}`)}<br/>
          Email: ${esc(company.email)}<br/>
          Phone: ${esc(company.phone)}
        </div>
      </div>

      ${serialHTML}

      ${htmlSections}

      <div class="footer">Generated by FSR Demo • ${esc(generatedAt)}</div>
    </div>
  </body>
</html>`;
}

export function exportReport(report) {
  const html = buildReportHtml(report);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function exportFieldPictures(report) {
  const title = `Field Pictures — ${report.jobNo}`;
  const styles = `
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin:0; padding:24px;}
    h1{font-size:22px; margin:0 0 12px 0;}
    .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:12px;}
    .card{border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;}
    .card img{width:100%; height:220px; object-fit:cover; display:block;}
    .cap{padding:8px 10px; font-size:12px; color:#374151;}
  </style>`;
  const photos = report.photos || [];
  const html = `
    <h1>${title}</h1>
    <div class="grid">
      ${photos
        .map(
          (p, idx) => `<div class="card">${p.imageUrl ? `<img src="${p.imageUrl}"/>` : ""}${
            p.caption
              ? `<div class="cap">${p.caption
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</div>`
              : ""
          }</div>`,
        )
        .join("")}
    </div>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>${styles}</head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
}
