import { describe, expect, it } from "vitest";
import { parseTripInvite, findImportedInvite } from "./inviteParser";

const description = [
  "SITE ADDRESS:", "Example Plant", "123 Test Avenue", "Sample City, WI 53201", "",
  "PROJECT CONTACT:", "Alice Example", "Example Integrator", "414-555-0101 Direct", "alice@example.com", "",
  "INSTALL CONTACT:", "Bob Example", "Example Installer", "414-555-0102", "bob@example.com",
].join("\\n").replaceAll(",", "\\,");

const invite = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:21460 Example Plant (START-UP) 3-Days - Technician
DTSTART;VALUE=DATE:20260921
DTEND;VALUE=DATE:20260926
LOCATION:Remote Support
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

describe("trip invitation parser", () => {
  it("extracts report and shared header fields from an Outlook ICS invite", () => {
    const result = parseTripInvite(invite);
    expect(result.jobNo).toBe("J#21460");
    expect(result.tripType).toBe("Start Up");
    expect(result.startAt).toBe("2026-09-21T00:00");
    expect(result.endAt).toBe("2026-09-25T23:59");
    expect(result.sharedSite).toMatchObject({
      jobName: "Example Plant",
      siteStreetAddress: "123 Test Avenue",
      siteMailingAddress: "123 Test Avenue",
      siteCity: "Sample City",
      siteState: "WI",
      siteZip: "53201",
    });
    expect(result.inviteMeta.projectContact.name).toBe("Alice Example");
    expect(result.inviteMeta.installContact.name).toBe("Bob Example");
  });
});

const timed = (start, end, extra = "", zone = "") => `BEGIN:VCALENDAR\n${zone}BEGIN:VEVENT\nUID:trip@example.com\nSUMMARY:J21460 Example Service\nDTSTART${start}\nDTEND${end}\n${extra}END:VEVENT\nEND:VCALENDAR`;
const local = (iso) => {
  const d = new Date(iso), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

describe("invitation dates and identity", () => {
  it("converts UTC instants into local editable dates", () => {
    const result = parseTripInvite(timed(":20260921T140000Z", ":20260921T160000Z"));
    expect(result.startAt).toBe(local("2026-09-21T14:00:00Z"));
    expect(result.endAt).toBe(local("2026-09-21T16:00:00Z"));
    expect(result.model).toBe("");
    expect(result.sharedSite.serialNumberText).toBe("");
    expect(result.inviteMeta.uid).toBe("trip@example.com");
  });
  it("resolves IANA time zones and summer time", () => {
    const result = parseTripInvite(timed(";TZID=America/Chicago:20260921T090000", ";TZID=America/Chicago:20260921T100000"));
    expect(result.startAt).toBe(local("2026-09-21T14:00:00Z"));
  });
  it("reads Outlook VTIMEZONE without confusing its DTSTART with the event", () => {
    const zone = `BEGIN:VTIMEZONE\nTZID:Central Standard Time\nBEGIN:STANDARD\nDTSTART:16011104T020000\nRRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0600\nEND:STANDARD\nBEGIN:DAYLIGHT\nDTSTART:16010311T020000\nRRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3\nTZOFFSETFROM:-0600\nTZOFFSETTO:-0500\nEND:DAYLIGHT\nEND:VTIMEZONE\n`;
    expect(parseTripInvite(timed(";TZID=Central Standard Time:20260921T090000", ";TZID=Central Standard Time:20260921T100000", "", zone)).startAt).toBe(local("2026-09-21T14:00:00Z"));
    expect(parseTripInvite(timed(";TZID=Central Standard Time:20261221T090000", ";TZID=Central Standard Time:20261221T100000", "", zone)).startAt).toBe(local("2026-12-21T15:00:00Z"));
  });
  it("rejects unknown time zones, cancelled events and reversed dates", () => {
    expect(() => parseTripInvite(timed(";TZID=Unknown:20260921T090000", ":20260921T100000"))).toThrow(/time zone/);
    expect(() => parseTripInvite(timed(":20260921T090000", ":20260921T100000", "STATUS:CANCELLED\n"))).toThrow(/cancelled/);
    expect(() => parseTripInvite(timed(":20260922T090000", ":20260921T100000"))).toThrow(/ends before/);
  });
  it("defaults an all-day event without DTEND to one day", () => {
    const result = parseTripInvite(invite.replace("DTEND;VALUE=DATE:20260926\n", ""));
    expect(result.endAt).toBe("2026-09-21T23:59");
  });
  it("keeps recurring instances distinct and detects a forwarded duplicate", () => {
    const draft = parseTripInvite(timed(":20260921T140000Z", ":20260921T160000Z"));
    const report = { ...draft, id: "existing", startAt: new Date(draft.startAt).toISOString() };
    expect(findImportedInvite([report], { ...draft, startAt: "2026-09-23T10:00" })).toBe(report);
    expect(findImportedInvite([report], { ...draft, inviteMeta: { ...draft.inviteMeta, recurrenceId: "other" } })).toBeUndefined();
    const old = { ...report, inviteMeta: { summary: draft.inviteMeta.summary } };
    expect(findImportedInvite([old], draft)).toBe(old);
  });
});

it.each(["20260230", "20261301", "20260001"])("rejects invalid date %s instead of normalizing it", (date) => {
  expect(() => parseTripInvite(invite.replace("20260921", date))).toThrow(/Invalid invitation date/);
});
