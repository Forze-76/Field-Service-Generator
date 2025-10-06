import React, { useCallback, useMemo, useState } from "react";
import buildInfo, { buildLabel } from "../utils/buildInfo";

function BuildBadge({ className = "" }) {
  const [copied, setCopied] = useState(false);
  const fullSha = buildInfo.sha;

  const tooltip = useMemo(() => {
    if (!fullSha || fullSha === "unknown") {
      return "Build metadata unavailable";
    }
    return copied ? "Copied!" : "Click to copy full SHA";
  }, [copied, fullSha]);

  const handleCopy = useCallback(async () => {
    if (!fullSha || fullSha === "unknown") return;
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (!clipboard?.writeText) return;
    try {
      await clipboard.writeText(fullSha);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.warn("Clipboard copy failed", error);
    }
  }, [fullSha]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`px-3 py-1 rounded-lg border text-xs font-mono tracking-tight text-gray-600 bg-white/70 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${className}`}
      title={tooltip}
      aria-label="Copy build commit SHA"
    >
      {buildLabel}
    </button>
  );
}

export default React.memo(BuildBadge);
