import { uid } from "./id";

export { uid };

export const fmtDateTime = (d) => new Date(d).toLocaleString();

export const FSR_ENTRY_TYPE_META = {
  issue: { label: "Issue", emoji: "📷", badgeClass: "bg-red-100 text-red-700 border-red-200" },
  correction: { label: "Correction", emoji: "🛠️", badgeClass: "bg-amber-100 text-amber-700 border-amber-200" },
  orderParts: { label: "Parts", emoji: "📦", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
  docRequest: { label: "Doc Request", emoji: "📄", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  followUp: { label: "Follow-Up", emoji: "📌", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
  internal: { label: "Internal", emoji: "🔒", badgeClass: "bg-gray-200 text-gray-700 border-gray-300" },
  commentary: { label: "Commentary", emoji: "💬", badgeClass: "bg-sky-100 text-sky-700 border-sky-200" },
};

const DOC_REQUEST_LABELS = {
  installation: "Installation Manual",
  pm: "PM Checklists",
  spares: "Spare Parts",
  electrical: "Electrical Diagrams",
  other: "Other",
};

const allowedEntryTypes = Object.keys(FSR_ENTRY_TYPE_META);

const cloneDetailItem = (item) => ({ id: item?.id || uid(), text: typeof item?.text === "string" ? item.text : "" });

const clonePartsNeededItem = (item) => {
  if (!item || typeof item !== "object") {
    return { id: uid(), text: "", partNo: "", desc: "", qty: "" };
  }
  const text = typeof item.text === "string" ? item.text : "";
  const partNo = typeof item.partNo === "string" ? item.partNo : "";
  const desc = typeof item.desc === "string" ? item.desc : "";
  const qty =
    typeof item.qty === "string"
      ? item.qty
      : typeof item.qty === "number"
      ? String(item.qty)
      : "";
  return { id: item.id || uid(), text, partNo, desc, qty };
};

const cleanPartField = (value) => (typeof value === "string" ? value.trim() : "");

const qtyToNumber = (value) => {
  if (value === undefined || value === null) return null;
  const asString = typeof value === "number" ? String(value) : String(value || "");
  if (!asString) return null;
  const parsed = Number.parseFloat(asString);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatQtyDisplay = (value) => {
  if (value === null || value === undefined) return "";
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
};

const formatPartsNeededLabel = (partNo, desc, qty) => {
  const label = [partNo, desc].map((v) => cleanPartField(v)).filter(Boolean).join(" — ");
  const base = label || cleanPartField(partNo) || cleanPartField(desc) || "Part";
  const qtyDisplay = cleanPartField(qty);
  return qtyDisplay ? `${base} (Qty ${qtyDisplay})` : base;
};

export function mergePartsNeeded(existing = [], orderPartEntries = []) {
  const manualItems = [];
  const aggregatedOrder = [];
  const aggregatedMap = new Map();

  const ensureRecord = (partNo, desc, preferredId) => {
    const key = `${partNo.toLowerCase()}__${desc.toLowerCase()}`;
    let record = aggregatedMap.get(key);
    if (!record) {
      record = {
        id: preferredId || null,
        partNo,
        desc,
        qtyValue: null,
        qtyFallback: "",
        manualText: "",
      };
      aggregatedMap.set(key, record);
      aggregatedOrder.push(record);
    } else if (preferredId && !record.id) {
      record.id = preferredId;
    }
    return record;
  };

  (existing || []).forEach((item) => {
    const normalized = clonePartsNeededItem(item);
    const partNo = cleanPartField(normalized.partNo);
    const desc = cleanPartField(normalized.desc);
    if (partNo || desc) {
      const record = ensureRecord(partNo, desc, normalized.id);
      if (!record.qtyFallback && normalized.qty) {
        record.qtyFallback = cleanPartField(normalized.qty);
      }
      if (!record.manualText && normalized.text) {
        record.manualText = normalized.text;
      }
    } else if (normalized.text) {
      manualItems.push({
        id: normalized.id,
        text: normalized.text,
        partNo: "",
        desc: "",
        qty: "",
      });
    }
  });

  (orderPartEntries || [])
    .filter((entry) => entry && entry.type === "orderParts")
    .forEach((entry) => {
      (entry.parts || []).forEach((part) => {
        const partNo = cleanPartField(part?.partNo);
        const desc = cleanPartField(part?.desc);
        const qtyRaw = cleanPartField(part?.qty);
        if (!partNo && !desc) return;
        const record = ensureRecord(partNo, desc, null);
        const qtyValue = qtyToNumber(qtyRaw);
        if (qtyValue !== null) {
          record.qtyValue = (record.qtyValue ?? 0) + qtyValue;
        } else if (!record.qtyFallback && qtyRaw) {
          record.qtyFallback = qtyRaw;
        }
      });
    });

  const aggregatedItems = aggregatedOrder
    .map((record) => {
      const qtyDisplay =
        record.qtyValue !== null && record.qtyValue !== undefined
          ? formatQtyDisplay(record.qtyValue)
          : record.qtyFallback;
      const text = formatPartsNeededLabel(record.partNo, record.desc, qtyDisplay) || record.manualText;
      if (!text) return null;
      return {
        id: record.id || uid(),
        text,
        partNo: record.partNo,
        desc: record.desc,
        qty: qtyDisplay || "",
      };
    })
    .filter(Boolean);

  return [...aggregatedItems, ...manualItems];
}

const ensureDetails = (details) => {
  const base = typeof details === "object" && details ? { ...details } : {};
  const workSummary = typeof base.workSummary === "string" ? base.workSummary : "";
  const partsInstalled = Array.isArray(base.partsInstalled)
    ? base.partsInstalled.map(cloneDetailItem)
    : [];
  const partsNeeded = Array.isArray(base.partsNeeded)
    ? base.partsNeeded.map(clonePartsNeededItem)
    : [];
  return { ...base, workSummary, partsInstalled, partsNeeded };
};

const sanitizePhoto = (photo) => {
  if (!photo) return null;
  const imageUrl = typeof photo.imageUrl === "string" ? photo.imageUrl : "";
  if (!imageUrl) return null;
  return { id: photo.id || uid(), imageUrl };
};

const sanitizePhotos = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos.map(sanitizePhoto).filter(Boolean);
};

const normalizeLegacyIssue = (issue) => {
  if (!issue) return null;
  const note = typeof issue.note === "string" ? issue.note : "";
  const imageUrl = typeof issue.imageUrl === "string" ? issue.imageUrl : "";
  const createdAt = issue.createdAt ? new Date(issue.createdAt).toISOString() : new Date().toISOString();
  const photos = Array.isArray(issue.photos) ? sanitizePhotos(issue.photos) : imageUrl ? [{ id: uid(), imageUrl }] : [];
  return {
    id: issue.id || uid(),
    note,
    imageUrl: photos[0]?.imageUrl || imageUrl || "",
    createdAt,
    collapsed: !!issue.collapsed,
    photos,
  };
};

const legacyIssueToEntry = (issue) => {
  const normalized = normalizeLegacyIssue(issue);
  if (!normalized) return null;
  return {
    id: normalized.id,
    type: "issue",
    createdAt: normalized.createdAt,
    collapsed: !!normalized.collapsed,
    note: normalized.note,
    photos: sanitizePhotos(normalized.photos),
  };
};

const sanitizePartsRow = (row) => {
  if (!row) return null;
  const partNo = typeof row.partNo === "string" ? row.partNo : "";
  const desc = typeof row.desc === "string" ? row.desc : "";
  const qty = typeof row.qty === "string" ? row.qty : typeof row.qty === "number" ? String(row.qty) : "";
  if (!partNo && !desc && !qty) return null;
  return { id: row.id || uid(), partNo, desc, qty };
};

const sanitizeParts = (parts) => {
  if (!Array.isArray(parts)) return [];
  return parts.map(sanitizePartsRow).filter(Boolean);
};

const sanitizeFollowUp = (value) => {
  if (!value || typeof value !== "object") return { title: "", details: "" };
  const title = typeof value.title === "string" ? value.title : "";
  const details = typeof value.details === "string" ? value.details : "";
  return { title, details };
};

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const type = entry.type;
  if (!allowedEntryTypes.includes(type)) return null;
  const id = entry.id || uid();
  const createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString();
  const collapsed = entry.collapsed ?? true;

  if (type === "issue" || type === "correction") {
    const note = typeof entry.note === "string" ? entry.note : "";
    const photos = sanitizePhotos(entry.photos);
    return { id, type, createdAt, collapsed: !!collapsed, note, photos };
  }

  if (type === "commentary" || type === "internal") {
    const note = typeof entry.note === "string" ? entry.note : "";
    return { id, type, createdAt, collapsed: !!collapsed, note };
  }

  if (type === "orderParts") {
    const parts = sanitizeParts(entry.parts);
    const note = typeof entry.note === "string" ? entry.note : "";
    return { id, type, createdAt, collapsed: !!collapsed, parts, note };
  }

  if (type === "docRequest") {
    const allowed = Object.keys(DOC_REQUEST_LABELS);
    const docKind = allowed.includes(entry.docKind) ? entry.docKind : "installation";
    const docNotes = typeof entry.docNotes === "string" ? entry.docNotes : "";
    return { id, type, createdAt, collapsed: !!collapsed, docKind, docNotes };
  }

  if (type === "followUp") {
    const followUp = sanitizeFollowUp(entry.followUp);
    return { id, type, createdAt, collapsed: !!collapsed, followUp };
  }

  return null;
};

const entriesToLegacyIssues = (entries) =>
  entries
    .filter((entry) => entry.type === "issue")
    .map((entry) => ({
      id: entry.id,
      note: entry.note || "",
      imageUrl: entry.photos?.[0]?.imageUrl || "",
      createdAt: entry.createdAt,
      collapsed: entry.collapsed,
      photos: entry.photos || [],
    }));

export const ensureFsrDocData = (data) => {
  const base = typeof data === "object" && data ? { ...data } : {};
  const details = ensureDetails(base.details);
  const rawEntries = Array.isArray(base.entries) ? base.entries : null;
  const normalizedEntries = (rawEntries || [])
    .map((entry) => normalizeEntry(entry))
    .filter(Boolean);

  const legacyIssues = Array.isArray(base.issues)
    ? base.issues.map((issue) => normalizeLegacyIssue(issue)).filter(Boolean)
    : [];

  const mergedEntries =
    rawEntries === null && legacyIssues.length
      ? legacyIssues.map((issue) => legacyIssueToEntry(issue)).filter(Boolean)
      : normalizedEntries;

  const entries = mergedEntries;

  const orderPartEntries = entries.filter((entry) => entry.type === "orderParts");
  const normalizedDetails = {
    ...details,
    partsNeeded: mergePartsNeeded(details.partsNeeded, orderPartEntries),
  };

  const syncedIssues = entriesToLegacyIssues(entries);

  return { ...base, details: normalizedDetails, entries, issues: syncedIssues };
};

export const makeEmptyFsrDocData = () => ensureFsrDocData({ entries: [], issues: [] });

export const cloneFsrDocData = (data) => {
  const safe = ensureFsrDocData(data);
  return {
    ...safe,
    entries: safe.entries.map((entry) => ({
      ...entry,
      photos: entry.photos ? entry.photos.map((photo) => ({ ...photo })) : undefined,
      parts: entry.parts ? entry.parts.map((part) => ({ ...part })) : undefined,
      followUp: entry.followUp ? { ...entry.followUp } : undefined,
    })),
    details: {
      ...safe.details,
      partsInstalled: safe.details.partsInstalled.map((item) => ({ ...item })),
      partsNeeded: safe.details.partsNeeded.map((item) => ({ ...item })),
    },
  };
};

export const addEntryToFsrData = (data, entry) => {
  const working = cloneFsrDocData(data);
  const normalized = normalizeEntry(entry);
  if (!normalized) return ensureFsrDocData(working);
  return ensureFsrDocData({ ...working, entries: [...working.entries, normalized] });
};

export const addEntryWithEffects = (data, entry) => {
  let next = addEntryToFsrData(data, entry);
  if (entry?.type === "orderParts") {
    const existing = Array.isArray(next.details?.partsNeeded) ? next.details.partsNeeded : [];
    const orderPartEntries = next.entries.filter((item) => item.type === "orderParts");
    const merged = mergePartsNeeded(existing, orderPartEntries);
    next = ensureFsrDocData({
      ...next,
      details: { ...next.details, partsNeeded: merged },
    });
  }
  return ensureFsrDocData(next);
};

export const updateEntryInFsrData = (data, id, updater) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.map((entry) => {
    if (entry.id !== id) return entry;
    const next = typeof updater === "function" ? updater(entry) : updater;
    return normalizeEntry({ ...entry, ...next });
  }).filter(Boolean);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const removeEntryFromFsrData = (data, id) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.filter((entry) => entry.id !== id);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const moveEntryInFsrData = (data, id, direction) => {
  const working = cloneFsrDocData(data);
  const index = working.entries.findIndex((entry) => entry.id === id);
  if (index === -1) return ensureFsrDocData(working);
  const delta = direction === "up" ? -1 : 1;
  const target = index + delta;
  if (target < 0 || target >= working.entries.length) return ensureFsrDocData(working);
  const nextEntries = [...working.entries];
  const [moved] = nextEntries.splice(index, 1);
  nextEntries.splice(target, 0, moved);
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const setEntriesCollapsedState = (data, collapsed) => {
  const working = cloneFsrDocData(data);
  const nextEntries = working.entries.map((entry) => ({ ...entry, collapsed }));
  return ensureFsrDocData({ ...working, entries: nextEntries });
};

export const docRequestLabel = (key) => DOC_REQUEST_LABELS[key] || DOC_REQUEST_LABELS.installation;

export const toISOInput = (date) => {
  const dt = new Date(date);
  const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16); // yyyy-MM-ddTHH:mm
  return iso;
};

export const MODELS = ["M", "F", "FS", "21", "H", "ZON", "ZONXL", "POD", "SLAM", "Cartveyor"];

export const ACCEPTANCE_CERT_DOC_NAME = "Acceptance Certificate";
export const ACCEPTANCE_CERT_LEGACY_NAMES = ["Acceptance Certification (15710-0017)"];
const ACCEPTANCE_CERT_ALL_NAMES = [ACCEPTANCE_CERT_DOC_NAME, ...ACCEPTANCE_CERT_LEGACY_NAMES];
const ACCEPTANCE_CERT_NAME_SET = new Set(
  ACCEPTANCE_CERT_ALL_NAMES.map((label) => label.toLowerCase()),
);
export const isAcceptanceCertDocName = (name) =>
  typeof name === "string" && ACCEPTANCE_CERT_NAME_SET.has(name.toLowerCase());
export const ACCEPTANCE_CERT_MODEL_KEYS = ["B", "D", "DB", "F", "M", "21"];

export const MOTOR_TEST_DOC_NAME = "Motor Test Data";
export const MOTOR_TEST_LEGACY_NAMES = ["Motor Test Data Sheet – Frequency Drive"];
const MOTOR_TEST_ALL_NAMES = [MOTOR_TEST_DOC_NAME, ...MOTOR_TEST_LEGACY_NAMES];
const MOTOR_TEST_NAME_SET = new Set(MOTOR_TEST_ALL_NAMES.map((label) => label.toLowerCase()));
export const isMotorTestDocName = (name) =>
  typeof name === "string" && MOTOR_TEST_NAME_SET.has(name.toLowerCase());
export const MOTOR_TEST_MODEL_KEYS = ["B", "D", "DB", "F", "M", "MQ", "21", "CV"];
const MOTOR_TEST_VOLT_KEYS = ["l1l2", "l1l3", "l2l3", "l1g", "l2g", "l3g"];

const ensureMotorTestVoltages = (raw = {}) => {
  const safe = {};
  MOTOR_TEST_VOLT_KEYS.forEach((key) => {
    const value = raw && typeof raw[key] === "string" ? raw[key] : "";
    safe[key] = value;
  });
  return safe;
};

const ensureMotorTestCurrents = (raw = {}) => {
  const ensureLoad = (load = {}) => ({
    t1: typeof load.t1 === "string" ? load.t1 : "",
    t2: typeof load.t2 === "string" ? load.t2 : "",
    t3: typeof load.t3 === "string" ? load.t3 : "",
  });
  const ensurePhase = (phase = {}) => ({
    unloaded: ensureLoad(phase.unloaded),
    full: ensureLoad(phase.full),
  });
  return {
    up: ensurePhase(raw.up),
    down: ensurePhase(raw.down),
  };
};

export const ensureMotorTestData = (data) => {
  const base = typeof data === "object" && data ? data : {};
  return {
    jobName: typeof base.jobName === "string" ? base.jobName : "",
    pflowSerialNumber: typeof base.pflowSerialNumber === "string" ? base.pflowSerialNumber : "",
    modelNumber: typeof base.modelNumber === "string" ? base.modelNumber : "",
    siteStreetAddress: typeof base.siteStreetAddress === "string" ? base.siteStreetAddress : "",
    siteCity: typeof base.siteCity === "string" ? base.siteCity : "",
    siteState: typeof base.siteState === "string" ? base.siteState : "",
    siteZip: typeof base.siteZip === "string" ? base.siteZip : "",
    voltIncoming: ensureMotorTestVoltages(base.voltIncoming),
    voltAfd: ensureMotorTestVoltages(base.voltAfd),
    currents: ensureMotorTestCurrents(base.currents),
    ratedLoad: typeof base.ratedLoad === "string" ? base.ratedLoad : "",
    testedLoad: typeof base.testedLoad === "string" ? base.testedLoad : "",
    motor: {
      manufacturer: typeof base?.motor?.manufacturer === "string" ? base.motor.manufacturer : "",
      serialNumber: typeof base?.motor?.serialNumber === "string" ? base.motor.serialNumber : "",
      schematicNumber: typeof base?.motor?.schematicNumber === "string" ? base.motor.schematicNumber : "",
      hp: typeof base?.motor?.hp === "string" ? base.motor.hp : "",
      vac: typeof base?.motor?.vac === "string" ? base.motor.vac : "",
      rpm: typeof base?.motor?.rpm === "string" ? base.motor.rpm : "",
      fla: typeof base?.motor?.fla === "string" ? base.motor.fla : "",
    },
    testedBySignature: typeof base.testedBySignature === "string" ? base.testedBySignature : "",
    testedByName: typeof base.testedByName === "string" ? base.testedByName : "",
    testedByTitle: typeof base.testedByTitle === "string" ? base.testedByTitle : "",
    serviceCompany: typeof base.serviceCompany === "string" ? base.serviceCompany : "",
    testDate: typeof base.testDate === "string" ? base.testDate : "",
  };
};

export const makeEmptyMotorTestData = () => ensureMotorTestData({});

export const motorTestDocHasContent = (data) => {
  const safe = ensureMotorTestData(data);
  if (
    safe.jobName.trim() ||
    safe.pflowSerialNumber.trim() ||
    safe.modelNumber.trim() ||
    safe.siteStreetAddress.trim() ||
    safe.siteCity.trim() ||
    safe.siteState.trim() ||
    safe.siteZip.trim() ||
    safe.ratedLoad.trim() ||
    safe.testedLoad.trim() ||
    safe.testedBySignature.trim() ||
    safe.testedByName.trim() ||
    safe.testedByTitle.trim() ||
    safe.serviceCompany.trim() ||
    safe.testDate.trim()
  ) {
    return true;
  }

  if (
    safe.motor.manufacturer.trim() ||
    safe.motor.serialNumber.trim() ||
    safe.motor.schematicNumber.trim() ||
    safe.motor.hp.trim() ||
    safe.motor.vac.trim() ||
    safe.motor.rpm.trim() ||
    safe.motor.fla.trim()
  ) {
    return true;
  }

  if (
    MOTOR_TEST_VOLT_KEYS.some(
      (key) => safe.voltIncoming[key]?.trim() || safe.voltAfd[key]?.trim(),
    )
  ) {
    return true;
  }

  const { currents } = safe;
  const allCurrents = [
    currents.up.unloaded.t1,
    currents.up.unloaded.t2,
    currents.up.unloaded.t3,
    currents.up.full.t1,
    currents.up.full.t2,
    currents.up.full.t3,
    currents.down.unloaded.t1,
    currents.down.unloaded.t2,
    currents.down.unloaded.t3,
    currents.down.full.t1,
    currents.down.full.t2,
    currents.down.full.t3,
  ];
  if (allCurrents.some((value) => (value || "").trim())) {
    return true;
  }

  return false;
};

const ensureAcceptanceCertPersonnel = (raw = {}) => ({
  name: typeof raw?.name === "string" ? raw.name : "",
  company: typeof raw?.company === "string" ? raw.company : "",
});

const ensureAcceptanceCertLoadTest = (raw = {}) => ({
  yes: !!raw?.yes,
  percent: typeof raw?.percent === "string" ? raw.percent : "",
});

const normalizeGateInterlock = (value) => {
  const safe = typeof value === "string" ? value.toLowerCase() : "";
  return ["yes", "no", "na"].includes(safe) ? safe : "";
};

export const ensureAcceptanceCertificationData = (data) => {
  const base = typeof data === "object" && data ? data : {};
  return {
    jobName: typeof base.jobName === "string" ? base.jobName : "",
    pflowSerialNumber: typeof base.pflowSerialNumber === "string" ? base.pflowSerialNumber : "",
    modelNumber: typeof base.modelNumber === "string" ? base.modelNumber : "",
    siteStreetAddress: typeof base.siteStreetAddress === "string" ? base.siteStreetAddress : "",
    siteMailingAddress: typeof base.siteMailingAddress === "string" ? base.siteMailingAddress : "",
    siteCity: typeof base.siteCity === "string" ? base.siteCity : "",
    siteState: typeof base.siteState === "string" ? base.siteState : "",
    siteZip: typeof base.siteZip === "string" ? base.siteZip : "",
    customerContactName: typeof base.customerContactName === "string" ? base.customerContactName : "",
    customerContactTitle: typeof base.customerContactTitle === "string" ? base.customerContactTitle : "",
    customerContactPhone: typeof base.customerContactPhone === "string" ? base.customerContactPhone : "",
    customerContactExt: typeof base.customerContactExt === "string" ? base.customerContactExt : "",
    customerContactEmail: typeof base.customerContactEmail === "string" ? base.customerContactEmail : "",
    customerCompany: typeof base.customerCompany === "string" ? base.customerCompany : "",
    loadCapacity: typeof base.loadCapacity === "string" ? base.loadCapacity : "",
    startupDate: typeof base.startupDate === "string" ? base.startupDate : "",
    loadTest: ensureAcceptanceCertLoadTest(base.loadTest),
    operationTestYes: !!base.operationTestYes,
    operationComments: typeof base.operationComments === "string" ? base.operationComments : "",
    gateInterlock: normalizeGateInterlock(base.gateInterlock),
    otherTest1: typeof base.otherTest1 === "string" ? base.otherTest1 : "",
    otherTest2: typeof base.otherTest2 === "string" ? base.otherTest2 : "",
    customerInitials: typeof base.customerInitials === "string" ? base.customerInitials : "",
    instructed1: ensureAcceptanceCertPersonnel(base.instructed1),
    instructed2: ensureAcceptanceCertPersonnel(base.instructed2),
    acceptedByName: typeof base.acceptedByName === "string" ? base.acceptedByName : "",
    acceptedByTitle: typeof base.acceptedByTitle === "string" ? base.acceptedByTitle : "",
    acceptedByCompany: typeof base.acceptedByCompany === "string" ? base.acceptedByCompany : "",
    acceptanceDate: typeof base.acceptanceDate === "string" ? base.acceptanceDate : "",
    pflowRepName: typeof base.pflowRepName === "string" ? base.pflowRepName : "",
    pflowRepPhone: typeof base.pflowRepPhone === "string" ? base.pflowRepPhone : "",
    acceptanceNotes: typeof base.acceptanceNotes === "string" ? base.acceptanceNotes : "",
  };
};

export const makeEmptyAcceptanceCertificationData = () => ensureAcceptanceCertificationData({});

export const acceptanceCertificationDocHasContent = (data) => {
  const safe = ensureAcceptanceCertificationData(data);
  const stringFields = [
    "jobName",
    "pflowSerialNumber",
    "modelNumber",
    "siteStreetAddress",
    "siteMailingAddress",
    "siteCity",
    "siteState",
    "siteZip",
    "customerContactName",
    "customerContactTitle",
    "customerContactPhone",
    "customerContactExt",
    "customerContactEmail",
    "customerCompany",
    "loadCapacity",
    "startupDate",
    "operationComments",
    "otherTest1",
    "otherTest2",
    "customerInitials",
    "acceptedByName",
    "acceptedByTitle",
    "acceptedByCompany",
    "acceptanceDate",
    "pflowRepName",
    "pflowRepPhone",
    "acceptanceNotes",
  ];

  if (stringFields.some((field) => (safe[field] || "").trim())) {
    return true;
  }

  if (safe.loadTest.yes || safe.loadTest.percent.trim()) {
    return true;
  }

  if (safe.operationTestYes) {
    return true;
  }

  if (safe.gateInterlock) {
    return true;
  }

  if (
    [safe.instructed1, safe.instructed2].some(
      (person) => person.name.trim() || person.company.trim(),
    )
  ) {
    return true;
  }

  return false;
};

const DEFAULT_TRIP_TYPES = ["Service", "Warranty", "Start Up", "Inspection"];

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  throw new Error("localStorage is not available");
};

export const loadTypes = (storage) => {
  const backing = resolveStorage(storage);
  try {
    const raw = backing.getItem("fsr.tripTypes");
    if (!raw) return [...DEFAULT_TRIP_TYPES];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : [...DEFAULT_TRIP_TYPES];
  } catch {
    return [...DEFAULT_TRIP_TYPES];
  }
};

export const saveTypes = (arr, storage) => {
  const backing = resolveStorage(storage);
  backing.setItem("fsr.tripTypes", JSON.stringify(arr));
};

const normalizeReportDocuments = (documents) => {
  if (!Array.isArray(documents)) return documents;
  let mutated = false;
  const next = documents.map((doc) => {
    if (!doc || typeof doc !== "object") return doc;
    if (isAcceptanceCertDocName(doc.name) && doc.name !== ACCEPTANCE_CERT_DOC_NAME) {
      mutated = true;
      return { ...doc, name: ACCEPTANCE_CERT_DOC_NAME };
    }
    if (isMotorTestDocName(doc.name) && doc.name !== MOTOR_TEST_DOC_NAME) {
      mutated = true;
      return { ...doc, name: MOTOR_TEST_DOC_NAME };
    }
    return doc;
  });
  return mutated ? next : documents;
};

const normalizeReport = (report) => {
  if (!report || typeof report !== "object") return report;
  const docs = normalizeReportDocuments(report.documents);
  if (docs !== report.documents) {
    return { ...report, documents: docs };
  }
  return report;
};

const normalizeReportsPayload = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload.map((report) => normalizeReport(report));
};

