import { requestGoogleToken } from "./googleAuth";
import { parseTripInvite } from "./inviteParser";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const requestGmailToken = () => requestGoogleToken(GMAIL_SCOPE);
const base = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
async function gmailGet(path, token, signal) {
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal, credentials: "omit" });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Gmail access expired. Connect to Gmail again.");
    let error;
    try { error = (await response.json())?.error; } catch { /* Some failures have no JSON body. */ }
    const reasons = [...(Array.isArray(error?.errors) ? error.errors : []), ...(Array.isArray(error?.details) ? error.details : [])].map((item) => item?.reason);
    if (reasons.some((reason) => ["SERVICE_DISABLED", "accessNotConfigured"].includes(reason))) {
      throw new Error("Gmail API is disabled for this app’s Google Cloud project. Enable Gmail API in the same project as the app’s OAuth client, then try Choose from Gmail again.");
    }
    if (reasons.some((reason) => ["ACCESS_TOKEN_SCOPE_INSUFFICIENT", "insufficientPermissions"].includes(reason))) {
      throw new Error("Gmail read-only permission was not granted. Choose from Gmail again and allow read-only Gmail access.");
    }
    if (reasons.includes("domainPolicy")) {
      throw new Error("Your Google Workspace administrator has blocked this app’s Gmail access. Ask your administrator to allow it, or import the calendar ICS file instead.");
    }
    if (response.status === 429 || reasons.some((reason) => ["rateLimitExceeded", "userRateLimitExceeded", "dailyLimitExceeded", "quotaExceeded", "RATE_LIMIT_EXCEEDED", "QUOTA_EXCEEDED"].includes(reason))) {
      throw new Error("Gmail’s request limit has been reached. Try again later, or import the calendar ICS file instead.");
    }
    if (response.status === 403) throw new Error("Google denied Gmail access (403). Check Gmail API settings and read-only permission in the app’s Google Cloud project, or import the calendar ICS file instead.");
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
