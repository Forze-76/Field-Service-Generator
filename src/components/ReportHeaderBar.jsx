import React, { useRef } from "react";
import { BookOpen, Camera } from "lucide-react";
import { fileToDataURL, toISOInput } from "../utils/fsr";

function ReportHeaderBar({ report, onUpdateReport, onOpenManuals, manualsButtonRef, showSerial = true }) {
  const inputRef = useRef(null);

  return (
    <div className="report-header rounded-3xl border shadow-sm p-6 bg-white">
      <div className="flex items-start justify-between gap-6">
        {/* Serial Tag thumbnail + Upload/Remove + None available */}
        {showSerial && <div className="flex items-start gap-6">
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

        }
        {/* Divider */}
        <div className="border-l" />

        {/* Info items + Manuals */}
        <div className="flex-1 flex items-start justify-between gap-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm text-gray-500">Job #
              <input id="report-job-number" className="mt-1 w-full rounded-lg border px-2 py-1 font-semibold text-gray-900" value={report.jobNo || ""} onChange={(event) => onUpdateReport?.({ jobNo: event.target.value })} />
            </label>
            <label className="text-sm text-gray-500">Model
              <input id="report-model" className="mt-1 w-full rounded-lg border px-2 py-1 font-semibold text-gray-900" value={report.model || ""} onChange={(event) => onUpdateReport?.({ model: event.target.value })} />
            </label>

            <label className="text-sm text-gray-500">Start date
              <input id="report-start-date" type="datetime-local" className="mt-1 w-full rounded-lg border px-2 py-1 font-semibold text-gray-900" value={toISOInput(report.startAt)} onChange={(event) => onUpdateReport?.({ startAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} />
            </label>
            <label className="text-sm text-gray-500">End date
              <input id="report-end-date" type="datetime-local" className="mt-1 w-full rounded-lg border px-2 py-1 font-semibold text-gray-900" value={toISOInput(report.endAt)} onChange={(event) => onUpdateReport?.({ endAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} />
            </label>
            <label className="col-span-2 text-sm text-gray-500">Technician
              <input id="report-technician" className="mt-1 w-full rounded-lg border px-2 py-1 font-semibold text-gray-900" value={report.technicianName ?? ""} placeholder="Uses signed-in technician when blank" onChange={(event) => onUpdateReport?.({ technicianName: event.target.value })} />
            </label>
          </div>
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
