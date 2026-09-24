import React, { useRef, useState } from 'react';
import useModalA11y from '../hooks/useModalA11y';
import { serialFromJob } from '../utils/jobNumber';

export default function TripLifts({ lifts, selected, types, onSelect, onAdd, onOverride, onHours, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [numbers, setNumbers] = useState('');
  const [model, setModel] = useState(selected.model || '');
  const [tripType, setTripType] = useState(types[0] || '');
  const [error, setError] = useState('');
  const ref = useRef(null);
  useModalA11y(adding, ref, { onClose: () => setAdding(false) });
  return <section className="surface space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3>Lifts on this trip <span className="text-slate-500">({lifts.length})</span></h3><p className="text-xs text-slate-500">Shared site and dates. Separate work, photos, and signatures for each lift.</p></div><button onClick={() => { setModel(selected.model || ""); setAdding(true); }}>+ Add lifts</button></div>
    <div className="flex flex-wrap gap-2">{lifts.map(lift => <button key={lift.id} aria-pressed={lift.id === selected.id} className={lift.id === selected.id ? 'primary' : ''} onClick={() => onSelect(lift.id)}><span className="font-semibold">{lift.jobNo || 'New lift'}</span><span className="block text-xs">{lift.tripType} · {lift.documents.filter(d => d.done).length}/{lift.documents.length} documents complete</span></button>)}</div>
    <details><summary className="text-sm cursor-pointer">Shared details & lift overrides</summary><p className="text-xs text-slate-500 mt-2">Trip setup changes update all lifts using shared details. Enable an override before editing only this lift.</p><div className="flex flex-wrap gap-4 mt-2">{[[['sharedSite', 'inviteMeta'], 'Separate site / contacts'], [['startAt', 'endAt'], 'Separate dates'], [['technicianName'], 'Separate technician']].map(([keys, label]) => <label key={label} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={!!selected.liftOverrides?.[keys[0]]} onChange={e => onOverride(keys, e.target.checked)} />{label}</label>)}</div><button className="mt-3 text-red-700" onClick={onRemove}>Remove this lift</button></details>
    {lifts.length > 1 && <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!selected.useTripHours} onChange={e => onHours(e.target.checked)} />Use shared trip hours on this lift<span className="text-xs text-slate-500">Hours sync; signatures remain separate. Changed hours require new daily signatures.</span></label>}
    {adding && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add lifts to trip"><form ref={ref} tabIndex={-1} className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4" onSubmit={e => {
      e.preventDefault();
      const jobs = numbers.split(/[\s,;]+/).filter(Boolean);
      const serials = jobs.map(serialFromJob);
      if (!jobs.length || serials.some(s => !s) || new Set(serials).size !== jobs.length || serials.some(s => lifts.some(l => serialFromJob(l.jobNo) === s))) { setError('Enter unique job/serial numbers, separated by spaces or commas. Do not repeat a lift already on this trip.'); return; }
      onAdd(jobs.map(jobNo => ({ jobNo, model, tripType })));
      setNumbers(''); setError(''); setAdding(false);
    }}><h3>Add lifts to this trip</h3><p className="text-sm text-slate-600">Add units with the same work type and model together. Repeat for another group.</p><label className="block text-sm">Job / serial numbers<textarea required className="block border rounded-lg w-full p-2 mt-1" value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="21461, 21462, 21463" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Work type<select required className="block border rounded-lg w-full p-2" value={tripType} onChange={e => setTripType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select></label><label className="text-sm">Model<input required className="block border rounded-lg w-full p-2" value={model} onChange={e => setModel(e.target.value)} /></label></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" type="submit">Add lifts</button></div></form></div>}
  </section>;
}
