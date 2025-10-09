import React, { useCallback, useEffect, useMemo } from "react";
import { ensureMotorTestData, makeEmptyMotorTestData, MOTOR_TEST_DOC_NAME } from "../utils/fsr";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`w-full rounded-lg border px-2 py-1 text-[13px] ${className}`} />;
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

const VOLT_LINE_KEYS = [
  { key: "l1l2", label: "L1-L2" },
  { key: "l1l3", label: "L1-L3" },
  { key: "l2l3", label: "L2-L3" },
];

const VOLT_GROUND_KEYS = [
  { key: "l1g", label: "L1-G" },
  { key: "l2g", label: "L2-G" },
  { key: "l3g", label: "L3-G" },
];

const CURRENT_KEYS = ["t1", "t2", "t3"];

function MotorTestForm({
  report = { sharedSite: {} },
  doc = { data: makeEmptyMotorTestData(), name: MOTOR_TEST_DOC_NAME },
  onUpdateDoc = () => {},
}) {
  const shared = report.sharedSite || {};
  const data = useMemo(() => ensureMotorTestData(doc?.data), [doc?.data]);

  const updateData = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(data) : { ...data, ...updater };
      onUpdateDoc({ ...doc, data: ensureMotorTestData(next) });
    },
    [doc, data, onUpdateDoc],
  );

  useEffect(() => {
    const patch = {};
    if (!data.jobName && shared.jobName) patch.jobName = shared.jobName;
    if (!data.pflowSerialNumber && shared.serialNumberText) patch.pflowSerialNumber = shared.serialNumberText;
    if (!data.modelNumber && report.model) patch.modelNumber = report.model;
    if (!data.siteStreetAddress && shared.siteStreetAddress) patch.siteStreetAddress = shared.siteStreetAddress;
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
    data.siteState,
    data.siteStreetAddress,
    data.siteZip,
    report.model,
    shared.jobName,
    shared.serialNumberText,
    shared.siteCity,
    shared.siteState,
    shared.siteStreetAddress,
    shared.siteZip,
    updateData,
  ]);

  const setVoltage = useCallback(
    (segment, key, value) => {
      updateData((prev) => ({
        ...prev,
        [segment]: { ...prev[segment], [key]: value },
      }));
    },
    [updateData],
  );

  const setCurrent = useCallback(
    (direction, load, key, value) => {
      updateData((prev) => ({
        ...prev,
        currents: {
          ...prev.currents,
          [direction]: {
            ...prev.currents[direction],
            [load]: {
              ...prev.currents[direction][load],
              [key]: value,
            },
          },
        },
      }));
    },
    [updateData],
  );

  const renderVoltageTable = (segmentKey, title) => (
    <div key={segmentKey} className="space-y-2">
      <div className="text-[13px] font-semibold">{title}</div>
      <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {VOLT_LINE_KEYS.map(({ key, label }) => (
              <td key={key} className="border border-gray-200 px-2 py-2 align-top">
                <div className="text-[11px] text-gray-600">{label}</div>
                <TinyInput
                  value={data[segmentKey][key]}
                  onChange={(event) => setVoltage(segmentKey, key, event.target.value)}
                  placeholder="VAC"
                  className="mt-1 text-center"
                  inputMode="decimal"
                  aria-label={`${title} ${label}`}
                />
              </td>
            ))}
          </tr>
          <tr>
            {VOLT_GROUND_KEYS.map(({ key, label }) => (
              <td key={key} className="border border-gray-200 px-2 py-2 align-top">
                <div className="text-[11px] text-gray-600">{label}</div>
                <TinyInput
                  value={data[segmentKey][key]}
                  onChange={(event) => setVoltage(segmentKey, key, event.target.value)}
                  placeholder="VAC"
                  className="mt-1 text-center"
                  inputMode="decimal"
                  aria-label={`${title} ${label}`}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderCurrentRow = (directionLabel, directionKey) => (
    <tr key={directionKey}>
      <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-left text-[12px] font-medium text-gray-700">
        {directionLabel}
      </th>
      {["unloaded", "full"].flatMap((loadKind) =>
        CURRENT_KEYS.map((phaseKey) => (
          <td key={`${directionKey}-${loadKind}-${phaseKey}`} className="border border-gray-200 px-2 py-2">
            <TinyInput
              value={data.currents[directionKey][loadKind][phaseKey]}
              onChange={(event) => setCurrent(directionKey, loadKind, phaseKey, event.target.value)}
              placeholder="A"
              className="text-center"
              inputMode="decimal"
              aria-label={`${directionLabel} ${loadKind === "unloaded" ? "Unloaded" : "Full Load"} ${phaseKey.toUpperCase()}`}
            />
          </td>
        )),
      )}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Job Name</TinyLabel>
          <div className="rounded-lg border px-3 py-2 text-[13px] bg-gray-50">{data.jobName || "—"}</div>
        </div>
        <div>
          <TinyLabel>PFlow Serial Number</TinyLabel>
          <div className="rounded-lg border px-3 py-2 text-[13px] bg-gray-50">{data.pflowSerialNumber || "—"}</div>
        </div>
        <div>
          <TinyLabel>Model</TinyLabel>
          <div className="rounded-lg border px-3 py-2 text-[13px] bg-gray-50">{data.modelNumber || report.model || "—"}</div>
        </div>
        <div>
          <TinyLabel>Site Street Address</TinyLabel>
          <TinyInput
            value={data.siteStreetAddress}
            onChange={(event) => updateData({ siteStreetAddress: event.target.value })}
            placeholder="Street"
            aria-label="Site street address"
          />
        </div>
        <div>
          <TinyLabel>City</TinyLabel>
          <TinyInput
            value={data.siteCity}
            onChange={(event) => updateData({ siteCity: event.target.value })}
            placeholder="City"
            aria-label="Site city"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <TinyLabel>State</TinyLabel>
            <TinyInput
              value={data.siteState}
              onChange={(event) => updateData({ siteState: event.target.value })}
              placeholder="State"
              aria-label="Site state"
            />
          </div>
          <div>
            <TinyLabel>Zip</TinyLabel>
            <TinyInput
              value={data.siteZip}
              onChange={(event) => updateData({ siteZip: event.target.value })}
              placeholder="Zip"
              aria-label="Site zip code"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <ModelBadge value={report?.model} />

      <div>
        <TinyLabel>Measured Voltage</TinyLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderVoltageTable("voltIncoming", "Incoming")}
          {renderVoltageTable("voltAfd", "AFD Output")}
        </div>
      </div>

      <div>
        <TinyLabel>Measured Current (AFD Output)</TinyLabel>
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-gray-50 text-gray-600 font-medium">
              <th className="border border-gray-200 px-2 py-2 text-left"></th>
              <th className="border border-gray-200 px-2 py-2 text-center" colSpan={3}>
                Unloaded (Amps)
              </th>
              <th className="border border-gray-200 px-2 py-2 text-center" colSpan={3}>
                Full Load (Amps)
              </th>
            </tr>
            <tr className="bg-gray-50 text-gray-500">
              <th className="border border-gray-200 px-2 py-2 text-left text-[12px] font-medium"></th>
              {["T1", "T2", "T3", "T1", "T2", "T3"].map((label, index) => (
                <th key={`head-${label}-${index}`} className="border border-gray-200 px-2 py-2 text-center text-[12px] font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{["up", "down"].map((direction) => renderCurrentRow(direction === "up" ? "Up" : "Down", direction))}</tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TinyLabel>Rated Load</TinyLabel>
          <TinyInput
            value={data.ratedLoad}
            onChange={(event) => updateData({ ratedLoad: event.target.value })}
            placeholder="e.g., 4000 lbs"
            aria-label="Rated load"
          />
        </div>
        <div>
          <TinyLabel>Tested Load</TinyLabel>
          <TinyInput
            value={data.testedLoad}
            onChange={(event) => updateData({ testedLoad: event.target.value })}
            placeholder="e.g., 2500 lbs"
            aria-label="Tested load"
          />
        </div>
      </div>

      <div>
        <TinyLabel>Motor information</TinyLabel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <TinyLabel>Manufacturer</TinyLabel>
            <TinyInput
              value={data.motor.manufacturer}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, manufacturer: event.target.value },
                }))
              }
              placeholder="Manufacturer"
              aria-label="Motor manufacturer"
            />
          </div>
          <div>
            <TinyLabel>Serial Number</TinyLabel>
            <TinyInput
              value={data.motor.serialNumber}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, serialNumber: event.target.value },
                }))
              }
              placeholder="Serial #"
              aria-label="Motor serial number"
            />
          </div>
          <div>
            <TinyLabel>Schematic Number</TinyLabel>
            <TinyInput
              value={data.motor.schematicNumber}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, schematicNumber: event.target.value },
                }))
              }
              placeholder="Schematic #"
              aria-label="Schematic number"
            />
          </div>
          <div>
            <TinyLabel>HP</TinyLabel>
            <TinyInput
              value={data.motor.hp}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, hp: event.target.value },
                }))
              }
              placeholder="Horsepower"
              aria-label="Motor HP"
              inputMode="decimal"
            />
          </div>
          <div>
            <TinyLabel>VAC</TinyLabel>
            <TinyInput
              value={data.motor.vac}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, vac: event.target.value },
                }))
              }
              placeholder="VAC"
              aria-label="Motor voltage"
              inputMode="decimal"
            />
          </div>
          <div>
            <TinyLabel>RPM</TinyLabel>
            <TinyInput
              value={data.motor.rpm}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, rpm: event.target.value },
                }))
              }
              placeholder="RPM"
              aria-label="Motor RPM"
              inputMode="decimal"
            />
          </div>
          <div>
            <TinyLabel>FLA</TinyLabel>
            <TinyInput
              value={data.motor.fla}
              onChange={(event) =>
                updateData((prev) => ({
                  ...prev,
                  motor: { ...prev.motor, fla: event.target.value },
                }))
              }
              placeholder="Full load amps"
              aria-label="Motor FLA"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div>
        <TinyLabel>Sign-off</TinyLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <TinyLabel>Signature</TinyLabel>
            <TinyInput
              value={data.testedBySignature}
              onChange={(event) => updateData({ testedBySignature: event.target.value })}
              placeholder="Signature"
              aria-label="Signature"
            />
          </div>
          <div>
            <TinyLabel>Name (Print)</TinyLabel>
            <TinyInput
              value={data.testedByName}
              onChange={(event) => updateData({ testedByName: event.target.value })}
              placeholder="Name"
              aria-label="Tested by name"
            />
          </div>
          <div>
            <TinyLabel>Title</TinyLabel>
            <TinyInput
              value={data.testedByTitle}
              onChange={(event) => updateData({ testedByTitle: event.target.value })}
              placeholder="Title"
              aria-label="Tested by title"
            />
          </div>
          <div>
            <TinyLabel>Service Company</TinyLabel>
            <TinyInput
              value={data.serviceCompany}
              onChange={(event) => updateData({ serviceCompany: event.target.value })}
              placeholder="Company"
              aria-label="Service company"
            />
          </div>
          <div>
            <TinyLabel>Test Date</TinyLabel>
            <TinyInput
              type="date"
              value={data.testDate}
              onChange={(event) => updateData({ testDate: event.target.value })}
              aria-label="Test date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MotorTestForm;
