import React, { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Package,
  PenSquare,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import MultiPhotoUpload from "./MultiPhotoUpload";
import { ENTRY_DOC_LABELS, fmtDateTime, uid } from "../utils/fsr";

const ENTRY_OPTIONS = [
  { type: "issue", label: "Add issue", emoji: "📷", description: "Capture equipment problems with photos" },
  { type: "correction", label: "Corrections", emoji: "🛠️", description: "Record fixes completed onsite" },
  { type: "orderParts", label: "Order parts", emoji: "📦", description: "List parts to request" },
  { type: "docRequest", label: "Document requests", emoji: "📄", description: "Request manuals or diagrams" },
  { type: "followUp", label: "Follow-up items", emoji: "📌", description: "Assign future actions" },
  { type: "internal", label: "Internal use", emoji: "🔒", description: "Notes not shared with customer" },
  { type: "commentary", label: "Commentary", emoji: "💬", description: "General narrative notes" },
];

const ENTRY_TYPE_META = {
  issue: { label: "Issue", badgeClass: "bg-red-100 text-red-700", icon: <Camera size={14} /> },
  correction: { label: "Correction", badgeClass: "bg-blue-100 text-blue-700", icon: <PenSquare size={14} /> },
  orderParts: { label: "Parts", badgeClass: "bg-purple-100 text-purple-700", icon: <Package size={14} /> },
  docRequest: { label: "Doc Request", badgeClass: "bg-amber-100 text-amber-700", icon: <FileText size={14} /> },
  followUp: { label: "Follow-Up", badgeClass: "bg-emerald-100 text-emerald-700", icon: <ClipboardList size={14} /> },
  internal: { label: "Internal", badgeClass: "bg-gray-200 text-gray-700", icon: <LockIcon /> },
  commentary: { label: "Commentary", badgeClass: "bg-sky-100 text-sky-700", icon: <StickyNote size={14} /> },
};

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

const initialFormState = (type) => {
  switch (type) {
    case "issue":
    case "correction":
      return { note: "", photos: [] };
    case "orderParts":
      return { parts: [{ id: uid(), partNo: "", desc: "", qty: "" }] };
    case "docRequest":
      return { docKind: "installation", docNotes: "" };
    case "followUp":
      return { followUp: { title: "", details: "" } };
    case "internal":
    case "commentary":
    default:
      return { note: "" };
  }
};

const formatSummary = (entry) => {
  switch (entry.type) {
    case "issue":
    case "correction":
    case "commentary":
    case "internal":
      return entry.note?.trim() ? entry.note.trim().split("\n")[0].slice(0, 120) : "(No description)";
    case "orderParts":
      return entry.parts?.length
        ? `${entry.parts.length} part${entry.parts.length === 1 ? "" : "s"} listed`
        : "No parts listed";
    case "docRequest":
      return ENTRY_DOC_LABELS[entry.docKind] || ENTRY_DOC_LABELS.installation;
    case "followUp":
      return entry.followUp?.title?.trim() || "Untitled follow-up";
    default:
      return "";
  }
};

function EntryCard({ entry, index, count, onChange, onDelete, onMove, onSyncParts }) {
  const meta = ENTRY_TYPE_META[entry.type] || { label: entry.type, badgeClass: "bg-gray-100 text-gray-600" };
  const collapsed = entry.collapsed ?? true;

  const toggleCollapse = () => onChange({ ...entry, collapsed: !collapsed });

  const updateField = (patch) => {
    const next = { ...entry, ...patch };
    onChange(next);
    if (entry.type === "orderParts" && onSyncParts) {
      onSyncParts(next.parts || []);
    }
  };

  const renderBody = () => {
    switch (entry.type) {
      case "issue":
      case "correction":
        return (
          <div className="space-y-4">
            <MultiPhotoUpload
              photos={entry.photos || []}
              onChange={(nextPhotos) => updateField({ photos: nextPhotos })}
              helperText="Attach as many supporting photos as needed"
            />
            <textarea
              className="w-full min-h-[120px] rounded-xl border px-3 py-2"
              value={entry.note || ""}
              onChange={(event) => updateField({ note: event.target.value })}
              placeholder={entry.type === "issue" ? "Describe the issue, cause, and impact" : "Describe the correction"}
            />
          </div>
        );
      case "orderParts":
        return (
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input
                type="text"
                disabled
                className="rounded-xl border px-3 py-2 w-full md:max-w-sm text-gray-400 bg-gray-50"
                placeholder="Model-aware parts search (coming soon)"
              />
            </div>
            {(entry.parts || []).map((row, idx) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  className="rounded-xl border px-3 py-2"
                  value={row.partNo || ""}
                  onChange={(event) => {
                    const nextParts = (entry.parts || []).map((item, i) =>
                      i === idx ? { ...item, partNo: event.target.value } : item,
                    );
                    updateField({ parts: nextParts });
                  }}
                  placeholder="Part #"
                />
                <input
                  className="rounded-xl border px-3 py-2 md:col-span-2"
                  value={row.desc || ""}
                  onChange={(event) => {
                    const nextParts = (entry.parts || []).map((item, i) =>
                      i === idx ? { ...item, desc: event.target.value } : item,
                    );
                    updateField({ parts: nextParts });
                  }}
                  placeholder="Description"
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  value={row.qty || ""}
                  onChange={(event) => {
                    const nextParts = (entry.parts || []).map((item, i) =>
                      i === idx ? { ...item, qty: event.target.value } : item,
                    );
                    updateField({ parts: nextParts });
                  }}
                  placeholder="Qty"
                />
                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border text-red-600"
                    onClick={() => {
                      const nextParts = (entry.parts || []).filter((_, i) => i !== idx);
                      updateField({ parts: nextParts });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="px-3 py-2 rounded-xl border flex items-center gap-2"
              onClick={() => updateField({ parts: [...(entry.parts || []), { id: uid(), partNo: "", desc: "", qty: "" }] })}
            >
              <Plus size={16} /> Add part row
            </button>
          </div>
        );
      case "docRequest":
        return (
          <div className="space-y-3">
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={entry.docKind || "installation"}
              onChange={(event) => updateField({ docKind: event.target.value })}
            >
              {Object.entries(ENTRY_DOC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              className="w-full min-h-[120px] rounded-xl border px-3 py-2"
              value={entry.docNotes || ""}
              onChange={(event) => updateField({ docNotes: event.target.value })}
              placeholder="Optional notes"
            />
          </div>
        );
      case "followUp":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={entry.followUp?.title || ""}
                onChange={(event) => updateField({ followUp: { ...(entry.followUp || {}), title: event.target.value } })}
                placeholder="Follow-up title"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Details</label>
              <textarea
                className="w-full rounded-xl border px-3 py-2 min-h-[100px]"
                value={entry.followUp?.details || ""}
                onChange={(event) => updateField({ followUp: { ...(entry.followUp || {}), details: event.target.value } })}
                placeholder="What needs to happen next?"
              />
            </div>
          </div>
        );
      case "internal":
      case "commentary":
      default:
        return (
          <textarea
            className="w-full min-h-[140px] rounded-xl border px-3 py-2"
            value={entry.note || ""}
            onChange={(event) => updateField({ note: event.target.value })}
            placeholder="Write your notes"
          />
        );
    }
  };

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${meta.badgeClass}`}>
              {meta.icon}
              {meta.label}
            </span>
            <span className="text-xs text-gray-500">{fmtDateTime(entry.createdAt)}</span>
          </div>
          <div className="text-sm text-gray-700 mt-1 truncate">{formatSummary(entry)}</div>
        </div>
        <div className="flex items-center gap-2 self-end">
          <button className="p-2 rounded-xl border" onClick={toggleCollapse}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            className="p-2 rounded-xl border"
            onClick={() => onDelete(entry)}
            title="Delete entry"
          >
            <Trash2 size={16} />
          </button>
          <button
            className="p-2 rounded-xl border"
            onClick={() => onMove(entry, "up")}
            disabled={index === 0}
            title="Move up"
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="p-2 rounded-xl border"
            onClick={() => onMove(entry, "down")}
            disabled={index === count - 1}
            title="Move down"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>
      {!collapsed && <div className="px-4 py-4 space-y-4">{renderBody()}</div>}
      {entry.type === "internal" && (
        <div className="px-4 pb-3 text-xs text-gray-500 flex items-center gap-1">
          <Check size={12} /> Internal notes are excluded from exports.
        </div>
      )}
    </div>
  );
}

function OptionTile({ option, disabled, onSelect }) {
  return (
    <button
      type="button"
      className={`rounded-2xl border px-4 py-6 text-left shadow-sm hover:shadow transition flex flex-col gap-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "bg-white"
      }`}
      onClick={() => !disabled && onSelect(option.type)}
      disabled={disabled}
    >
      <div className="text-2xl">{option.emoji}</div>
      <div className="font-semibold text-sm">{option.label}</div>
      <div className="text-xs text-gray-500 leading-snug">{option.description}</div>
    </button>
  );
}

function FsrEntriesCard({ entries = [], onChange, canAddIssue, onSyncOrderParts, showIssueGate }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formState, setFormState] = useState({});

  const list = entries || [];

  const handleCreate = () => {
    if (!selectedType) return;
    const now = new Date().toISOString();
    const entry = {
      id: uid(),
      type: selectedType,
      createdAt: now,
      collapsed: true,
      ...formState,
    };
    const nextEntries = [...list, entry];
    onChange(nextEntries);
    if (selectedType === "orderParts" && onSyncOrderParts) {
      onSyncOrderParts(entry.id, entry.parts || []);
    }
    setModalOpen(false);
    setSelectedType(null);
    setFormState({});
  };

  const handleChangeEntry = (entryId, next) => {
    const nextEntries = list.map((item) => (item.id === entryId ? next : item));
    onChange(nextEntries);
    if (next.type === "orderParts" && onSyncOrderParts) {
      onSyncOrderParts(next.id, next.parts || []);
    }
  };

  const handleDelete = (entry) => {
    const nextEntries = list.filter((item) => item.id !== entry.id);
    onChange(nextEntries);
    if (entry.type === "orderParts" && onSyncOrderParts) {
      onSyncOrderParts(entry.id, []);
    }
  };

  const handleMove = (entry, direction) => {
    const currentIndex = list.findIndex((item) => item.id === entry.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const nextEntries = list.slice();
    const [removed] = nextEntries.splice(currentIndex, 1);
    nextEntries.splice(targetIndex, 0, removed);
    onChange(nextEntries);
  };

  const openModal = (type = null) => {
    if (type === "issue" && !canAddIssue) return;
    setModalOpen(true);
    setSelectedType(type);
    setFormState(type ? initialFormState(type) : {});
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedType(null);
    setFormState({});
  };

  const issueCount = list.filter((entry) => entry.type === "issue").length;

  return (
    <div className="rounded-3xl border shadow-sm p-6 bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Field Service Entries</h3>
          <div className="text-xs text-gray-500">Track issues, corrections, parts, and more in one place.</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="px-3 py-2 rounded-xl border flex items-center gap-2"
            onClick={() => openModal()}
          >
            <Plus size={18} /> Add
          </button>
          <button
            className="px-3 py-2 rounded-xl border flex items-center gap-2 disabled:opacity-40"
            onClick={() => openModal("issue")}
            disabled={!canAddIssue}
            title={canAddIssue ? "Add issue" : "Attach serial tag first"}
          >
            <Camera size={18} /> Issue ({issueCount})
          </button>
        </div>
      </div>

      {showIssueGate && !canAddIssue ? (
        <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Please attach a photo of the Serial Number Tag or check <b>None available</b> before adding issues.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {list.length === 0 && (
          <p className="text-sm text-gray-500">No entries yet. Use the Add button to insert items into this report.</p>
        )}
        {list.map((entry, idx) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={idx}
            count={list.length}
            onChange={(next) => handleChangeEntry(entry.id, next)}
            onDelete={handleDelete}
            onMove={handleMove}
            onSyncParts={(parts) => onSyncOrderParts && onSyncOrderParts(entry.id, parts)}
          />
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {selectedType ? ENTRY_OPTIONS.find((option) => option.type === selectedType)?.label || "Add entry" : "Add entry"}
              </h3>
              <button className="p-2 rounded-full hover:bg-gray-100" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            {!selectedType ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ENTRY_OPTIONS.map((option) => (
                  <OptionTile
                    key={option.type}
                    option={option}
                    disabled={option.type === "issue" && !canAddIssue}
                    onSelect={(type) => {
                      setSelectedType(type);
                      setFormState(initialFormState(type));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedType === "issue" || selectedType === "correction" ? (
                  <MultiPhotoUpload
                    photos={formState.photos || []}
                    onChange={(photos) => setFormState((prev) => ({ ...prev, photos }))}
                  />
                ) : null}

                {selectedType === "orderParts" && (
                  <>
                    {(formState.parts || []).map((row, idx) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          className="rounded-xl border px-3 py-2"
                          value={row.partNo || ""}
                          onChange={(event) => {
                            setFormState((prev) => ({
                              ...prev,
                              parts: (prev.parts || []).map((item, i) =>
                                i === idx ? { ...item, partNo: event.target.value } : item,
                              ),
                            }));
                          }}
                          placeholder="Part #"
                        />
                        <input
                          className="rounded-xl border px-3 py-2 md:col-span-2"
                          value={row.desc || ""}
                          onChange={(event) => {
                            setFormState((prev) => ({
                              ...prev,
                              parts: (prev.parts || []).map((item, i) =>
                                i === idx ? { ...item, desc: event.target.value } : item,
                              ),
                            }));
                          }}
                          placeholder="Description"
                        />
                        <input
                          className="rounded-xl border px-3 py-2"
                          value={row.qty || ""}
                          onChange={(event) => {
                            setFormState((prev) => ({
                              ...prev,
                              parts: (prev.parts || []).map((item, i) =>
                                i === idx ? { ...item, qty: event.target.value } : item,
                              ),
                            }));
                          }}
                          placeholder="Qty"
                        />
                        <div className="md:col-span-4 flex justify-end">
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl border text-red-600"
                            onClick={() =>
                              setFormState((prev) => ({
                                ...prev,
                                parts: (prev.parts || []).filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl border flex items-center gap-2"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          parts: [...(prev.parts || []), { id: uid(), partNo: "", desc: "", qty: "" }],
                        }))
                      }
                    >
                      <Plus size={16} /> Add part row
                    </button>
                    <input
                      type="text"
                      disabled
                      className="rounded-xl border px-3 py-2 w-full text-gray-400 bg-gray-50"
                      placeholder="Model-aware parts search (coming soon)"
                    />
                  </>
                )}

                {selectedType === "docRequest" && (
                  <>
                    <select
                      className="w-full rounded-xl border px-3 py-2"
                      value={formState.docKind || "installation"}
                      onChange={(event) => setFormState((prev) => ({ ...prev, docKind: event.target.value }))}
                    >
                      {Object.entries(ENTRY_DOC_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full min-h-[120px] rounded-xl border px-3 py-2"
                      value={formState.docNotes || ""}
                      onChange={(event) => setFormState((prev) => ({ ...prev, docNotes: event.target.value }))}
                      placeholder="Optional notes"
                    />
                  </>
                )}

                {selectedType === "followUp" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        value={formState.followUp?.title || ""}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            followUp: { ...(prev.followUp || {}), title: event.target.value },
                          }))
                        }
                        placeholder="Follow-up title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Details</label>
                      <textarea
                        className="w-full rounded-xl border px-3 py-2 min-h-[100px]"
                        value={formState.followUp?.details || ""}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            followUp: { ...(prev.followUp || {}), details: event.target.value },
                          }))
                        }
                        placeholder="What needs to happen next?"
                      />
                    </div>
                  </div>
                )}

                {(selectedType === "issue" || selectedType === "correction" || selectedType === "commentary" ||
                  selectedType === "internal") && (
                  <textarea
                    className="w-full min-h-[140px] rounded-xl border px-3 py-2"
                    value={formState.note || ""}
                    onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                    placeholder="Add notes"
                  />
                )}

                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 rounded-xl border" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
                    onClick={handleCreate}
                    disabled={selectedType === "issue" && !canAddIssue}
                  >
                    Save entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FsrEntriesCard;