const MODEL_UNIFIED_SCHEMA_KEY = "fsr.schema.modelUnified";
const META_PRUNED_SCHEMA_KEY = "fsr.schema.metaPruned";
const SS_PRUNED_SCHEMA_KEY = "fsr.schema.serviceSummary.prunedV1";

const shouldStripDocModelFields = (name) => {
  if (typeof name !== "string") return false;
  if (name.trim().toLowerCase() === "service summary") return true;
  if (isAcceptanceCertDocName(name)) return true;
  if (isMotorTestDocName(name)) return true;
  return false;
};

const stripModelFieldsFromDocData = (data) => {
  if (!data || typeof data !== "object") return data;
  let mutated = false;
  const next = { ...data };
  if (Object.prototype.hasOwnProperty.call(next, "modelChecks")) {
    delete next.modelChecks;
    mutated = true;
  }
  if (Object.prototype.hasOwnProperty.call(next, "modelOther")) {
    delete next.modelOther;
    mutated = true;
  }
  return mutated ? next : data;
};

const migrateReportsToUnifiedModel = (reports) => {
  if (!Array.isArray(reports)) {
    return { reports: [], changed: false };
  }

  let changed = false;

  const migrated = reports.map((report) => {
    if (!report || typeof report !== "object") return report;
    if (!Array.isArray(report.documents)) return report;

    let docsChanged = false;
    const nextDocs = report.documents.map((doc) => {
      if (!doc || typeof doc !== "object") return doc;
      if (!shouldStripDocModelFields(doc.name)) return doc;
      const nextData = stripModelFieldsFromDocData(doc.data);
      if (nextData === doc.data) return doc;
      docsChanged = true;
      return { ...doc, data: nextData };
    });

    if (!docsChanged) return report;
    changed = true;
    return { ...report, documents: nextDocs };
  });

  return { reports: changed ? migrated : reports, changed };
};

