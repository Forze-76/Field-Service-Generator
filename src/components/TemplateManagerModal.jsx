import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileArchive, Trash2, Upload, X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y";
import { buildNativeDocument, outputFilename, shareOrDownloadDocument } from "../utils/nativeTemplates";
import {
  TEMPLATE_CATALOG,
  listStoredTemplates,
  removeStoredTemplate,
  saveTemplateFile,
} from "../utils/templateStore";

export default function TemplateManagerModal({ open, onClose, report, technician, returnFocusRef }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [stored, setStored] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  const installed = useMemo(() => new Map(stored.map((item) => [item.id, item])), [stored]);
  const refresh = async () => setStored(await listStoredTemplates());

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => setMessage("Unable to read the private template vault."));
  }, [open]);

  if (!open) return null;

  const handleFiles = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setBusyId("upload");
    setMessage("");
    try {
      for (const file of files) await saveTemplateFile(file);
      await refresh();
      setMessage(`${files.length} template${files.length === 1 ? "" : "s"} stored privately on this device.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to store templates.");
    } finally {
      setBusyId("");
      if (inputRef.current) inputRef.current.value = "";
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

  const handleRemove = async (id) => {
    setBusyId(id);
    await removeStoredTemplate(id);
    await refresh();
    setBusyId("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="template-manager-title">
      <div ref={containerRef} tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="template-manager-title" className="flex items-center gap-2 text-xl font-bold"><FileArchive size={20} /> Document Templates</h3>
          <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose} aria-label="Close document templates"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Templates stay in this browser's private offline storage and are not uploaded to GitHub.</p>
        <input ref={inputRef} className="hidden" type="file" multiple accept=".pdf,.docx,.xlsx" onChange={handleFiles} />
        <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => inputRef.current?.click()} disabled={!!busyId}>
          <Upload size={17} /> {busyId === "upload" ? "Storing…" : "Import Templates"}
        </button>

        {message && <div className="mt-4 rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</div>}

        <div className="mt-5 space-y-2">
          {TEMPLATE_CATALOG.map((definition) => {
            const record = installed.get(definition.id);
            return (
              <div key={definition.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="font-medium">{definition.label}</div>
                  <div className="text-xs text-gray-500">{record ? `${record.filename} · ${definition.format.toUpperCase()}` : "Not installed"}</div>
                </div>
                <div className="flex gap-2">
                  {record && report && (
                    <button className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => handleExport(record)} disabled={!!busyId}>
                      <Download size={15} /> {busyId === record.id ? "Creating…" : "Export"}
                    </button>
                  )}
                  {record && (
                    <button className="rounded-lg border p-2 text-red-600 disabled:opacity-50" onClick={() => handleRemove(record.id)} disabled={!!busyId} aria-label={`Remove ${definition.label}`}><Trash2 size={16} /></button>
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
