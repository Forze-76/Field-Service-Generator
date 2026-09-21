import React from "react";

const branch = import.meta.env.VITE_GIT_BRANCH || "unknown";
const commit = import.meta.env.VITE_GIT_SHA || "unknown";
const buildTime = import.meta.env.VITE_BUILD_TIME || "";

export default function BuildStamp() {
  const title = buildTime
    ? `Built ${new Date(buildTime).toLocaleString()}`
    : "Build time unavailable";

  return (
    <div
      className="fixed bottom-2 right-2 z-40 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-300 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur"
      title={title}
      aria-label={`App build branch ${branch}, commit ${commit}`}
    >
      Branch: {branch} · {commit}
    </div>
  );
}
