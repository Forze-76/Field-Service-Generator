import React, { useEffect, useRef, useState } from 'react';
import { listStoredTemplates, normalizeTripType } from '../utils/templateStore.js';
import { fillPdfTemplate } from '../utils/nativeTemplates.js';
import { inkForTarget, patchInk, readInkTargets } from '../utils/pdfInk.js';
import SignaturePad from './SignaturePad.jsx';
import pdfUrl from 'pdfjs-dist/build/pdf.mjs?url';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export default function DocumentPreview({ report, doc, user, templateId, onUpdateDoc, onClose, onOpenTemplates }) {
  const host = useRef(null);
  const [state, setState] = useState({ loading: true });
  const [signing, setSigning] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let task;
    (async () => {
      setState({ loading: true });
      const stored = await listStoredTemplates();
      const matching = stored.filter(item => item.templateId === templateId && item.blob && (!item.tripType || normalizeTripType(item.tripType) === normalizeTripType(report.tripType)));
      const template = matching.find(item => normalizeTripType(item.tripType) === normalizeTripType(report.tripType)) || matching[0];
      if (!template) { setState({ missing: true }); return; }
      const blob = await fillPdfTemplate(template.blob, templateId, report, user);
      const targets = await readInkTargets(blob, templateId);
      const pdfjs = await import(/* @vite-ignore */ pdfUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      const pdf = await task.promise;
      if (cancelled) return;
      host.current.replaceChildren();
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, Math.max(.5, (host.current.clientWidth - 4) / base.width));
        const viewport = page.getViewport({ scale });
        const wrapper = document.createElement('div');
        wrapper.className = 'relative mx-auto mb-4 shadow-md bg-white';
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width * (window.devicePixelRatio || 1));
        canvas.height = Math.ceil(viewport.height * (window.devicePixelRatio || 1));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        wrapper.append(canvas); host.current.append(wrapper);
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport, transform: [window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0] }).promise;
        if (pageNo === 1) for (const target of targets.filter(item => !item.key.startsWith('timeLog:') || doc.data?.timeLogs?.[Number(item.key.split(':')[1])])) {
          const { x, y, width, height } = target.rect;
          const [left, top, right, bottom] = viewport.convertToViewportRectangle([x, y, x + width, y + height]);
          const button = document.createElement('button');
          button.type = 'button';
          button.setAttribute('aria-label', `Sign ${target.label}`);
          button.title = `Tap to sign: ${target.label}`;
          button.className = 'absolute border-2 border-blue-500/75 bg-blue-100/20 hover:bg-blue-100/50 focus:outline-2 focus:outline-blue-700';
          Object.assign(button.style, { left: `${Math.min(left, right)}px`, top: `${Math.min(top, bottom)}px`, width: `${Math.abs(right-left)}px`, height: `${Math.max(20, Math.abs(bottom-top))}px` });
          button.onclick = () => setSigning(target);
          wrapper.append(button);
        }
      }
      setState({ targets });
    })().catch(error => { if (!cancelled) setState({ error: error.message || 'Could not preview this document.' }); });
    return () => { cancelled = true; task?.destroy(); };
  }, [report, doc, user, templateId]);
  const save = ink => {
    onUpdateDoc({ ...doc, data: patchInk(doc.data || {}, signing.key, ink) });
    setSigning(null);
  };
  return <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-2 sm:p-5" role="dialog" aria-modal="true" aria-label={`${doc.name} preview`}>
    <div className="bg-gray-100 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden">
      <div className="p-3 bg-white flex items-center justify-between gap-3 border-b"><div><h2 className="font-semibold">{doc.name} · document preview</h2><p className="text-xs text-gray-600">Check the filled form, then tap a signature box to sign.</p></div><button type="button" className="border rounded-lg px-3 py-2" onClick={onClose}>Close</button></div>
      {state.loading && <p className="p-4">Filling the original document…</p>}
      {state.missing && <div className="p-5 space-y-3"><p>Sync the approved PDF template for this trip type in Review & export to preview it.</p><button className="border rounded-lg px-3 py-2" onClick={onOpenTemplates}>Review & export</button></div>}
      {state.error && <p className="p-5 text-red-700" role="alert">{state.error}</p>}
      {state.targets && <div className="p-2 bg-white flex flex-wrap gap-2 border-b">{state.targets.filter(target => !target.key.startsWith('timeLog:') || doc.data?.timeLogs?.[Number(target.key.split(':')[1])]).map(target => <button type="button" key={target.key} className="border rounded-lg px-3 py-2 text-sm" onClick={() => setSigning(target)}>{inkForTarget(doc.data, target.key) ? 'Edit' : 'Sign'} {target.label}</button>)}</div>}
      <div className="overflow-auto flex-1 p-2" ref={host} />
    </div>
    {signing && <SignaturePad label={signing.label} value={inkForTarget(doc.data, signing.key)} onSave={save} onClose={() => setSigning(null)} />}
  </div>;
}
