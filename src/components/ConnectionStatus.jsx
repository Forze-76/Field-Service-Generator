import React, { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

function getOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export default function ConnectionStatus() {
  const [online, setOnline] = useState(getOnlineState);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const Icon = online ? Wifi : WifiOff;
  const label = online ? "Online" : "Offline";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold ${
        online
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
      role="status"
      aria-live="polite"
      title={online ? "Connected to the internet" : "Working without an internet connection"}
    >
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
