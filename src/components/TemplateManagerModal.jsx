import React, { useEffect, useMemo, useRef, useState } from "react";
import { CloudDownload, Download, FileArchive, RefreshCcw, X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y";
import { buildNativeDocument, outputFilename, shareOrDownloadDocument } from "../utils/nativeTemplates";
import {
  TEMPLATE_CATALOG,
  listStoredTemplates,
} from "../utils/templateStore";
import { requestGoogleDriveToken, syncGoogleTemplatesForTrip } from "../utils/googleDriveTemplates";

export default function TemplateManagerModal({ open, onClose, report, technician, returnFocusRef }) {
  const containerRef = useRef(null);
  const [stored, setStored] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  const installed = useMemo(
    () => new Map(stored
      .filter((item) => !item.tripType || item.tripType === report?.tripType)
      .map((item) => [item.id, item])),
    [report?.tripType, stored],
  );
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

  const handleExport = async (record) => {
    if (!report) return;
    setBusyId(record.id);
    setMessage("");
    try {
      const result = await buildNativeDocument(record, report, technician);
      await shareOrDownloadDocument(result, outputFilename(record, report));
    } catch (error) {
      if (error?.name !== "AbortError") {
        setMessage(error instanceof Error ? error.message : "Unable to create the native document.");
      }
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="template-manager-title">
      <div ref={containerRef} tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="template-manager-title" className="flex items-center gap-2 text-xl font-bold"><FileArchive size={20} /> Document Templates</h3>
          <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose} aria-label="Close document templates"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Approved templates are retrieved from your private Google Drive folder and cached for offline export on this device.</p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={handleSync} disabled={!!busyId || !report}>
          {busyId === "sync" ? <RefreshCcw className="animate-spin" size={17} /> : <CloudDownload size={17} />}
          {busyId === "sync" ? "Synchronizing…" : `Connect Drive & Sync${report?.tripType ? ` ${report.tripType}` : ""}`}
        </button>

        {message && <div className="mt-4 rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</div>}

        <div className="mt-5 space-y-2">
          {TEMPLATE_CATALOG.map((definition) => {
            const record = installed.get(definition.id);
            return (
              <div key={definition.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="font-medium">{definition.label}</div>
                  <div className="text-xs text-gray-500">{record ? `${record.filename} · ${definition.format.toUpperCase()} · ${record.source === "google-drive" ? "Google Drive" : "Device cache"}` : "Not available for this report"}</div>
                </div>
                <div className="flex gap-2">
                  {record && report && (
                    <button className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => handleExport(record)} disabled={!!busyId}>
                      <Download size={15} /> {busyId === record.id ? "Creating…" : "Export"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!report && <p className="mt-4 text-sm text-amber-700">Open a saved report to enable native document exports.</p>}
      </div>
    </div>
  );
}
