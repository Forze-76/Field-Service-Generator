import { requestGoogleToken } from "./googleAuth";
import { parseTripInvite } from "./inviteParser";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const requestGmailToken = () => requestGoogleToken(GMAIL_SCOPE);
const base = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
async function gmailGet(path, token, signal) {
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal, credentials: "omit" });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Gmail access expired. Connect to Gmail again.");
    if (response.status === 403) throw new Error("Gmail access is unavailable. Check read-only permission and that the Gmail API is enabled for this app.");
    throw new Error(`Unable to read Gmail (${response.status}). Try again.`);
  }
  return response.json();
}
export function calendarParts(payload) {
  return [ ...(payload?.mimeType?.toLowerCase() === "text/calendar" || /\.(ics|ical)$/i.test(payload?.filename || "") ? [payload] : []), ...(payload?.parts || []).flatMap(calendarParts) ];
}
export const decodeCalendar = (data) => new TextDecoder().decode(Uint8Array.from(atob(data.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)));
export async function listGmailInvites(token, pageToken = "", signal) {
  const params = new URLSearchParams({ q: "{filename:ics filename:ical}", maxResults: "20" });
  if (pageToken) params.set("pageToken", pageToken);
  const page = await gmailGet(`?${params}`, token, signal);
  const messages = await Promise.all((page.messages || []).map(({id}) => gmailGet(`/${encodeURIComponent(id)}?format=full`, token, signal)));
  const invites = messages.flatMap((message) => {
    const header = (name) => message.payload?.headers?.find((item) => item.name.toLowerCase() === name)?.value || "";
    return calendarParts(message.payload).map((part, index) => ({ id: `${message.id}:${part.partId || index}`, messageId: message.id, subject: header("subject") || part.filename || "Calendar invitation", from: header("from"), date: header("date"), part }));
  });
  return { invites, nextPageToken: page.nextPageToken || "" };
}
export async function importGmailInvite(invite, token, signal) {
  let data = invite.part.body?.data;
  if (!data && invite.part.body?.attachmentId) {
    const attachment = await gmailGet(`/${encodeURIComponent(invite.messageId)}/attachments/${encodeURIComponent(invite.part.body.attachmentId)}`, token, signal);
    data = attachment.data;
  }
  if (!data) throw new Error("This invitation has no calendar data. Try downloading its ICS file and importing it manually.");
  const draft = parseTripInvite(decodeCalendar(data));
  return { ...draft, inviteMeta: { ...draft.inviteMeta, gmailMessageId: invite.messageId } };
}
