import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import MultiPhotoUpload from "./MultiPhotoUpload.jsx";
import { FSR_ENTRY_TYPE_META, docRequestLabel, fmtDateTime, uid } from "../utils/fsr";
import useModalA11y from "../hooks/useModalA11y";

const ENTRY_OPTIONS = [
  {
    type: "issue",
    title: "Add issue",
    description: "Capture problems with notes and photos",
    emoji: "📷",
  },
  {
    type: "correction",
    title: "Corrections",
    description: "Log the work you corrected onsite",
    emoji: "🛠️",
  },
  {
    type: "orderParts",
    title: "Order parts",
    description: "Track the parts you need to order",
    emoji: "📦",
  },
  {
    type: "docRequest",
    title: "Document requests",
    description: "Request manuals or diagrams",
    emoji: "📄",
  },
  {
    type: "followUp",
    title: "Follow-up items",
    description: "Create to-dos for the next visit",
    emoji: "📌",
  },
  {
    type: "internal",
    title: "Internal use",
    description: "Notes for the service team only",
    emoji: "🔒",
  },
  {
    type: "commentary",
    title: "Commentary",
    description: "General narrative notes for the report",
    emoji: "💬",
  },
];

const DOC_REQUEST_OPTIONS = [
  { value: "installation", label: "Installation Manual" },
  { value: "pm", label: "PM Checklists" },
  { value: "spares", label: "Spare Parts" },
  { value: "electrical", label: "Electrical Diagrams" },
  { value: "other", label: "Other" },
];

const Label = ({ children }) => (
  <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{children}</div>
);

const mkId = () =>
  (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : uid());

const createDraft = (type) => {
  const id = mkId();
  switch (type) {
    case "issue":
      return { id, type, note: "", photos: [], collapsed: true };
    case "correction":
      return { id, type, note: "", photos: [], collapsed: true };
    case "orderParts":
      return {
        id,
        note: "",
        parts: [{ id: mkId(), partNo: "", desc: "", qty: "" }],
        collapsed: true,
      };
    case "docRequest":
      return { id, type, docKind: "installation", docNotes: "", collapsed: true };
    case "followUp":
      return { id, type, followUp: { title: "", details: "" }, collapsed: true };
    case "internal":
      return { id, type, note: "", collapsed: true };
    case "commentary":
      return { id, type, note: "", collapsed: true };
    default:
      return { id, type, collapsed: true };
  }
};

const firstLine = (value = "") => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  const line = text.split(/\n|\r/)[0];
  return line.length > 140 ? `${line.slice(0, 140)}…` : line;
};

const getEntrySummary = (entry) => {
  switch (entry.type) {
    case "issue":
    case "correction":
    case "commentary":
    case "internal":
      return firstLine(entry.note) || "(No description)";
    case "docRequest": {
      const label = docRequestLabel(entry.docKind);
      const extra = firstLine(entry.docNotes);
      return extra ? `${label} — ${extra}` : label;
    }
    case "followUp":
      return firstLine(entry.followUp?.title) || firstLine(entry.followUp?.details) || "(No follow-up details)";
    case "orderParts": {
      const parts = entry.parts || [];
      if (!parts.length) return "(No parts listed)";
      const lines = parts
        .map((part) => part.partNo || part.desc || part.qty)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      return lines || "(No parts listed)";
    }
    default:
      return "";
  }
};

