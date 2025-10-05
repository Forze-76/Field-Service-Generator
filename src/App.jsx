// FSR iPad – Web Demo Prototype (React) v0.8 (widgets removed)
import React, { useEffect, useMemo, useState } from "react";
import { Plus, FileDown, X, Settings, Trash, Search, FolderPlus, Calendar, Home as HomeIcon, Cog, BookOpen } from "lucide-react";

import {
  clampJob,
  exportFieldPictures,
  exportReport,
  formatRange,
  isValidJob,
  loadReports,
  loadTypes,
  makeDocs,
  mergeFsrData,
  convertLegacyIssueToEntry,
  entriesToLegacyIssues,
  mergePartsNeededFromEntry,
  MODELS,
  saveReports,
  toISOInput,
  uid,
} from "./utils/fsr";
import {
  ConfirmDialog,
  DocumentTabs,
  FsrDetailsCard,
  FsrEntriesCard,
  ManageDocsModal,
  ManageTypes,
  ManualsModal,
  PhotoVault,
  SerialTagCard,
  ServiceSummaryForm,
} from "./components";

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

  function updateFsrDetails(mutator) {
    updateDocs((docs)=> (docs||[]).map(d => {
      if ((d.name||"").toLowerCase() !== 'field service report') return d;
      const current = mergeFsrData(d.data);
      const nextDetails = typeof mutator === 'function' ? mutator(current.details) : mutator;
      return { ...d, data: { ...current, details: nextDetails } };
    }));
  }

  function updateFsrEntries(mutator) {
    updateDocs((docs)=> (docs||[]).map(d => {
      if ((d.name||"").toLowerCase() !== 'field service report') return d;
      const current = mergeFsrData(d.data);
      const nextEntries = typeof mutator === 'function' ? mutator(current.entries) : mutator;
      return { ...d, data: { ...current, entries: nextEntries, issues: entriesToLegacyIssues(nextEntries) } };
    }));
  }

  function syncOrderPartsFromEntry(entryId, parts) {
    updateFsrDetails((details) => mergePartsNeededFromEntry(details, entryId, parts));
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
  const fsrData = useMemo(() => mergeFsrData(fsrDoc?.data), [fsrDoc]);
  const fsrDetails = fsrData.details;
  const fsrIssues = fsrData.issues;
  const fsrEntries = fsrData.entries || [];

  useEffect(() => {
    if (!fsrDoc) return;
    if ((fsrEntries?.length || 0) === 0 && (fsrIssues?.length || 0) > 0) {
      updateFsrEntries(() => (fsrIssues || []).map((iss) => convertLegacyIssueToEntry(iss)));
    }
  }, [fsrDoc?.id, fsrEntries?.length, fsrIssues?.length]);

  const hasIssueEntries = fsrEntries.some((entry) => entry?.type === 'issue');
  const canExportReport = hasIssueEntries || (fsrIssues?.length || 0) > 0;

  const activeDoc = selected?.documents?.find(d=>d.id===activeDocId) || null;
  const hasPhotos = (selected?.photos||[]).length>0;

  // Global collapse helpers
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
                    <button className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40" disabled={!canExportReport} onClick={()=>exportReport(selected)}>
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
                <div className="space-y-6">
                  <FsrDetailsCard details={fsrDetails} onChange={(next)=>updateFsrDetails(next)} />
                  <FsrEntriesCard
                    entries={fsrEntries}
                    onChange={(next) => updateFsrEntries(next)}
                    canAddIssue={readyForIssues}
                    onSyncOrderParts={(entryId, parts) => syncOrderPartsFromEntry(entryId, parts)}
                    showIssueGate
                  />
                  <PhotoVault photos={selected.photos||[]} onChange={(next)=>updatePhotos(next)} />
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
