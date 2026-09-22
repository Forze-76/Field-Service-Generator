/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { loadGoogleIdentity } from "../utils/googleAuth";
import { importGmailInvite, listGmailInvites, requestGmailToken } from "../utils/gmailInvites";

export default function GmailInvitePicker({ onImport }) {
  const [invites, setInvites] = useState([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("");
  const token = useRef("");
  const controller = useRef(null);
  useEffect(() => {
    loadGoogleIdentity().catch(() => {});
    return () => { controller.current?.abort(); token.current = ""; };
  }, []);
  const run = async (operation) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setError("");
    try { await operation(request.signal); }
    catch (err) { if (!request.signal.aborted) setError(err.message || "Unable to read invitations."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  const load = (reconnect) => run(async (signal) => {
    const access = reconnect ? await requestGmailToken() : token.current;
    if (signal.aborted) return;
    token.current = access;
    const page = await listGmailInvites(access, reconnect ? "" : next, signal);
    if (signal.aborted) return;
    setInvites((old) => reconnect ? page.invites : [...old, ...page.invites.filter((item) => !old.some((prior) => prior.id === item.id))]);
    setNext(page.nextPageToken); setConnected(true);
  });
  return <div className="mt-3 border-t border-blue-200 pt-3">
    <button type="button" disabled={busy} onClick={() => load(true)} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{connected ? "Reconnect to Gmail" : "Choose from Gmail"}</button>
    <p className="mt-1 text-xs text-blue-900">Read-only access to calendar attachments. Your emails stay unchanged.</p>
    {busy && <p role="status" className="mt-2 text-sm">Loading invitations…</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {connected && !busy && !invites.length && <p className="mt-2 text-sm">No calendar attachments on this page. Try older invitations or import an ICS file.</p>}
    <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
      {invites.map((invite) => <li key={invite.id}><button type="button" disabled={busy} className="w-full rounded-lg border bg-white p-3 text-left disabled:opacity-50" onClick={() => run(async (signal) => {
        const draft = await importGmailInvite(invite, token.current, signal);
        if (!signal.aborted) onImport(draft);
      })}><span className="block text-sm font-semibold">{invite.subject}</span><span className="block break-words text-xs text-gray-600">{invite.from} · {invite.date}</span></button></li>)}
    </ul>
    {next && <button type="button" disabled={busy} className="mt-2 rounded border bg-white px-3 py-2 text-sm" onClick={() => load(false)}>Load older invitations</button>}
  </div>;
}
