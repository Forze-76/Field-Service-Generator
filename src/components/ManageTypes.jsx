import React, { useCallback, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { saveTypes } from "../utils/fsr";
import useModalA11y from "../hooks/useModalA11y";

function ManageTypes({ open, onClose, types, setTypes, returnFocusRef, storage }) {
  const [newType, setNewType] = useState("");
  const containerRef = useRef(null);
  useModalA11y(open, containerRef, { onClose, returnFocusRef });

  const items = useMemo(() => types || [], [types]);

  const handleOverlayMouseDown = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        onClose?.();
      }
    },
    [onClose],
  );

  const handleRemove = useCallback(
    (type) => {
      setTypes((prev) => {
        const next = (prev || []).filter((entry) => entry !== type);
        saveTypes(next, storage);
        return next;
      });
    },
    [setTypes, storage],
  );

  const handleAdd = useCallback(() => {
    const value = newType.trim();
    if (!value || items.includes(value)) return;
    const next = [...items, value];
    setTypes(next);
    saveTypes(next, storage);
    setNewType("");
  }, [items, newType, setTypes, storage]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
    >
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Manage Trip Types</h3>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close trip types dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto">
          {items.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border px-3 py-2">{type}</div>
              <button
                className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                onClick={() => handleRemove(type)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2"
            placeholder="e.g. Commissioning"
            value={newType}
            onChange={(event) => setNewType(event.target.value)}
          />
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
            disabled={!newType.trim()}
            onClick={handleAdd}
          >
            Add
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageTypes;
