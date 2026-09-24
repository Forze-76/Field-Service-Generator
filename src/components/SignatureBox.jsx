import React from 'react';

export default function SignatureBox({ label, value, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={value ? `Edit ${label.toLowerCase()}` : undefined}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-left ${compact ? 'min-h-[44px]' : 'min-h-[96px]'}`}
    >
      {value ? (
        <>
          <img
            src={value}
            alt={label}
            className={`block w-full object-contain ${compact ? 'h-10' : 'h-20'}`}
          />
          <span className="block text-xs text-gray-500 mt-1">Tap to edit signature</span>
        </>
      ) : (
        <span>{compact ? 'Sign' : 'Sign with finger'}</span>
      )}
    </button>
  );
}
