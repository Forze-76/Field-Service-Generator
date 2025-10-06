// FSR iPad – Web Demo Prototype (React) v0.8 (widgets removed)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, FileDown, X, Settings, Trash, Search, FolderPlus, Calendar, Home as HomeIcon, Cog, BookOpen } from "lucide-react";

import {
  addEntryWithEffects,
  clampJob,
  ensureFsrDocData,
  exportFieldPictures,
  exportReport,
  formatRange,
  isValidJob,
  loadReports,
  loadTypes,
  makeDocs,
  MODELS,
  moveEntryInFsrData,
  removeEntryFromFsrData,
  saveReports,
  setEntriesCollapsedState,
  toISOInput,
  uid,
  updateEntryInFsrData,
} from "./utils/fsr";
import {
  ConfirmDialog,
  DocumentTabs,
  FsrEntriesSection,
  ManageDocsModal,
  ManageTypes,
  ManualsModal,
  PhotoVault,
  SerialTagCard,
  ServiceSummaryForm,
  StorageMeter,
  UserMenu,
} from "./components";
import useModalA11y from "./hooks/useModalA11y";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AuthGate from "./auth/AuthGate";

// ===================== Main App =====================
function Workspace({
  storage,
  currentUser,
  onLock,
  onSignOut,
  onSwitchUser,
  justSignedIn,
  clearJustSignedIn,
}) {
  const [types, setTypes] = useState(() => loadTypes(storage));
  const [manageOpen, setManageOpen] = useState(false);

  const [reports, setReports] = useState(() => loadReports(storage));
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
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);

  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState("");

  const manageTriggerRef = useRef(null);
  const docsTriggerRef = useRef(null);
  const manualsTriggerRef = useRef(null);
  const setupTriggerRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  const storageScope = storage?.scopeId || "";

  useEffect(() => {
    if (!storage) return;
    setTypes(loadTypes(storage));
    setReports(loadReports(storage));
    setSelectedId(null);
  }, [storageScope]);

  // Persist on changes
  useEffect(() => {
    if (!storage) return;
    const timer = setTimeout(() => {
      saveReports(reports, storage);
    }, 200);
    return () => clearTimeout(timer);
  }, [reports, storage]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!justSignedIn) return;
    const offline = typeof navigator !== "undefined" ? !navigator.onLine : false;
    if (offline && reports.length === 0) {
      setBanner("Your reports will appear after first sync.");
    }
    clearJustSignedIn();
  }, [justSignedIn, reports.length, clearJustSignedIn]);

  useEffect(() => {
    if (reports.length > 0) {
      setBanner("");
    }
  }, [reports.length]);

  // When selecting a report, default the active tab to the first document
  const docList = selected?.documents || [];
  const docIdsKey = useMemo(() => docList.map((doc) => doc.id).join("|"), [docList]);

  useEffect(() => {
    if (!selected) {
      setActiveDocId(null);
      return;
    }
    setActiveDocId((prev) => {
      if (prev && docList.some((doc) => doc.id === prev)) {
        return prev;
      }
      return docList[0]?.id || null;
    });
  }, [selected, docList, docIdsKey]);

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
    setDuplicatePrompt(null);
  }

  function handleCreateReport() {
    if (!canCreate) return;
    const normalized = jobNo.trim().toLowerCase();
    const existing = reports.find((report) => report.jobNo.trim().toLowerCase() === normalized);
    if (existing) {
      setDuplicatePrompt({ id: existing.id, jobNo: existing.jobNo });
      return;
    }
    createReport();
  }

  const updateReport = useCallback(
    (patch) => {
      if (!selectedId) return;
      setReports((prev) =>
        prev.map((report) => {
          if (report.id !== selectedId) return report;
          const entries = Object.entries(patch || {});
          if (!entries.length) return report;
          const hasChange = entries.some(([key, value]) => report[key] !== value);
          if (!hasChange) return report;
          return { ...report, ...patch };
        }),
      );
    },
    [selectedId],
  );

  const updateDocs = useCallback(
    (mutator) => {
      if (!selectedId) return;
      setReports((prev) =>
        prev.map((report) => {
          if (report.id !== selectedId) return report;
          const currentDocs = report.documents || [];
          const nextDocs = typeof mutator === "function" ? mutator(currentDocs) : mutator;
          if (nextDocs === currentDocs) {
            return report;
          }
          return { ...report, documents: nextDocs };
        }),
      );
    },
    [selectedId],
  );

  const updateDocById = useCallback(
    (id, nextDoc) => {
      updateDocs((docs = []) => docs.map((doc) => (doc.id === id ? nextDoc : doc)));
    },
    [updateDocs],
  );

  const updatePhotos = useCallback(
    (mutator) => {
      if (!selectedId) return;
      setReports((prev) =>
        prev.map((report) => {
          if (report.id !== selectedId) return report;
          const currentPhotos = report.photos || [];
          const nextPhotos = typeof mutator === "function" ? mutator(currentPhotos) : mutator;
          if (nextPhotos === currentPhotos) {
            return report;
          }
          return { ...report, photos: nextPhotos };
        }),
      );
    },
    [selectedId],
  );

  const removeReport = useCallback(
    (id) => {
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const filtered = useMemo(()=> {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r => r.jobNo.toLowerCase().includes(q) || r.tripType.toLowerCase().includes(q) || (r.model||'').toLowerCase().includes(q) || (r.sharedSite?.jobName||'').toLowerCase().includes(q));
  }, [reports, search]);

  const reportsSizeBytes = useMemo(() => {
    try {
      const json = JSON.stringify(reports || []);
      if (!json) return 0;
      return new TextEncoder().encode(json).length;
    } catch {
      return 0;
    }
  }, [reports]);

  const readyForIssues = selected ? (!!selected.serialTagImageUrl || !!selected.serialTagMissing) : false;
  const fsrDoc = selected?.documents?.find(d => (d.name||"").toLowerCase() === 'field service report');
  const fsrData = ensureFsrDocData(fsrDoc?.data);
  const fsrEntries = fsrData.entries || [];
  const fsrIssueEntries = fsrEntries.filter((entry) => entry.type === "issue");

  useEffect(() => {
    if (!fsrDoc) return;
    const needsEntries = !Array.isArray(fsrDoc.data?.entries);
    const needsDetails = typeof fsrDoc.data?.details !== "object";
    if (needsEntries || needsDetails) {
      updateDocById(fsrDoc.id, { ...fsrDoc, data: ensureFsrDocData(fsrDoc.data) });
    }
  }, [fsrDoc?.id, fsrDoc, updateDocById]);

  const activeDoc = selected?.documents?.find(d=>d.id===activeDocId) || null;
  const hasPhotos = (selected?.photos||[]).length>0;
  const isFsrTabActive = (activeDoc?.name || "").toLowerCase() === "field service report";

  const fsrDocId = fsrDoc?.id;

  const updateFsrData = useCallback(
    (mutator) => {
      if (!selectedId || !fsrDocId) return;
      setReports((prev) =>
        prev.map((report) => {
          if (report.id !== selectedId) return report;
          const docs = report.documents || [];
          let changed = false;
          const nextDocs = docs.map((doc) => {
            if (doc.id !== fsrDocId) return doc;
            const base = ensureFsrDocData(doc.data);
            const result = typeof mutator === "function" ? mutator(base) || base : base;
            const nextData = ensureFsrDocData(result);
            if (nextData === doc.data) {
              return doc;
            }
            changed = true;
            return { ...doc, data: nextData };
          });
          if (!changed) {
            return report;
          }
          return { ...report, documents: nextDocs };
        }),
      );
    },
    [selectedId, fsrDocId],
  );

  const handleAddEntry = useCallback(
    (entry) => {
      updateFsrData((data) => addEntryWithEffects(data, entry));
    },
    [updateFsrData],
  );

  const handleUpdateEntry = useCallback(
    (id, updater) => {
      updateFsrData((data) => updateEntryInFsrData(data, id, updater));
    },
    [updateFsrData],
  );

  const handleRemoveEntry = useCallback(
    (id) => {
      updateFsrData((data) => removeEntryFromFsrData(data, id));
    },
    [updateFsrData],
  );

  const handleMoveEntry = useCallback(
    (id, direction) => {
      updateFsrData((data) => moveEntryInFsrData(data, id, direction));
    },
    [updateFsrData],
  );

  const handleCollapseAll = useCallback(
    (collapsed) => {
      updateFsrData((data) => setEntriesCollapsedState(data, collapsed));
    },
    [updateFsrData],
  );

  const activeDocIdMemo = activeDoc?.id;

  const handleUpdateActiveDoc = useCallback(
    (nextDoc) => {
      if (!activeDocIdMemo) return;
      updateDocById(activeDocIdMemo, nextDoc);
    },
    [activeDocIdMemo, updateDocById],
  );

  const handleSync = useCallback(() => {
    console.log("Cloud sync placeholder—no server configured.");
    setToast({ id: Date.now(), text: "Cloud sync placeholder—no server configured." });
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-xl">
            {toast.text}
          </div>
        </div>
      )}
      {/* Shell with optional Sidebar */}
      <div className={`mx-auto ${selected? 'max-w-6xl' : 'max-w-7xl'} flex`}>
        {/* Sidebar only on Home */}
        {!selected && (
          <aside className="w-[320px] border-r bg-white/70 backdrop-blur sticky top-0 h-dvh p-4 hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold">Reports</h2>
              <button
                className="p-2 rounded-xl border hover:bg-gray-50"
                title="New report"
                aria-label="Create new report"
                onClick={(event) => {
                  setupTriggerRef.current = event.currentTarget;
                  setSetupOpen(true);
                }}
              >
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
                      aria-label={`Delete ${r.jobNo}`}
                      onClick={(event)=>{
                        deleteTriggerRef.current = event.currentTarget;
                        setDeleteTarget({ id: r.id, jobNo: r.jobNo });
                      }}
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
                <button
                  className="p-2 rounded-xl border hover:bg-gray-50"
                  onClick={()=>setSelectedId(null)}
                  title="Home"
                  aria-label="Back to report list"
                >
                  <HomeIcon size={18}/>
                </button>
              )}
              <h1 className="text-2xl md:text-3xl font-extrabold">Field Service Report</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl border flex items-center gap-2"
                  onClick={(event)=>{
                    manageTriggerRef.current = event.currentTarget;
                    setManageOpen(true);
                  }}
                >
                  <Settings size={18}/> Trip Types
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2"
                  onClick={(event)=>{
                    setupTriggerRef.current = event.currentTarget;
                    setSetupOpen(true);
                  }}
                >
                  <Plus size={18}/> New Report
                </button>
              </div>
              <UserMenu
                user={currentUser}
                onLock={onLock}
                onSignOut={onSignOut}
                onSwitchUser={onSwitchUser}
                onSync={handleSync}
              />
            </div>
          </div>

          {banner && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <span>{banner}</span>
              <button className="p-1 rounded-full hover:bg-blue-100" onClick={()=>setBanner("")} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Home (main page) */}
          {!selected && (
            <div className="grid place-items-center py-16">
              <div className="w-full max-w-2xl rounded-3xl border shadow-sm p-8 bg-white text-center">
                <p className="text-gray-500">Start a report or pick one on the left</p>
                <h2 className="text-2xl font-bold mt-1">Create a new Report</h2>
                <button
                  className="mt-6 w-full px-6 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg flex items-center justify-center gap-2"
                  onClick={(event)=>{
                    setupTriggerRef.current = event.currentTarget;
                    setSetupOpen(true);
                  }}
                >
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
                      <button
                        className="ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1"
                        onClick={(event)=>{
                          docsTriggerRef.current = event.currentTarget;
                          setDocsOpen(true);
                        }}
                        title="Edit documents for this job"
                      >
                        <Cog size={14}/> Docs
                      </button>
                      <button
                        className="ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1"
                        onClick={(event)=>{
                          manualsTriggerRef.current = event.currentTarget;
                          setManualsOpen(true);
                        }}
                        title="Owner's Manuals"
                      >
                        <BookOpen size={14}/> Manuals
                      </button>
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
                    <button className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40" disabled={fsrIssueEntries.length === 0} onClick={()=>exportReport(selected, currentUser)}>
                      <FileDown size={18}/> Export Report
                    </button>
                    <button className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40" disabled={!hasPhotos} onClick={()=>exportFieldPictures(selected)}>
                      <FileDown size={18}/> Export Field Pictures
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border text-red-600 flex items-center gap-2"
                      onClick={(event)=>{
                        deleteTriggerRef.current = event.currentTarget;
                        setDeleteTarget({ id: selected.id, jobNo: selected.jobNo });
                      }}
                    >
                      <Trash size={18}/> Delete
                    </button>
                  </div>
                  <div className="md:col-span-5 col-span-1 mt-3">
                    <StorageMeter bytes={reportsSizeBytes} />
                  </div>
                </div>
              </div>

              <SerialTagCard report={selected} onChange={updateReport} />

              {isFsrTabActive && !selected.serialTagImageUrl && !selected.serialTagMissing && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                  Reminder: add a serial tag photo or check <b>None available</b> before logging issues.
                </div>
              )}

              {/* Document Tabs */}
              <DocumentTabs documents={selected.documents||[]} activeId={activeDocId} onSelect={setActiveDocId} />

              {/* Active Document Body */}
              {activeDoc && (activeDoc.name||"").toLowerCase()==='field service report' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white space-y-6">
                  <FsrEntriesSection
                    entries={fsrEntries}
                    onAddEntry={handleAddEntry}
                    onUpdateEntry={handleUpdateEntry}
                    onRemoveEntry={handleRemoveEntry}
                    onMoveEntry={handleMoveEntry}
                    onCollapseAll={handleCollapseAll}
                    readyForIssue={readyForIssues}
                  />
                  <div>
                  <PhotoVault photos={selected.photos||[]} onChange={updatePhotos} />
                  </div>
                </div>
              )}

              {activeDoc && (activeDoc.name||"").toLowerCase()==='service summary' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white">
                  <h3 className="text-lg font-bold mb-4">Service Summary</h3>
                  <ServiceSummaryForm
                    report={selected}
                    doc={activeDoc}
                    onUpdateReport={updateReport}
                    onUpdateDoc={handleUpdateActiveDoc}
                  />
                </div>
              )}

              {activeDoc && (activeDoc.name||"").toLowerCase()!=='field service report' && (activeDoc.name||"").toLowerCase()!=='service summary' && (
                <div className="rounded-3xl border shadow-sm p-6 bg-white">
                  <h3 className="text-lg font-bold">{activeDoc.name}</h3>
                  <p className="text-gray-500 mt-2">This will be a form with questions soon. Use the Docs button near Trip Type to add/remove documents and mark completed.</p>
                </div>
              )}

              <StorageMeter bytes={reportsSizeBytes} className="bg-white/70" />
            </div>
          )}
        </main>
      </div>

      {/* Trip Types Manager */}
      <ManageTypes
        open={manageOpen}
        onClose={()=>setManageOpen(false)}
        types={types}
        setTypes={setTypes}
        returnFocusRef={manageTriggerRef}
        storage={storage}
      />

      {/* Docs Settings Modal */}
      {selected && (
        <ManageDocsModal
          open={docsOpen}
          onClose={()=>setDocsOpen(false)}
          documents={selected.documents||[]}
          onChange={updateDocs}
          returnFocusRef={docsTriggerRef}
        />
      )}

      {/* Manuals Modal */}
      {selected && (
        <ManualsModal
          open={manualsOpen}
          onClose={()=>setManualsOpen(false)}
          model={selected.model}
          returnFocusRef={manualsTriggerRef}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete report?"
        message={deleteTarget? `This will permanently remove ${deleteTarget.jobNo}.` : ''}
        onCancel={()=>setDeleteTarget(null)}
        onConfirm={()=>{ if(deleteTarget){ removeReport(deleteTarget.id); setDeleteTarget(null);} }}
        confirmText="Delete"
        returnFocusRef={deleteTriggerRef}
      />

      <ConfirmDialog
        open={!!duplicatePrompt}
        title="Open existing report?"
        message={duplicatePrompt ? `${duplicatePrompt.jobNo} is already saved. Open it instead or create another report with the same Job #.` : ""}
        onCancel={() => {
          if (duplicatePrompt) {
            setSelectedId(duplicatePrompt.id);
            setSetupOpen(false);
          }
          setDuplicatePrompt(null);
        }}
        cancelText="Open existing"
        confirmText="Use anyway"
        onConfirm={() => {
          setDuplicatePrompt(null);
          createReport();
        }}
        returnFocusRef={setupTriggerRef}
      />

      {/* Setup modal for creating report */}
      <ReportSetup
        open={setupOpen}
        onClose={()=>{ setSetupOpen(false); setDuplicatePrompt(null); }}
        types={types}
        jobNo={jobNo} setJobNo={(v)=>setJobNo(clampJob(v))}
        tripType={tripType} setTripType={setTripType}
        model={model} setModel={setModel}
        startAt={startAt} setStartAt={setStartAt}
        endAt={endAt} setEndAt={setEndAt}
        canCreate={canCreate}
        onCreate={handleCreateReport}
        returnFocusRef={setupTriggerRef}
      />
    </div>
  );
}

function AppShell() {
  const { status, currentUser, scopedStorage, lock, signOut, switchUser, justSignedIn, clearJustSignedIn } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="rounded-2xl border bg-white px-6 py-4 text-sm text-gray-600 shadow">Checking local profiles…</div>
      </div>
    );
  }

  if (!currentUser || !scopedStorage) {
    return <AuthGate />;
  }

  return (
    <Workspace
      storage={scopedStorage}
      currentUser={currentUser}
      onLock={lock}
      onSignOut={signOut}
      onSwitchUser={switchUser}
      justSignedIn={justSignedIn}
      clearJustSignedIn={clearJustSignedIn}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function ReportSetup({
  open,
  onClose,
  types,
  jobNo,
  setJobNo,
  tripType,
  setTripType,
  model,
  setModel,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
  canCreate,
  onCreate,
  returnFocusRef,
}) {
  if (!open) return null;
  const endBeforeStart = new Date(endAt) < new Date(startAt);
  const jobValid = isValidJob(jobNo);
  const containerRef = useRef(null);
  useModalA11y(open, containerRef, { onClose, returnFocusRef });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">New Report</h3>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close new report dialog"
          >
            <X size={18}/>
          </button>
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
