import { openReportDatabase, TEMPLATE_STORE_NAME } from "./reportStore";

export const TEMPLATE_CATALOG = [
  { id: "service-summary", label: "Service Summary", format: "pdf", match: /service summary.*\.pdf$/i, trips: ["service", "warranty", "start up", "inspection"] },
  { id: "acceptance-certification", label: "Acceptance Certification", format: "pdf", match: /acceptance certification.*\.pdf$/i, trips: ["start up"] },
  { id: "motor-test", label: "Motor Test Data Sheet", format: "pdf", match: /motor test data sheet.*\.pdf$/i, trips: ["start up"] },
  { id: "field-service-report", label: "Field Service Report", format: "docx", match: /^(?!internal).*field service report.*\.docx$/i, trips: ["service", "warranty", "start up", "inspection"] },
  { id: "internal-field-service-report", label: "Internal Field Service Report", format: "docx", match: /internal only.*field service report.*\.docx$/i, trips: ["service", "warranty", "start up", "inspection"] },
  { id: "inspection-workbook", label: "Inspection Workbook", format: "xlsx", match: /inspection template.*\.xlsx$/i, trips: ["inspection"] },
];

export const normalizeTripType = (tripType = "") => String(tripType).trim().toLowerCase();

export const templatesForTrip = (tripType = "") => {
  const normalized = normalizeTripType(tripType);
  return TEMPLATE_CATALOG.filter((template) => !template.trips || template.trips.includes(normalized));
};

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Template transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("Template transaction aborted"));
  });

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Template request failed"));
  });

export const identifyTemplate = (filename = "") =>
  TEMPLATE_CATALOG.find((template) => template.match.test(filename)) || null;

export async function saveTemplateFile(file, indexedDBImpl, metadata = {}) {
  const definition = identifyTemplate(file?.name || "");
  if (!definition) throw new Error(`Unrecognized template: ${file?.name || "unnamed file"}`);
  const normalizedTripType = normalizeTripType(metadata.tripType);
  const database = await openReportDatabase(indexedDBImpl);
  try {
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readwrite");
    transaction.objectStore(TEMPLATE_STORE_NAME).put({
      id: normalizedTripType ? `${normalizedTripType}:${definition.id}` : definition.id,
      templateId: definition.id,
      label: definition.label,
      format: definition.format,
      filename: file.name,
      blob: file,
      size: file.size,
      updatedAt: new Date().toISOString(),
      ...metadata,
      ...(normalizedTripType ? { tripType: normalizedTripType } : {}),
    });
    await transactionDone(transaction);
    return definition;
  } finally {
    database.close();
  }
}

export async function listStoredTemplates(indexedDBImpl) {
  const database = await openReportDatabase(indexedDBImpl);
  try {
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readonly");
    const records = await requestResult(transaction.objectStore(TEMPLATE_STORE_NAME).getAll());
    await transactionDone(transaction);
    return records;
  } finally {
    database.close();
  }
}

export async function getStoredTemplate(id, indexedDBImpl) {
  const database = await openReportDatabase(indexedDBImpl);
  try {
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readonly");
    const record = await requestResult(transaction.objectStore(TEMPLATE_STORE_NAME).get(id));
    await transactionDone(transaction);
    return record || null;
  } finally {
    database.close();
  }
}

export async function removeStoredTemplate(id, indexedDBImpl) {
  const database = await openReportDatabase(indexedDBImpl);
  try {
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readwrite");
    transaction.objectStore(TEMPLATE_STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
