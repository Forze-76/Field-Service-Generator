import React, { useEffect, useRef, useState } from 'react';

export default function SignaturePad({ label, value, onSave, onClose }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  useEffect(() => {
    const context = canvas.current.getContext('2d');
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#172b4d';
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.current.width, canvas.current.height);
      image.src = value;
    }
  }, [value]);
  const position = event => {
    const bounds = canvas.current.getBoundingClientRect();
    return [(event.clientX - bounds.left) * canvas.current.width / bounds.width,
      (event.clientY - bounds.top) * canvas.current.height / bounds.height];
  };
  const start = event => {
    event.preventDefault();
    canvas.current.setPointerCapture(event.pointerId);
    drawing.current = true;
    const [x, y] = position(event);
    const context = canvas.current.getContext('2d');
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + .1, y + .1); context.stroke();
    setHasStroke(true);
  };
  const move = event => {
    if (!drawing.current) return;
    event.preventDefault();
    const [x, y] = position(event);
    const context = canvas.current.getContext('2d');
    context.lineTo(x, y); context.stroke();
  };
  return <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={label}>
    <div className="bg-white rounded-2xl p-4 w-full max-w-xl space-y-3">
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm text-gray-600">Sign with your finger or stylus in the box.</p>
      <canvas ref={canvas} width={900} height={270} onPointerDown={start} onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }}
        className="w-full border rounded-lg bg-white" style={{ touchAction: 'none', aspectRatio: '10 / 3' }} aria-label="Signature drawing area" />
      <div className="flex gap-2 justify-end flex-wrap">
        <button type="button" className="px-3 py-2 border rounded-lg" onClick={() => { canvas.current.getContext('2d').clearRect(0, 0, 900, 270); setHasStroke(false); }}>Clear</button>
        {value && <button type="button" className="px-3 py-2 border rounded-lg" onClick={() => onSave('')}>Remove signature</button>}
        <button type="button" className="px-3 py-2 border rounded-lg" onClick={onClose}>Cancel</button>
        <button type="button" className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!hasStroke} onClick={() => onSave(canvas.current.toDataURL('image/png'))}>Save signature</button>
      </div>
    </div>
  </div>;
}
