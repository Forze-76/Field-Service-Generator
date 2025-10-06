import React, { useRef, useState } from "react";
import { X, CheckSquare, Square, Trash } from "lucide-react";
import { uid } from "../utils/fsr";
import useModalA11y from "../hooks/useModalA11y";

function DocumentsManager({ documents, onChange }) {
  const [name, setName] = useState("");
  const add = () => {
    const v = name.trim();
    if (!v) return;
    onChange([...(documents || []), { id: uid(), name: v, done: false, data: {} }]);
    setName("");
  };
  const toggle = (id) => onChange((documents || []).map((d) => (d.id === id ? { ...d, done: !d.done } : d)));
  const remove = (id) => onChange((documents || []).filter((d) => d.id !== id));

  return (
    <div>
      <div className="space-y-2">
        {(documents || []).length === 0 && <div className="text-sm text-gray-500">No documents yet.</div>}
        {(documents || []).map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <button className="flex items-center gap-2" onClick={() => toggle(d.id)}>
              {d.done ? <CheckSquare size={18} /> : <Square size={18} />}
              <span>{d.name}</span>
            </button>
            <button
              className="p-2 rounded-xl border"
              onClick={() => remove(d.id)}
              aria-label={`Remove ${d.name}`}
            >
              <Trash size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2"
          placeholder="Add document (e.g., Inspection Sheet)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="px-4 py-2 rounded-xl border" onClick={add}>
          Add
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2">Defaults load from trip type; you can add/remove as needed per job.</div>
    </div>
  );
}

function ManageDocsModal({ open, onClose, documents, onChange, returnFocusRef }) {
  const containerRef = useRef(null);
  useModalA11y(open, containerRef, { onClose, returnFocusRef });
  if (!open) return null;
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
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Documents</h3>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close documents dialog"
          >
            <X size={18} />
          </button>
        </div>
        <DocumentsManager documents={documents} onChange={onChange} />
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageDocsModal;
