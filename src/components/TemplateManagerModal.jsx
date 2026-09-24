import { tripExportRows, buildTripArchive } from "../utils/tripExport";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudDownload, Download, FileArchive, RefreshCcw, X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y";
import { buildNativeDocument, outputFilename, shareOrDownloadDocument, shareOrDownloadDocuments } from "../utils/nativeTemplates";
import {
  listStoredTemplates,
  normalizeTripType,
  templatesForTrip,
} from "../utils/templateStore";
import { requestGoogleDriveToken, syncGoogleTemplatesForTrip } from "../utils/googleDriveTemplates";
import { templateReadiness, missingItemsForTemplate } from "../utils/nativeTemplateReadiness";

export default function TemplateManagerModal({ open, onClose, report, technician, tripReports = [], returnFocusRef, onResolveMissing, onSetDocumentDone }) {
  const containerRef = useRef(null);
  const [stored, setStored] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  const installed = useMemo(
    () => new Map(stored
      .filter((item) => !item.tripType || normalizeTripType(item.tripType) === normalizeTripType(report?.tripType))
      .map((item) => [item.templateId || item.id, item])),
    [report?.tripType, stored],
  );
  const definitions = useMemo(() => templatesForTrip(report?.tripType).filter(definition => !report || report.documents?.some(doc => ({'service-summary':'Service Summary','field-service-report':'Field Service Report','internal-field-service-report':'Field Service Report','motor-test':'Motor Test Data','acceptance-certification':'Acceptance Certificate','inspection-workbook':'Inspection Sheet'})[definition.id] === doc.name)), [report]);
  const exportRows = useMemo(() => definitions.map((definition) => {
    const record = installed.get(definition.id);
    const readiness = templateReadiness(definition, record, report, technician);
    if (!record && report) readiness.missingItems = missingItemsForTemplate(definition.id, report, technician);
    return { definition, record, readiness };
  }), [definitions, installed, report, technician]);
  const tripRows = useMemo(() => tripExportRows(tripReports, stored, technician), [tripReports, stored, technician]);
  const refresh = async () => setStored(await listStoredTemplates());

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => setMessage("Unable to read the private template vault."));
  }, [open]);

  if (!open) return null;

  const handleSync = async () => {
    if (!report) return;
    setBusyId("sync");
    setMessage("");
    try {
      const token = await requestGoogleDriveToken();
      const files = await syncGoogleTemplatesForTrip(report.tripType, token);
      await refresh();
      setMessage(`${files.length} native template${files.length === 1 ? "" : "s"} synchronized for ${report.tripType}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to synchronize Google Drive templates.");
    } finally {
      setBusyId("");
    }
  };

  const handleExport = async (row) => {
    const { record, readiness } = row;
    if (!report) return;
    setBusyId(record.id);
    setMessage("");
    try {
      const result = await buildNativeDocument(record, report, technician);
      await shareOrDownloadDocument(result, outputFilename(record, report, { draft: readiness.status !== "completed" }));
    } catch (error) {
      if (error?.name !== "AbortError") {
        setMessage(error instanceof Error ? error.message : "Unable to create the native document.");
      }
    } finally {
      setBusyId("");
    }
  };

  const handleExportReady = async () => {
    const ready = exportRows.filter((row) => row.readiness.status === "completed");
    if (!ready.length) return;
    setBusyId("batch");
    setMessage("");
    try {
      const documents = [];
      for (const row of ready) {
        const blob = await buildNativeDocument(row.record, report, technician);
        documents.push({ blob, filename: outputFilename(row.record, report) });
      }
      await shareOrDownloadDocuments(documents);
      setMessage(`${documents.length} ready document${documents.length === 1 ? "" : "s"} created.`);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setMessage(error instanceof Error ? error.message : "Unable to create the ready documents.");
      }
    } finally {
      setBusyId("");
    }
  };

  const handleTripExport = async () => {
    setBusyId('trip'); setMessage('');
    try {
      const blob = await buildTripArchive(tripRows, technician);
      await shareOrDownloadDocument(blob, `Trip-${String(report.startAt || '').slice(0, 10)}.zip`);
      setMessage('Trip ZIP created. See Export-summary.txt for drafts and missing templates.');
    } catch (error) { if (error?.name !== 'AbortError') setMessage(error.message || 'Unable to export trip.'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="template-manager-title">
      <div ref={containerRef} tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="template-manager-title" className="flex items-center gap-2 text-xl font-bold"><FileArchive size={20} /> Export Documents</h3>
          <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose} aria-label="Close export documents"><X size={18} /></button>
        </div>
        <p className="mt-3 font-semibold">{report?.jobNo} · {report?.sharedSite?.jobName || "Site not set"}</p><p className="mt-2 text-sm text-gray-600">Fix missing information here, mark finished documents complete, and export native PDF, DOCX, or XLSX files. Unfinished exports are labeled DRAFT.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={handleExportReady} disabled={!!busyId || !report || !exportRows.some((row) => row.readiness.status === "completed")}>
            <Download size={17} /> {busyId === "batch" ? "Creating…" : "Export All Completed"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-slate-700 disabled:opacity-50" onClick={handleSync} disabled={!!busyId || !report}>
            {busyId === "sync" ? <RefreshCcw className="animate-spin" size={17} /> : <CloudDownload size={17} />}
            {busyId === "sync" ? "Synchronizing…" : `Sync ${report?.tripType || "Templates"}`}
          </button>
        </div>

        {tripReports.length > 1 && <div className="mt-4 border rounded-xl p-3 space-y-2">
          <h4 className="font-semibold">Entire trip · {tripReports.length} lifts</h4>
          <p className="text-xs text-slate-600">Includes drafts and separate INTERNAL folders. Missing templates are listed in the export summary.</p>
          {tripReports.map(unit => <p className="text-xs" key={unit.id}>{unit.jobNo} · {unit.tripType} · {tripRows.filter(row => row.report.id === unit.id && row.readiness.status === 'completed').length} completed · {tripRows.filter(row => row.report.id === unit.id && !row.record).length} missing templates</p>)}
          <button disabled={!!busyId || !tripRows.some(row => row.record)} onClick={handleTripExport}>{busyId === 'trip' ? 'Creating trip ZIP…' : 'Export trip ZIP (includes drafts)'}</button>
        </div>}

        {message && <div className="mt-4 rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</div>}

        <div className="mt-5 space-y-2">
          {exportRows.map((row) => {
            const { definition, record, readiness } = row;
            return (
              <div key={definition.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {readiness.status === "completed" ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                      {definition.label}
                      {record && <span className={`rounded-full px-2 py-0.5 text-[11px] ${readiness.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{readiness.status === "completed" ? "Completed" : readiness.status === "draft" ? "Ready to mark complete" : "Draft"}</span>}
                    </div>
                  <div className="text-xs text-gray-500">{record ? `${record.filename} · ${definition.format.toUpperCase()} · ${record.source === "google-drive" ? "Google Drive" : "Device cache"}` : "Template not yet saved on this device"}</div>
                  </div>
                  {record && report && (
                    <button className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => handleExport(row)} disabled={!!busyId}>
                      <Download size={15} /> {busyId === record.id ? "Creating…" : readiness.status === "completed" ? "Export" : "Export Draft"}
                    </button>
                  )}
                </div>
                {readiness.status === "missing-template" && <p className="mt-2 text-xs text-amber-700">Use Sync above to load the approved templates from Google Drive. This is needed once on each device; the saved templates then work offline.</p>}
                {readiness.missingItems.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-amber-700"><span>Missing:</span>{readiness.missingItems.map((missing) => <button key={missing.label} type="button" className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-medium underline" onClick={() => onResolveMissing?.(missing)}>{missing.label}</button>)}</div>}
                {definition.id !== "inspection-workbook" && readiness.status === "draft" && <button type="button" className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" onClick={() => onSetDocumentDone?.(definition.id, true)}>Mark document complete</button>}
                {readiness.status === "completed" && <button type="button" className="mt-2 text-xs text-gray-600 underline" onClick={() => onSetDocumentDone?.(definition.id, false)}>Return to draft</button>}
              </div>
            );
          })}
        </div>
        {!report && <p className="mt-4 text-sm text-amber-700">Open a saved report to enable native document exports.</p>}
      </div>
    </div>
  );
}
