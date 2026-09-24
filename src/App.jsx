import { fillTimeLogDates } from "./utils/timeLogDates.js";
import { prefillAcceptanceContact } from "./utils/acceptanceContact.js";
import { serialFromJob } from './utils/jobNumber.js';
import WorkSummary from './components/WorkSummary';
import TripSetupPanel from './components/TripSetupPanel';
import { setupMissing, documentStatus, orderNewDocuments } from './utils/fieldWorkflow';
import GmailInvitePicker from "./components/GmailInvitePicker";
// FSR iPad – Web Demo Prototype (React) v0.8 (widgets removed)
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, FileDown, X, Settings, Trash, Search, FolderPlus, Calendar, Home as HomeIcon, Cog, BookOpen, Camera } from "lucide-react";

import {
  addEntryWithEffects,
  clampJob,
  ensureFsrDocData,
  exportFieldPictures,
  exportReport,
  formatRange,
  isValidJob,
  loadTypes,
  makeDocs,
  ACCEPTANCE_CERT_DOC_NAME,
  isAcceptanceCertDocName,
  MODELS,
  moveEntryInFsrData,
  MOTOR_TEST_DOC_NAME,
  isMotorTestDocName,
  removeEntryFromFsrData,
  setEntriesCollapsedState,
  toISOInput,
  uid,
  updateEntryInFsrData,
} from "./utils/fsr";
import { loadReportsFromIndexedDb, saveReportsToIndexedDb } from "./utils/reportStore";
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
  MotorTestForm,
  AcceptanceCertificationForm,
  ReportHeaderBar,
  DocEditorShell,
  ConnectionStatus,
  SaveStatus,
  BackupRestoreModal,
  TemplateManagerModal,
  BuildStamp,
} from "./components";
import useModalA11y from "./hooks/useModalA11y";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AuthGate from "./auth/AuthGate";
import { parseTripInvite, findImportedInvite } from "./utils/inviteParser";

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

  const [reports, setReports] = useState([]);
  const [loadedReportScope, setLoadedReportScope] = useState(null);
  const [saveState, setSaveState] = useState("loading");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(()=> reports.find(r=>r.id===selectedId) || null, [reports, selectedId]);

  // Setup form state
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupReportId, setSetupReportId] = useState(null);
  const [correctionReportId, setCorrectionReportId] = useState(null);

  const [search, setSearch] = useState("");

  // Docs tabs state
  const [activeDocId, setActiveDocId] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [manualsOpen, setManualsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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
  const backupTriggerRef = useRef(null);
  const templatesTriggerRef = useRef(null);
  const pendingExportFocusRef = useRef("");
  const reportsRef = useRef(reports);
  const pendingSaveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const saveAttemptRef = useRef(0);

  const storageScope = storage?.scopeId || "";

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  const persistReports = useCallback(
    (snapshot = reportsRef.current) => {
      const attempt = saveAttemptRef.current + 1;
      saveAttemptRef.current = attempt;
      setSaveState("saving");
      const queuedSave = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          saveReportsToIndexedDb(snapshot, { scopeId: storageScope, legacyStorage: storage }),
        );
      saveQueueRef.current = queuedSave;
      return queuedSave
        .then(() => {
          if (attempt !== saveAttemptRef.current) return;
          setSaveState("saved");
          setLastSavedAt(new Date());
        })
        .catch((error) => {
          if (attempt !== saveAttemptRef.current) throw error;
          console.error("Failed to save reports to IndexedDB", error);
          setSaveState("error");
          setBanner("The latest report changes could not be saved on this device.");
          throw error;
        });
    },
    [storage, storageScope],
  );

  const flushPendingSave = useCallback(async () => {
    if (pendingSaveTimerRef.current) {
      clearTimeout(pendingSaveTimerRef.current);
      pendingSaveTimerRef.current = null;
    }
    if (loadedReportScope !== storageScope) return;
    await persistReports(reportsRef.current);
  }, [loadedReportScope, persistReports, storageScope]);

  useEffect(() => {
    if (!storage) return;
    setTypes(loadTypes(storage));
    setLoadedReportScope(null);
    setSaveState("loading");
    let cancelled = false;
    loadReportsFromIndexedDb({ scopeId: storageScope, legacyStorage: storage })
      .then(({ reports: storedReports }) => {
        if (cancelled) return;
        setReports(storedReports);
        setLoadedReportScope(storageScope);
        setSaveState("saved");
      })
      .catch((error) => {
        console.error("Failed to load reports from IndexedDB", error);
        if (cancelled) return;
        setReports([]);
        setLoadedReportScope(storageScope);
        setBanner("Reports could not be loaded from local device storage.");
      });
    setSelectedId(null);
    return () => {
      cancelled = true;
    };
  }, [storageScope]);

  // Persist on changes
  useEffect(() => {
    if (!storage || loadedReportScope !== storageScope) return;
    setSaveState("saving");
    if (pendingSaveTimerRef.current) clearTimeout(pendingSaveTimerRef.current);
    pendingSaveTimerRef.current = setTimeout(() => {
      pendingSaveTimerRef.current = null;
      persistReports(reports).catch(() => undefined);
    }, 200);
    return () => {
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
    };
  }, [reports, storage, storageScope, loadedReportScope, persistReports]);

  useEffect(() => {
    const flushOnPageHide = () => {
      flushPendingSave().catch(() => undefined);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushOnPageHide();
    };
    window.addEventListener("pagehide", flushOnPageHide);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushOnPageHide);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [flushPendingSave]);

  const handleLock = useCallback(async () => {
    await flushPendingSave();
    onLock?.();
  }, [flushPendingSave, onLock]);

  const handleSignOut = useCallback(async () => {
    await flushPendingSave();
    onSignOut?.();
  }, [flushPendingSave, onSignOut]);

  const handleSwitchUser = useCallback(async () => {
    await flushPendingSave();
    onSwitchUser?.();
  }, [flushPendingSave, onSwitchUser]);

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
  const docIdsKey = useMemo(() => {
    const docs = selected?.documents || [];
    return docs.map((doc) => doc.id).join("|");
  }, [selected?.documents]);

  useEffect(() => {
    if (!selected) {
      setActiveDocId(null);
      return;
    }
    const docs = selected.documents || [];
    if (docs.length === 0) {
      setActiveDocId(null);
      return;
    }
    setActiveDocId((prev) => {
      if (prev && docs.some((doc) => doc.id === prev)) {
        return prev;
      }
      return docs[0]?.id || null;
    });
  }, [selected?.id, docIdsKey]);

  const createReportFromDraft = useCallback(
    (draft) => {
      if (!draft) return;
      const { jobNo, tripType, model, startAt, endAt } = draft;
      const inviteMeta = draft.inviteMeta || null;
      const projectContact = inviteMeta?.projectContact || {};
      const installContact = inviteMeta?.installContact || {};
      const contactSource = { inviteMeta, sharedSite: draft.sharedSite };
      const documents = orderNewDocuments(makeDocs(tripType), tripType).map((doc) => {
        const name = (doc.name || "").toLowerCase();
        if (name === "service summary") {
          return {
            ...doc,
            data: {
              ...doc.data,
              timeLogs: fillTimeLogDates(doc.data.timeLogs, startAt),
              pmContact: [projectContact.name, projectContact.email].filter(Boolean).join(" | "),
              customerContact: [installContact.name, installContact.phone].filter(Boolean).join(" | "),
            },
          };
        }
        if (isAcceptanceCertDocName(doc.name)) {
          return {
            ...doc,
            data: {
              ...doc.data,
              ...prefillAcceptanceContact(doc.data, contactSource),
              startupDate: String(startAt || "").slice(0, 10),
            },
          };
        }
        return doc;
      });
      const report = {
        id: uid(),
        jobNo: jobNo.trim(),
        tripType,
        model,
        startAt: startAt ? new Date(startAt).toISOString() : "",
        endAt: endAt ? new Date(endAt).toISOString() : "",
        createdAt: new Date().toISOString(),
        serialTagImageUrl: "",
        serialTagMissing: false,
        documents,
        photos: [],
        sharedSite: {
          jobName: "",
          siteStreetAddress: "",
          siteMailingAddress: "",
          siteCity: "",
          siteState: "",
          siteZip: "",
          customerContact: "",
          ...(draft.sharedSite || {}),
          serialNumberText: serialFromJob(jobNo),
        },
        inviteMeta,
      };
      setReports((prev) => [report, ...prev]);
      setSelectedId(report.id);
      setSetupReportId(report.id);
      setSetupOpen(false);
      setDuplicatePrompt(null);
    },
    [setReports, setSelectedId],
  );

  const handleCreateReport = useCallback(
    (draft) => {
      if (!draft) return;
      const imported = findImportedInvite(reports, draft);
      if (imported) { setSelectedId(imported.id); setSetupOpen(false); return; }
      const normalized = draft.jobNo.trim().toLowerCase();
      const existing = reports.find((report) => report.jobNo.trim().toLowerCase() === normalized);
      if (existing) {
        setDuplicatePrompt({ id: existing.id, jobNo: existing.jobNo, draft });
        return;
      }
      createReportFromDraft(draft);
    },
    [reports, createReportFromDraft, setSelectedId],
  );

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
          const next = { ...report, ...patch };
          return { ...next, sharedSite: { ...next.sharedSite, serialNumberText: serialFromJob(next.jobNo) } };
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
    (id, value) => {
      updateDocs((docs = []) =>
        docs.map((doc) => {
          if (doc.id !== id) return doc;
          const nextDoc = typeof value === "function" ? value(doc) : value;
          return nextDoc || doc;
        }),
      );
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
  const fsrDocId = fsrDoc?.id;
  const fsrDocData = fsrDoc?.data;
  const fsrData = ensureFsrDocData(fsrDoc?.data);
  const fsrEntries = fsrData.entries || [];
  const fsrIssueEntries = fsrEntries.filter((entry) => entry.type === "issue");

  useEffect(() => {
    if (!fsrDocId) return;
    const needsEntries = !Array.isArray(fsrDocData?.entries);
    const needsDetails = typeof fsrDocData?.details !== "object";
    if (!needsEntries && !needsDetails) return;
    updateDocById(fsrDocId, (doc) => ({ ...doc, data: ensureFsrDocData(fsrDocData) }));
  }, [fsrDocId, fsrDocData, updateDocById]);

  const headerMissing = selected ? setupMissing(selected, currentUser) : [];
  const showingSetup = selected && (setupReportId === selected.id || (headerMissing.length > 0 && correctionReportId !== selected.id));
  const activeDoc = !showingSetup ? selected?.documents?.find(d=>d.id===activeDocId) || null : null;
  const hasSavedWork = selected?.photos?.length || selected?.documents?.some(doc => doc.done || doc.data?.entries?.length || doc.data?.issues?.length || doc.data?.details?.workSummary || doc.data?.details?.partsInstalled?.length || doc.data?.details?.partsNeeded?.length || doc.data?.servicePerformed || doc.data?.timeLogs?.some(row=>row.timeIn || row.timeOut || row.signature) || Object.values(doc.data?.motor || {}).some(Boolean) || doc.data?.testedLoad || doc.data?.acceptedByName);
  const nextStage = selected?.documents?.slice(selected.documents.findIndex(doc=>doc.id===activeDocId)+1).find(doc=>!["Form unavailable"].includes(documentStatus(doc,selected,currentUser)));
  const hasPhotos = (selected?.photos||[]).length>0;
  const isFsrTabActive = (activeDoc?.name || "").toLowerCase() === "field service report";
  const isMotorTestDocActive = isMotorTestDocName(activeDoc?.name);
  const isAcceptanceDocActive = isAcceptanceCertDocName(activeDoc?.name);

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

  const handleResolveExportField = useCallback((missing) => {
    const target = missing?.target;
    if (!target) return;
    if (target.documentName) {
      const sourceDocument = selected?.documents?.find((doc) => (doc.name || "").toLowerCase() === target.documentName.toLowerCase());
      if (sourceDocument) setActiveDocId(sourceDocument.id);
    }
    if (['#report-job-number','#report-model','#report-start-date','#report-technician'].includes(target.selector) || target.selector.startsWith('#shared-')) setSetupReportId(selected.id);
    else { setSetupReportId(null); setCorrectionReportId(selected.id); }
    pendingExportFocusRef.current = target.selector;
    setTemplatesOpen(false);
  }, [selected?.documents]);

  useEffect(() => {
    if (templatesOpen || !pendingExportFocusRef.current) return;
    const selector = pendingExportFocusRef.current;
    const timer = window.setTimeout(() => {
      const field = document.querySelector(selector);
      if (!field) return;
      pendingExportFocusRef.current = "";
      field.scrollIntoView?.({ behavior: "smooth", block: "center" });
      field.focus?.({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [activeDocId, templatesOpen, showingSetup]);

  const handleSetExportDocumentDone = useCallback((templateId, done) => {
    const documentName = {
      "field-service-report": "Field Service Report",
      "internal-field-service-report": "Field Service Report",
      "service-summary": "Service Summary",
      "acceptance-certification": ACCEPTANCE_CERT_DOC_NAME,
      "motor-test": MOTOR_TEST_DOC_NAME,
      "inspection-workbook": "Inspection Sheet",
    }[templateId];
    if (!documentName) return;
    updateDocs((documents = []) => documents.map((doc) => (doc.name || "").toLowerCase() === documentName.toLowerCase() ? { ...doc, done } : doc));
  }, [updateDocs]);

  const handleSync = useCallback(() => {
    console.log("Cloud sync placeholder—no server configured.");
    setToast({ id: Date.now(), text: "Cloud sync placeholder—no server configured." });
  }, []);

  return (
    <div className={`field-app min-h-dvh ${selected ? "report-open" : ""}`}>
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
          <aside className="report-library w-[300px] border-r bg-white p-4">
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
        <main className="workspace-main flex-1 min-w-0 p-6">
          <div className="app-topbar flex items-center justify-between mb-6">
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
              <h1 className="text-2xl md:text-3xl font-extrabold">Fieldwork</h1>
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
                onLock={handleLock}
                onSignOut={handleSignOut}
                onSwitchUser={handleSwitchUser}
                onSync={handleSync}
                onBackup={(event) => {
                  backupTriggerRef.current = event.currentTarget;
                  setBackupOpen(true);
                }}
                onTemplates={(event) => {
                  templatesTriggerRef.current = event.currentTarget;
                  setTemplatesOpen(true);
                }}
              />
              <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
              <ConnectionStatus />
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
                <p className="text-gray-500">Your next site visit starts here.</p>
                <h2 className="text-2xl font-bold mt-1">Arrive prepared. Capture as you go.</h2>
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
              <div className="trip-banner"><div><p className="eyebrow">{selected.tripType || 'Trip draft'} · {selected.jobNo || 'Job not set'}</p><h2>{selected.sharedSite?.jobName || 'Set up your site visit'}</h2><p>{selected.model ? `Model ${selected.model}` : 'Model not set'} · {headerMissing.length ? 'Setup incomplete' : 'Shared headers ready'}</p></div><div className="flex gap-2 flex-wrap"><button onClick={()=>setSetupReportId(selected.id)}>Trip setup</button><button ref={docsTriggerRef} onClick={()=>setDocsOpen(true)}>Manage documents</button><button className="primary" ref={templatesTriggerRef} onClick={()=>setTemplatesOpen(true)}>Review & export</button></div></div>
              {showingSetup ? <TripSetupPanel report={selected} user={currentUser} types={types} onUpdate={updateReport} onStart={()=>{setSetupReportId(null);setCorrectionReportId(selected.id);}} onManage={()=>setDocsOpen(true)} onCorrectExisting={hasSavedWork ? ()=>{setSetupReportId(null);setCorrectionReportId(selected.id);} : undefined}>
                <ReportHeaderBar showSerial={false} report={selected} onUpdateReport={updateReport} onOpenManuals={(event)=>{manualsTriggerRef.current=event.currentTarget;setManualsOpen(true);}} manualsButtonRef={manualsTriggerRef}/>
              </TripSetupPanel> : <>
                <div className="workflow-nav"><DocumentTabs documents={(selected.documents || []).map(doc=>({...doc, status:documentStatus(doc,selected,currentUser)}))} activeId={activeDocId} onSelect={setActiveDocId} onReorder={next=>updateDocs(next.map(({status,...doc})=>doc))}/></div>
                <div className="stage-heading"><div><p className="eyebrow">Stage {Math.max(1,(selected.documents || []).findIndex(doc=>doc.id===activeDocId)+1)} of {selected.documents.length}</p><h2>{activeDoc?.name || 'Choose a document'}</h2><p>{activeDoc ? documentStatus(activeDoc,selected,currentUser) : 'Add a page with Manage documents.'}{isAcceptanceDocActive ? ' · You can leave acceptance pending and export other completed documents.' : ''}</p></div><button onClick={()=>{if(nextStage)setActiveDocId(nextStage.id);else setTemplatesOpen(true);}}>{nextStage ? `Next: ${nextStage.name} →` : 'Review & export →'}</button></div>
                {isFsrTabActive && <details className="surface serial-disclosure" open={!readyForIssues}><summary>Serial tag · {readyForIssues ? 'Recorded — edit photo or availability' : 'Required before adding issues'}</summary><ReportHeaderBar report={selected} onUpdateReport={updateReport} onOpenManuals={()=>setManualsOpen(true)} manualsButtonRef={manualsTriggerRef}/></details>}
              </>}

              {/* Active Document Body */}
              {activeDoc && (activeDoc.name||"").toLowerCase()==='field service report' && (
                <DocEditorShell
                  documents={selected.documents||[]}
                  activeId={activeDocId}
                  onSelect={setActiveDocId}
                  onReorder={(next)=>updateDocs(next)}
                  className="rounded-3xl border shadow-sm p-6 bg-white space-y-6"
                >
                  <FsrEntriesSection
                    entries={fsrEntries}
                    onAddEntry={handleAddEntry}
                    onUpdateEntry={handleUpdateEntry}
                    onRemoveEntry={handleRemoveEntry}
                    onMoveEntry={handleMoveEntry}
                    onCollapseAll={handleCollapseAll}
                    readyForIssue={readyForIssues}
                  />
                  <WorkSummary report={selected} data={fsrData} onChange={updateFsrData} />
                  <div>
                    <button className="mb-3 px-3 py-2 border rounded-xl" disabled={!hasPhotos} onClick={()=>exportFieldPictures(selected)}>Export field photos</button>
                    <PhotoVault photos={selected.photos||[]} onChange={updatePhotos} />
                  </div>
                </DocEditorShell>
              )}

              {activeDoc && (activeDoc.name||"").toLowerCase()==='service summary' && (
                <DocEditorShell
                  documents={selected.documents||[]}
                  activeId={activeDocId}
                  onSelect={setActiveDocId}
                  onReorder={(next)=>updateDocs(next)}
                  className="rounded-3xl border shadow-sm p-6 bg-white"
                >
                  <h3 className="text-lg font-bold mb-4">Service Summary</h3>
                  <ServiceSummaryForm
                    report={selected}
                    doc={activeDoc}
                    user={currentUser}
                    onOpenTemplates={() => setTemplatesOpen(true)}
                    onUpdateDoc={handleUpdateActiveDoc}
                  />
                </DocEditorShell>
              )}

              {activeDoc && isAcceptanceDocActive && (
                <DocEditorShell
                  documents={selected.documents||[]}
                  activeId={activeDocId}
                  onSelect={setActiveDocId}
                  onReorder={(next)=>updateDocs(next)}
                  className="rounded-3xl border shadow-sm p-6 bg-white space-y-4"
                >
                  <h3 className="text-lg font-bold">{ACCEPTANCE_CERT_DOC_NAME}</h3>
                  <AcceptanceCertificationForm
                    report={selected}
                    doc={activeDoc}
                    user={currentUser}
                    onOpenTemplates={() => setTemplatesOpen(true)}
                    onUpdateDoc={handleUpdateActiveDoc}
                  />
                </DocEditorShell>
              )}

              {activeDoc && isMotorTestDocActive && (
                <DocEditorShell
                  documents={selected.documents||[]}
                  activeId={activeDocId}
                  onSelect={setActiveDocId}
                  onReorder={(next)=>updateDocs(next)}
                  className="rounded-3xl border shadow-sm p-6 bg-white space-y-4"
                >
                  <h3 className="text-lg font-bold">{MOTOR_TEST_DOC_NAME}</h3>
                  <MotorTestForm report={selected} doc={activeDoc} onUpdateDoc={handleUpdateActiveDoc} />
                </DocEditorShell>
              )}

              {activeDoc &&
                !isFsrTabActive &&
                (activeDoc.name || "").toLowerCase() !== "service summary" &&
                !isMotorTestDocActive &&
                !isAcceptanceDocActive && (
                <DocEditorShell
                  documents={selected.documents||[]}
                  activeId={activeDocId}
                  onSelect={setActiveDocId}
                  onReorder={(next)=>updateDocs(next)}
                  className="rounded-3xl border shadow-sm p-6 bg-white"
                >
                  <h3 className="text-lg font-bold">{activeDoc.name}</h3>
                  <p className="text-gray-500 mt-2">This form is not implemented yet. Existing data is retained, but inspection answers and startup checks cannot be recorded here. Continue to another stage or use Manage documents. Header-only workbook export does not complete an inspection.</p>
                </DocEditorShell>
              )}

              {/* Legacy per-document info/serial bars removed; actions remain below as before if present elsewhere */}

              <StorageMeter bytes={reportsSizeBytes} className="bg-white/70" />
            </div>
          )}
        </main>
      </div>

      <BuildStamp />

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
          if (duplicatePrompt?.draft) {
            createReportFromDraft(duplicatePrompt.draft);
          } else {
            setDuplicatePrompt(null);
          }
        }}
        returnFocusRef={setupTriggerRef}
      />

      {/* Setup modal for creating report */}
      <ReportSetup
        open={setupOpen}
        onClose={()=>{ setSetupOpen(false); setDuplicatePrompt(null); }}
        types={types}
        reports={reports}
        onOpenExisting={(id) => { setSelectedId(id); setSetupOpen(false); }}
        onCreate={handleCreateReport}
        returnFocusRef={setupTriggerRef}
      />

      <BackupRestoreModal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        reports={reports}
        technician={currentUser}
        onRestore={(restoredReports) => {
          setReports(restoredReports);
          setSelectedId(null);
          setBanner(`Restored ${restoredReports.length} reports from backup.`);
        }}
        returnFocusRef={backupTriggerRef}
      />
      <TemplateManagerModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        report={selected}
        technician={currentUser}
        onResolveMissing={handleResolveExportField}
        onSetDocumentDone={handleSetExportDocumentDone}
        returnFocusRef={templatesTriggerRef}
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

export { ReportSetup };



function makeInitialReportDraft() {

  return {
    jobNo: "J#",
    tripType: "",
    model: "",
    startAt: "",
    endAt: "",
  };
}

function ReportSetup({ open, onClose, types, onCreate, returnFocusRef, reports = [], onOpenExisting }) {
  const containerRef = useRef(null);
  const [draft, setDraft] = useState(() => makeInitialReportDraft());
  const [inviteError, setInviteError] = useState("");
  const inviteInputRef = useRef(null);
  const initializedRef = useRef(false);
  const idPrefix = useId();
  const jobFieldId = `${idPrefix}-job`;
  const tripTypeId = `${idPrefix}-trip-type`;
  const modelId = `${idPrefix}-model`;
  const startAtId = `${idPrefix}-start`;
  const endAtId = `${idPrefix}-end`;

  useEffect(() => {
    if (open && !initializedRef.current) {
      setDraft(makeInitialReportDraft());
      setInviteError("");
      initializedRef.current = true;
    } else if (!open && initializedRef.current) {
      initializedRef.current = false;
    }
  }, [open]);

  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  if (!open) return null;

  const jobValid = isValidJob(draft.jobNo);
  const importedReport = findImportedInvite(reports, draft);

  const endBeforeStart = new Date(draft.endAt) < new Date(draft.startAt);
  const canCreate = !!draft.tripType && (!draft.startAt || Number.isFinite(Date.parse(draft.startAt))) && (!draft.endAt || Number.isFinite(Date.parse(draft.endAt))) && !endBeforeStart && !importedReport;

  const handleSubmit = () => {
    if (!canCreate) return;
    onCreate?.({
      ...draft,
      jobNo: clampJob(draft.jobNo),
    });
  };

  const applyInvite = (imported) => {
    setInviteError("");
    setDraft((previous) => ({ ...previous, ...imported }));
  };

  const handleInviteFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setInviteError("");
    try {
      const imported = parseTripInvite(await file.text());
      applyInvite(imported);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to read this calendar invitation.");
    } finally {
      event.target.value = "";
    }
  };

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
    >
      <div ref={containerRef} tabIndex={-1} className="max-h-[90dvh] overflow-y-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">New Report</h3>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close new report dialog"
          >
            <X size={18} />
          </button>
        </div>
        <input ref={inviteInputRef} className="hidden" type="file" accept=".ics,text/calendar" onChange={handleInviteFile} />
        <div className="mb-4 rounded-xl border bg-blue-50 p-3">
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => inviteInputRef.current?.click()}
          >
            Import Calendar Invite
          </button>
          <span className="ml-3 text-xs text-blue-900">Import a trip, or enter the details below manually.</span>
          <GmailInvitePicker onImport={applyInvite} />
          {importedReport && <div role="alert" className="mt-2 text-sm text-amber-900">This invitation already has a report. <button type="button" className="underline font-semibold" onClick={() => onOpenExisting?.(importedReport.id)}>Open existing report</button></div>}
          {draft.inviteMeta?.summary && <div className="mt-2 text-xs font-medium text-emerald-700">Loaded: {draft.inviteMeta.summary}</div>}
          {inviteError && <div className="mt-2 text-xs text-red-600">{inviteError}</div>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold" htmlFor={jobFieldId}>
              Job / serial number (format: J#01 … J#99999)
            </label>
            <input
              id={jobFieldId}
              className={`w-full rounded-xl border px-3 py-2 ${jobValid ? "" : "border-red-400"}`}
              value={draft.jobNo}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  jobNo: clampJob(event.target.value),
                }))
              }
              placeholder="J#12345"
            />
            {!jobValid && (
              <div className="text-xs text-red-500 mt-1">
                Enter at least 2 and up to 5 digits after J# (e.g., J#01, J#20021).
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor={tripTypeId}>
              Trip type
            </label>
            <select
              id={tripTypeId}
              className="w-full rounded-xl border px-3 py-2"
              value={draft.tripType}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  tripType: event.target.value,
                }))
              }
            >
              <option value="">— Choose —</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor={modelId}>
              Model
            </label>
            <select
              id={modelId}
              className="w-full rounded-xl border px-3 py-2"
              value={draft.model}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  model: event.target.value,
                }))
              }
            >
              <option value="">— Choose model —</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor={startAtId}>
              Start
            </label>
            <input
              id={startAtId}
              type="datetime-local"
              className="w-full rounded-xl border px-3 py-2"
              value={draft.startAt}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  startAt: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor={endAtId}>
              End
            </label>
            <input
              id={endAtId}
              type="datetime-local"
              className={`w-full rounded-xl border px-3 py-2 ${endBeforeStart ? "border-red-400" : ""}`}
              value={draft.endAt}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  endAt: event.target.value,
                }))
              }
            />
            {endBeforeStart && <div className="text-xs text-red-500 mt-1">End must be after Start.</div>}
          </div>
        </div>
        {<div className="mt-4 space-y-3">
          <p className="text-xs text-gray-600">Review the imported details. Timed events use this device’s time zone; all-day End shows the last included day. Choose the model if it was not supplied.</p>
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3"><legend className="font-semibold">Site details</legend>
            {[["jobName", "Site name"], ["siteStreetAddress", "Street address"], ["siteMailingAddress", "Mailing address"], ["siteCity", "City"], ["siteState", "State"], ["siteZip", "ZIP code"], ["customerContact", "Site contact"]].map(([key, label]) => <label key={key} className="text-sm">{label}<input className="block w-full rounded-lg border p-2" value={draft.sharedSite?.[key] || ""} onChange={(event) => setDraft((prev) => ({ ...prev, sharedSite: { ...prev.sharedSite, [key]: event.target.value } }))} /></label>)}
          </fieldset>
          {[["projectContact", "Project contact"], ["installContact", "Install contact"]].map(([contact, label]) => <fieldset key={contact} className="grid grid-cols-1 md:grid-cols-2 gap-3"><legend className="font-semibold">{label}</legend>
            {[["name", "Name"], ["company", "Company"], ["phone", "Phone"], ["alternatePhone", "Alternate phone"], ["email", "Email"]].map(([key, title]) => <label key={key} className="text-sm">{label} {title.toLowerCase()}<input className="block w-full rounded-lg border p-2" value={draft.inviteMeta?.[contact]?.[key] || ""} onChange={(event) => setDraft((prev) => ({ ...prev, inviteMeta: { ...prev.inviteMeta, [contact]: { ...prev.inviteMeta?.[contact], [key]: event.target.value } } }))} /></label>)}
          </fieldset>)}
        </div>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
            disabled={!canCreate}
            onClick={handleSubmit}
          >
            Save draft & review setup
          </button>
        </div>
      </div>
    </div>
  );
}
