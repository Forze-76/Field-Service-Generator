import React, { useRef, useState } from "react";
import { DatabaseBackup, Download, Upload, X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y";
import { parseBackup, shareOrDownloadBackup } from "../utils/backup";

export default function BackupRestoreModal({
  open,
  onClose,
  reports,
  technician,
  onRestore,
  returnFocusRef,
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  if (!open) return null;

  const resetImport = () => {
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleBackup = async () => {
    setBusy(true);
    setError("");
    try {
      await shareOrDownloadBackup({ reports, technician });
    } catch (backupError) {
      if (backupError?.name !== "AbortError") {
        setError("The backup could not be shared or downloaded.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setPreview(parseBackup(await file.text()));
    } catch (importError) {
      setPreview(null);
      setError(importError instanceof Error ? importError.message : "The backup could not be read.");
    }
  };

  const handleRestore = () => {
    if (!preview) return;
    onRestore?.(preview.reports);
    resetImport();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="backup-restore-title" className="flex items-center gap-2 text-xl font-bold">
            <DatabaseBackup size={20} /> Backup & Restore
          </h3>
          <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose} aria-label="Close backup and restore">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border p-4">
            <h4 className="font-semibold">Create complete backup</h4>
            <p className="mt-1 text-sm text-gray-600">
              Includes all {reports.length} reports and their compressed report photos.
            </p>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              onClick={handleBackup}
              disabled={busy}
            >
              <Download size={17} /> {busy ? "Preparing…" : "Share or Download Backup"}
            </button>
          </section>

          <section className="rounded-2xl border p-4">
            <h4 className="font-semibold">Restore from backup</h4>
            <p className="mt-1 text-sm text-gray-600">Choose a Field Service Generator JSON backup for validation.</p>
            <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
            <button className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2" onClick={() => inputRef.current?.click()}>
              <Upload size={17} /> Choose Backup File
            </button>
          </section>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {preview && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-900">Validated backup</h4>
              <p className="mt-1 text-sm text-amber-900">
                {preview.reportCount} reports from {new Date(preview.exportedAt).toLocaleString()}.
              </p>
              <p className="mt-2 text-sm font-semibold text-red-700">
                Restoring will replace all {reports.length} reports currently stored for this profile.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button className="rounded-xl border bg-white px-4 py-2" onClick={resetImport}>Cancel</button>
                <button className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white" onClick={handleRestore}>
                  Replace with {preview.reportCount} reports
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
