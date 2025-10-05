// FSR iPad – Web Demo Prototype (React) v0.8 (widgets removed)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Camera, Trash2, FileDown, X, Settings,
  ArrowUp, ArrowDown, Trash, Search, FolderPlus, Calendar, Home as HomeIcon, CheckSquare, Square, Cog,
  ChevronDown, ChevronUp, Images, BookOpen
} from "lucide-react";

// ===================== Utilities & Storage =====================
const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d) => new Date(d).toLocaleString();
const toISOInput = (date) => {
  const dt = new Date(date);
  const iso = new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16); // yyyy-MM-ddTHH:mm
  return iso;
};

// Models (report-level)
const MODELS = ["M","F","FS","21","H","ZON","ZONXL","POD","SLAM","Cartveyor"];

// Service Summary model checkboxes (form-level per your PDF)
const SS_MODEL_KEYS = ["B","D","DB","F","M","MQ","21","CV"]; // plus Other text

// Trip types storage
const loadTypes = () => {
  try {
    const raw = localStorage.getItem("fsr.tripTypes");
    if (!raw) return ["Service", "Warranty", "Start Up", "Inspection"];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : ["Service", "Warranty", "Start Up", "Inspection"];
  } catch {
    return ["Service", "Warranty", "Start Up", "Inspection"];
  }
};
const saveTypes = (arr) => localStorage.setItem("fsr.tripTypes", JSON.stringify(arr));

// Reports storage
const loadReports = () => {
  try {
    const raw = localStorage.getItem("fsr.reports");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveReports = (arr) => localStorage.setItem("fsr.reports", JSON.stringify(arr));

// Validation without regex escapes
const isValidJob = (v) => {
  const t = v.trim().toUpperCase();
  if (!t.startsWith("J#")) return false;
  const digits = t.slice(2);
  if (digits.length < 2 || digits.length > 5) return false;
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (c < '0' || c > '9') return false;
  }
  return true;
};
const clampJob = (raw) => {
  let v = raw.toUpperCase();
  if (!v.startsWith("J#")) v = "J#" + v;
  const onlyDigits = v.slice(2).split('').filter(ch => ch >= '0' && ch <= '9').join('');
  return "J#" + onlyDigits.slice(0, 5);
};

// Date range label
function formatRange(startAt, endAt) {
  try {
    const s = new Date(startAt); const e = new Date(endAt);
    const sameDay = s.toDateString() === e.toDateString();
    const dFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    const tFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
    if (sameDay) return `${dFmt.format(s)} • ${tFmt.format(s)} – ${tFmt.format(e)}`;
    return `${dFmt.format(s)} ${tFmt.format(s)} → ${dFmt.format(e)} ${tFmt.format(e)}`;
  } catch { return `${fmtDateTime(startAt)} → ${fmtDateTime(endAt)}`; }
}

// File to DataURL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===================== Trip-type document defaults =====================
const defaultDocsByType = {
  "Inspection": ["Field Service Report", "Inspection Sheet", "Service Summary"],
  "Warranty": ["Field Service Report", "Service Summary"],
  "Service": ["Field Service Report", "Service Summary"],
  "Start Up": ["Field Service Report", "Startup Checklist", "Service Summary"],
};
const makeDocs = (type) => (defaultDocsByType[type] || ["Field Service Report"]).map(n => (
  n === "Field Service Report"
    ? { id: uid(), name: n, done: false, data: { issues: [] } }
    : n === "Service Summary"
      ? { id: uid(), name: n, done: false, data: makeEmptyServiceSummaryData() }
      : { id: uid(), name: n, done: false, data: {} }
));

function makeEmptyServiceSummaryData(){
  const model = {};
  SS_MODEL_KEYS.forEach(k => model[k] = false);
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
    timeLogs: [ { id: uid(), date: "", timeIn: "", timeOut: "", travelTime: "", signature: "" } ]
  };
}

