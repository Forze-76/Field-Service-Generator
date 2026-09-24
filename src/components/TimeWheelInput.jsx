import React, { useEffect, useRef, useState } from 'react';

const pad = value => String(value).padStart(2, '0');
const minutes = Array.from({ length: 60 }, (_, i) => pad(i));
const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
const durationHours = Array.from({ length: 100 }, (_, i) => pad(i));

function Wheel({ label, options, value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.scrollTop = options.indexOf(value) * 44;
    // Position the wheel when the picker opens; scrolling owns its position afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const select = index => {
    const next = Math.max(0, Math.min(options.length - 1, index));
    ref.current.scrollTop = next * 44;
    onChange(options[next]);
  };
  return <div className="flex-1 min-w-0">
    <div className="text-center text-xs text-gray-500 mb-2">{label}</div>
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-[88px] h-11 rounded-lg bg-teal-50 border-y border-teal-200" />
      <div ref={ref} role="listbox" aria-label={label} tabIndex={0}
        aria-activedescendant={`${label}-${value}`}
        className="relative h-[220px] overflow-y-auto snap-y snap-mandatory overscroll-contain"
        style={{ scrollbarWidth: 'none', paddingBlock: 88 }}
        onKeyDown={event => {
          const index = options.indexOf(value);
          if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            select(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1));
          }
        }}
        onScroll={() => {
          const index = Math.max(0, Math.min(options.length - 1, Math.round(ref.current.scrollTop / 44)));
          onChange(options[index]);
        }}>
        {options.map((option, index) => <div key={option} id={`${label}-${option}`} role="option" aria-selected={option === value}
          onClick={() => select(index)}
          className={`h-11 flex items-center justify-center snap-center cursor-pointer text-xl ${option === value ? 'font-semibold text-teal-800' : 'text-gray-500'}`}>{option}</div>)}
      </div>
    </div>
  </div>;
}

function Picker({ value, duration, label, onChange, onClose }) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  const initialHour = match ? Math.min(duration ? 99 : 23, Number(match[1])) : 0;
  const [hour, setHour] = useState(duration ? pad(initialHour) : String(initialHour % 12 || 12));
  const [minute, setMinute] = useState(match && Number(match[2]) < 60 ? match[2] : '00');
  const [period, setPeriod] = useState(initialHour >= 12 ? 'PM' : 'AM');
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-label={label} className="rounded-2xl p-5 w-[340px] max-w-[95vw] backdrop:bg-black/40">
    <h3 className="font-semibold mb-3">{label}</h3>
    <div className="flex gap-3">
      <Wheel label="Hours" options={duration ? durationHours : hours} value={hour} onChange={setHour} />
      <Wheel label="Minutes" options={minutes} value={minute} onChange={setMinute} />
      {!duration && <Wheel label="AM/PM" options={['AM', 'PM']} value={period} onChange={setPeriod} />}
    </div>
    <div className="flex justify-between gap-2 mt-4">
      <button type="button" onClick={() => { onChange(''); onClose(); }}>Clear</button>
      <button type="button" onClick={onClose}>Cancel</button>
      <button type="button" className="bg-teal-700 text-white" onClick={() => {
        onChange(`${pad(duration ? Number(hour) : Number(hour) % 12 + (period === 'PM' ? 12 : 0))}:${minute}`);
        onClose();
      }}>Set time</button>
    </div>
  </dialog>;
}

export default function TimeWheelInput({ value, onChange, label, duration = false }) {
  const [open, setOpen] = useState(false);
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  const display = match && !duration ? `${Number(match[1]) % 12 || 12}:${match[2]} ${Number(match[1]) >= 12 ? 'PM' : 'AM'}` : value;
  return <>
    <button type="button" aria-label={`${label}: ${display || 'Set time'}`} className="w-full rounded-lg border text-left whitespace-nowrap" onClick={() => setOpen(true)}>{display || (duration ? 'Hours : min' : 'Set time')}</button>
    {open && <Picker value={value} duration={duration} label={label} onChange={onChange} onClose={() => setOpen(false)} />}
  </>;
}
