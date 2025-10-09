import React, { useRef } from "react";
import { BookOpen, Camera } from "lucide-react";
import { fileToDataURL, formatRange } from "../utils/fsr";

function ReportHeaderBar({ report, onUpdateReport, onOpenManuals, manualsButtonRef, showMetaChips = false }) {
  const inputRef = useRef(null);

  return (
    <div className="rounded-3xl border shadow-sm p-6 bg-white">
      <div className="flex items-start justify-between gap-6">
        {/* Serial Tag thumbnail + Upload/Remove + None available */}
        <div className="flex items-start gap-6">
          <div className="w-60">
            <div className="w-60 aspect-[4/3] bg-gray-50 border rounded-xl flex items-center justify-center overflow-hidden">
              {report.serialTagImageUrl ? (
                <img src={report.serialTagImageUrl} alt="Serial Tag" className="h-full w-full object-cover" />
              ) : (
                <div className="text-gray-400 flex flex-col items-center gap-2">
                  <Camera />
                  <span>Upload serial tag photo</span>
                </div>
              )}
            </div>
            <div className="mt-2 space-x-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await fileToDataURL(f);
                  onUpdateReport?.({ serialTagImageUrl: url, serialTagMissing: false });
                }}
              />
              <button className="px-3 py-2 rounded-xl border" onClick={() => inputRef.current?.click()}>
                Upload
              </button>
              {!!report.serialTagImageUrl && (
                <button className="px-3 py-2 rounded-xl border" onClick={() => onUpdateReport?.({ serialTagImageUrl: "" })}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!report.serialTagMissing}
              onChange={(e) =>
                onUpdateReport?.({
                  serialTagMissing: e.target.checked,
                  serialTagImageUrl: e.target.checked ? "" : report.serialTagImageUrl,
                })
              }
            />
            <span>None available</span>
          </label>
        </div>

        {/* Divider */}
        <div className="border-l" />

        {/* Info items (optional) + Manuals */}
        <div className="flex-1 flex items-start justify-between gap-6">
          {showMetaChips ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Job #</div>
                <div className="font-semibold">{report.jobNo}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Model</div>
                <div className="font-semibold">{report.model || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Trip Type</div>
                <div className="font-semibold">{report.tripType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Dates</div>
                <div className="font-semibold">{formatRange(report.startAt, report.endAt)}</div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-start">
            <button
              ref={manualsButtonRef}
              className="ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1"
              onClick={onOpenManuals}
              title="Owner's Manuals"
            >
              <BookOpen size={14}/> Manuals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportHeaderBar;
