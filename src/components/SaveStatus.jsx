import React from "react";
import { AlertTriangle, Check, LoaderCircle } from "lucide-react";

const STATUS = {
  loading: {
    label: "Loading",
    title: "Loading reports from this iPad",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    Icon: LoaderCircle,
    spin: true,
  },
  saving: {
    label: "Saving",
    title: "Saving report changes on this iPad",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    Icon: LoaderCircle,
    spin: true,
  },
  saved: {
    label: "Saved on iPad",
    title: "Report changes are saved on this iPad",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: Check,
    spin: false,
  },
  error: {
    label: "Save failed",
    title: "The latest changes are not safely stored",
    className: "border-red-300 bg-red-50 text-red-700",
    Icon: AlertTriangle,
    spin: false,
  },
};

export default function SaveStatus({ state = "loading", lastSavedAt = null }) {
  const config = STATUS[state] || STATUS.loading;
  const { Icon } = config;
  const savedTime = lastSavedAt instanceof Date ? lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const title = savedTime && state === "saved" ? `${config.title} at ${savedTime}` : config.title;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold ${config.className}`}
      role="status"
      aria-live="polite"
      title={title}
    >
      <Icon size={15} aria-hidden="true" className={config.spin ? "animate-spin" : ""} />
      <span>{config.label}</span>
    </div>
  );
}
