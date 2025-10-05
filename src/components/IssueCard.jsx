import React, { useRef } from "react";
import { Camera, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import { fmtDateTime, fileToDataURL } from "../utils/fsr";

function IssueCard({ issue, idx, onChange, onRemove, onMove }) {
  const inputRef = useRef(null);
  const collapsed = !!issue.collapsed;
  const headerText = issue.note?.trim()
    ? issue.note.trim().length > 80
      ? `${issue.note.trim().slice(0, 80)}…`
      : issue.note.trim()
    : "(No description)";
  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="text-sm font-medium">
          Issue #{idx + 1} <span className="text-gray-500">— {fmtDateTime(issue.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded-xl border" onClick={() => onChange({ ...issue, collapsed: !collapsed })}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button className="p-2 rounded-xl border" onClick={onRemove}>
            <Trash2 size={16} />
          </button>
          <button className="p-2 rounded-xl border" onClick={() => onMove("up")} title="Move up">
            <ArrowUp size={16} />
          </button>
          <button className="p-2 rounded-xl border" onClick={() => onMove("down")} title="Move down">
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="p-4 text-sm text-gray-700">
          {issue.imageUrl ? (
            <img src={issue.imageUrl} alt="thumb" className="w-28 h-20 object-cover rounded border mr-3 inline-block" />
          ) : null}
          <span className="align-middle">{headerText}</span>
        </div>
      ) : (
        <>
          <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
            {issue.imageUrl ? (
              <img src={issue.imageUrl} alt="issue" className="h-full w-full object-cover" />
            ) : (
              <div className="text-gray-400 flex items-center gap-2">
                <Camera /> No photo
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = await fileToDataURL(f);
                onChange({ ...issue, imageUrl: url });
              }}
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button className="px-2 py-1 rounded-xl border bg-white/90" onClick={() => inputRef.current?.click()}>
                <Camera size={16} /> Upload
              </button>
            </div>
          </div>
          <div className="p-4">
            <textarea
              className="w-full min-h-[120px] rounded-xl border px-3 py-2"
              value={issue.note}
              onChange={(e) => onChange({ ...issue, note: e.target.value })}
              placeholder="Write what happened, cause, fix, next steps…"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default IssueCard;
