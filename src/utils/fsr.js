import { uid } from "./id";

export { uid };

export const fmtDateTime = (d) => new Date(d).toLocaleString();

export const FSR_ENTRY_TYPE_META = {
  issue: { label: "Issue", emoji: "📷", badgeClass: "bg-red-100 text-red-700 border-red-200" },
  correction: { label: "Correction", emoji: "🛠️", badgeClass: "bg-amber-100 text-amber-700 border-amber-200" },
  orderParts: { label: "Parts", emoji: "📦", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
  docRequest: { label: "Doc Request", emoji: "📄", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  followUp: { label: "Follow-Up", emoji: "📌", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
  internal: { label: "Internal", emoji: "🔒", badgeClass: "bg-gray-200 text-gray-700 border-gray-300" },
  commentary: { label: "Commentary", emoji: "💬", badgeClass: "bg-sky-100 text-sky-700 border-sky-200" },
};

const DOC_REQUEST_LABELS = {
  installation: "Installation Manual",
  pm: "PM Checklists",
  spares: "Spare Parts",
  electrical: "Electrical Diagrams",
  other: "Other",
};

const allowedEntryTypes = Object.keys(FSR_ENTRY_TYPE_META);

const cloneDetailItem = (item) => ({ id: item?.id || uid(), text: typeof item?.text === "string" ? item.text : "" });

const ensureDetails = (details) => {
  const base = typeof details === "object" && details ? { ...details } : {};
  const workSummary = typeof base.workSummary === "string" ? base.workSummary : "";
  const partsInstalled = Array.isArray(base.partsInstalled)
    ? base.partsInstalled.map(cloneDetailItem)
    : [];
  const partsNeeded = Array.isArray(base.partsNeeded)
    ? base.partsNeeded.map(cloneDetailItem)
    : [];
  return { ...base, workSummary, partsInstalled, partsNeeded };
};

const sanitizePhoto = (photo) => {
  if (!photo) return null;
  const imageUrl = typeof photo.imageUrl === "string" ? photo.imageUrl : "";
  if (!imageUrl) return null;
  return { id: photo.id || uid(), imageUrl };
};

const sanitizePhotos = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos.map(sanitizePhoto).filter(Boolean);
};

const normalizeLegacyIssue = (issue) => {
  if (!issue) return null;
  const note = typeof issue.note === "string" ? issue.note : "";
  const imageUrl = typeof issue.imageUrl === "string" ? issue.imageUrl : "";
  const createdAt = issue.createdAt ? new Date(issue.createdAt).toISOString() : new Date().toISOString();
  const photos = Array.isArray(issue.photos) ? sanitizePhotos(issue.photos) : imageUrl ? [{ id: uid(), imageUrl }] : [];
  return {
    id: issue.id || uid(),
    note,
    imageUrl: photos[0]?.imageUrl || imageUrl || "",
    createdAt,
    collapsed: !!issue.collapsed,
    photos,
  };
};

const legacyIssueToEntry = (issue) => {
  const normalized = normalizeLegacyIssue(issue);
  if (!normalized) return null;
  return {
    id: normalized.id,
    type: "issue",
    createdAt: normalized.createdAt,
    collapsed: !!normalized.collapsed,
    note: normalized.note,
    photos: normalizePhotos(normalized.photos),
  };
};

const sanitizePartsRow = (row) => {
  if (!row) return null;
  const partNo = typeof row.partNo === "string" ? row.partNo : "";
  const desc = typeof row.desc === "string" ? row.desc : "";
  const qty = typeof row.qty === "string" ? row.qty : typeof row.qty === "number" ? String(row.qty) : "";
  if (!partNo && !desc && !qty) return null;
  return { id: row.id || uid(), partNo, desc, qty };
};

const sanitizeParts = (parts) => {
  if (!Array.isArray(parts)) return [];
  return parts.map(sanitizePartsRow).filter(Boolean);
};

const summarizeParts = (parts) => {
  if (!Array.isArray(parts)) return [];
  return parts
    .filter((row) => row && (row.partNo || row.desc || row.qty))
    .map((row) => {
      const label = [row.partNo, row.desc].filter(Boolean).join(" — ") || "Part";
      const qty = row.qty ? ` (Qty ${row.qty})` : "";
      return `${label}${qty}`.trim();
    })
    .filter(Boolean);
};

const sanitizeFollowUp = (value) => {
  if (!value || typeof value !== "object") return { title: "", details: "" };
  const title = typeof value.title === "string" ? value.title : "";
  const details = typeof value.details === "string" ? value.details : "";
  return { title, details };
};

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const type = entry.type;
  if (!allowedEntryTypes.includes(type)) return null;
  const id = entry.id || uid();
  const createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString();
  const collapsed = entry.collapsed ?? true;

  if (type === "issue" || type === "correction") {
    const note = typeof entry.note === "string" ? entry.note : "";
    const photos = sanitizePhotos(entry.photos);
    return { id, type, createdAt, collapsed: !!collapsed, note, photos };
  }

  if (type === "commentary" || type === "internal") {
    const note = typeof entry.note === "string" ? entry.note : "";
    return { id, type, createdAt, collapsed: !!collapsed, note };
  }

  if (type === "orderParts") {
    const parts = sanitizeParts(entry.parts);
    const note = typeof entry.note === "string" ? entry.note : "";
    return { id, type, createdAt, collapsed: !!collapsed, parts, note };
  }

  if (type === "docRequest") {
    const allowed = Object.keys(DOC_REQUEST_LABELS);
    const docKind = allowed.includes(entry.docKind) ? entry.docKind : "installation";
    const docNotes = typeof entry.docNotes === "string" ? entry.docNotes : "";
    return { id, type, createdAt, collapsed: !!collapsed, docKind, docNotes };
  }

  if (type === "followUp") {
    const followUp = sanitizeFollowUp(entry.followUp);
    return { id, type, createdAt, collapsed: !!collapsed, followUp };
  }

  return null;
};

const entriesToLegacyIssues = (entries) =>
  entries
    .filter((entry) => entry.type === "issue")
    .map((entry) => ({
      id: entry.id,
      note: entry.note || "",
      imageUrl: entry.photos?.[0]?.imageUrl || "",
      createdAt: entry.createdAt,
      collapsed: entry.collapsed,
      photos: entry.photos || [],
    }));

export const ensureFsrDocData = (data) => {
  const base = typeof data === "object" && data ? { ...data } : {};
  const details = ensureDetails(base.details);
  const rawEntries = Array.isArray(base.entries) ? base.entries : null;
  const normalizedEntries = (rawEntries || [])
    .map((entry) => normalizeEntry(entry))
    .filter(Boolean);

  const legacyIssues = Array.isArray(base.issues)
    ? base.issues.map((issue) => normalizeLegacyIssue(issue)).filter(Boolean)
    : [];

  const mergedEntries =
    rawEntries === null && legacyIssues.length
      ? legacyIssues.map((issue) => legacyIssueToEntry(issue)).filter(Boolean)
      : normalizedEntries;

  const entries = mergedEntries;

  const syncedIssues = entriesToLegacyIssues(entries);

  return { ...base, details, entries, issues: syncedIssues };
};

export const makeEmptyFsrDocData = () => ensureFsrDocData({ entries: [], issues: [] });

export const cloneFsrDocData = (data) => {
  const safe = ensureFsrDocData(data);
  return {
    ...safe,
    entries: safe.entries.map((entry) => ({
      ...entry,
      photos: entry.photos ? entry.photos.map((photo) => ({ ...photo })) : undefined,
      parts: entry.parts ? entry.parts.map((part) => ({ ...part })) : undefined,
      followUp: entry.followUp ? { ...entry.followUp } : undefined,
    })),
    details: {
      ...safe.details,
      partsInstalled: safe.details.partsInstalled.map((item) => ({ ...item })),
      partsNeeded: safe.details.partsNeeded.map((item) => ({ ...item })),
    },
  };
};

export const addEntryToFsrData = (data, entry) => {
  const working = cloneFsrDocData(data);
  const normalized = normalizeEntry(entry);
  if (!normalized) return ensureFsrDocData(working);
  return ensureFsrDocData({ ...working, entries: [...working.entries, normalized] });
};

export const addEntryWithEffects = (data, entry) => {
  let next = addEntryToFsrData(data, entry);
  if (entry?.type === "orderParts") {
    const summaries = summarizeParts(entry.parts);
    if (summaries.length) {
      const existing = Array.isArray(next.details?.partsNeeded) ? next.details.partsNeeded : [];
      next = ensureFsrDocData({
        ...next,
        details: {
          ...next.details,
          partsNeeded: [...existing, ...summaries.map((text) => ({ id: uid(), text }))],
        },
      });
    }
  }
  return ensureFsrDocData(next);
};

export const updateEntryInFsrData = (data, id, updater) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.map((entry) => {
    if (entry.id !== id) return entry;
    const next = typeof updater === "function" ? updater(entry) : updater;
    return normalizeEntry({ ...entry, ...next });
  }).filter(Boolean);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const removeEntryFromFsrData = (data, id) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.filter((entry) => entry.id !== id);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const moveEntryInFsrData = (data, id, direction) => {
  const working = cloneFsrDocData(data);
  const index = working.entries.findIndex((entry) => entry.id === id);
  if (index === -1) return ensureFsrDocData(working);
  const delta = direction === "up" ? -1 : 1;
  const target = index + delta;
  if (target < 0 || target >= working.entries.length) return ensureFsrDocData(working);
  const nextEntries = [...working.entries];
  const [moved] = nextEntries.splice(index, 1);
  nextEntries.splice(target, 0, moved);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const setEntriesCollapsedState = (data, collapsed) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.map((entry) => ({ ...entry, collapsed }));
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const docRequestLabel = (key) => DOC_REQUEST_LABELS[key] || DOC_REQUEST_LABELS.installation;

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

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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
      ? { id: uid(), name: n, done: false, data: makeEmptyFsrDocData() }
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
      .map((d) => `<div>${d.done ? "☑" : "☐"} ${escapeHtml(d.name || "Untitled document")}</div>`)
      .join("") || `<div>☐ Field Service Report</div>`;

  const serialHTML = report.serialTagImageUrl
    ? `<div class="serial"><div><b>Serial Tag</b><div class="note">Attached</div></div><img src="${report.serialTagImageUrl}" alt="Serial tag"/></div>`
    : `<div class="serial"><div><b>Serial Tag</b><div class="note">${
        report.serialTagMissing ? "Not available (checked)" : "Not provided"
      }</div></div></div>`;

  const fsrDoc = (report.documents || []).find((d) => (d.name || "").toLowerCase() === "field service report");
  const fsrData = ensureFsrDocData(fsrDoc?.data);
  const allEntries = fsrData.entries || [];
  const issueEntries = allEntries.filter((entry) => entry.type === "issue");
  const correctionEntries = allEntries.filter((entry) => entry.type === "correction");
  const orderPartEntries = allEntries.filter((entry) => entry.type === "orderParts");
  const docRequestEntries = allEntries.filter((entry) => entry.type === "docRequest");
  const followUpEntries = allEntries.filter((entry) => entry.type === "followUp");
  const commentaryEntries = allEntries.filter((entry) => entry.type === "commentary");

  const escapeAttr = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");

  const renderPhotos = (photos) => {
    if (!photos || !photos.length) return "";
    return `<div class="photo-grid">${photos
      .map((photo, idx) => `<img src="${escapeAttr(photo.imageUrl)}" alt="Attachment ${idx + 1}"/>`)
      .join("")}</div>`;
  };

  const renderNoteWithFallback = (note, fallback = "(No description)") => {
    const value = typeof note === "string" ? note.trim() : "";
    if (!value) return `<div class="note muted">${escapeHtml(fallback)}</div>`;
    return `<div class="note">${escapeHtml(value)}</div>`;
  };

  const correctionsHTML = correctionEntries
    .map(
      (entry, idx) => `
      <div class="entry">
        <div class="entry-title">Correction #${idx + 1} — ${escapeHtml(fmtDateTime(entry.createdAt))}</div>
        ${renderNoteWithFallback(entry.note, "(No description)")}
        ${renderPhotos(entry.photos)}
      </div>
    `,
    )
    .join("");

  const orderPartsHTML = orderPartEntries
    .map((entry, idx) => {
      const rows = (entry.parts || []).length
        ? `<table class="entry-table"><thead><tr><th>Part #</th><th>Description</th><th>Qty</th></tr></thead><tbody>${entry.parts
            .map(
              (part) => `<tr><td>${escapeHtml(part.partNo || "-")}</td><td>${escapeHtml(part.desc || "-")}</td><td>${escapeHtml(part.qty || "-")}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : `<div class="note muted">(No parts listed)</div>`;
      const note = entry.note && entry.note.trim() ? `<div class="note">${escapeHtml(entry.note)}</div>` : "";
      return `
        <div class="entry">
          <div class="entry-title">Order Parts #${idx + 1} — ${escapeHtml(fmtDateTime(entry.createdAt))}</div>
          ${rows}
          ${note}
        </div>
      `;
    })
    .join("");

  const docRequestsHTML = docRequestEntries
    .map(
      (entry, idx) => `
      <div class="entry">
        <div class="entry-title">Document Request #${idx + 1} — ${escapeHtml(fmtDateTime(entry.createdAt))}</div>
        <div class="note">Requested: ${escapeHtml(docRequestLabel(entry.docKind))}</div>
        ${entry.docNotes && entry.docNotes.trim() ? `<div class="note">${escapeHtml(entry.docNotes)}</div>` : ""}
      </div>
    `,
    )
    .join("");

  const followUpsHTML = followUpEntries.length
    ? `<table class="entry-table"><thead><tr><th>Title</th><th>Details</th></tr></thead><tbody>${followUpEntries
        .map(
          (entry) => `<tr><td>${escapeHtml(entry.followUp?.title || "")}</td><td>${escapeHtml(entry.followUp?.details || "")}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";

  const commentaryHTML = commentaryEntries
    .map(
      (entry) => `
      <div class="entry">
        <div class="entry-title">Commentary — ${escapeHtml(fmtDateTime(entry.createdAt))}</div>
        ${renderNoteWithFallback(entry.note, "(No commentary)")}
      </div>
    `,
    )
    .join("");

  const entryBlocks = [];
  if (correctionEntries.length) entryBlocks.push(`<div class="entry-block"><h4>Corrections</h4>${correctionsHTML}</div>`);
  if (orderPartEntries.length) entryBlocks.push(`<div class="entry-block"><h4>Order Parts</h4>${orderPartsHTML}</div>`);
  if (docRequestEntries.length) entryBlocks.push(`<div class="entry-block"><h4>Document Requests</h4>${docRequestsHTML}</div>`);
  if (followUpEntries.length) entryBlocks.push(`<div class="entry-block"><h4>Follow-Ups</h4>${followUpsHTML}</div>`);
  if (commentaryEntries.length) entryBlocks.push(`<div class="entry-block"><h4>Commentary</h4>${commentaryHTML}</div>`);

  const entriesHTML = entryBlocks.length ? `<div class="section"><b>Entries</b>${entryBlocks.join("")}</div>` : "";

  const issuesHTML = issueEntries.length
    ? issueEntries
        .map(
          (iss, i) => `
      <div class="issue">
        <h3>Issue #${i + 1} — ${escapeHtml(fmtDateTime(iss.createdAt))}</h3>
        ${renderNoteWithFallback(iss.note, "(No description)")}
        ${renderPhotos(iss.photos)}
      </div>
    `,
        )
        .join("")
    : `<p style="color:#666;">No issues recorded.</p>`;

  const photos = report.photos || [];
  const photosHTML = photos.length
    ? photos
        .map(
          (p, i) => `
      <div class="issue">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Photo ${i + 1}"/>` : ""}
        ${p.caption ? `<div class="note">${escapeHtml(p.caption)}</div>` : ""}
      </div>
    `,
        )
        .join("")
    : `<p style="color:#666;">No field pictures.</p>`;

  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
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
      .note.muted { color:#6b7280; font-style: italic; }
      .entry-block { margin-top: 14px; }
      .entry-block h4 { margin: 0 0 6px 0; font-size: 15px; }
      .entry { margin-top: 8px; page-break-inside: avoid; }
      .entry-title { font-weight: 600; font-size: 13px; color:#111827; margin-bottom: 4px; }
      .photo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; margin-top:8px; }
      .photo-grid img { width:100%; height:auto; border:1px solid #eee; border-radius:8px; }
      .entry-table { width:100%; border-collapse: collapse; margin-top:6px; font-size:13px; }
      .entry-table th, .entry-table td { border:1px solid #e5e7eb; padding:6px; text-align:left; vertical-align:top; }
      .entry-table th { background:#f3f4f6; }
      .footer { text-align:center; color:#888; font-size: 11px; margin-top: 24px; }
      @media print { body { background: white; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hdr">
        <div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="subtitle">${escapeHtml(subtitle)}</div>
        </div>
        <div class="tech">
          ${escapeHtml(company.name)}<br/>
          ${escapeHtml(`${company.techName} — ${company.techTitle}`)}<br/>
          Email: ${escapeHtml(company.email)}<br/>
          Phone: ${escapeHtml(company.phone)}
        </div>
      </div>

      ${serialHTML}

      <div class="section">
        <b>Documents to Fill</b>
        <div style="margin-top:6px;">${docsHTML}</div>
      </div>

      ${entriesHTML}

      <div class="section">
        <b>Field Service Report – Issues</b>
        ${issuesHTML}
      </div>

      <div class="section">
        <b>Field Pictures</b>
        ${photosHTML}
      </div>

      <div class="footer">Generated by FSR Demo • ${escapeHtml(generatedAt)}</div>
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
