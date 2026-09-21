const unfoldIcs = (value = "") => String(value).replace(/\r?\n[ \t]/g, "");

const unescapeIcs = (value = "") => String(value)
  .replace(/\\n/gi, "\n")
  .replace(/\\,/g, ",")
  .replace(/\\;/g, ";")
  .replace(/\\\\/g, "\\");

const propertyValue = (ics, property) => {
  const match = new RegExp(`^${property}(?:;[^:]*)?:(.*)$`, "mi").exec(ics);
  return unescapeIcs(match?.[1] || "").trim();
};

const localDateTime = (value, endOfDay = false) => {
  const raw = String(value || "").replace(/[^0-9TZ]/g, "");
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${endOfDay ? "23:59" : "00:00"}`;
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` : "";
};

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
  const ics = unfoldIcs(rawIcs);
  const summary = propertyValue(ics, "SUMMARY");
  const description = propertyValue(ics, "DESCRIPTION");
  const site = parseSiteAddress(description);
  const projectContact = parseContact(description, "PROJECT CONTACT");
  const installContact = parseContact(description, "INSTALL CONTACT");
  const startValue = propertyValue(ics, "DTSTART");
  const endValue = propertyValue(ics, "DTEND");
  const allDay = /^\d{8}$/.test(startValue.replace(/[^0-9]/g, ""));
  const jobDigits = summary.match(/\b(\d{2,5})\b/)?.[1] || "";

  if (!jobDigits || !summary) throw new Error("This calendar file does not contain a recognizable PFlow trip invitation.");

  return {
    jobNo: `J#${jobDigits}`,
    tripType: tripTypeFromSummary(summary),
    model: "",
    startAt: localDateTime(startValue),
    endAt: localDateTime(endValue, !allDay),
    sharedSite: {
      ...site,
      siteMailingAddress: site.siteStreetAddress,
      serialNumberText: "",
      customerContact: [projectContact.name, projectContact.phone].filter(Boolean).join(" | "),
    },
    inviteMeta: {
      summary,
      location: propertyValue(ics, "LOCATION"),
      projectContact,
      installContact,
    },
  };
}

