import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, RefreshCcw, Shield, Users } from "lucide-react";

function MenuItem({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
        disabled ? "cursor-not-allowed text-slate-400" : "hover:bg-slate-100 text-slate-700"
      }`}
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

export default function UserMenu({ user, onLock, onSignOut, onSwitchUser, onSync }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const online = typeof navigator !== "undefined" ? navigator.onLine : false;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 bg-white shadow-sm hover:bg-slate-50"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="text-left">
          <div className="font-semibold leading-tight">{user.name || "Field Tech"}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-3 shadow-xl z-20">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Account</div>
          <MenuItem
            icon={RefreshCcw}
            label="Sync (coming soon)"
            disabled={!online}
            onClick={() => {
              if (!online) return;
              onSync?.();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={Users}
            label="Switch user"
            onClick={() => {
              onSwitchUser?.();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={Shield}
            label="Lock"
            onClick={() => {
              onLock?.();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={LogOut}
            label="Sign out"
            onClick={() => {
              onSignOut?.();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
