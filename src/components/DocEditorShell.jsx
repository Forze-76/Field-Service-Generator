import React from "react";
import DocumentTabs from "./DocumentTabs.jsx";

function DocEditorShell({
  documents,
  activeId,
  onSelect,
  onReorder,
  className,
  children,
}) {
  return (
    <div className={className}>
      <DocumentTabs
        documents={documents || []}
        activeId={activeId}
        onSelect={onSelect}
        onReorder={onReorder}
      />
      {children}
    </div>
  );
}

export default DocEditorShell;

