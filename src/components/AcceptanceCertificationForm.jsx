import SignatureBox from "./SignatureBox.jsx";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import DocumentPreview from "./DocumentPreview.jsx";
import SignaturePad from "./SignaturePad.jsx";
import { ACCEPTANCE_CERT_DOC_NAME, ensureAcceptanceCertificationData, makeEmptyAcceptanceCertificationData } from "../utils/fsr";
import { prefillAcceptanceContact } from "../utils/acceptanceContact.js";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`min-w-0 w-full rounded-lg border px-3 py-2 text-[13px] ${className}`} />;
}

function TinyTextarea(props) {
  const { className = "", rows = 3, ...rest } = props;
  return <textarea {...rest} rows={rows} className={`min-w-0 w-full rounded-lg border px-3 py-2 text-[13px] ${className}`} />;
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

function CertificateSection({ number, title, hint, children }) {
  return <section className="rounded-xl border bg-white overflow-hidden">
    <div className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-sm font-semibold">{number}</span>
      <div><h3>{title}</h3><p className="text-xs text-slate-500 mt-1">{hint}</p></div>
    </div>
    <div className="p-4 space-y-4">{children}</div>
  </section>;
}

function AcceptanceCertificationForm({
  doc = { data: makeEmptyAcceptanceCertificationData(), name: ACCEPTANCE_CERT_DOC_NAME },
  onUpdateDoc = () => {}, report, user, onOpenTemplates,
}) {
  const [preview, setPreview] = useState(false);
  const [signing, setSigning] = useState(false);
  const data = useMemo(() => ensureAcceptanceCertificationData(doc?.data), [doc?.data]);

  useEffect(() => {
    const prefilled = prefillAcceptanceContact(data, report);
    if (prefilled !== data) onUpdateDoc({ ...doc, data: prefilled });
  }, [data, doc, report, onUpdateDoc]);

  const updateData = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(data) : { ...data, ...updater };
      onUpdateDoc({ ...doc, data: ensureAcceptanceCertificationData(next) });
    },
    [doc, data, onUpdateDoc],
  );

  // Meta fields (job/model/serial/address) are edited only in Service Summary.

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

  const field = (key, label, props = {}) => (
    <label className="block min-w-0 text-xs text-slate-600">
      <span className="block mb-1">{label}</span>
      <TinyInput value={data[key]} onChange={event => updateData({ [key]: event.target.value })} {...props} />
    </label>
  );

  return (
    <div className="space-y-4">
      {preview && <DocumentPreview report={report} doc={doc} user={user} templateId="acceptance-certification" onUpdateDoc={onUpdateDoc} onOpenTemplates={() => { setPreview(false); onOpenTemplates?.(); }} onClose={() => setPreview(false)} />}
      {signing && <SignaturePad label="Customer signature" value={data.acceptedByInk} onSave={ink => { updateData({ acceptedByInk: ink }); setSigning(false); }} onClose={() => setSigning(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-teal-50 p-4">
        <div>
          <p className="font-semibold text-teal-900">Acceptance review</p>
          <p className="text-sm text-slate-600 mt-1">Record the checks, confirm training, then review with the customer.</p>
        </div>
        <button type="button" className="bg-white shrink-0" onClick={() => setPreview(true)}>Preview Document</button>
      </div>

      <details key={doc.id} className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Edit contact details</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Customer Contact Name</TinyLabel>
          <TinyInput
            id="acceptance-customer-contact"
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
        </div>
      </details>

      <CertificateSection number="1" title="Tests & verification" hint="Record the unit’s acceptance checks.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('startupDate', 'Startup date', { id: 'acceptance-startup-date', type: 'date' })}
          {field('loadCapacity', 'Load capacity', { id: 'acceptance-load-capacity', placeholder: 'Rated capacity' })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <fieldset className="min-w-0 rounded-lg border p-3 space-y-3">
            <legend className="px-1 text-sm font-semibold">Load test</legend>
            <div className="flex gap-2">
              <TinyOptionButton active={!!data.loadTest.yes} label="Yes" onClick={() => updateLoadTest({ yes: true })} />
              <TinyOptionButton active={!data.loadTest.yes} label="No" onClick={() => updateLoadTest({ yes: false })} />
            </div>
            <label className="block text-xs text-slate-600">Percent of lift capacity
              <TinyInput className="mt-1" value={data.loadTest.percent} onChange={event => updateLoadTest({ percent: event.target.value })} placeholder="e.g., 100%" aria-label="Percent of lift capacity" />
            </label>
          </fieldset>
          <fieldset className="min-w-0 rounded-lg border p-3 space-y-3">
            <legend className="px-1 text-sm font-semibold">Operation test</legend>
            <div className="flex gap-2">
              <TinyOptionButton active={!!data.operationTestYes} label="Yes" onClick={() => updateData({ operationTestYes: true })} />
              <TinyOptionButton active={!data.operationTestYes} label="No" onClick={() => updateData({ operationTestYes: false })} />
            </div>
            <label className="block text-xs text-slate-600">Operation comments
              <TinyTextarea className="mt-1" rows={2} value={data.operationComments} onChange={event => updateData({ operationComments: event.target.value })} placeholder="Notes from operation test" />
            </label>
          </fieldset>
          <fieldset className="min-w-0 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">Gate / interlock</legend>
            <div className="flex flex-wrap gap-2">
              {[['yes', 'Yes'], ['no', 'No'], ['na', 'N/A']].map(([value, label]) => <TinyOptionButton key={value} active={data.gateInterlock === value} label={label} onClick={() => updateData({ gateInterlock: value })} />)}
            </div>
          </fieldset>
        </div>
        <details className="rounded-lg border p-3" key={`${doc.id}-other-tests`}>
          <summary className="cursor-pointer text-sm font-medium">Additional tests (optional)</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {['otherTest1', 'otherTest2'].map((key, index) => <label key={key} className="text-xs text-slate-600">Other test {index + 1}
              <TinyTextarea className="mt-1" rows={2} value={data[key]} onChange={event => updateData({ [key]: event.target.value })} />
            </label>)}
          </div>
        </details>
        <div className="max-w-[180px]">{field('customerInitials', 'Customer initials', { placeholder: 'Initials' })}</div>
      </CertificateSection>

      <CertificateSection number="2" title="Personnel instructed" hint="Who received operating and maintenance instruction?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['instructed1', 'instructed2'].map((key, index) => <div key={key} className="rounded-lg bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">PERSON {index + 1}</p>
            {['name', 'company'].map(part => <label key={part} className="block text-xs text-slate-600">
              <span className="block mb-1">{part === 'name' ? 'Name' : 'Company'}</span>
              <TinyInput value={data[key][part]} onChange={event => updatePersonnel(key, { [part]: event.target.value })} />
            </label>)}
          </div>)}
        </div>
      </CertificateSection>

      <CertificateSection number="3" title="Customer acceptance" hint="Confirm who is accepting the unit, then preview before signing.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {field('acceptedByName', 'Accepted by — name', { id: 'acceptance-accepted-by', placeholder: 'Name' })}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('acceptedByTitle', 'Title')}
              {field('acceptedByCompany', 'Company')}
            </div>
            {field('acceptanceDate', 'Acceptance date', { id: 'acceptance-date', type: 'date' })}
          </div>
          <div className="rounded-xl bg-teal-50 p-3 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <p className="text-sm font-semibold">Customer signature</p>
              <span className="text-xs text-teal-800">{data.acceptedByInk ? 'Signature captured' : 'Awaiting signature'}</span>
            </div>
            <SignatureBox label="Customer signature" value={data.acceptedByInk} onClick={() => setSigning(true)} />
            <button type="button" className="w-full bg-white" onClick={() => setPreview(true)}>Review filled document</button>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">PFlow representative</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('pflowRepName', 'Representative name', { placeholder: 'Representative' })}
            {field('pflowRepPhone', 'Phone', { inputMode: 'tel' })}
          </div>
        </div>
        <label className="block text-xs text-slate-600">Notes (optional)
          <TinyTextarea className="mt-1" value={data.acceptanceNotes} onChange={event => updateData({ acceptanceNotes: event.target.value })} rows={2} placeholder="Additional notes" />
        </label>
      </CertificateSection>
    </div>
  );
}

export default AcceptanceCertificationForm;
