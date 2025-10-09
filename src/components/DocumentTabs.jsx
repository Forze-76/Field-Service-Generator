import React from "react";

function FSRInfoTab({ documents, activeId, onSelect }) {
  return (
    <div className="rounded-2xl border bg-white p-2 flex items-center gap-2 overflow-x-auto">
      {(documents || []).map((doc) => (
        <button
          key={doc.id}
          className={`px-3 py-2 rounded-xl border ${
            activeId === doc.id ? "bg-blue-600 text-white border-blue-600" : "bg-white"
          }`}
          onClick={() => onSelect(doc.id)}
          title={doc.done ? "Completed" : "Not completed"}
        >
          <span
            className="mr-2 inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: doc.done ? "#22c55e" : "#d1d5db" }}
          ></span>
          {doc.name}
        </button>
      ))}
      {(documents || []).length === 0 && <div className="text-sm text-gray-500 px-2 py-1">No documents</div>}
    </div>
  );
}

export default FSRInfoTab;
