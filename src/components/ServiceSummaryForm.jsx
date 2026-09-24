import TimeWheelInput from "./TimeWheelInput.jsx";
import { fillTimeLogDates, followingDay, reportStartDay } from "../utils/timeLogDates.js";
import SignatureBox from "./SignatureBox.jsx";
import React, { useCallback, useState, useEffect, useRef } from "react";
import DocumentPreview from "./DocumentPreview.jsx";
import SignaturePad from "./SignaturePad.jsx";
import { patchInk } from "../utils/pdfInk.js";
import { makeEmptyServiceSummaryData, uid } from "../utils/fsr";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  return <input {...props} className={(props.className || "") + " w-full rounded-lg border px-2 py-1 text-[13px]"} />;
}

function TinyTextArea(props) {
  return <textarea {...props} className={(props.className || "") + " w-full rounded-lg border px-2 py-1 text-[13px] min-h-[80px]"} />;
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
  const initializedDates = useRef('');
  useEffect(() => {
    const key = `${doc.id}:${report.startAt}`;
    if (initializedDates.current === key || !reportStartDay(report.startAt)) return;
    initializedDates.current = key;
    const rows = data.timeLogs || [];
    const datedRows = fillTimeLogDates(rows, report.startAt);
    if (datedRows.some((row, index) => row !== rows[index])) setData({ timeLogs: datedRows });
  }, [doc.id, report.startAt, data.timeLogs, setData]);
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Daily Time Log</h4>
          <button
            className="px-2 py-1 rounded-lg border text-[13px] disabled:opacity-40"
            disabled={(data.timeLogs || []).length >= 7}
            onClick={addRow}
          >
            + Add day
          </button>
        </div>
        <div id="service-time-log" tabIndex={-1} className="rounded-xl border overflow-x-auto">
          <div className="min-w-[760px] grid grid-cols-5 bg-gray-50 text-[12px] font-medium">
            <div className="px-2 py-1">Date</div>
            <div className="px-2 py-1">Time in</div>
            <div className="px-2 py-1">Time out</div>
            <div className="px-2 py-1">Travel time</div>
            <div className="px-2 py-1">Signature</div>
          </div>
          {(data.timeLogs || []).map((row) => (
            <div key={row.id} className="min-w-[760px] grid grid-cols-5 text-[13px] border-t">
              <div className="px-2 py-1">
                <TinyInput
                  type="date"
                  value={row.date}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, date: e.target.value } : r)) })
                  }
                />
              </div>
              <div className="px-2 py-1">
                <TimeWheelInput label="Time in" value={row.timeIn}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, timeIn: value } : r) })} />
              </div>
              <div className="px-2 py-1">
                <TimeWheelInput label="Time out" value={row.timeOut}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, timeOut: value } : r) })} />
              </div>
              <div className="px-2 py-1">
                <TimeWheelInput label="Travel time" duration value={row.travelTime}
                  onChange={value => setData({ timeLogs: data.timeLogs.map(r => r.id === row.id ? { ...r, travelTime: value } : r) })} />
              </div>
              <div className="px-2 py-1 flex items-center gap-2">
                <SignatureBox compact label="Day signature" value={row.signatureInk} onClick={() => setSigning({ key: `timeLog:${data.timeLogs.findIndex(r => r.id === row.id)}`, label: 'Day signature', value: row.signatureInk })} />
                <button className="px-2 py-1 rounded-lg border" onClick={() => removeRow(row.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <TinyLabel>Service performed</TinyLabel>
          <button type="button" className="rounded-lg border text-sm" onClick={() => setPreview(true)}>Preview Document</button>
        </div>
        <TinyTextArea id="service-performed" value={data.servicePerformed} onChange={e => setData({ servicePerformed: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[['Supervisor', 'supervisorNameEmail', 'supervisorInk'], ['Manager', 'managerNameEmail', 'managerInk']].map(([label, nameKey, inkKey]) => (
          <div key={inkKey} className="rounded-xl border p-3 space-y-2">
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

      <div>
        <TinyLabel>Additional notes</TinyLabel>
        <TinyTextArea value={data.additionalNotes} onChange={(e) => setData({ additionalNotes: e.target.value })} />
      </div>
    </div>
  );
}

export default React.memo(ServiceSummaryForm);
