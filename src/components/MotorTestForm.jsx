import React, { useCallback, useMemo } from "react";
import { ensureMotorTestData, makeEmptyMotorTestData, MOTOR_TEST_DOC_NAME } from "../utils/fsr";

function TinyLabel({ children }) {
  return <div className="text-[11px] text-gray-600 mb-1">{children}</div>;
}

function TinyInput(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`min-w-0 w-full rounded-lg border px-2 py-1 text-[13px] ${className}`} />;
}

//

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
  doc = { data: makeEmptyMotorTestData(), name: MOTOR_TEST_DOC_NAME },
  onUpdateDoc = () => {},
}) {
  const data = useMemo(() => ensureMotorTestData(doc?.data), [doc?.data]);

  const updateData = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(data) : { ...data, ...updater };
      onUpdateDoc({ ...doc, data: ensureMotorTestData(next) });
    },
    [doc, data, onUpdateDoc],
  );

  // Meta fields (job/model/serial/address) are edited only in Service Summary.

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
    <fieldset key={segmentKey} className="min-w-0 rounded-xl border p-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="grid grid-cols-3 gap-2">
        {[...VOLT_LINE_KEYS, ...VOLT_GROUND_KEYS].map(({ key, label }) => (
          <label key={key} className="min-w-0 text-xs text-gray-600">
            {label}
            <TinyInput value={data[segmentKey][key]}
              onChange={event => setVoltage(segmentKey, key, event.target.value)}
              placeholder="VAC" className="mt-1 text-center" inputMode="decimal"
              aria-label={`${title} ${label}`} />
          </label>
        ))}
      </div>
    </fieldset>
  );

  const renderCurrentTable = (loadKind, title) => (
    <fieldset key={loadKind} className="min-w-0 rounded-xl border p-3">
      <legend className="px-1 text-sm font-semibold">{title} (Amps)</legend>
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr>
            <th className="w-12"><span className="sr-only">Direction</span></th>
            {CURRENT_KEYS.map(key => <th key={key} scope="col" className="pb-2 font-medium text-gray-600">{key.toUpperCase()}</th>)}
          </tr>
        </thead>
        <tbody>
          {["up", "down"].map(direction => (
            <tr key={direction}>
              <th scope="row" className="text-left font-medium">{direction === "up" ? "Up" : "Down"}</th>
              {CURRENT_KEYS.map(key => (
                <td key={key} className="p-1">
                  <TinyInput value={data.currents[direction][loadKind][key]}
                    onChange={event => setCurrent(direction, loadKind, key, event.target.value)}
                    placeholder="A" className="text-center" inputMode="decimal"
                    aria-label={`${direction === "up" ? "Up" : "Down"} ${title} ${key.toUpperCase()}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  );

  return (
    <div className="space-y-6">
      {/* Meta fields (Job/Serial/Model/Address) removed from this editor */}

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
        <TinyLabel>Measured Voltage</TinyLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderVoltageTable("voltIncoming", "Incoming")}
          {renderVoltageTable("voltAfd", "AFD Output")}
        </div>
      </div>

      <div>
        <TinyLabel>Measured Current (AFD Output)</TinyLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {renderCurrentTable("unloaded", "Unloaded")}
          {renderCurrentTable("full", "Full Load")}
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
              aria-label="Test date"
              value={data.testDate}
              onChange={(event) => updateData({ testDate: event.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MotorTestForm;
