import React from "react";

const DEFAULT_LIMIT = 5 * 1024 * 1024;

function formatMb(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(2);
}

function StorageMeter({ bytes = 0, limitBytes = DEFAULT_LIMIT, className = "" }) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const percent = limitBytes > 0 ? Math.min(100, (safeBytes / limitBytes) * 100) : 0;
  const warnThreshold = 4.5 * 1024 * 1024;
  const warn = safeBytes >= warnThreshold;
  const limitMb = formatMb(limitBytes);
  const usedMb = formatMb(safeBytes);

  return (
    <div className={`rounded-2xl border px-4 py-3 bg-white/60 ${className}`.trim()}>
      <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
        <span>Local storage usage</span>
        <span>
          {usedMb} MB / {limitMb} MB
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-full ${warn ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {warn && (
        <p className="mt-2 text-[11px] text-amber-600">
          Storage is almost full. Consider removing photos before exporting or clearing old reports.
        </p>
      )}
    </div>
  );
}

export default StorageMeter;