// Prune meta fields from Acceptance & Motor Test docs so Service Summary owns them
const shouldPruneDocMeta = (name) => {
  if (typeof name !== "string") return false;
  if (isAcceptanceCertDocName(name)) return true;
  if (isMotorTestDocName(name)) return true;
  return false;
};

const pruneMetaFromDocData = (data) => {
  if (!data || typeof data !== "object") return data;
  const next = { ...data };
  let mutated = false;
  const keys = [
    "jobName",
    "serialNumberText", // legacy stray key in some seeds
    "pflowSerialNumber",
    "modelNumber",
    "modelChecks",
    "modelOther",
    "siteStreetAddress",
    "siteMailingAddress",
    "siteCity",
    "siteState",
    "siteZip",
  ];
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(next, k)) {
      delete next[k];
      mutated = true;
    }
  });
  return mutated ? next : data;
};

const migrateReportsPruneMeta = (reports) => {
  if (!Array.isArray(reports)) {
    return { reports: [], changed: false };
  }
  let changed = false;
  const migrated = reports.map((report) => {
    if (!report || typeof report !== "object") return report;
    if (!Array.isArray(report.documents)) return report;
    let docsChanged = false;
    const nextDocs = report.documents.map((doc) => {
      if (!doc || typeof doc !== "object") return doc;
      if (!shouldPruneDocMeta(doc.name)) return doc;
      const nextData = pruneMetaFromDocData(doc.data);
      if (nextData === doc.data) return doc;
      docsChanged = true;
      return { ...doc, data: nextData };
    });
    if (!docsChanged) return report;
    changed = true;
    return { ...report, documents: nextDocs };
  });
  return { reports: changed ? migrated : reports, changed };
};

