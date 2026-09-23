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
      className="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-600 break-words"
      title={title}
      aria-label={`App build branch ${branch}, commit ${commit}`}
    >
      Branch: {branch} · {commit}
    </div>
  );
}
