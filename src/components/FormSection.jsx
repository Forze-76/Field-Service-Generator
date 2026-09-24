import React from "react";

export default function FormSection({ number, title, hint, children }) {
  return <section className="rounded-xl border bg-white overflow-hidden">
    <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-sm font-semibold">{number}</span>
      <div><h3>{title}</h3><p className="text-xs text-slate-500 mt-1">{hint}</p></div>
    </div>
    <div className="p-4 space-y-4">{children}</div>
  </section>;
}