export const loadReports = (storage) => {
  const backing = resolveStorage(storage);
  try {
    const raw = backing.getItem("fsr.reports");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const normalized = normalizeReportsPayload(parsed);
    // Migration 1: remove legacy per-doc model checkbox data
    let reportsWorking = normalized;
    if (backing.getItem(MODEL_UNIFIED_SCHEMA_KEY) !== "true") {
      const { reports: migratedReports, changed } = migrateReportsToUnifiedModel(normalized);
      if (changed) {
        backing.setItem("fsr.reports", JSON.stringify(migratedReports));
      }
      backing.setItem(MODEL_UNIFIED_SCHEMA_KEY, "true");
      reportsWorking = migratedReports;
    }

    // Migration 2: prune meta fields from Acceptance & Motor Test docs
    if (backing.getItem(META_PRUNED_SCHEMA_KEY) !== "true") {
      const { reports: pruned, changed: prunedChanged } = migrateReportsPruneMeta(reportsWorking);
      if (prunedChanged) {
        backing.setItem("fsr.reports", JSON.stringify(pruned));
      }
      backing.setItem(META_PRUNED_SCHEMA_KEY, "true");
      reportsWorking = pruned;
    }

    // Migration 3: prune removed fields from Service Summary docs (idempotent)
    if (backing.getItem(SS_PRUNED_SCHEMA_KEY) !== "true") {
      const { reports: prunedSS, changed: ssChanged } = migrateReportsPruneServiceSummary(reportsWorking);
      if (ssChanged) {
        backing.setItem("fsr.reports", JSON.stringify(prunedSS));
      }
      backing.setItem(SS_PRUNED_SCHEMA_KEY, "true");
      return prunedSS;
    }

    return reportsWorking;
  } catch {
    return [];
  }
};

