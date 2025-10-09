import React, { useCallback, useEffect, useMemo } from "react";
import { ACCEPTANCE_CERT_DOC_NAME, ensureAcceptanceCertificationData, makeEmptyAcceptanceCertificationData } from "../utils/fsr";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`w-full rounded-lg border px-2 py-1 text-[13px] ${className}`} />;
}

function TinyTextarea(props) {
  const { className = "", rows = 3, ...rest } = props;
  return <textarea {...rest} rows={rows} className={`w-full rounded-lg border px-2 py-1 text-[13px] ${className}`} />;
}

function TinyOptionButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`px-3 py-1 rounded-lg border text-[13px] ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white"
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function SummaryField({ label, value }) {
  return (
    <div>
      <TinyLabel>{label}</TinyLabel>
      <div className="rounded-lg border px-3 py-2 text-[13px] bg-gray-50">{value || "—"}</div>
    </div>
  );
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

function AcceptanceCertificationForm({
  report = { sharedSite: {} },
  doc = { data: makeEmptyAcceptanceCertificationData(), name: ACCEPTANCE_CERT_DOC_NAME },
  onUpdateDoc = () => {},
}) {
  const shared = report.sharedSite || {};
  const data = useMemo(() => ensureAcceptanceCertificationData(doc?.data), [doc?.data]);

  const updateData = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(data) : { ...data, ...updater };
      onUpdateDoc({ ...doc, data: ensureAcceptanceCertificationData(next) });
    },
    [doc, data, onUpdateDoc],
  );

  useEffect(() => {
    const patch = {};
    if (!data.jobName && shared.jobName) patch.jobName = shared.jobName;
    if (!data.pflowSerialNumber && shared.serialNumberText) patch.pflowSerialNumber = shared.serialNumberText;
    if (!data.modelNumber && report.model) patch.modelNumber = report.model;
    if (!data.siteStreetAddress && shared.siteStreetAddress) patch.siteStreetAddress = shared.siteStreetAddress;
    if (!data.siteMailingAddress && shared.siteMailingAddress) patch.siteMailingAddress = shared.siteMailingAddress;
    if (!data.siteCity && shared.siteCity) patch.siteCity = shared.siteCity;
    if (!data.siteState && shared.siteState) patch.siteState = shared.siteState;
    if (!data.siteZip && shared.siteZip) patch.siteZip = shared.siteZip;
    if (Object.keys(patch).length) {
      updateData((prev) => ({ ...prev, ...patch }));
    }
  }, [
    data.jobName,
    data.modelNumber,
    data.pflowSerialNumber,
    data.siteCity,
    data.siteMailingAddress,
    data.siteState,
    data.siteStreetAddress,
    data.siteZip,
    report.model,
    shared.jobName,
    shared.serialNumberText,
    shared.siteCity,
    shared.siteMailingAddress,
    shared.siteState,
    shared.siteStreetAddress,
    shared.siteZip,
    updateData,
  ]);

  const updateLoadTest = useCallback(
    (patch) => {
      updateData((prev) => ({
        ...prev,
        loadTest: { ...prev.loadTest, ...patch },
      }));
    },
    [updateData],
  );

  const updatePersonnel = useCallback(
    (key, patch) => {
      updateData((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...patch },
      }));
    },
    [updateData],
  );

  const summaryStreet = data.siteStreetAddress || shared.siteStreetAddress || "";
  const summaryMailing = data.siteMailingAddress || shared.siteMailingAddress || "";
  const summaryCity = data.siteCity || shared.siteCity || "";
  const summaryState = data.siteState || shared.siteState || "";
  const summaryZip = data.siteZip || shared.siteZip || "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryField label="Job Name" value={data.jobName || shared.jobName} />
        <SummaryField label="PFlow Serial Number" value={data.pflowSerialNumber || shared.serialNumberText} />
        <SummaryField label="Model" value={data.modelNumber || report.model} />
        <SummaryField label="Site Street Address" value={summaryStreet} />
        <SummaryField label="Mailing Address" value={summaryMailing} />
        <SummaryField
          label="City / State / ZIP"
          value={[summaryCity, summaryState, summaryZip].filter(Boolean).join(", ")}
        />
      </div>

      <ModelBadge value={report?.model} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Customer Contact Name</TinyLabel>
          <TinyInput
            value={data.customerContactName}
            onChange={(event) => updateData({ customerContactName: event.target.value })}
            placeholder="Contact name"
          />
        </div>
        <div>
          <TinyLabel>Customer Contact Title</TinyLabel>
          <TinyInput
            value={data.customerContactTitle}
            onChange={(event) => updateData({ customerContactTitle: event.target.value })}
            placeholder="Title"
          />
        </div>
        <div>
          <TinyLabel>Customer Company</TinyLabel>
          <TinyInput
            value={data.customerCompany}
            onChange={(event) => updateData({ customerCompany: event.target.value })}
            placeholder="Company"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <TinyLabel>Phone</TinyLabel>
            <TinyInput
              value={data.customerContactPhone}
              onChange={(event) => updateData({ customerContactPhone: event.target.value })}
              placeholder="(###) ###-####"
              inputMode="tel"
            />
          </div>
          <div>
            <TinyLabel>Ext</TinyLabel>
            <TinyInput
              value={data.customerContactExt}
              onChange={(event) => updateData({ customerContactExt: event.target.value })}
              placeholder="Ext"
              inputMode="numeric"
            />
          </div>
        </div>
        <div>
          <TinyLabel>Email</TinyLabel>
          <TinyInput
            value={data.customerContactEmail}
            onChange={(event) => updateData({ customerContactEmail: event.target.value })}
            type="email"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <TinyLabel>Startup Date</TinyLabel>
          <TinyInput
            value={data.startupDate}
            onChange={(event) => updateData({ startupDate: event.target.value })}
            type="date"
          />
        </div>
        <div>
          <TinyLabel>Load Capacity</TinyLabel>
          <TinyInput
            value={data.loadCapacity}
            onChange={(event) => updateData({ loadCapacity: event.target.value })}
            placeholder="Rated capacity"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <TinyLabel>Load Test</TinyLabel>
          <div className="flex flex-wrap items-center gap-3">
            <TinyOptionButton active={!!data.loadTest.yes} label="Yes" onClick={() => updateLoadTest({ yes: true })} />
            <TinyOptionButton active={!data.loadTest.yes} label="No" onClick={() => updateLoadTest({ yes: false })} />
            <TinyInput
              value={data.loadTest.percent}
              onChange={(event) => updateLoadTest({ percent: event.target.value })}
              placeholder="% of lift capacity"
              className="w-40 md:w-48"
              aria-label="Percent of lift capacity"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TinyLabel>Operation Test</TinyLabel>
            <div className="flex items-center gap-3">
              <TinyOptionButton
                active={!!data.operationTestYes}
                label="Yes"
                onClick={() => updateData({ operationTestYes: true })}
              />
              <TinyOptionButton
                active={!data.operationTestYes}
                label="No"
                onClick={() => updateData({ operationTestYes: false })}
              />
            </div>
          </div>
          <div>
            <TinyLabel>Operation Comments</TinyLabel>
            <TinyTextarea
              value={data.operationComments}
              onChange={(event) => updateData({ operationComments: event.target.value })}
              rows={3}
              placeholder="Notes from operation test"
            />
          </div>
        </div>

        <div>
          <TinyLabel>Gate / Interlock</TinyLabel>
          <div className="flex flex-wrap items-center gap-3">
            <TinyOptionButton
              active={data.gateInterlock === "yes"}
              label="Yes"
              onClick={() => updateData({ gateInterlock: "yes" })}
            />
            <TinyOptionButton
              active={data.gateInterlock === "no"}
              label="No"
              onClick={() => updateData({ gateInterlock: "no" })}
            />
            <TinyOptionButton
              active={data.gateInterlock === "na"}
              label="N/A"
              onClick={() => updateData({ gateInterlock: "na" })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TinyLabel>Other Test 1</TinyLabel>
            <TinyTextarea
              value={data.otherTest1}
              onChange={(event) => updateData({ otherTest1: event.target.value })}
              rows={2}
            />
          </div>
          <div>
            <TinyLabel>Other Test 2</TinyLabel>
            <TinyTextarea
              value={data.otherTest2}
              onChange={(event) => updateData({ otherTest2: event.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <TinyLabel>Customer Initials</TinyLabel>
          <TinyInput
            value={data.customerInitials}
            onChange={(event) => updateData({ customerInitials: event.target.value })}
            placeholder="Initials"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Personnel Instructed — Name</TinyLabel>
          <TinyInput
            value={data.instructed1.name}
            onChange={(event) => updatePersonnel("instructed1", { name: event.target.value })}
            placeholder="Name"
          />
        </div>
        <div>
          <TinyLabel>Personnel Instructed — Company</TinyLabel>
          <TinyInput
            value={data.instructed1.company}
            onChange={(event) => updatePersonnel("instructed1", { company: event.target.value })}
            placeholder="Company"
          />
        </div>
        <div>
          <TinyLabel>Personnel Instructed #2 — Name</TinyLabel>
          <TinyInput
            value={data.instructed2.name}
            onChange={(event) => updatePersonnel("instructed2", { name: event.target.value })}
            placeholder="Name"
          />
        </div>
        <div>
          <TinyLabel>Personnel Instructed #2 — Company</TinyLabel>
          <TinyInput
            value={data.instructed2.company}
            onChange={(event) => updatePersonnel("instructed2", { company: event.target.value })}
            placeholder="Company"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Accepted By — Name</TinyLabel>
          <TinyInput
            value={data.acceptedByName}
            onChange={(event) => updateData({ acceptedByName: event.target.value })}
            placeholder="Name"
          />
        </div>
        <div>
          <TinyLabel>Accepted By — Title</TinyLabel>
          <TinyInput
            value={data.acceptedByTitle}
            onChange={(event) => updateData({ acceptedByTitle: event.target.value })}
            placeholder="Title"
          />
        </div>
        <div>
          <TinyLabel>Accepted By — Company</TinyLabel>
          <TinyInput
            value={data.acceptedByCompany}
            onChange={(event) => updateData({ acceptedByCompany: event.target.value })}
            placeholder="Company"
          />
        </div>
        <div>
          <TinyLabel>Acceptance Date</TinyLabel>
          <TinyInput
            value={data.acceptanceDate}
            onChange={(event) => updateData({ acceptanceDate: event.target.value })}
            type="date"
          />
        </div>
        <div>
          <TinyLabel>PFlow Representative — Name</TinyLabel>
          <TinyInput
            value={data.pflowRepName}
            onChange={(event) => updateData({ pflowRepName: event.target.value })}
            placeholder="Representative"
          />
        </div>
        <div>
          <TinyLabel>PFlow Representative — Phone</TinyLabel>
          <TinyInput
            value={data.pflowRepPhone}
            onChange={(event) => updateData({ pflowRepPhone: event.target.value })}
            placeholder="(###) ###-####"
            inputMode="tel"
          />
        </div>
      </div>

      <div>
        <TinyLabel>Notes (optional)</TinyLabel>
        <TinyTextarea
          value={data.acceptanceNotes}
          onChange={(event) => updateData({ acceptanceNotes: event.target.value })}
          rows={4}
          placeholder="Additional notes"
        />
      </div>
    </div>
  );
}

export default AcceptanceCertificationForm;
