import React, { useCallback } from "react";
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

function ModelBadge({ value }) {
  const display = typeof value === "string" && value.trim() ? value.trim() : "-";
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[12px] text-gray-700">
      <span className="uppercase tracking-wide text-[11px] text-gray-500">Model:</span>
      <span className="font-medium text-gray-900">{display}</span>
    </div>
  );
}

function SharedSiteBlock({ shared, onChange }) {
  return (
    <div className="rounded-2xl border p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <TinyLabel>Job Name</TinyLabel>
          <TinyInput value={shared.jobName || ""} onChange={(e) => onChange({ jobName: e.target.value })} />
        </div>
        <div>
          <TinyLabel>PFlow Serial Number</TinyLabel>
          <TinyInput
            value={shared.serialNumberText || ""}
            onChange={(e) => onChange({ serialNumberText: e.target.value })}
            placeholder="e.g., M-12345"
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <TinyLabel>Site Street Address</TinyLabel>
            <TinyInput value={shared.siteStreetAddress || ""} onChange={(e) => onChange({ siteStreetAddress: e.target.value })} />
          </div>
          <div>
            <TinyLabel>Site Mailing Address</TinyLabel>
            <TinyInput value={shared.siteMailingAddress || ""} onChange={(e) => onChange({ siteMailingAddress: e.target.value })} />
          </div>
        </div>
        <div>
          <TinyLabel>City</TinyLabel>
          <TinyInput value={shared.siteCity || ""} onChange={(e) => onChange({ siteCity: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <TinyLabel>State</TinyLabel>
            <TinyInput value={shared.siteState || ""} onChange={(e) => onChange({ siteState: e.target.value })} />
          </div>
          <div>
            <TinyLabel>Zip Code</TinyLabel>
            <TinyInput value={shared.siteZip || ""} onChange={(e) => onChange({ siteZip: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="text-[11px] text-gray-500 mt-2">Filled once and shared across all documents for this report.</div>
    </div>
  );
}

function ServiceSummaryForm({ report, doc, onUpdateReport, onUpdateDoc }) {
  const data = doc.data || makeEmptyServiceSummaryData();
  const setData = useCallback(
    (patch) => onUpdateDoc({ ...doc, data: { ...data, ...patch } }),
    [doc, data, onUpdateDoc],
  );
  const shared = report.sharedSite || {};
  const setShared = useCallback(
    (patch) => onUpdateReport({ sharedSite: { ...shared, ...patch } }),
    [onUpdateReport, shared],
  );

  const addRow = useCallback(() => {
    if ((data.timeLogs || []).length >= 7) return;
    setData({
      timeLogs: [...(data.timeLogs || []), { id: uid(), date: "", timeIn: "", timeOut: "", travelTime: "", signature: "" }],
    });
  }, [data.timeLogs, setData]);
  const removeRow = useCallback((id) => setData({ timeLogs: (data.timeLogs || []).filter((r) => r.id !== id) }), [data.timeLogs, setData]);

  return (
    <div className="space-y-6">
      <SharedSiteBlock shared={shared} onChange={setShared} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Reason for visit</TinyLabel>
          <TinyTextArea
            value={data.reasonForVisit}
            onChange={(e) => setData({ reasonForVisit: e.target.value })}
            aria-label="Reason for visit"
            name="reasonForVisit"
          />
        </div>
        <div>
          <ModelBadge value={report?.model} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Service performed</TinyLabel>
          <TinyTextArea value={data.servicePerformed} onChange={(e) => setData({ servicePerformed: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Parts replaced</TinyLabel>
          <TinyTextArea value={data.partsReplaced} onChange={(e) => setData({ partsReplaced: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Supervisor Name / E-mail</TinyLabel>
          <TinyInput value={data.supervisorNameEmail} onChange={(e) => setData({ supervisorNameEmail: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Acceptance date</TinyLabel>
          <TinyInput type="date" value={data.acceptanceDate} onChange={(e) => setData({ acceptanceDate: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Supervisor Signature</TinyLabel>
          <TinyInput
            value={data.supervisorSignature}
            onChange={(e) => setData({ supervisorSignature: e.target.value })}
            placeholder="(name or initials)"
          />
        </div>
        <div>
          <TinyLabel>PFlow Service Technician</TinyLabel>
          <TinyInput value={data.pflowServiceTechnician} onChange={(e) => setData({ pflowServiceTechnician: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Manager Name / E-mail</TinyLabel>
          <TinyInput value={data.managerNameEmail} onChange={(e) => setData({ managerNameEmail: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Manager Signature</TinyLabel>
          <TinyInput
            value={data.managerSignature}
            onChange={(e) => setData({ managerSignature: e.target.value })}
            placeholder="(name or initials)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>PM Contact</TinyLabel>
          <TinyInput value={data.pmContact} onChange={(e) => setData({ pmContact: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Customer Contact</TinyLabel>
          <TinyInput value={data.customerContact} onChange={(e) => setData({ customerContact: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Tech 1</TinyLabel>
          <TinyInput value={data.tech1} onChange={(e) => setData({ tech1: e.target.value })} />
        </div>
        <div>
          <TinyLabel>Tech 2</TinyLabel>
          <TinyInput value={data.tech2} onChange={(e) => setData({ tech2: e.target.value })} />
        </div>
      </div>

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
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-50 text-[12px] font-medium">
            <div className="px-2 py-1">Date</div>
            <div className="px-2 py-1">Time in</div>
            <div className="px-2 py-1">Time out</div>
            <div className="px-2 py-1">Travel time</div>
            <div className="px-2 py-1">Signature</div>
          </div>
          {(data.timeLogs || []).map((row) => (
            <div key={row.id} className="grid grid-cols-5 text-[13px] border-t">
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
                <TinyInput
                  type="time"
                  value={row.timeIn}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, timeIn: e.target.value } : r)) })
                  }
                />
              </div>
              <div className="px-2 py-1">
                <TinyInput
                  type="time"
                  value={row.timeOut}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, timeOut: e.target.value } : r)) })
                  }
                />
              </div>
              <div className="px-2 py-1">
                <TinyInput
                  placeholder="hh:mm"
                  value={row.travelTime}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, travelTime: e.target.value } : r)) })
                  }
                />
              </div>
              <div className="px-2 py-1 flex items-center gap-2">
                <TinyInput
                  placeholder="name/initials"
                  value={row.signature}
                  onChange={(e) =>
                    setData({ timeLogs: data.timeLogs.map((r) => (r.id === row.id ? { ...r, signature: e.target.value } : r)) })
                  }
                />
                <button className="px-2 py-1 rounded-lg border" onClick={() => removeRow(row.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <TinyLabel>Additional notes</TinyLabel>
        <TinyTextArea value={data.additionalNotes} onChange={(e) => setData({ additionalNotes: e.target.value })} />
      </div>
    </div>
  );
}

export default React.memo(ServiceSummaryForm);
