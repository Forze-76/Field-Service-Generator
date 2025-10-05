import React, { useRef } from "react";
import useModalA11y from "../hooks/useModalA11y";

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel",
  returnFocusRef,
}) {
  const containerRef = useRef(null);
  useModalA11y(open, containerRef, { onClose: onCancel, returnFocusRef });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
      <div ref={containerRef} tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="px-4 py-2 rounded-xl bg-red-600 text-white" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