export const saveReports = (arr, storage) => {
  const backing = resolveStorage(storage);
  backing.setItem("fsr.reports", JSON.stringify(arr));
};

export const isValidJob = (v) => {
  const t = v.trim().toUpperCase();
  if (!t.startsWith("J#")) return false;
  const digits = t.slice(2);
  if (digits.length < 2 || digits.length > 5) return false;
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (c < "0" || c > "9") return false;
  }
  return true;
};

export const clampJob = (raw) => {
  let v = raw.toUpperCase();
  if (!v.startsWith("J#")) v = "J#" + v;
  const onlyDigits = v
    .slice(2)
    .split("")
    .filter((ch) => ch >= "0" && ch <= "9")
    .join("");
  return "J#" + onlyDigits.slice(0, 5);
};

export function formatRange(startAt, endAt) {
  try {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const sameDay = s.toDateString() === e.toDateString();
    const dFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    const tFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
    if (sameDay) return `${dFmt.format(s)} • ${tFmt.format(s)} – ${tFmt.format(e)}`;
    return `${dFmt.format(s)} ${tFmt.format(s)} → ${dFmt.format(e)} ${tFmt.format(e)}`;
  } catch {
    return `${fmtDateTime(startAt)} → ${fmtDateTime(endAt)}`;
  }
}

export function computeDowntimeMinutes(startAt, endAt) {
  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diffMs / 60000);
  } catch {
    return 0;
  }
}

export const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const defaultDocsByType = {
  Inspection: ["Field Service Report", "Inspection Sheet", "Service Summary"],
  Warranty: ["Field Service Report", "Service Summary"],
  Service: ["Field Service Report", "Service Summary"],
  "Start Up": [
    "Field Service Report",
    "Startup Checklist",
    ACCEPTANCE_CERT_DOC_NAME,
    MOTOR_TEST_DOC_NAME,
    "Service Summary",
  ],
};

export const makeDocs = (type) =>
  (defaultDocsByType[type] || ["Field Service Report"]).map((n) =>
    n === "Field Service Report"
      ? { id: uid(), name: n, done: false, data: makeEmptyFsrDocData() }
      : n === "Service Summary"
      ? { id: uid(), name: n, done: false, data: makeEmptyServiceSummaryData() }
      : isAcceptanceCertDocName(n)
      ? { id: uid(), name: ACCEPTANCE_CERT_DOC_NAME, done: false, data: makeEmptyAcceptanceCertificationData() }
      : isMotorTestDocName(n)
      ? { id: uid(), name: MOTOR_TEST_DOC_NAME, done: false, data: makeEmptyMotorTestData() }
      : { id: uid(), name: n, done: false, data: {} },
  );

export function makeEmptyServiceSummaryData() {
  return {
    serialNumberText: "",
    servicePerformed: "",
    supervisorNameEmail: "",
    acceptanceDate: "",
    supervisorSignature: "",
    managerNameEmail: "",
    managerSignature: "",
    tech1: "",
    tech2: "",
    pmContact: "",
    customerContact: "",
    additionalNotes: "",
    timeLogs: [{ id: uid(), date: "", timeIn: "", timeOut: "", travelTime: "", signature: "" }],
  };
}

// Service Summary prune: remove keys no longer present in UI
const shouldPruneServiceSummary = (name) => {
  if (typeof name !== "string") return false;
  return name.trim().toLowerCase() === "service summary";
};

const pruneServiceSummaryDocData = (data) => {
  if (!data || typeof data !== "object") return data;
  const next = { ...data };
  let mutated = false;
  ["reasonForVisit", "partsReplaced", "pflowServiceTechnician"].forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(next, k)) {
      delete next[k];
      mutated = true;
    }
  });
  return mutated ? next : data;
};

const migrateReportsPruneServiceSummary = (reports) => {
  if (!Array.isArray(reports)) {
    return { reports: [], changed: false };
  }
  let changed = false;
  const migrated = reports.map((report) => {
    if (!report || typeof report !== "object") return report;
    if (!Array.isArray(report.documents)) return report;
    let docsChanged = false;
    const nextDocs = report.documents.map((doc) => {
      if (!doc || typeof doc !== "object") return doc;
      if (!shouldPruneServiceSummary(doc.name)) return doc;
      const nextData = pruneServiceSummaryDocData(doc.data);
      if (nextData === doc.data) return doc;
      docsChanged = true;
      return { ...doc, data: nextData };
    });
    if (!docsChanged) return report;
    changed = true;
    return { ...report, documents: nextDocs };
  });
  return { reports: changed ? migrated : reports, changed };
};