// ===================== Export (printable) =====================
function exportReport(report) {
  const title = `Field Service Report`;
  const subtitle = `${report.jobNo} • ${report.tripType}${report.model?` • Model ${report.model}`:``} — ${formatRange(report.startAt, report.endAt)}`;

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

  const docsHTML = (report.documents || []).map(d => `
    <div> ${d.done ? '☑' : '☐'} ${d.name} </div>
  `).join("") || `<div>☐ Field Service Report</div>`;

  const serialHTML = report.serialTagImageUrl
    ? `<div class="serial"><div><b>Serial Tag</b><div class="note">Attached</div></div><img src="${report.serialTagImageUrl}"/></div>`
    : `<div class="serial"><div><b>Serial Tag</b><div class="note">${report.serialTagMissing ? 'Not available (checked)' : 'Not provided'}</div></div></div>`;

  const fsrDoc = (report.documents || []).find(d => (d.name||"").toLowerCase() === 'field service report');
  const fsrIssues = fsrDoc?.data?.issues || [];

  const issuesHTML = (fsrIssues.length ? fsrIssues.map((iss, i) => `
      <div class="issue">
        <h3>Issue #${i+1} — ${fmtDateTime(iss.createdAt)}</h3>
        ${iss.imageUrl ? `<img src="${iss.imageUrl}" alt="Issue ${i+1} image"/>` : ""}
        <div class="note">${(iss.note || "(No description)")
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>
    `).join("") : `<p style="color:#666;">No issues recorded.</p>`);

  const photos = report.photos || [];
  const photosHTML = (photos.length ? photos.map((p, i) => `
      <div class="issue">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Photo ${i+1}"/>` : ""}
        ${p.caption ? `<div class="note">${p.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
      </div>
    `).join("") : `<p style="color:#666;">No field pictures.</p>`);

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

function exportFieldPictures(report){
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
  const photos = report.photos||[];
  const html = `
    <h1>${title}</h1>
    <div class="grid">
      ${photos.map(p => `<div class="card">${p.imageUrl?`<img src="${p.imageUrl}"/>`:''}${p.caption?`<div class="cap">${p.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`:''}</div>`).join('')}
    </div>`;
  const win = window.open("", "_blank");
  if(!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>${styles}</head><body>${html}</body></html>`);
  win.document.close(); win.focus();
}

// ===================== Docs Settings Modal =====================
function ManageDocsModal({ open, onClose, documents, onChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Documents</h3>
          <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose}><X size={18}/></button>
        </div>
        <DocumentsManager documents={documents} onChange={onChange} />
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DocumentsManager({ documents, onChange }) {
  const [name, setName] = useState("");
  const add = () => { const v=name.trim(); if(!v) return; onChange([...(documents||[]), { id: uid(), name: v, done: false, data: {} }]); setName(""); };
  const toggle = (id) => onChange((documents||[]).map(d => d.id===id ? { ...d, done: !d.done } : d));
  const remove = (id) => onChange((documents||[]).filter(d=>d.id!==id));
  return (
    <div>
      <div className="space-y-2">
        {(documents||[]).length === 0 && <div className="text-sm text-gray-500">No documents yet.</div>}
        {(documents||[]).map(d => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <button className="flex items-center gap-2" onClick={()=>toggle(d.id)}>
              {d.done ? <CheckSquare size={18}/> : <Square size={18}/>}
              <span>{d.name}</span>
            </button>
            <button className="p-2 rounded-xl border" onClick={()=>remove(d.id)}><Trash size={16}/></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded-xl border px-3 py-2" placeholder="Add document (e.g., Inspection Sheet)" value={name} onChange={e=>setName(e.target.value)} />
        <button className="px-4 py-2 rounded-xl border" onClick={add}>Add</button>
      </div>
      <div className="text-xs text-gray-500 mt-2">Defaults load from trip type; you can add/remove as needed per job.</div>
    </div>
  );
}

// ===================== Editor Subsections =====================
function SerialTagCard({ report, onChange }) {
  const inputRef = useRef(null);
  const hasSerial = !!report.serialTagImageUrl;
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Serial Number Tag</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!report.serialTagMissing} onChange={e=>onChange({ serialTagMissing: e.target.checked, serialTagImageUrl: e.target.checked ? "" : report.serialTagImageUrl })} />
          <span>None available</span>
        </label>
      </div>
      <div className="mt-3 flex gap-16 items-start">
        <div className="w-60 aspect-[4/3] bg-gray-50 border rounded-xl flex items-center justify-center overflow-hidden">
          {report.serialTagImageUrl ? (
            <img src={report.serialTagImageUrl} alt="Serial Tag" className="h-full w-full object-cover"/>
          ) : (
            <div className="text-gray-400 flex flex-col items-center gap-2">
              <Camera/>
              <span>Upload serial tag photo</span>
            </div>
          )}
        </div>
        <div className="space-x-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e)=>{
            const f = e.target.files?.[0]; if (!f) return; const url = await fileToDataURL(f);
            onChange({ serialTagImageUrl: url, serialTagMissing: false });
          }}/>
          <button className="px-3 py-2 rounded-xl border" onClick={()=>inputRef.current?.click()}>Upload</button>
          {hasSerial && <button className="px-3 py-2 rounded-xl border" onClick={()=>onChange({ serialTagImageUrl: "" })}>Remove</button>}
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, idx, onChange, onRemove, onMove }) {
  const inputRef = useRef(null);
  const collapsed = !!issue.collapsed;
  const headerText = issue.note?.trim() ? (issue.note.trim().length>80? issue.note.trim().slice(0,80)+"…" : issue.note.trim()) : "(No description)";
  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="text-sm font-medium">Issue #{idx+1} <span className="text-gray-500">— {fmtDateTime(issue.createdAt)}</span></div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded-xl border" onClick={()=>onChange({ ...issue, collapsed: !collapsed })}>
            {collapsed ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
          </button>
          <button className="p-2 rounded-xl border" onClick={onRemove}><Trash2 size={16}/></button>
          <button className="p-2 rounded-xl border" onClick={()=>onMove('up')} title="Move up"><ArrowUp size={16}/></button>
          <button className="p-2 rounded-xl border" onClick={()=>onMove('down')} title="Move down"><ArrowDown size={16}/></button>
        </div>
      </div>

      {collapsed ? (
        <div className="p-4 text-sm text-gray-700">
          {issue.imageUrl ? <img src={issue.imageUrl} alt="thumb" className="w-28 h-20 object-cover rounded border mr-3 inline-block"/> : null}
          <span className="align-middle">{headerText}</span>
        </div>
      ) : (
        <>
          <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
            {issue.imageUrl ? (
              <img src={issue.imageUrl} alt="issue" className="h-full w-full object-cover"/>
            ) : (
              <div className="text-gray-400 flex items-center gap-2"><Camera/> No photo</div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e)=>{
              const f = e.target.files?.[0]; if (!f) return; const url = await fileToDataURL(f); onChange({ ...issue, imageUrl: url });
            }}/>
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button className="px-2 py-1 rounded-xl border bg-white/90" onClick={()=>inputRef.current?.click()}><Camera size={16}/> Upload</button>
            </div>
          </div>
          <div className="p-4">
            <textarea className="w-full min-h-[120px] rounded-xl border px-3 py-2" value={issue.note} onChange={e=>onChange({ ...issue, note: e.target.value })} placeholder="Write what happened, cause, fix, next steps…"/>
          </div>
        </>
      )}
    </div>
  );
}

function DocumentTabs({ documents, activeId, onSelect }) {
  return (
    <div className="rounded-2xl border bg-white p-2 flex items-center gap-2 overflow-x-auto">
      {(documents||[]).map(doc => (
        <button
          key={doc.id}
          className={`px-3 py-2 rounded-xl border ${activeId===doc.id? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
          onClick={()=>onSelect(doc.id)}
          title={doc.done? 'Completed' : 'Not completed'}
        >
          <span className="mr-2 inline-block w-2 h-2 rounded-full" style={{backgroundColor: doc.done? '#22c55e' : '#d1d5db'}}></span>
          {doc.name}
        </button>
      ))}
      {(documents||[]).length===0 && <div className="text-sm text-gray-500 px-2 py-1">No documents</div>}
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText="Delete" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onCancel}>Cancel</button>
          <button className="px-4 py-2 rounded-xl bg-red-600 text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function PhotoVault({ photos, onChange }){
  const inputRef = useRef(null);
  const addFiles = async (files) => {
    const arr = [];
    for(const f of files){
      const url = await fileToDataURL(f);
      arr.push({ id: uid(), imageUrl: url, caption: "", createdAt: new Date().toISOString() });
    }
    onChange([...(photos||[]), ...arr]);
  };
  return (
    <div className="rounded-3xl border shadow-sm p-6 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><Images size={18}/> Photo Vault</h3>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={async (e)=>{ const fs = e.target.files; if(!fs) return; await addFiles(fs); e.target.value=''; }}/>
          <button className="px-3 py-2 rounded-xl border" onClick={()=>inputRef.current?.click()}>Add Photo(s)</button>
        </div>
      </div>
      {(photos||[]).length===0 ? (
        <p className="text-gray-500 mt-3">No photos yet. Use <b>Add Photo(s)</b> to upload field pictures.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((p, idx) => (
            <div key={p.id} className="rounded-2xl border overflow-hidden bg-white">
              {p.imageUrl ? <img src={p.imageUrl} alt={`photo-${idx+1}`} className="h-64 w-full object-cover"/> : <div className="h-64 bg-gray-50"/>}
              <div className="p-3 flex items-center gap-2">
                <input className="flex-1 rounded-xl border px-3 py-2" placeholder="Caption (optional)" value={p.caption||""} onChange={e=>onChange(photos.map(x=> x.id===p.id ? { ...x, caption: e.target.value } : x))} />
                <button className="p-2 rounded-xl border" onClick={()=>onChange(photos.filter(x=>x.id!==p.id))}><Trash size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== Service Summary Form =====================
function TinyLabel({children}){ return <div className="text-[11px] text-gray-600 mb-1">{children}</div>; }
function TinyInput(props){ return <input {...props} className={(props.className||"")+" w-full rounded-lg border px-2 py-1 text-[13px]"}/> }
function TinyTextArea(props){ return <textarea {...props} className={(props.className||"")+" w-full rounded-lg border px-2 py-1 text-[13px] min-h-[80px]"}/> }
function TinyCheck({checked,onChange,label}){
  return (
    <label className="flex items-center gap-2 text-[13px] mr-3">
      <input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SharedSiteBlock({ shared, onChange }){
  return (
    <div className="rounded-2xl border p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <TinyLabel>Job Name</TinyLabel>
          <TinyInput value={shared.jobName||""} onChange={e=>onChange({ jobName: e.target.value })}/>
        </div>
        <div>
          <TinyLabel>PFlow Serial Number</TinyLabel>
          <TinyInput value={shared.serialNumberText||""} onChange={e=>onChange({ serialNumberText: e.target.value })} placeholder="e.g., M-12345"/>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <TinyLabel>Site Street Address</TinyLabel>
            <TinyInput value={shared.siteStreetAddress||""} onChange={e=>onChange({ siteStreetAddress: e.target.value })}/>
          </div>
          <div>
            <TinyLabel>Site Mailing Address</TinyLabel>
            <TinyInput value={shared.siteMailingAddress||""} onChange={e=>onChange({ siteMailingAddress: e.target.value })}/>
          </div>
        </div>
        <div>
          <TinyLabel>City</TinyLabel>
          <TinyInput value={shared.siteCity||""} onChange={e=>onChange({ siteCity: e.target.value })}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <TinyLabel>State</TinyLabel>
            <TinyInput value={shared.siteState||""} onChange={e=>onChange({ siteState: e.target.value })}/>
          </div>
          <div>
            <TinyLabel>Zip Code</TinyLabel>
            <TinyInput value={shared.siteZip||""} onChange={e=>onChange({ siteZip: e.target.value })}/>
          </div>
        </div>
      </div>
      <div className="text-[11px] text-gray-500 mt-2">Filled once and shared across all documents for this report.</div>
    </div>
  );
}

function ServiceSummaryForm({ report, doc, onUpdateReport, onUpdateDoc }){
  const data = doc.data || makeEmptyServiceSummaryData();
  const setData = (patch) => onUpdateDoc({ ...doc, data: { ...data, ...patch } });
  const shared = report.sharedSite || {};
  const setShared = (patch) => onUpdateReport({ sharedSite: { ...shared, ...patch } });

  const toggleModel = (k, v) => setData({ modelChecks: { ...data.modelChecks, [k]: v } });

  const addRow = () => {
    if ((data.timeLogs||[]).length >= 7) return;
    setData({ timeLogs: [...(data.timeLogs||[]), { id: uid(), date: "", timeIn: "", timeOut: "", travelTime: "", signature: "" }] });
  };
  const removeRow = (id) => setData({ timeLogs: (data.timeLogs||[]).filter(r => r.id !== id) });

  return (
    <div className="space-y-6">
      {/* Shared Site Info */}
      <SharedSiteBlock shared={shared} onChange={setShared} />

      {/* Top row: Reason & Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Reason for visit</TinyLabel>
          <TinyTextArea value={data.reasonForVisit} onChange={e=>setData({ reasonForVisit: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Model classification (form checkboxes)</TinyLabel>
          <div className="flex flex-wrap gap-2">
            {SS_MODEL_KEYS.map(k => (
              <TinyCheck key={k} checked={!!data.modelChecks[k]} onChange={(v)=>toggleModel(k, v)} label={k} />
            ))}
            <div className="flex items-center gap-2">
              <span className="text-[13px]">Other</span>
              <TinyInput value={data.modelOther} onChange={e=>setData({ modelOther: e.target.value })} className="w-28"/>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Report model: <b>{report.model || '-'}</b></div>
        </div>
      </div>

      {/* Services & Parts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Service performed</TinyLabel>
          <TinyTextArea value={data.servicePerformed} onChange={e=>setData({ servicePerformed: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Parts replaced</TinyLabel>
          <TinyTextArea value={data.partsReplaced} onChange={e=>setData({ partsReplaced: e.target.value })} />
        </div>
      </div>

      {/* Contacts & Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Supervisor Name / E-mail</TinyLabel>
          <TinyInput value={data.supervisorNameEmail} onChange={e=>setData({ supervisorNameEmail: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Acceptance date</TinyLabel>
          <TinyInput type="date" value={data.acceptanceDate} onChange={e=>setData({ acceptanceDate: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Supervisor Signature</TinyLabel>
          <TinyInput value={data.supervisorSignature} onChange={e=>setData({ supervisorSignature: e.target.value })} placeholder="(name or initials)" />
        </div>
        <div>
          <TinyLabel>PFlow Service Technician</TinyLabel>
          <TinyInput value={data.pflowServiceTechnician} onChange={e=>setData({ pflowServiceTechnician: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Manager Name / E-mail</TinyLabel>
          <TinyInput value={data.managerNameEmail} onChange={e=>setData({ managerNameEmail: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Manager Signature</TinyLabel>
          <TinyInput value={data.managerSignature} onChange={e=>setData({ managerSignature: e.target.value })} placeholder="(name or initials)" />
        </div>
      </div>

      {/* Contacts (PM/Customer) & Techs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>PM Contact</TinyLabel>
          <TinyInput value={data.pmContact} onChange={e=>setData({ pmContact: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Customer Contact</TinyLabel>
          <TinyInput value={data.customerContact} onChange={e=>setData({ customerContact: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Tech 1</TinyLabel>
          <TinyInput value={data.tech1} onChange={e=>setData({ tech1: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Tech 2</TinyLabel>
          <TinyInput value={data.tech2} onChange={e=>setData({ tech2: e.target.value })} />
        </div>
      </div>

      {/* Time Log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Daily Time Log</h4>
          <button className="px-2 py-1 rounded-lg border text-[13px] disabled:opacity-40" disabled={(data.timeLogs||[]).length>=7} onClick={addRow}>+ Add day</button>
        </div>
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-50 text-[12px] font-medium">
            <div className="px-2 py-1">Date</div>
            <div className="px-2 py-1">Time in</div>
            <div className="px-2 py-1">Time out</div>
            <div className="px-2 py-1">Travel time</div>
            <div className="px-2 py-1">Signature</div>
          </div>
          {(data.timeLogs||[]).map(row => (
            <div key={row.id} className="grid grid-cols-5 text-[13px] border-t">
              <div className="px-2 py-1"><TinyInput type="date" value={row.date} onChange={e=>setData({ timeLogs: data.timeLogs.map(r=> r.id===row.id ? { ...r, date: e.target.value } : r) })}/></div>
              <div className="px-2 py-1"><TinyInput type="time" value={row.timeIn} onChange={e=>setData({ timeLogs: data.timeLogs.map(r=> r.id===row.id ? { ...r, timeIn: e.target.value } : r) })}/></div>
              <div className="px-2 py-1"><TinyInput type="time" value={row.timeOut} onChange={e=>setData({ timeLogs: data.timeLogs.map(r=> r.id===row.id ? { ...r, timeOut: e.target.value } : r) })}/></div>
              <div className="px-2 py-1"><TinyInput placeholder="hh:mm" value={row.travelTime} onChange={e=>setData({ timeLogs: data.timeLogs.map(r=> r.id===row.id ? { ...r, travelTime: e.target.value } : r) })}/></div>
              <div className="px-2 py-1 flex items-center gap-2">
                <TinyInput placeholder="name/initials" value={row.signature} onChange={e=>setData({ timeLogs: data.timeLogs.map(r=> r.id===row.id ? { ...r, signature: e.target.value } : r) })}/>
                <button className="px-2 py-1 rounded-lg border" onClick={()=>removeRow(row.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <TinyLabel>Additional notes</TinyLabel>
        <TinyTextArea value={data.additionalNotes} onChange={e=>setData({ additionalNotes: e.target.value })} />
      </div>
    </div>
  );
}

function ManualsModal({ open, onClose, model }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen size={18}/> Owner's Manuals</h3>
          <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose}><X size={18}/></button>
        </div>
        <p className="text-sm text-gray-600">Model: <b>{model||'-'}</b></p>
        <div className="mt-3 rounded-xl border p-3 bg-gray-50 text-sm text-gray-700">
          Manual links will appear here based on the selected model. We can surface PDFs, quick-starts, and checklists automatically.
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ===================== Main App =====================
export default function App() {
  const [types, setTypes] = useState(loadTypes);
  const [manageOpen, setManageOpen] = useState(false);

  const [reports, setReports] = useState(loadReports);
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(()=> reports.find(r=>r.id===selectedId) || null, [reports, selectedId]);

  // Setup form state
  const [setupOpen, setSetupOpen] = useState(false);
  const [jobNo, setJobNo] = useState("J#");
  const [tripType, setTripType] = useState("");
  const [model, setModel] = useState("");
  const [startAt, setStartAt] = useState(toISOInput(new Date()));
  const [endAt, setEndAt] = useState(toISOInput(new Date(Date.now()+2*60*60*1000)));

  const [search, setSearch] = useState("");

  // Docs tabs state
  const [activeDocId, setActiveDocId] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [manualsOpen, setManualsOpen] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Persist on changes
  useEffect(()=> saveReports(reports), [reports]);

  // When selecting a report, default the active tab to the first document
  useEffect(()=>{
    if (selected) {
      const first = selected.documents?.[0]?.id || null;
      setActiveDocId(prev => selected.documents?.some(d=>d.id===prev) ? prev : first);
    } else {
      setActiveDocId(null);
    }
  }, [selectedId]);

  const canCreate = isValidJob(jobNo) && !!tripType && !!model && new Date(endAt) >= new Date(startAt);

  function createReport() {
    if (!canCreate) return;
    const r = {
      id: uid(),
      jobNo: jobNo.trim(),
      tripType,
      model,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      createdAt: new Date().toISOString(),
      serialTagImageUrl: "",
      serialTagMissing: false,
      documents: makeDocs(tripType),
      photos: [],
      sharedSite: {
        jobName: "",
        serialNumberText: "",
        siteStreetAddress: "",
        siteMailingAddress: "",
        siteCity: "",
        siteState: "",
        siteZip: "",
      }
    };
    setReports(prev => [r, ...prev]);
    setSelectedId(r.id);
    setSetupOpen(false);
    setModel("");
  }

  function updateReport(patch) {
    if (!selected) return;
    setReports(prev => prev.map(r => r.id===selected.id ? { ...r, ...patch } : r));
  }

  function updateDocs(mutator) {
    if (!selected) return;
    const next = typeof mutator === 'function' ? mutator(selected.documents||[]) : mutator;
    updateReport({ documents: next });
  }

  function updateDocById(id, nextDoc){
    updateDocs((docs)=> (docs||[]).map(d => d.id===id ? nextDoc : d));
  }

  function updateFsrIssues(mutator) {
    updateDocs((docs)=> (docs||[]).map(d => {
      if ((d.name||"").toLowerCase() !== 'field service report') return d;
      const prevIssues = d.data?.issues || [];
      const nextIssues = mutator(prevIssues);
      return { ...d, data: { ...(d.data||{}), issues: nextIssues } };
    }));
  }

  function updatePhotos(mutator){
    if(!selected) return;
    const next = typeof mutator === 'function' ? mutator(selected.photos||[]) : mutator;
    updateReport({ photos: next });
  }

  function removeReport(id) {
    setReports(prev => prev.filter(r=>r.id!==id));
    if (selectedId===id) setSelectedId(null);
  }

  const filtered = useMemo(()=> {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r => r.jobNo.toLowerCase().includes(q) || r.tripType.toLowerCase().includes(q) || (r.model||'').toLowerCase().includes(q) || (r.sharedSite?.jobName||'').toLowerCase().includes(q));
  }, [reports, search]);

  const readyForIssues = selected ? (!!selected.serialTagImageUrl || !!selected.serialTagMissing) : false;
  const fsrDoc = selected?.documents?.find(d => (d.name||"").toLowerCase() === 'field service report');
  const fsrIssues = fsrDoc?.data?.issues || [];

  const activeDoc = selected?.documents?.find(d=>d.id===activeDocId) || null;
  const hasPhotos = (selected?.photos||[]).length>0;

  // Global collapse helpers
  const collapseAll = () => updateFsrIssues(prev => prev.map(i => ({...i, collapsed:true})));
  const expandAll = () => updateFsrIssues(prev => prev.map(i => ({...i, collapsed:false})));

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      {/* Shell with optional Sidebar */}
      <div className={`mx-auto ${selected? 'max-w-6xl' : 'max-w-7xl'} flex`}>
        {/* Sidebar only on Home */}
        {!selected && (
          <aside className="w-[320px] border-r bg-white/70 backdrop-blur sticky top-0 h-dvh p-4 hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold">Reports</h2>
              <button className="p-2 rounded-xl border hover:bg-gray-50" title="New report" onClick={()=>setSetupOpen(true)}>
                <FolderPlus size={18}/>
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-gray-500"/>
              <input className="w-full rounded-xl border px-3 py-2" placeholder="Search job #, type, model, or job name" value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <div className="space-y-2 overflow-auto" style={{maxHeight: '45vh'}}>
              {filtered.length === 0 && <div className="text-sm text-gray-500">No reports yet.</div>}
              {filtered.map(r => (
                <div key={r.id} className={`w-full rounded-xl border px-3 py-2 ${selectedId===r.id? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <button className="flex-1 text-left" onClick={()=>setSelectedId(r.id)}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{r.jobNo}</div>
                        <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-xs text-gray-600">{r.tripType}{r.model?` • Model ${r.model}`:''}</div>
                      <div className="text-[11px] text-gray-500">{r.sharedSite?.jobName || <span className="italic text-gray-400">(no job name)</span>}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar size={12}/>{formatRange(r.startAt, r.endAt)}</div>
                    </button>
                    <button
                      className="p-2 rounded-xl border text-red-600 hover:bg-red-50"
                      title="Delete report"
                      onClick={()=>setDeleteTarget({ id: r.id, jobNo: r.jobNo })}
                    >
                      <Trash size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Widgets removed for now */}
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {selected && (
                <button className="p-2 rounded-xl border hover:bg-gray-50" onClick={()=>setSelectedId(null)} title="Home">
                  <HomeIcon size={18}/>
                </button>
              )}
              <h1 className="text-2xl md:text-3xl font-extrabold">Field Service Report</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl border flex items-center gap-2" onClick={()=>setManageOpen(true)}>
                <Settings size={18}/> Trip Types
              </button>
              <button className="px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2" onClick={()=>setSetupOpen(true)}>
                <Plus size={18}/> New Report
              </button>
            </div>
          </div>

          {/* Home (main page) */}
          {!selected && (
            <div className="grid place-items-center py-16">
              <div className="w-full max-w-2xl rounded-3xl border shadow-sm p-8 bg-white text-center">
                <p className="text-gray-500">Start a report or pick one on the left</p>
                <h2 className="text-2xl font-bold mt-1">Create a new Report</h2>
                <button className="mt-6 w-full px-6 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg flex items-center justify-center gap-2" onClick={()=>setSetupOpen(true)}>
                  <Plus/> Create Report
                </button>
              </div>
            </div>
          )}

          {/* Editor when a report is selected */}
          {selected && (
            <div className="w-full mx-auto space-y-6">
              {/* Header cards */}
              <div className="rounded-3xl border shadow-sm p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Job #</div>
                    <div className="font-semibold">{selected.jobNo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">Trip Type
                      <button className="ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1" onClick={()=>setDocsOpen(true)} title="Edit documents for this job"><Cog size={14}/> Docs</button>
                      <button className="ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1" onClick={()=>setManualsOpen(true)} title="Owner's Manuals"><BookOpen size={14}/> Manuals</button>
                    </div>
                    <div className="font-semibold">{selected.tripType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Model</div>
                    <div className="font-semibold">{selected.model || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Dates</div>
                    <div className="font-semibold">{formatRange(selected.startAt, selected.endAt)}</div>
                  </div>
                  <div className="flex items-start gap-2 justify-end flex-wrap">
                    <button className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40" disabled={(fsrIssues.length||0) === 0} onClick={()=>exportReport(selected)}>
                      <FileDown size={18}/> Export Report
                    </button>
                    <button className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40" disabled={!hasPhotos} onClick={()=>exportFieldPictures(selected)}>
                      <FileDown size={18}/> Export Field Pictures
                    </button>
                    <button className="px-3 py-2 rounded-xl border text-red-600 flex items-center gap-2" onClick={()=>setDeleteTarget({ id: selected.id, jobNo: selected.jobNo })}>
                      <Trash size={18}/> Delete
                    </button>
                  </div>
                </div>
              </div>

              <SerialTagCard report={selected} onChange={(patch)=>updateReport(patch)} />

              {/* Document Tabs */}
              <DocumentTabs documents={selected.documents||[]} activeId={activeDocId} onSelect={setActiveDocId} />

              {/* Active Document Body */}
              {activeDoc && (activeDoc.name||"").toLowerCase()==='field service report' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Field Service Report – Issues</h3>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded-xl border" onClick={collapseAll}>Collapse all</button>
                      <button className="px-2 py-1 rounded-xl border" onClick={expandAll}>Expand all</button>
                      <button className="px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2 disabled:opacity-40" disabled={!readyForIssues} onClick={()=>updateFsrIssues(iss => [...iss, { id: uid(), note: "", imageUrl: "", createdAt: new Date().toISOString(), collapsed:false }])}>
                        <Plus size={18}/> Add issue
                      </button>
                    </div>
                  </div>
                  {!readyForIssues && (
                    <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      Please attach a photo of the Serial Number Tag or check <b>None available</b> before adding issues.
                    </div>
                  )}

                  {(fsrIssues||[]).length === 0 ? (
                    <p className="text-gray-500 mt-4">No issues yet.</p>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fsrIssues.map((iss, idx) => (
                        <IssueCard key={iss.id} issue={iss} idx={idx} onChange={(next)=>{
                          updateFsrIssues(prev => { const arr=[...prev]; arr[idx]=next; return arr; });
                        }} onRemove={()=>{
                          updateFsrIssues(prev => prev.filter(x=>x.id!==iss.id));
                        }} onMove={(dir)=>{
                          updateFsrIssues(prev => { const arr=[...prev]; const j = idx + (dir==='up'?-1:1); if (j<0||j>=arr.length) return arr; const t=arr[j]; arr[j]=arr[idx]; arr[idx]=t; return arr; });
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Photo Vault */}
                  <div className="mt-6">
                    <PhotoVault photos={selected.photos||[]} onChange={(next)=>updatePhotos(next)} />
                  </div>
                </div>
              )}

              {activeDoc && (activeDoc.name||"").toLowerCase()==='service summary' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white">
                  <h3 className="text-lg font-bold mb-4">Service Summary</h3>
                  <ServiceSummaryForm
                    report={selected}
                    doc={activeDoc}
                    onUpdateReport={(patch)=>updateReport(patch)}
                    onUpdateDoc={(next)=>updateDocById(activeDoc.id, next)}
                  />
                </div>
              )}

              {activeDoc && (activeDoc.name||"").toLowerCase()!=='field service report' && (activeDoc.name||"").toLowerCase()!=='service summary' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white">
                  <h3 className="text-lg font-bold">{activeDoc.name}</h3>
                  <p className="text-gray-500 mt-2">This will be a form with questions soon. Use the Docs button near Trip Type to add/remove documents and mark completed.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Trip Types Manager */}
      <ManageTypes open={manageOpen} onClose={()=>setManageOpen(false)} types={types} setTypes={setTypes} />

      {/* Docs Settings Modal */}
      {selected && (
        <ManageDocsModal
          open={docsOpen}
          onClose={()=>setDocsOpen(false)}
          documents={selected.documents||[]}
          onChange={(next)=>updateDocs(next)}
        />
      )}

      {/* Manuals Modal */}
      {selected && (
        <ManualsModal open={manualsOpen} onClose={()=>setManualsOpen(false)} model={selected.model} />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete report?"
        message={deleteTarget? `This will permanently remove ${deleteTarget.jobNo}.` : ''}
        onCancel={()=>setDeleteTarget(null)}
        onConfirm={()=>{ if(deleteTarget){ removeReport(deleteTarget.id); setDeleteTarget(null);} }}
        confirmText="Delete"
      />

      {/* Setup modal for creating report */}
      <ReportSetup
        open={setupOpen}
        onClose={()=>setSetupOpen(false)}
        types={types}
        jobNo={jobNo} setJobNo={(v)=>setJobNo(clampJob(v))}
        tripType={tripType} setTripType={setTripType}
        model={model} setModel={setModel}
        startAt={startAt} setStartAt={setStartAt}
        endAt={endAt} setEndAt={setEndAt}
        canCreate={canCreate}
        onCreate={createReport}
      />
    </div>
  );
}

function ManageTypes({ open, onClose, types, setTypes }) {
  const [newType, setNewType] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Manage Trip Types</h3>
          <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto">
          {types.map((t, idx) => (
            <div key={t+idx} className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border px-3 py-2">{t}</div>
              <button
                className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                onClick={() => {
                  const up = types.filter((_, i) => i !== idx);
                  setTypes(up); saveTypes(up);
                }}
              >Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input className="flex-1 rounded-xl border px-3 py-2" placeholder="e.g. Commissioning" value={newType} onChange={e=>setNewType(e.target.value)} />
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
            disabled={!newType.trim()}
            onClick={()=>{
              const v = newType.trim();
              if (!v) return; if (types.includes(v)) return;
              const up = [...types, v]; setTypes(up); saveTypes(up); setNewType("");
            }}>Add</button>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function ReportSetup({ open, onClose, types, jobNo, setJobNo, tripType, setTripType, model, setModel, startAt, setStartAt, endAt, setEndAt, canCreate, onCreate }) {
  if (!open) return null;
  const endBeforeStart = new Date(endAt) < new Date(startAt);
  const jobValid = isValidJob(jobNo);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">New Report</h3>
          <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold">Job # (format: J#01 … J#99999)</label>
            <input className={`w-full rounded-xl border px-3 py-2 ${jobValid? '' : 'border-red-400'}`} value={jobNo} onChange={(e)=>setJobNo(e.target.value)} placeholder="J#12345"/>
            {!jobValid && <div className="text-xs text-red-500 mt-1">Enter at least 2 and up to 5 digits after J# (e.g., J#01, J#20021).</div>}
          </div>
          <div>
            <label className="block text-sm font-semibold">Trip type</label>
            <select className="w-full rounded-xl border px-3 py-2" value={tripType} onChange={(e)=>setTripType(e.target.value)}>
              <option value="">— Choose —</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Model</label>
            <select className="w-full rounded-xl border px-3 py-2" value={model} onChange={(e)=>setModel(e.target.value)}>
              <option value="">— Choose model —</option>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Start</label>
            <input type="datetime-local" className="w-full rounded-xl border px-3 py-2" value={startAt} onChange={(e)=>setStartAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold">End</label>
            <input type="datetime-local" className={`w-full rounded-xl border px-3 py-2 ${endBeforeStart? 'border-red-400' : ''}`} value={endAt} onChange={(e)=>setEndAt(e.target.value)} />
            {endBeforeStart && <div className="text-xs text-red-500 mt-1">End must be after Start.</div>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40" disabled={!canCreate} onClick={onCreate}>Create Report</button>
        </div>
      </div>
    </div>
  );
}
