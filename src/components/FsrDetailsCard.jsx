import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { computeDowntimeMinutes, uid } from "../utils/fsr";

const MODULES = [
  { key: "partsInstalled", label: "Parts Installed" },
  { key: "partsNeeded", label: "Parts to Order" },
  { key: "measurements", label: "Measurements" },
  { key: "downtime", label: "Downtime" },
  { key: "siteRequestsRich", label: "Site Requests+" },
  { key: "followUps", label: "Follow-Ups" },
  { key: "customerAck", label: "Customer Ack" },
];

function ToggleChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm transition ${
        active ? "bg-blue-600 border-blue-600 text-white" : "bg-white hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function SectionCard({ title, countLabel, children, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="font-semibold text-sm md:text-base flex items-center gap-2">
          <span>{title}</span>
          {countLabel ? <span className="text-xs text-gray-500">{countLabel}</span> : null}
        </div>
        <button type="button" className="p-2 rounded-xl border" onClick={onToggle}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isOpen ? <div className="p-4 space-y-4">{children}</div> : null}
    </div>
  );
}

const normalizeArray = (arr) => (Array.isArray(arr) ? arr : []);

function FsrDetailsCard({ details, onChange }) {
  const enabled = details.enabled || {};
  const [expanded, setExpanded] = useState(() =>
    MODULES.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {}),
  );

  const ensureObject = (value) => (typeof value === "object" && value ? value : {});

  const toggleModule = (key) => {
    const nextEnabled = { ...enabled, [key]: !enabled[key] };
    onChange({ ...details, enabled: nextEnabled });
    setExpanded((prev) => ({ ...prev, [key]: true }));
  };

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (key, value) => {
    onChange({ ...details, [key]: value });
  };

  const updateNested = (key, value) => {
    onChange({ ...details, [key]: { ...details[key], ...value } });
  };

  const partsInstalled = useMemo(() => normalizeArray(details.partsInstalled), [details.partsInstalled]);
  const partsNeeded = useMemo(() => normalizeArray(details.partsNeeded), [details.partsNeeded]);
  const measurements = useMemo(() => normalizeArray(details.measurements), [details.measurements]);
  const followUps = useMemo(() => normalizeArray(details.followUps), [details.followUps]);

  const downtime = details.downtime || { start: "", end: "", totalMin: "", reason: "" };
  const downtimeMinutes = computeDowntimeMinutes(downtime.start, downtime.end);

  const doneFollowUps = followUps.filter((row) => row?.done).length;

  const renderPartsInstalled = () => (
    <SectionCard
      title="Parts Installed"
      isOpen={expanded.partsInstalled}
      onToggle={() => toggleExpanded("partsInstalled")}
    >
      <div className="space-y-3">
        {partsInstalled.length === 0 && <p className="text-sm text-gray-500">No parts installed.</p>}
        {partsInstalled.map((row, idx) => {
          const value = typeof row === "string" ? row : row?.text || "";
          return (
            <div key={row?.id || idx} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-xl border px-3 py-2"
                value={value}
                onChange={(e) => {
                  const next = partsInstalled.map((item, i) => {
                    if (i !== idx) return item;
                    const id = typeof item === "object" && item?.id ? item.id : uid();
                    return { ...((typeof item === "object" && item) || {}), id, text: e.target.value };
                  });
                  updateField("partsInstalled", next);
                }}
                placeholder="Part description"
              />
              <button
                type="button"
                className="p-2 rounded-xl border text-red-600"
                onClick={() => updateField(
                  "partsInstalled",
                  partsInstalled.filter((_, i) => i !== idx),
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="px-3 py-2 rounded-xl border flex items-center gap-2"
          onClick={() => updateField("partsInstalled", [...partsInstalled, { id: uid(), text: "" }])}
        >
          <Plus size={16} /> Add part
        </button>
      </div>
    </SectionCard>
  );

  const renderPartsNeeded = () => (
    <SectionCard
      title="Parts to Order"
      isOpen={expanded.partsNeeded}
      onToggle={() => toggleExpanded("partsNeeded")}
    >
      <div className="space-y-3">
        {partsNeeded.length === 0 && <p className="text-sm text-gray-500">No parts to order.</p>}
        {partsNeeded.map((row, idx) => {
          const base = ensureObject(row);
          const normalized = {
            id: base.id,
            partNumber: base.partNumber || "",
            description: base.description || (typeof row === "string" ? row : ""),
            qty: base.qty || "",
            priority: base.priority || "Normal",
            needBy: base.needBy || "",
          };
          const applyPatch = (patch) => {
            const next = partsNeeded.map((item, i) =>
              i === idx
                ? {
                    id: ensureObject(item).id || normalized.id || uid(),
                    ...normalized,
                    ...patch,
                  }
                : item,
            );
            updateField("partsNeeded", next);
          };
          return (
            <div key={row?.id || idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                className="rounded-xl border px-3 py-2"
                value={normalized.partNumber}
                onChange={(e) => applyPatch({ partNumber: e.target.value })}
                placeholder="Part #"
              />
              <input
                className="rounded-xl border px-3 py-2 md:col-span-2"
                value={normalized.description}
                onChange={(e) => applyPatch({ description: e.target.value })}
                placeholder="Description"
              />
              <input
                className="rounded-xl border px-3 py-2"
                value={normalized.qty}
                onChange={(e) => applyPatch({ qty: e.target.value })}
                placeholder="Qty"
              />
              <select
                className="rounded-xl border px-3 py-2"
                value={normalized.priority}
                onChange={(e) => applyPatch({ priority: e.target.value })}
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
              <input
                type="date"
                className="rounded-xl border px-3 py-2"
                value={normalized.needBy}
                onChange={(e) => applyPatch({ needBy: e.target.value })}
              />
              <div className="md:col-span-5 flex justify-end">
                <button
                  type="button"
                  className="mt-2 px-3 py-2 rounded-xl border text-red-600"
                  onClick={() => updateField(
                    "partsNeeded",
                    partsNeeded.filter((_, i) => i !== idx),
                  )}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="px-3 py-2 rounded-xl border flex items-center gap-2"
          onClick={() =>
            updateField("partsNeeded", [
              ...partsNeeded,
              { id: uid(), partNumber: "", description: "", qty: "", priority: "Normal", needBy: "" },
            ])
          }
        >
          <Plus size={16} /> Add row
        </button>
      </div>
    </SectionCard>
  );

  const renderMeasurements = () => (
    <SectionCard
      title="Measurements"
      isOpen={expanded.measurements}
      onToggle={() => toggleExpanded("measurements")}
    >
      <div className="space-y-3">
        {measurements.length === 0 && <p className="text-sm text-gray-500">No measurements recorded.</p>}
        {measurements.map((row, idx) => (
          <div key={row?.id || idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.name || ""}
              onChange={(e) => {
                const next = measurements.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), name: e.target.value }
                    : item,
                );
                updateField("measurements", next);
              }}
              placeholder="Measurement"
            />
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.before || ""}
              onChange={(e) => {
                const next = measurements.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), before: e.target.value }
                    : item,
                );
                updateField("measurements", next);
              }}
              placeholder="Before"
            />
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.after || ""}
              onChange={(e) => {
                const next = measurements.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), after: e.target.value }
                    : item,
                );
                updateField("measurements", next);
              }}
              placeholder="After"
            />
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.units || ""}
              onChange={(e) => {
                const next = measurements.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), units: e.target.value }
                    : item,
                );
                updateField("measurements", next);
              }}
              placeholder="Units"
            />
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.notes || ""}
              onChange={(e) => {
                const next = measurements.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), notes: e.target.value }
                    : item,
                );
                updateField("measurements", next);
              }}
              placeholder="Notes"
            />
            <div className="md:col-span-5 flex justify-end">
              <button
                type="button"
                className="mt-2 px-3 py-2 rounded-xl border text-red-600"
                onClick={() => updateField(
                  "measurements",
                  measurements.filter((_, i) => i !== idx),
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="px-3 py-2 rounded-xl border flex items-center gap-2"
          onClick={() =>
            updateField("measurements", [
              ...measurements,
              { id: uid(), name: "", before: "", after: "", units: "", notes: "" },
            ])
          }
        >
          <Plus size={16} /> Add measurement
        </button>
      </div>
    </SectionCard>
  );

  const renderDowntime = () => (
    <SectionCard
      title="Downtime"
      isOpen={expanded.downtime}
      onToggle={() => toggleExpanded("downtime")}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">Start</span>
          <input
            type="datetime-local"
            className="rounded-xl border px-3 py-2"
            value={downtime.start || ""}
            onChange={(e) => {
              const start = e.target.value;
              const total = computeDowntimeMinutes(start, downtime.end);
              updateNested("downtime", { start, totalMin: String(total) });
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">End</span>
          <input
            type="datetime-local"
            className="rounded-xl border px-3 py-2"
            value={downtime.end || ""}
            onChange={(e) => {
              const end = e.target.value;
              const total = computeDowntimeMinutes(downtime.start, end);
              updateNested("downtime", { end, totalMin: String(total) });
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium text-gray-600">Reason</span>
          <textarea
            className="rounded-xl border px-3 py-2"
            value={downtime.reason || ""}
            onChange={(e) => updateNested("downtime", { reason: e.target.value })}
            rows={3}
          />
        </label>
        <div className="md:col-span-2 text-sm text-gray-600">
          Total downtime: <span className="font-semibold text-gray-900">{downtimeMinutes}</span> minutes
        </div>
      </div>
    </SectionCard>
  );

  const renderSiteRequests = () => (
    <SectionCard
      title="Site Requests+"
      isOpen={expanded.siteRequestsRich}
      onToggle={() => toggleExpanded("siteRequestsRich")}
    >
      <textarea
        className="w-full rounded-xl border px-3 py-2"
        rows={5}
        value={details.siteRequestsRich || ""}
        onChange={(e) => updateField("siteRequestsRich", e.target.value)}
        placeholder="Additional site requests, customer notes, etc."
      />
    </SectionCard>
  );

  const renderFollowUps = () => (
    <SectionCard
      title="Follow-Ups"
      countLabel={`${doneFollowUps}/${followUps.length || 0} done`}
      isOpen={expanded.followUps}
      onToggle={() => toggleExpanded("followUps")}
    >
      <div className="space-y-3">
        {followUps.length === 0 && <p className="text-sm text-gray-500">No follow-ups assigned.</p>}
        {followUps.map((row, idx) => (
          <div key={row?.id || idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
            <input
              className="rounded-xl border px-3 py-2 md:col-span-2"
              value={row?.action || ""}
              onChange={(e) => {
                const next = followUps.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), action: e.target.value }
                    : item,
                );
                updateField("followUps", next);
              }}
              placeholder="Action"
            />
            <input
              className="rounded-xl border px-3 py-2"
              value={row?.owner || ""}
              onChange={(e) => {
                const next = followUps.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), owner: e.target.value }
                    : item,
                );
                updateField("followUps", next);
              }}
              placeholder="Owner"
            />
            <input
              type="date"
              className="rounded-xl border px-3 py-2"
              value={row?.due || ""}
              onChange={(e) => {
                const next = followUps.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), due: e.target.value }
                    : item,
                );
                updateField("followUps", next);
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={!!row?.done}
                onChange={(e) => {
                const next = followUps.map((item, i) =>
                  i === idx
                    ? { id: ensureObject(item).id || uid(), ...ensureObject(item), done: e.target.checked }
                    : item,
                );
                  updateField("followUps", next);
                }}
              />
              Done
            </label>
            <div className="md:col-span-5 flex justify-end">
              <button
                type="button"
                className="mt-2 px-3 py-2 rounded-xl border text-red-600"
                onClick={() => updateField(
                  "followUps",
                  followUps.filter((_, i) => i !== idx),
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="px-3 py-2 rounded-xl border flex items-center gap-2"
          onClick={() =>
            updateField("followUps", [
              ...followUps,
              { id: uid(), action: "", owner: "", due: "", done: false },
            ])
          }
        >
          <Plus size={16} /> Add follow-up
        </button>
      </div>
    </SectionCard>
  );

  const renderCustomerAck = () => (
    <SectionCard
      title="Customer Acknowledgment"
      isOpen={expanded.customerAck}
      onToggle={() => toggleExpanded("customerAck")}
    >
      {(() => {
        const ack = details.customerAck || {};
        return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">Name</span>
          <input
            className="rounded-xl border px-3 py-2"
            value={ack.name || ""}
            onChange={(e) => updateField("customerAck", { ...ack, name: e.target.value })}
            placeholder="Customer name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">Title</span>
          <input
            className="rounded-xl border px-3 py-2"
            value={ack.title || ""}
            onChange={(e) => updateField("customerAck", { ...ack, title: e.target.value })}
            placeholder="Title"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">Date</span>
          <input
            type="date"
            className="rounded-xl border px-3 py-2"
            value={ack.date || ""}
            onChange={(e) => updateField("customerAck", { ...ack, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-600">Initials</span>
          <input
            className="rounded-xl border px-3 py-2"
            value={ack.initials || ""}
            onChange={(e) => updateField("customerAck", { ...ack, initials: e.target.value })}
            placeholder="Initials"
          />
        </label>
      </div>
        );
      })()}
    </SectionCard>
  );

  return (
    <div className="rounded-3xl border shadow-sm p-6 bg-white space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4">Report Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-600">Work Summary</span>
            <textarea
              className="rounded-2xl border px-3 py-2"
              rows={3}
              value={details.workSummary || ""}
              onChange={(e) => updateField("workSummary", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-600">Corrections Made</span>
            <textarea
              className="rounded-2xl border px-3 py-2"
              rows={3}
              value={details.correctionsMade || ""}
              onChange={(e) => updateField("correctionsMade", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-600">Site Requests</span>
            <textarea
              className="rounded-2xl border px-3 py-2"
              rows={3}
              value={details.siteRequests || ""}
              onChange={(e) => updateField("siteRequests", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-600">Safety Notes</span>
            <textarea
              className="rounded-2xl border px-3 py-2"
              rows={3}
              value={details.safetyNotes || ""}
              onChange={(e) => updateField("safetyNotes", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-600">Equipment Status</span>
            <textarea
              className="rounded-2xl border px-3 py-2"
              rows={3}
              value={details.equipmentStatus || ""}
              onChange={(e) => updateField("equipmentStatus", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <input
                type="checkbox"
                className="rounded"
                checked={!!details.returnVisitNeeded}
                onChange={(e) => updateField("returnVisitNeeded", e.target.checked)}
              />
              Return visit needed?
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-600">Target return date</span>
              <input
                type="date"
                className="rounded-xl border px-3 py-2"
                value={details.targetReturnDate || ""}
                onChange={(e) => updateField("targetReturnDate", e.target.value)}
                disabled={!details.returnVisitNeeded}
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-600">Optional Modules</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {MODULES.map((mod) => (
            <ToggleChip
              key={mod.key}
              label={mod.label}
              active={!!enabled[mod.key]}
              onClick={() => toggleModule(mod.key)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {enabled.partsInstalled ? renderPartsInstalled() : null}
        {enabled.partsNeeded ? renderPartsNeeded() : null}
        {enabled.measurements ? renderMeasurements() : null}
        {enabled.downtime ? renderDowntime() : null}
        {enabled.siteRequestsRich ? renderSiteRequests() : null}
        {enabled.followUps ? renderFollowUps() : null}
        {enabled.customerAck ? renderCustomerAck() : null}
      </div>
    </div>
  );
}

export default FsrDetailsCard;