function EntryForm({ value, onChange }) {
  const meta = FSR_ENTRY_TYPE_META[value.type] || { label: "Entry" };

  if (value.type === "issue") {
    return (
      <div className="space-y-4">
        <div>
          <Label>Description</Label>
          <textarea
            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[120px]"
            value={value.note}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            placeholder="What happened, cause, fix, next steps…"
          />
        </div>
        <div>
          <Label>Photos</Label>
          <MultiPhotoUpload
            photos={value.photos || []}
            onChange={(photos) => onChange({ ...value, photos })}
          />
        </div>
      </div>
    );
  }

  if (value.type === "correction") {
    return (
      <div className="space-y-4">
        <div>
          <Label>Description of items fixed onsite</Label>
          <textarea
            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[120px]"
            value={value.note}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            placeholder="Summarize the corrections you made while onsite."
          />
        </div>
        <div>
          <Label>Photos</Label>
          <MultiPhotoUpload
            photos={value.photos || []}
            onChange={(photos) => onChange({ ...value, photos })}
          />
        </div>
      </div>
    );
  }

  if (value.type === "orderParts") {
    const parts =
      value.parts && value.parts.length ? value.parts : [{ id: mkId(), partNo: "", desc: "", qty: "" }];
    const updatePart = (id, patch) => {
      const next = parts.map((row) => (row.id === id ? { ...row, ...patch } : row));
      onChange({ ...value, parts: next });
    };
    const removePart = (id) => {
      const next = parts.filter((row) => row.id !== id);
      onChange({ ...value, parts: next });
    };
    const addPart = () => {
      onChange({ ...value, parts: [...parts, { id: mkId(), partNo: "", desc: "", qty: "" }] });
    };
    return (
      <div className="space-y-4">
        <div>
          <Label>Model-aware parts search</Label>
          <input
            type="text"
            value=""
            disabled
            placeholder="Model-aware parts search (coming soon)"
            className="w-full rounded-2xl border px-3 py-2 text-sm text-gray-400 bg-gray-50"
          />
        </div>
        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <div className="col-span-12 md:col-span-3">Part #</div>
            <div className="col-span-12 md:col-span-7">Description</div>
            <div className="col-span-12 md:col-span-2">Qty</div>
          </div>
          {parts.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t">
              <input
                className="col-span-12 md:col-span-3 rounded-xl border px-3 py-2 text-sm"
                value={row.partNo}
                onChange={(event) => updatePart(row.id, { partNo: event.target.value })}
                placeholder="e.g., 12345"
              />
              <input
                className="col-span-12 md:col-span-7 rounded-xl border px-3 py-2 text-sm"
                value={row.desc}
                onChange={(event) => updatePart(row.id, { desc: event.target.value })}
                placeholder="Description"
              />
              <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                  value={row.qty}
                  onChange={(event) => updatePart(row.id, { qty: event.target.value })}
                  placeholder="Qty"
                />
                <button
                  type="button"
                  className="p-2 rounded-xl border text-gray-500 hover:text-red-600"
                  onClick={() => removePart(row.id)}
                  title="Remove row"
                  aria-label="Remove part row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="px-3 py-2 rounded-xl border text-sm" onClick={addPart}>
          + Add part
        </button>
        <div>
          <Label>Notes (optional)</Label>
          <textarea
            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[80px]"
            value={value.note || ""}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            placeholder="Notes about the order"
          />
        </div>
      </div>
    );
  }

  if (value.type === "docRequest") {
    return (
      <div className="space-y-4">
        <div>
          <Label>Document requested</Label>
          <select
            className="w-full rounded-2xl border px-3 py-2 text-sm"
            value={value.docKind || "installation"}
            onChange={(event) => onChange({ ...value, docKind: event.target.value })}
          >
            {DOC_REQUEST_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <textarea
            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[80px]"
            value={value.docNotes || ""}
            onChange={(event) => onChange({ ...value, docNotes: event.target.value })}
            placeholder="Extra details for the document request"
          />
        </div>
      </div>
    );
  }

  if (value.type === "followUp") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Title</Label>
          <input
            className="w-full rounded-2xl border px-3 py-2 text-sm"
            value={value.followUp?.title || ""}
            onChange={(event) =>
              onChange({ ...value, followUp: { ...(value.followUp || {}), title: event.target.value } })
            }
            placeholder="Follow-up item"
          />
        </div>
        <div>
          <Label>Details</Label>
          <textarea
            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[80px]"
            value={value.followUp?.details || ""}
            onChange={(event) =>
              onChange({ ...value, followUp: { ...(value.followUp || {}), details: event.target.value } })
            }
            placeholder="Context or next steps"
          />
        </div>
      </div>
    );
  }

  if (value.type === "internal" || value.type === "commentary") {
    return (
      <div>
        <Label>{meta.label}</Label>
        <textarea
          className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[120px]"
          value={value.note || ""}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="Add notes"
        />
      </div>
    );
  }

  return null;
}

