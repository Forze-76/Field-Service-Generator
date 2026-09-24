import { Trash2 } from "lucide-react";
import FormSection from "./FormSection.jsx";
import TimeWheelInput from "./TimeWheelInput.jsx";
import { populateTripTimeLogs, followingDay, reportStartDay } from "../utils/timeLogDates.js";
import SignatureBox from "./SignatureBox.jsx";
import React, { useCallback, useState, useEffect } from "react";
import DocumentPreview from "./DocumentPreview.jsx";
import SignaturePad from "./SignaturePad.jsx";
import { patchInk } from "../utils/pdfInk.js";
import { makeEmptyServiceSummaryData, uid } from "../utils/fsr";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  return <input {...props} className={(props.className || "") + " min-w-0 w-full rounded-lg border px-3 py-2 text-[13px]"} />;
}

function TinyTextArea(props) {
  return <textarea {...props} className={(props.className || "") + " min-w-0 w-full rounded-lg border px-3 py-2 text-[13px] min-h-[80px]"} />;
}

// Model badge removed from UI per requirements

function ServiceSummaryForm({ report, doc, user, onUpdateDoc, onOpenTemplates }) {
  const [preview, setPreview] = useState(false);
  const [signing, setSigning] = useState(null);
  const data = doc.data || makeEmptyServiceSummaryData();
  const setData = useCallback(
    (patch) => onUpdateDoc({ ...doc, data: { ...data, ...patch } }),
    [doc, data, onUpdateDoc],
  );
  useEffect(() => {
    const range = `${reportStartDay(report.startAt)}:${reportStartDay(report.endAt)}`;
    if (report.useTripHours || data.timeLogRangeInitialized === range || !reportStartDay(report.startAt)) return;
    if (report.endAt && reportStartDay(report.endAt) < reportStartDay(report.startAt)) return;
    const timeLogs = populateTripTimeLogs(data.timeLogs || [], report.startAt, report.endAt, uid);
    setData({ timeLogs, timeLogRangeInitialized: range });
  }, [report.startAt, report.endAt, report.useTripHours, data.timeLogs, data.timeLogRangeInitialized, setData]);
  const addRow = useCallback(() => {
    if ((data.timeLogs || []).length >= 7) return;
    setData({
      timeLogs: [...(data.timeLogs || []), { id: uid(), date: followingDay(data.timeLogs?.at(-1)?.date) || reportStartDay(report.startAt), timeIn: "", timeOut: "", travelTime: "", signature: "" }],
    });
  }, [data.timeLogs, report.startAt, setData]);
  const removeRow = useCallback((id) => setData({ timeLogs: (data.timeLogs || []).filter((r) => r.id !== id) }), [data.timeLogs, setData]);

  return (
    <div className="space-y-4">
      {preview && <DocumentPreview report={report} doc={doc} user={user} templateId="service-summary" onUpdateDoc={onUpdateDoc} onOpenTemplates={() => { setPreview(false); onOpenTemplates?.(); }} onClose={() => setPreview(false)} />}
      {signing && <SignaturePad label={signing.label} value={signing.value} onSave={ink => { onUpdateDoc({ ...doc, data: patchInk(data, signing.key, ink) }); setSigning(null); }} onClose={() => setSigning(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-teal-50 p-4">
        <div><p className="font-semibold text-teal-900">Service visit summary</p><p className="text-sm text-slate-600 mt-1">Log the day, summarize the work, and review with the customer before signing.</p></div>
        <button type="button" className="bg-white" onClick={() => setPreview(true)}>Preview Document</button>
      </div>
      <details key={doc.id} className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-medium">Edit contact details</summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            PM Contact
            <TinyInput value={data.pmContact || ""} onChange={e => setData({ pmContact: e.target.value })} />
          </label>
          <label className="text-sm">
            Customer Contact
            <TinyInput value={data.customerContact || ""} onChange={e => setData({ customerContact: e.target.value })} />
          </label>
        </div>
      </details>

      <FormSection number="1" title="Daily Time Log" hint="Set work and travel hours, then collect each day’s signature.">
        <div className="flex items-center justify-end mb-2">
          <button
            className="px-2 py-1 rounded-lg border text-[13px] disabled:opacity-40"
            disabled={(data.timeLogs || []).length >= 7}
            onClick={addRow}
          >
            + Add day
          </button>
        </div>
        <div id="service-time-log" tabIndex={-1} className="space-y-2">
          {(data.timeLogs || []).map((row, index) => (
            <div key={row.id} className="rounded-xl border bg-slate-50 p-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 text-[13px]">
              <div className="min-w-0">
                <TinyLabel>Day {index + 1} · Date</TinyLabel>
                <TinyInput
                  type="date"
                  value={row.date}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, date: e.target.value } : r)) })
                  }
                />
              </div>
              <div className="min-w-0">
                <TinyLabel>Time in</TinyLabel>
                <TimeWheelInput label="Time in" value={row.timeIn}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, timeIn: value } : r) })} />
              </div>
              <div className="min-w-0">
                <TinyLabel>Time out</TinyLabel>
                <TimeWheelInput label="Time out" value={row.timeOut}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, timeOut: value } : r) })} />
              </div>
              <div className="min-w-0">
                <TinyLabel>Travel time</TinyLabel>
                <TimeWheelInput label="Travel time" duration value={row.travelTime}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, travelTime: value } : r) })} />
              </div>
              <div className="min-w-0">
                <TinyLabel>Daily signature</TinyLabel>
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                <SignatureBox compact label="Day signature" value={row.signatureInk} onClick={() => setSigning({ key: `timeLog:${data.timeLogs.findIndex(r => r.id === row.id)}`, label: 'Day signature', value: row.signatureInk })} />
                  </div>
                <button type="button" title={`Remove day ${index + 1}`} className="shrink-0 text-slate-500" aria-label={`Remove day ${index + 1}`} onClick={() => removeRow(row.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection number="2" title="Work summary" hint="Summarize the work and record any additional notes.">
        <div className="flex items-center justify-between gap-3 mb-2">
          <TinyLabel>Service performed</TinyLabel>
        </div>
        <TinyTextArea id="service-performed" value={data.servicePerformed} onChange={e => setData({ servicePerformed: e.target.value })} />
      <div>
        <TinyLabel>Additional notes</TinyLabel>
        <TinyTextArea value={data.additionalNotes} onChange={(e) => setData({ additionalNotes: e.target.value })} />
      </div>
      </FormSection>

      <FormSection number="3" title="Review & sign-off" hint="Confirm the supervisor and manager details, then capture their signatures.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[['Supervisor', 'supervisorNameEmail', 'supervisorInk'], ['Manager', 'managerNameEmail', 'managerInk']].map(([label, nameKey, inkKey]) => (
          <div key={inkKey} className="rounded-xl bg-teal-50 p-3 space-y-3">
            <div>
              <TinyLabel>{label} Name / E-mail</TinyLabel>
              <TinyInput value={data[nameKey]} onChange={e => setData({ [nameKey]: e.target.value })} />
            </div>
            <SignatureBox compact label={`${label} signature`} value={data[inkKey]} onClick={() => setSigning({ key: inkKey, label: `${label} signature`, value: data[inkKey] })} />
          </div>
        ))}
      </div>
      <div className="max-w-xs">
        <TinyLabel>Acceptance date</TinyLabel>
        <TinyInput type="date" value={data.acceptanceDate} onChange={e => setData({ acceptanceDate: e.target.value })} />
      </div>

      <button type="button" className="bg-white" onClick={() => setPreview(true)}>Review filled document</button>
      </FormSection>
    </div>
  );
}

export default React.memo(ServiceSummaryForm);
