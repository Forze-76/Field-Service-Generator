import { describe, expect, it } from "vitest";
import { parseTripInvite } from "./inviteParser";

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
    expect(result.endAt).toBe("2026-09-26T00:00");
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
