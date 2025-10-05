import React from "react";

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = "Delete" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onCancel}>
            Cancel
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