const escAttr = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildReportHtml(report, user) {
  const title = `Field Service Report`;
  const subtitle = `${report.jobNo} • ${report.tripType}${
    report.model ? ` • Model ${report.model}` : ""
  } — ${formatRange(report.startAt, report.endAt)}`;

  const userName = typeof user?.name === "string" && user.name.trim() ? user.name.trim() : null;
  const userEmail = typeof user?.email === "string" && user.email.trim() ? user.email.trim() : null;

  const company = {
    name: "PFlow Industries",
    techName: userName || "F. Madera",
    techTitle: "Field Service Tech",
    email: userEmail || "fernandocm@pflow.com",
    phone: "414-426-2643",
  };

  const docsHTML = (report.documents || []).length
    ? (report.documents || [])
        .map((d) => `<div>${d.done ? "☑" : "☐"} ${esc(d.name || "Untitled document")}</div>`)
        .join("")
    : `<div>☐ Field Service Report</div>`;

  const serialHTML = report.serialTagImageUrl
    ? `<div class="serial"><div><b>Serial Tag</b><div class="note">Attached</div></div><img src="${escAttr(
        report.serialTagImageUrl,
      )}" alt="Serial tag photo"/></div>`
    : `<div class="serial"><div><b>Serial Tag</b><div class="note">${
        report.serialTagMissing ? "Not available (checked)" : "Not provided"
      }</div></div></div>`;

  const sharedSite = typeof report.sharedSite === "object" && report.sharedSite ? report.sharedSite : {};

  const acceptanceDoc = (report.documents || []).find((d) => isAcceptanceCertDocName(d?.name));
  const acceptanceData = ensureAcceptanceCertificationData(acceptanceDoc?.data);
  const hasAcceptanceData = acceptanceDoc ? acceptanceCertificationDocHasContent(acceptanceDoc.data) : false;

  const motorDoc = (report.documents || []).find((d) => isMotorTestDocName(d?.name));
  const motorData = motorDoc ? ensureMotorTestData(motorDoc.data) : makeEmptyMotorTestData();
  const hasMotorData = motorDoc ? motorTestDocHasContent(motorDoc.data) : false;

  const renderMotorVoltageTable = (title, values) => {
    const cell = (key) => {
      const raw = values[key] || "";
      return raw && raw.trim() ? esc(raw) : "&mdash;";
    };
    return `
      <div>
        <div class="motor-subtitle">${esc(title)}</div>
        <table class="entry-table motor-table">
          <thead>
            <tr><th>L1-L2</th><th>L1-L3</th><th>L2-L3</th></tr>
          </thead>
          <tbody>
            <tr><td>${cell("l1l2")}</td><td>${cell("l1l3")}</td><td>${cell("l2l3")}</td></tr>
            <tr><th>L1-G</th><th>L2-G</th><th>L3-G</th></tr>
            <tr><td>${cell("l1g")}</td><td>${cell("l2g")}</td><td>${cell("l3g")}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const renderMotorCurrentsTable = (currents) => {
    const value = (direction, load, key) => {
      const raw = currents?.[direction]?.[load]?.[key] || "";
      return raw && raw.trim() ? esc(raw) : "&mdash;";
    };
    return `
      <table class="entry-table motor-table">
        <thead>
          <tr>
            <th></th>
            <th colspan="3">Unloaded (Amps)</th>
            <th colspan="3">Full Load (Amps)</th>
          </tr>
          <tr>
            <th></th>
            <th>T1</th><th>T2</th><th>T3</th>
            <th>T1</th><th>T2</th><th>T3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Up</th>
            <td>${value("up", "unloaded", "t1")}</td>
            <td>${value("up", "unloaded", "t2")}</td>
            <td>${value("up", "unloaded", "t3")}</td>
            <td>${value("up", "full", "t1")}</td>
            <td>${value("up", "full", "t2")}</td>
            <td>${value("up", "full", "t3")}</td>
          </tr>
          <tr>
            <th>Down</th>
            <td>${value("down", "unloaded", "t1")}</td>
            <td>${value("down", "unloaded", "t2")}</td>
            <td>${value("down", "unloaded", "t3")}</td>
            <td>${value("down", "full", "t1")}</td>
            <td>${value("down", "full", "t2")}</td>
            <td>${value("down", "full", "t3")}</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const acceptanceAddressParts = [
    acceptanceData.siteStreetAddress || sharedSite.siteStreetAddress || "",
    acceptanceData.siteMailingAddress || sharedSite.siteMailingAddress || "",
    [acceptanceData.siteCity || sharedSite.siteCity || "", acceptanceData.siteState || sharedSite.siteState || ""]
      .filter(Boolean)
      .join(", "),
    acceptanceData.siteZip || sharedSite.siteZip || "",
  ]
    .map((part) => (part || "").trim())
    .filter(Boolean);

  const acceptanceHeaderSegments = [
    `Job: ${esc(acceptanceData.jobName || sharedSite.jobName || report.jobNo || "-")}`,
    `Serial: ${esc(acceptanceData.pflowSerialNumber || sharedSite.serialNumberText || "-")}`,
    `Model: ${esc(acceptanceData.modelNumber || report.model || "-")}`,
    `Address: ${esc(acceptanceAddressParts.join(", ") || "-")}`,
  ];

  const acceptanceModelChecksHTML = `
    <div class="model-checks">
      ${ACCEPTANCE_CERT_MODEL_KEYS.map(
        (key) => `<span class="model-check">${acceptanceData.modelChecks?.[key] ? "☑" : "☐"} ${esc(key)}</span>`,
      ).join("")}
      ${
        acceptanceData.modelOther && acceptanceData.modelOther.trim()
          ? `<span class="model-check">Other: ${esc(acceptanceData.modelOther)}</span>`
          : ""
      }
    </div>
  `;

  const acceptanceFmtCell = (value) => {
    const str = typeof value === "string" ? value.trim() : "";
    return str ? esc(str) : "&mdash;";
  };

  const acceptanceFmtMultiline = (value) => {
    const str = typeof value === "string" ? value.trim() : "";
    return str ? esc(str).replace(/\n/g, "<br/>") : "&mdash;";
  };

  const acceptancePhoneCell = (() => {
    const phone = (acceptanceData.customerContactPhone || "").trim();
    const ext = (acceptanceData.customerContactExt || "").trim();
    if (!phone && !ext) return "&mdash;";
    if (phone && ext) return `${esc(phone)} ext ${esc(ext)}`;
    if (phone) return esc(phone);
    return `Ext ${esc(ext)}`;
  })();

  const acceptanceGateLabel = (() => {
    if (acceptanceData.gateInterlock === "yes") return "Yes";
    if (acceptanceData.gateInterlock === "no") return "No";
    if (acceptanceData.gateInterlock === "na") return "Not Applicable";
    return "—";
  })();

  const acceptanceContactHTML = `
    <table class="entry-table">
      <tbody>
        <tr>
          <th>Customer Contact</th>
          <td>${acceptanceFmtCell(acceptanceData.customerContactName)}</td>
          <th>Title</th>
          <td>${acceptanceFmtCell(acceptanceData.customerContactTitle)}</td>
        </tr>
        <tr>
          <th>Company</th>
          <td>${acceptanceFmtCell(acceptanceData.customerCompany)}</td>
          <th>Phone / Ext</th>
          <td>${acceptancePhoneCell}</td>
        </tr>
        <tr>
          <th>Email</th>
          <td>${acceptanceFmtCell(acceptanceData.customerContactEmail)}</td>
          <th>Startup Date</th>
          <td>${acceptanceFmtCell(acceptanceData.startupDate)}</td>
        </tr>
        <tr>
          <th>Load Capacity</th>
          <td colspan="3">${acceptanceFmtCell(acceptanceData.loadCapacity)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const acceptanceTestsHTML = `
    <table class="entry-table">
      <tbody>
        <tr>
          <th>Load Test Completed</th>
          <td>${acceptanceData.loadTest.yes ? "Yes" : "No"}</td>
          <th>% of Lift Capacity</th>
          <td>${acceptanceFmtCell(acceptanceData.loadTest.percent)}</td>
        </tr>
        <tr>
          <th>Operation Test Completed</th>
          <td>${acceptanceData.operationTestYes ? "Yes" : "No"}</td>
          <th>Operation Comments</th>
          <td>${acceptanceFmtMultiline(acceptanceData.operationComments)}</td>
        </tr>
        <tr>
          <th>Gate / Interlock</th>
          <td>${acceptanceGateLabel}</td>
          <th>Customer Initials</th>
          <td>${acceptanceFmtCell(acceptanceData.customerInitials)}</td>
        </tr>
        <tr>
          <th>Other Test 1</th>
          <td colspan="3">${acceptanceFmtMultiline(acceptanceData.otherTest1)}</td>
        </tr>
        <tr>
          <th>Other Test 2</th>
          <td colspan="3">${acceptanceFmtMultiline(acceptanceData.otherTest2)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const acceptancePersonnelHTML = `
    <table class="entry-table">
      <thead>
        <tr>
          <th>Personnel Instructed — Operation &amp; PM</th>
          <th>Company</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${acceptanceFmtCell(acceptanceData.instructed1.name)}</td>
          <td>${acceptanceFmtCell(acceptanceData.instructed1.company)}</td>
        </tr>
        <tr>
          <td>${acceptanceFmtCell(acceptanceData.instructed2.name)}</td>
          <td>${acceptanceFmtCell(acceptanceData.instructed2.company)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const acceptanceSignoffHTML = `
    <table class="entry-table">
      <tbody>
        <tr>
          <th>Accepted By</th>
          <td>${acceptanceFmtCell(acceptanceData.acceptedByName)}</td>
          <th>Title</th>
          <td>${acceptanceFmtCell(acceptanceData.acceptedByTitle)}</td>
        </tr>
        <tr>
          <th>Company</th>
          <td>${acceptanceFmtCell(acceptanceData.acceptedByCompany)}</td>
          <th>Acceptance Date</th>
          <td>${acceptanceFmtCell(acceptanceData.acceptanceDate)}</td>
        </tr>
        <tr>
          <th>PFlow Representative</th>
          <td>${acceptanceFmtCell(acceptanceData.pflowRepName)}</td>
          <th>Phone</th>
          <td>${acceptanceFmtCell(acceptanceData.pflowRepPhone)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const acceptanceNotesHTML = acceptanceData.acceptanceNotes.trim()
    ? `<div class="note">${esc(acceptanceData.acceptanceNotes).replace(/\n/g, "<br/>")}</div>`
    : "";

  const acceptanceHTML = hasAcceptanceData
    ? `<div class="section">
        <div class="section-title">${esc(ACCEPTANCE_CERT_DOC_NAME)}</div>
        <div class="note">${acceptanceHeaderSegments.join(" • ")}</div>
        ${acceptanceModelChecksHTML}
        ${acceptanceContactHTML}
        ${acceptanceTestsHTML}
        ${acceptancePersonnelHTML}
        ${acceptanceSignoffHTML}
        ${acceptanceNotesHTML}
      </div>`
    : "";

  const motorAddressParts = [
    motorData.siteStreetAddress || sharedSite.siteStreetAddress || "",
    motorData.siteCity || sharedSite.siteCity || "",
    motorData.siteState || sharedSite.siteState || "",
    motorData.siteZip || sharedSite.siteZip || "",
  ]
    .map((part) => (part || "").trim())
    .filter(Boolean);

  const motorHeaderSegments = [
    `Job: ${esc(motorData.jobName || sharedSite.jobName || report.jobNo || "-")}`,
    `PFlow Serial Number: ${esc(motorData.pflowSerialNumber || sharedSite.serialNumberText || "-")}`,
    `Model: ${esc(motorData.modelNumber || report.model || "-")}`,
    `Address: ${esc(motorAddressParts.join(", ") || "-")}`,
  ];

  const motorModelsHTML = `
    <div class="model-checks">
      ${MOTOR_TEST_MODEL_KEYS.map(
        (key) => `<span class="model-check">${motorData.modelChecks?.[key] ? "☑" : "☐"} ${esc(key)}</span>`,
      ).join("")}
      ${
        motorData.modelOther && motorData.modelOther.trim()
          ? `<span class="model-check">Other: ${esc(motorData.modelOther)}</span>`
          : ""
      }
    </div>
  `;

  const motorLoadsHTML = `
    <table class="entry-table motor-table">
      <thead><tr><th>Rated Load</th><th>Tested Load</th></tr></thead>
      <tbody><tr><td>${motorData.ratedLoad?.trim() ? esc(motorData.ratedLoad) : "&mdash;"}</td><td>${
        motorData.testedLoad?.trim() ? esc(motorData.testedLoad) : "&mdash;"
      }</td></tr></tbody>
    </table>
  `;

  const motorInfoHTML = `
    <table class="entry-table motor-table">
      <thead><tr><th>Manufacturer</th><th>Serial #</th><th>Schematic #</th><th>HP</th><th>VAC</th><th>RPM</th><th>FLA</th></tr></thead>
      <tbody><tr>
        <td>${motorData.motor.manufacturer?.trim() ? esc(motorData.motor.manufacturer) : "&mdash;"}</td>
        <td>${motorData.motor.serialNumber?.trim() ? esc(motorData.motor.serialNumber) : "&mdash;"}</td>
        <td>${motorData.motor.schematicNumber?.trim() ? esc(motorData.motor.schematicNumber) : "&mdash;"}</td>
        <td>${motorData.motor.hp?.trim() ? esc(motorData.motor.hp) : "&mdash;"}</td>
        <td>${motorData.motor.vac?.trim() ? esc(motorData.motor.vac) : "&mdash;"}</td>
        <td>${motorData.motor.rpm?.trim() ? esc(motorData.motor.rpm) : "&mdash;"}</td>
        <td>${motorData.motor.fla?.trim() ? esc(motorData.motor.fla) : "&mdash;"}</td>
      </tr></tbody>
    </table>
  `;

  const motorSignoffHTML = `
    <table class="entry-table motor-table">
      <thead><tr><th>Signature</th><th>Name (Print)</th><th>Title</th><th>Service Company</th><th>Test Date</th></tr></thead>
      <tbody><tr>
        <td>${motorData.testedBySignature?.trim() ? esc(motorData.testedBySignature) : "&mdash;"}</td>
        <td>${motorData.testedByName?.trim() ? esc(motorData.testedByName) : "&mdash;"}</td>
        <td>${motorData.testedByTitle?.trim() ? esc(motorData.testedByTitle) : "&mdash;"}</td>
        <td>${motorData.serviceCompany?.trim() ? esc(motorData.serviceCompany) : "&mdash;"}</td>
        <td>${motorData.testDate?.trim() ? esc(motorData.testDate) : "&mdash;"}</td>
      </tr></tbody>
    </table>
  `;

  const motorTestHTML = hasMotorData
    ? `<div class="section">
        <div class="section-title">${esc(MOTOR_TEST_DOC_NAME)}</div>
        <div class="note">${motorHeaderSegments.join(" • ")}</div>
        ${motorModelsHTML}
        <div class="motor-grid">
          ${renderMotorVoltageTable("Measured Voltage (Incoming)", motorData.voltIncoming)}
          ${renderMotorVoltageTable("Measured Voltage (AFD Output)", motorData.voltAfd)}
        </div>
        <div class="motor-table-wrap">
          ${renderMotorCurrentsTable(motorData.currents)}
        </div>
        ${motorLoadsHTML}
        ${motorInfoHTML}
        ${motorSignoffHTML}
      </div>`
    : "";

  const fsrDoc = (report.documents || []).find((d) => (d.name || "").toLowerCase() === "field service report");
  const fsrData = ensureFsrDocData(fsrDoc?.data);
  const entries = fsrData.entries || [];
  const details = fsrData.details || {};

  const issueEntries = entries.filter((entry) => entry.type === "issue");
  const correctionEntries = entries.filter((entry) => entry.type === "correction");
  const orderPartEntries = entries.filter((entry) => entry.type === "orderParts");
  const docRequestEntries = entries.filter((entry) => entry.type === "docRequest");
  const followUpEntries = entries.filter((entry) => entry.type === "followUp");
  const commentaryEntries = entries.filter((entry) => entry.type === "commentary");

  const partsInstalledItems = (details.partsInstalled || [])
    .map((item) => cleanPartField(item.text))
    .filter(Boolean);

  const partsNeededRows = mergePartsNeeded(details.partsNeeded, orderPartEntries);

  const partNotes = orderPartEntries
    .map((entry, idx) => ({ idx: idx + 1, note: cleanPartField(entry.note) }))
    .filter((item) => item.note);

  const renderNoteWithFallback = (note, fallback = "(No description)") => {
    const value = typeof note === "string" ? note.trim() : "";
    if (!value) return `<div class="note muted">${esc(fallback)}</div>`;
    return `<div class="note">${esc(value)}</div>`;
  };

  const renderPhotos = (photos, altPrefix, { showCaptions = false } = {}) => {
    const safePhotos = (photos || []).filter((photo) => photo && photo.imageUrl);
    if (!safePhotos.length) return "";
    return `<div class="photo-grid">${safePhotos
      .map((photo, idx) => {
        const caption = showCaptions && photo.caption
          ? `<figcaption class="photo-caption">${esc(photo.caption)}</figcaption>`
          : "";
        return `<figure class="photo-card"><img src="${escAttr(photo.imageUrl)}" alt="${escAttr(
          `${altPrefix} ${idx + 1}`,
        )}"/>${caption}</figure>`;
      })
      .join("")}</div>`;
  };

  const coreDetailsBlocks = [];
  const workSummary = cleanPartField(details.workSummary);
  if (workSummary) {
    coreDetailsBlocks.push(`
      <div class="entry">
        <div class="entry-title">Work Summary</div>
        <div class="note">${esc(workSummary)}</div>
      </div>
    `);
  }

  commentaryEntries.forEach((entry, idx) => {
    coreDetailsBlocks.push(`
      <div class="entry">
        <div class="entry-title">Commentary #${idx + 1} — ${esc(fmtDateTime(entry.createdAt))}</div>
        ${renderNoteWithFallback(entry.note, "(No commentary)")}
      </div>
    `);
  });

  const coreDetailsHTML = coreDetailsBlocks.length
    ? `<div class="section"><div class="section-title">Core Details</div>${coreDetailsBlocks.join("")}</div>`
    : "";

  const partsInstalledHTML = partsInstalledItems.length
    ? `<div class="section"><div class="section-title">Parts Installed</div><ul class="simple-list">${partsInstalledItems
        .map((item) => `<li>${esc(item)}</li>`)
        .join("")}</ul></div>`
    : "";

  const partsNeededHTML = partsNeededRows.length
    ? `<div class="section"><div class="section-title">Parts Needed</div><table class="entry-table"><thead><tr><th>Part #</th><th>Description</th><th>Qty</th></tr></thead><tbody>${partsNeededRows
        .map(
          (row) => `<tr><td>${esc(row.partNo || "-")}</td><td>${esc(row.desc || "-")}</td><td>${esc(row.qty || "-")}</td></tr>`,
        )
        .join("")}</tbody></table>${
        partNotes.length
          ? `<div class="note muted">Order notes:</div><ul class="simple-list">${partNotes
              .map((item) => `<li>Order ${item.idx}: ${esc(item.note)}</li>`)
              .join("")}</ul>`
          : ""
      }</div>`
    : "";

  const correctionsHTML = correctionEntries.length
    ? `<div class="section"><div class="section-title">Corrections</div>${correctionEntries
        .map(
          (entry, idx) => `
            <div class="entry">
              <div class="entry-title">Correction #${idx + 1} — ${esc(fmtDateTime(entry.createdAt))}</div>
              ${renderNoteWithFallback(entry.note, "(No description)")}
              ${renderPhotos(entry.photos, "Correction photo")}
            </div>
          `,
        )
        .join("")}</div>`
    : "";

  const docRequestsHTML = docRequestEntries.length
    ? `<div class="section"><div class="section-title">Document Requests</div>${docRequestEntries
        .map(
          (entry, idx) => `
            <div class="entry">
              <div class="entry-title">Document Request #${idx + 1} — ${esc(fmtDateTime(entry.createdAt))}</div>
              <div class="note">Requested: ${esc(docRequestLabel(entry.docKind))}</div>
              ${entry.docNotes && entry.docNotes.trim() ? `<div class="note">${esc(entry.docNotes)}</div>` : ""}
            </div>
          `,
        )
        .join("")}</div>`
    : "";

  const followUpsHTML = followUpEntries.length
    ? `<div class="section"><div class="section-title">Follow-Ups</div><table class="entry-table"><thead><tr><th>Title</th><th>Details</th></tr></thead><tbody>${followUpEntries
        .map(
          (entry) => `<tr><td>${esc(entry.followUp?.title || "")}</td><td>${esc(entry.followUp?.details || "")}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : "";

  const issuesHTML = issueEntries.length
    ? `<div class="section"><div class="section-title">Issues</div>${issueEntries
        .map(
          (iss, idx) => `
            <div class="entry">
              <div class="entry-title">Issue #${idx + 1} — ${esc(fmtDateTime(iss.createdAt))}</div>
              ${renderNoteWithFallback(iss.note, "(No description)")}
              ${renderPhotos(iss.photos, "Issue photo")}
            </div>
          `,
        )
        .join("")}</div>`
    : "";

  const fieldPhotosHTML = renderPhotos(report.photos, "Field photo", { showCaptions: true });
  const fieldPicturesSection = fieldPhotosHTML
    ? `<div class="section"><div class="section-title">Field Pictures</div>${fieldPhotosHTML}</div>`
    : "";

  const generatedAt = new Date().toLocaleString();

  const styles = `
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
    .page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.5in; }
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding-bottom:12px; }
    .title { font-size: 26px; font-weight: 800; }
    .subtitle { color:#666; margin-top:4px; font-size: 13px; }
    .tech { text-align:right; font-size: 12px; line-height: 1.35; }
    .serial { margin-top: 12px; display:flex; gap: 12px; align-items:flex-start; }
    .serial img { max-height: 140px; border:1px solid #eee; border-radius:8px; }
    .section { margin-top: 18px; padding-top: 12px; border-top: 1px solid #eee; }
    .section-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
    .entry { margin-top: 10px; page-break-inside: avoid; }
    .entry-title { font-weight: 600; font-size: 13px; color:#111827; margin-bottom: 4px; }
    .note { margin-top: 8px; white-space: pre-wrap; font-size: 13px; }
    .note.muted { color:#6b7280; font-style: italic; }
    .simple-list { margin: 0; padding-left: 20px; font-size: 13px; }
    .simple-list li { margin-bottom: 4px; }
    .entry-table { width:100%; border-collapse: collapse; margin-top:6px; font-size:13px; }
    .entry-table th, .entry-table td { border:1px solid #e5e7eb; padding:6px; text-align:left; vertical-align:top; }
    .entry-table th { background:#f3f4f6; }
    .photo-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-top:10px; }
    .photo-card { border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff; }
    .photo-card img { width:100%; height:auto; display:block; }
    .photo-caption { margin:0; padding:6px 8px; font-size:12px; color:#374151; background:#f9fafb; }
    .model-checks { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; font-size:13px; }
    .model-check { display:flex; align-items:center; gap:4px; }
    .motor-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:12px; }
    .motor-subtitle { font-weight:600; font-size:13px; margin-bottom:4px; }
    .motor-table { font-size:13px; }
    .motor-table th { background:#f9fafb; }
    .motor-table-wrap { margin-top:12px; }
    .footer { text-align:center; color:#888; font-size: 11px; margin-top: 24px; }
    @media print { body { background: white; } }
  `;

  const body = `
    <div class="page">
      <div class="hdr">
        <div>
          <div class="title">${esc(title)}</div>
          <div class="subtitle">${esc(subtitle)}</div>
        </div>
        <div class="tech">
          ${esc(company.name)}<br/>
          ${esc(`${company.techName} — ${company.techTitle}`)}<br/>
          Email: ${esc(company.email)}<br/>
          Phone: ${esc(company.phone)}
        </div>
      </div>

      ${serialHTML}

      <div class="section">
        <div class="section-title">Documents</div>
        <div class="note">${docsHTML}</div>
      </div>

      ${acceptanceHTML}
      ${motorTestHTML}
      ${coreDetailsHTML}
      ${partsInstalledHTML}
      ${partsNeededHTML}
      ${correctionsHTML}
      ${docRequestsHTML}
      ${followUpsHTML}
      ${issuesHTML}
      ${fieldPicturesSection}

      <div class="footer">Generated by FSR Demo • ${esc(generatedAt)}</div>
    </div>
  `;

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${styles}</style></head><body>${body}</body></html>`;
}

export function exportReport(report, user) {
  const html = buildReportHtml(report, user);
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function exportFieldPictures(report) {
  const title = `Field Pictures — ${report.jobNo}`;
  const styles = `
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin:0; padding:24px;}
    h1{font-size:22px; margin:0 0 12px 0;}
    .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:12px;}
    .card{border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff;}
    .card img{width:100%; height:220px; object-fit:cover; display:block;}
    .cap{padding:8px 10px; font-size:12px; color:#374151; background:#f9fafb;}
  `;
  const photos = (report.photos || []).filter((p) => p && p.imageUrl);
  const grid = photos.length
    ? `<div class="grid">${photos
        .map(
          (p, idx) => `<div class="card"><img src="${escAttr(p.imageUrl)}" alt="${escAttr(
            `Field photo ${idx + 1}`,
          )}"/>${p.caption ? `<div class="cap">${esc(p.caption)}</div>` : ""}</div>`,
        )
        .join("")}</div>`
    : `<p style="color:#4b5563;">No field pictures attached.</p>`;
  const body = `<h1>${esc(title)}</h1>${grid}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${styles}</style></head><body>${body}</body></html>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
