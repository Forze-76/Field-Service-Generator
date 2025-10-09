import React, { useRef } from "react";
import { Camera } from "lucide-react";
import { fileToDataURL } from "../utils/fsr";

function SerialTagCard({ report, onChange }) {
  const inputRef = useRef(null);
  const hasSerial = !!report.serialTagImageUrl;

  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Serial Number Tag</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!report.serialTagMissing}
            onChange={(e) =>
              onChange({
                serialTagMissing: e.target.checked,
                serialTagImageUrl: e.target.checked ? "" : report.serialTagImageUrl,
              })
            }
          />
          <span>None available</span>
        </label>
      </div>
      <div className="mt-3 flex gap-16 items-start">
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
        <div className="space-x-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = await fileToDataURL(f);
              onChange({ serialTagImageUrl: url, serialTagMissing: false });
            }}
          />
          <button className="px-3 py-2 rounded-xl border" onClick={() => inputRef.current?.click()}>
            Upload
          </button>
          {hasSerial && (
            <button className="px-3 py-2 rounded-xl border" onClick={() => onChange({ serialTagImageUrl: "" })}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SerialTagCard;
