import React, { useRef } from "react";
import { X, BookOpen } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y";

function ManualsModal({ open, onClose, model, returnFocusRef }) {
  const containerRef = useRef(null);
  useModalA11y(open, containerRef, { onClose, returnFocusRef });
  if (!open) return null;

  const trimmedModel = (model || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} />
            <h3 className="text-xl font-bold">Owner's Manuals</h3>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close manuals dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Manuals will live here soon. In the meantime, reach out to the engineering team or check the shared drive
            if you need documentation for this job.
          </p>
          <div className="rounded-xl border bg-gray-50 px-4 py-3 text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500">Selected model</div>
            <div className="font-semibold text-base">{trimmedModel || "Model not specified"}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualsModal;
