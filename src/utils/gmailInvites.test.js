import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarParts, decodeCalendar, importGmailInvite, listGmailInvites } from "./gmailInvites";
const encoded = (s) => Buffer.from(s).toString("base64url");
const calendar = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:J21460 Café Service\nUID:one\nDTSTART;VALUE=DATE:20260921\nDTEND;VALUE=DATE:20260922\nEND:VEVENT\nEND:VCALENDAR";
const response = (value) => ({ ok: true, json: async () => value });
afterEach(() => vi.unstubAllGlobals());
describe("Gmail read-only invitation transport", () => {
  it("lists nested ICS attachments with names and pagination", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ messages: [{ id: "one" }], nextPageToken: "next" })).mockResolvedValueOnce(response({ id: "one", payload: { headers: [{name:"Subject",value:"Plant visit"}], parts:[{ mimeType:"multipart/mixed", parts:[{ filename:"invite.ics", body:{attachmentId:"file"} }] }] } }));
    vi.stubGlobal("fetch", fetch);
    const result = await listGmailInvites("secret", "older");
    expect(result.nextPageToken).toBe("next");
    expect(result.invites[0]).toMatchObject({ subject:"Plant visit", messageId:"one" });
    expect(fetch.mock.calls[0][0]).toContain("pageToken=older");
    expect(fetch.mock.calls.every(([,options]) => !options.method && options.credentials === "omit")).toBe(true);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
  });
  it("decodes UTF-8 inline calendar data without fetching unrelated attachments", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(decodeCalendar(encoded("Café"))).toBe("Café");
    const draft = await importGmailInvite({ messageId:"one",part:{body:{data:encoded(calendar)}} },"secret");
    expect(draft.inviteMeta.summary).toBe("J21460 Café Service");
    expect(fetch).not.toHaveBeenCalled();
    expect(calendarParts({parts:[{mimeType:"text/calendar"},{filename:"photo.jpg"}]})).toHaveLength(1);
  });
  it("fetches and parses only the selected external attachment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({data:encoded(calendar)})));
    const draft = await importGmailInvite({messageId:"one",part:{body:{attachmentId:"file"}}}, "secret");
    expect(fetch.mock.calls[0][0]).toMatch(/\/one\/attachments\/file$/);
    expect(draft.jobNo).toBe("J#21460");
    expect(draft.endAt).toBe("2026-09-21T23:59");
  });
  it.each([
    [403, { details: [{ reason: "SERVICE_DISABLED" }] }, /Gmail API is disabled/],
    [403, { errors: [{ reason: "accessNotConfigured" }] }, /Gmail API is disabled/],
    [403, { details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] }, /permission was not granted/],
    [403, { errors: [{ reason: "insufficientPermissions" }] }, /permission was not granted/],
    [403, { errors: [{ reason: "domainPolicy" }] }, /administrator has blocked/],
    [403, { errors: [{ reason: "dailyLimitExceeded" }] }, /request limit/],
    [429, {}, /request limit/],
    [403, { details: "unexpected", errors: null }, /Google denied Gmail access/],
  ])("explains Gmail failure %s with reason %j", async (status, error, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error }) }));
    await expect(listGmailInvites("secret")).rejects.toThrow(message);
  });
  it("handles a non-JSON error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => { throw new SyntaxError(); } }));
    await expect(listGmailInvites("secret")).rejects.toThrow(/Google denied Gmail access/);
  });
  it.each([401,403,500])("reports actionable HTTP %s failures", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:false,status}));
    await expect(listGmailInvites("secret")).rejects.toThrow(status===401 ? /expired/ : status===403 ? /permission/ : /500/);
  });
});
