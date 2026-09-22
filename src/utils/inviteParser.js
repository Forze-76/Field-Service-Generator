import ICAL from "ical.js";

const section = (description, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n\\s*\\n[A-Z][A-Z /&-]+:|$)`, "i").exec(description);
  return (match?.[1] || "").trim();
};

const compactLines = (value) => String(value || "")
  .split(/\r?\n/)
  .map((line) => line.replace(/<mailto:[^>]+>/gi, "").trim())
  .filter(Boolean);

const parseContact = (description, label) => {
  const lines = compactLines(section(description, label));
  const email = lines.find((line) => /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(line)) || "";
  const phones = lines.filter((line) => /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(line));
  const plain = lines.filter((line) => line !== email && !phones.includes(line));
  return {
    name: plain[0] || "",
    company: plain[1] || "",
    phone: phones[0]?.replace(/\s+(Direct|Cell)$/i, "") || "",
    alternatePhone: phones[1]?.replace(/\s+(Direct|Cell)$/i, "") || "",
    email: email.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/)?.[0] || "",
  };
};

const parseSiteAddress = (description) => {
  const lines = compactLines(section(description, "SITE ADDRESS"));
  const cityLine = lines.find((line) => /^.+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/.test(line));
  const match = cityLine?.match(/^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  const cityIndex = cityLine ? lines.indexOf(cityLine) : -1;
  return {
    jobName: lines[0] || "",
    siteStreetAddress: cityIndex > 1 ? lines.slice(1, cityIndex).join(", ") : lines[1] || "",
    siteCity: match?.[1] || "",
    siteState: match?.[2] || "",
    siteZip: match?.[3] || "",
  };
};

const tripTypeFromSummary = (summary) => {
  const normalized = summary.toLowerCase();
  if (/start[ -]?up/.test(normalized)) return "Start Up";
  if (normalized.includes("warranty")) return "Warranty";
  if (normalized.includes("inspection")) return "Inspection";
  if (normalized.includes("service")) return "Service";
  return "";
};

export function parseTripInvite(rawIcs) {
  let calendar;
  try { calendar = new ICAL.Component(ICAL.parse(rawIcs)); }
  catch { throw new Error("Unable to read this calendar file."); }
  const events = calendar.getAllSubcomponents("vevent");
  if (events.length !== 1) throw new Error("Choose a calendar file containing one invitation.");
  const event = events[0];
  const value = (key) => String(event.getFirstPropertyValue(key) || "").trim();
  if (value("status").toUpperCase() === "CANCELLED" || String(calendar.getFirstPropertyValue("method")).toUpperCase() === "CANCEL") {
    throw new Error("This invitation has been cancelled.");
  }
  if (event.hasProperty("rrule") && !event.hasProperty("recurrence-id")) throw new Error("Choose a single occurrence of this recurring invitation.");
  const summary = value("summary"), description = value("description");
  const site = parseSiteAddress(description);
  const projectContact = parseContact(description, "PROJECT CONTACT");
  const installContact = parseContact(description, "INSTALL CONTACT");
  for (const name of ["dtstart", "dtend"]) {
    const property = event.getFirstProperty(name);
    if (property) validateDateProperty(property);
  }
  const start = event.getFirstPropertyValue("dtstart");
  let end = event.getFirstPropertyValue("dtend");
  if (!start) throw new Error("This invitation is missing a start date.");
  if (!end) {
    end = start.clone();
    const duration = event.getFirstPropertyValue("duration");
    if (duration) end.addDuration(duration);
    else if (start.isDate) end.adjust(1, 0, 0, 0);
  }
  if (start.isDate !== end.isDate) throw new Error("The invitation has inconsistent start and end dates.");
  const startDate = inviteDate(start, event.getFirstProperty("dtstart"), calendar);
  const endDate = inviteDate(end, event.getFirstProperty("dtend") || event.getFirstProperty("dtstart"), calendar);
  if (endDate < startDate || (start.isDate && endDate <= startDate)) throw new Error("The invitation ends before it starts.");
  const exclusiveEnd = end.toString();
  if (start.isDate) { endDate.setDate(endDate.getDate() - 1); endDate.setHours(23, 59, 0, 0); }
  const jobDigits = (summary.match(/\bJ[# -]?(\d{2,5})\b/i) || summary.match(/\b(\d{2,5})\b/))?.[1] || "";

  if (!jobDigits || !summary) throw new Error("This calendar file does not contain a recognizable PFlow trip invitation.");

  return {
    jobNo: `J#${jobDigits}`,
    tripType: tripTypeFromSummary(summary),
    model: "",
    startAt: inputDate(startDate),
    endAt: inputDate(endDate),
    sharedSite: {
      ...site,
      siteMailingAddress: site.siteStreetAddress,
      serialNumberText: "",
      customerContact: [projectContact.name, projectContact.phone].filter(Boolean).join(" | "),
    },
    inviteMeta: {
      summary,
      location: value("location"),
      uid: value("uid"),
      recurrenceId: value("recurrence-id"),
      originalStart: start.toString(),
      exclusiveEnd: start.isDate ? exclusiveEnd : "",
      allDay: start.isDate,
      projectContact,
      installContact,
    },
  };
}