function FsrEntryCard({ entry, index, total, onUpdate, onRemove, onMove, onToggleCollapse }) {
  const meta = FSR_ENTRY_TYPE_META[entry.type] || { label: "Entry", emoji: "📝", badgeClass: "bg-gray-100 text-gray-600 border-gray-200" };
  const summary = useMemo(() => getEntrySummary(entry), [entry]);
  const timestamp = useMemo(() => fmtDateTime(entry.createdAt), [entry.createdAt]);
  const collapsed = !!entry.collapsed;

  return (
    <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${
                meta.badgeClass
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          {collapsed && <div className="text-sm text-gray-600 max-w-xl">{summary}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-xl border"
            onClick={() => onToggleCollapse(entry.id, !collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand entry" : "Collapse entry"}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            type="button"
            className="p-2 rounded-xl border"
            onClick={() => onMove(entry.id, "up")}
            disabled={index === 0}
            title="Move up"
            aria-label="Move entry up"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl border"
            onClick={() => onMove(entry.id, "down")}
            disabled={index === total - 1}
            title="Move down"
            aria-label="Move entry down"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl border text-red-600"
            onClick={() => onRemove(entry.id)}
            title="Delete entry"
            aria-label={`Delete ${meta.label}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="p-4">
          <EntryForm value={entry} onChange={(next) => onUpdate(entry.id, () => next)} />
        </div>
      )}
    </div>
  );
}

function FsrEntriesSection({
  entries = [],
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onMoveEntry,
  onCollapseAll,
  readyForIssue,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draftType, setDraftType] = useState(null);
  const [draft, setDraft] = useState(null);
  const modalTriggerRef = useRef(null);
  const modalContainerRef = useRef(null);

  const openModal = useCallback((trigger) => {
    setDraftType(null);
    setDraft(null);
    modalTriggerRef.current = trigger || null;
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDraftType(null);
    setDraft(null);
  }, []);

  useModalA11y(modalOpen, modalContainerRef, { onClose: closeModal, returnFocusRef: modalTriggerRef });

  const startDraft = useCallback((type) => {
    setDraftType(type);
    setDraft(createDraft(type));
  }, []);

  const handleSubmitDraft = useCallback(() => {
    if (!draftType || !draft) return;
    const base = {
      ...draft,
      id: draft.id || mkId(),
      type: draftType,
      collapsed: true,
      createdAt: new Date().toISOString(),
    };
    if (draftType === "orderParts") {
      const parts = (base.parts || []).filter((row) => row.partNo || row.desc || row.qty);
      onAddEntry({ ...base, parts });
    } else {
      onAddEntry(base);
    }
    closeModal();
  }, [draft, draftType, onAddEntry, closeModal]);

  const handleQuickIssue = useCallback(
    (event) => {
      if (!readyForIssue) return;
      modalTriggerRef.current = event?.currentTarget || null;
      setModalOpen(true);
      startDraft("issue");
    },
    [readyForIssue, startDraft],
  );

  const handleToggleCollapse = useCallback(
    (id, collapsed) => {
      onUpdateEntry(id, (prev) => ({ ...prev, collapsed }));
    },
    [onUpdateEntry],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Field Service Report Entries</h3>
          <div className="text-xs text-gray-500">Log issues, corrections, follow-ups, and more.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <>
              <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => onCollapseAll(true)}>
                Collapse all
              </button>
              <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => onCollapseAll(false)}>
                Expand all
              </button>
            </>
          )}
          <button
            className="px-3 py-2 rounded-xl border flex items-center gap-2 text-sm"
            onClick={handleQuickIssue}
            disabled={!readyForIssue}
          >
            <Camera size={16} /> Add Issue
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2 text-sm"
            onClick={(event) => openModal(event.currentTarget)}
          >
            <Plus size={18} /> Add
          </button>
        </div>
      </div>

      {!readyForIssue && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please attach a photo of the Serial Number Tag or check <b>None available</b> before adding issues.
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          No entries yet. Tap <b>Add</b> to capture issues, corrections, document requests, and more.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <FsrEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              total={entries.length}
              onUpdate={onUpdateEntry}
              onRemove={onRemoveEntry}
              onMove={onMoveEntry}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div ref={modalContainerRef} tabIndex={-1} className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {draftType ? FSR_ENTRY_TYPE_META[draftType]?.label || "New Entry" : "Add entry"}
              </h3>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={closeModal}
                aria-label="Close add entry dialog"
              >
                <X size={18} />
              </button>
            </div>

            {!draftType && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ENTRY_OPTIONS.map((option) => {
                  const disabled = option.type === "issue" && !readyForIssue;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && startDraft(option.type)}
                      className={`rounded-2xl border px-4 py-5 text-left transition ${
                        disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      <div className="text-2xl">{option.emoji}</div>
                      <div className="mt-2 font-semibold text-sm">{option.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {draftType && draft && (
              <div className="space-y-4">
                <EntryForm value={draft} onChange={setDraft} />
                <div className="flex items-center justify-between">
                  <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => setDraftType(null)}>
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 rounded-xl border text-sm" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm" onClick={handleSubmitDraft}>
                      Add {FSR_ENTRY_TYPE_META[draftType]?.label || "entry"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(FsrEntriesSection);
