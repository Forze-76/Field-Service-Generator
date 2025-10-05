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
      ? { id: uid(), name: n, done: false, data: { issues: [] } }
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

export function exportReport(report) {
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

  const styles = `
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
      .issue { page-break-inside: avoid; margin-top: 12px; }
      .issue h3 { margin: 0 0 8px 0; font-size: 16px; }
      .issue img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 8px; }
      .note { margin-top: 8px; white-space: pre-wrap; font-size: 13px; }
      .footer { text-align:center; color:#888; font-size: 11px; margin-top: 24px; }
      @media print { body { background: white; } }
    </style>`;

  const docsHTML =
    (report.documents || [])
      .map(
        (d) => `
    <div> ${d.done ? "☑" : "☐"} ${d.name} </div>
  `,
      )
      .join("") || `<div>☐ Field Service Report</div>`;

  const serialHTML = report.serialTagImageUrl
    ? `<div class="serial"><div><b>Serial Tag</b><div class="note">Attached</div></div><img src="${report.serialTagImageUrl}"/></div>`
    : `<div class="serial"><div><b>Serial Tag</b><div class="note">${
        report.serialTagMissing ? "Not available (checked)" : "Not provided"
      }</div></div></div>`;

  const fsrDoc = (report.documents || []).find((d) => (d.name || "").toLowerCase() === "field service report");
  const fsrIssues = fsrDoc?.data?.issues || [];

  const issuesHTML =
    fsrIssues.length
      ? fsrIssues
          .map(
            (iss, i) => `
      <div class="issue">
        <h3>Issue #${i + 1} — ${fmtDateTime(iss.createdAt)}</h3>
        ${iss.imageUrl ? `<img src="${iss.imageUrl}" alt="Issue ${i + 1} image"/>` : ""}
        <div class="note">${(iss.note || "(No description)")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>
      </div>
    `,
          )
          .join("")
      : `<p style="color:#666;">No issues recorded.</p>`;

  const photos = report.photos || [];
  const photosHTML =
    photos.length
      ? photos
          .map(
            (p, i) => `
      <div class="issue">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Photo ${i + 1}"/>` : ""}
        ${
          p.caption
            ? `<div class="note">${p.caption
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</div>`
            : ""
        }
      </div>
    `,
          )
          .join("")
      : `<p style="color:#666;">No field pictures.</p>`;

  const body = `
  <div class="page">
    <div class="hdr">
      <div>
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="tech">
        ${company.name}<br/>
        ${company.techName} — ${company.techTitle}<br/>
        Email: ${company.email}<br/>
        Phone: ${company.phone}
      </div>
    </div>

    ${serialHTML}

    <div class="section">
      <b>Documents to Fill</b>
      <div style="margin-top:6px;">${docsHTML}</div>
    </div>

    <div class="section">
      <b>Field Service Report – Issues</b>
      ${issuesHTML}
    </div>

    <div class="section">
      <b>Field Pictures</b>
      ${photosHTML}
    </div>

    <div class="footer">Generated by FSR Demo • ${new Date().toLocaleString()}</div>
  </div>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>${styles}</head><body>${body}</body></html>`);
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