const inputDate = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function inviteDate(time, property, calendar) {
  if (!Number.isFinite(time.year) || time.month < 1 || time.month > 12 || time.day < 1 || time.day > new Date(time.year, time.month, 0).getDate() || time.hour > 23 || time.minute > 59 || time.second > 59) throw new Error("Invalid invitation date.");
  const tzid = property?.getParameter("tzid");
  if (tzid && !time.isDate) {
    const component = calendar.getAllSubcomponents("vtimezone").find((zone) => zone.getFirstPropertyValue("tzid") === tzid);
    if (component) {
      const zoned = time.clone();
      zoned.zone = new ICAL.Timezone({ component, tzid });
      return zoned.toJSDate();
    }
    // IANA zones without embedded VTIMEZONE use the browser's timezone database.
    try {
      const format = new Intl.DateTimeFormat("en-CA", { timeZone: tzid, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" });
      const target = Date.UTC(time.year, time.month-1, time.day, time.hour, time.minute, time.second);
      let instant = target;
      for (let i = 0; i < 4; i++) {
        const parts = Object.fromEntries(format.formatToParts(new Date(instant)).map(({type,value}) => [type,value]));
        const offset = Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)-instant;
        if (instant === target-offset) return new Date(instant);
        instant = target-offset;
      }
    } catch { /* Unknown zones must not silently become local time. */ }
    throw new Error(`Cannot resolve invitation time zone: ${tzid}. Use a calendar export with time-zone definitions.`);
  }
  const date = time.toJSDate();
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid invitation date.");
  return date;
}

export function findImportedInvite(reports, draft) {
  const meta = draft?.inviteMeta;
  if (!meta) return undefined;
  return reports.find((report) => {
    const other = report.inviteMeta;
    if (!other) return false;
    if (meta.uid && other.uid) return meta.uid === other.uid && (meta.recurrenceId || "") === (other.recurrenceId || "");
    return meta.summary === other.summary && (meta.originalStart && other.originalStart
      ? meta.originalStart === other.originalStart
      : new Date(draft.startAt).getTime() === new Date(report.startAt).getTime());
  });
}

function validateDateProperty(property) {
  // Validate before ICAL.Time normalizes out-of-range calendar values.
  const raw = String(property.toJSON()[3]);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})Z?)?$/.exec(raw);
  if (!match) throw new Error("Invalid invitation date.");
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  if (+month < 1 || +month > 12 || +day < 1 || +day > new Date(+year, +month, 0).getDate() || +hour > 23 || +minute > 59 || +second > 59) throw new Error("Invalid invitation date.");
}
