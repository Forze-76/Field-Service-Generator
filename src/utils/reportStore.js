import { loadReports, saveReports } from "./fsr";

export const REPORT_DB_NAME = "field-service-generator";
export const REPORT_DB_VERSION = 2;
export const REPORT_STORE_NAME = "report-data";
export const TEMPLATE_STORE_NAME = "document-templates";
export const REPORT_SCHEMA_VERSION = 2;

const reportKey = (scopeId) => `reports:${scopeId || "default"}`;

const resolveIndexedDb = (indexedDBImpl) => {
  if (indexedDBImpl) return indexedDBImpl;
  if (typeof globalThis !== "undefined") return globalThis.indexedDB;
  return undefined;
};

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });

export const openReportDatabase = (indexedDBImpl) => {
  const factory = resolveIndexedDb(indexedDBImpl);
  if (!factory) return Promise.reject(new Error("IndexedDB is not available"));

  return new Promise((resolve, reject) => {
    const request = factory.open(REPORT_DB_NAME, REPORT_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REPORT_STORE_NAME)) {
        database.createObjectStore(REPORT_STORE_NAME);
      }
      if (!database.objectStoreNames.contains(TEMPLATE_STORE_NAME)) {
        database.createObjectStore(TEMPLATE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open report database"));
    request.onblocked = () => reject(new Error("Report database upgrade is blocked"));
  });
};

const readRecord = async (database, key) => {
  const transaction = database.transaction(REPORT_STORE_NAME, "readonly");
  const value = await requestToPromise(transaction.objectStore(REPORT_STORE_NAME).get(key));
  await transactionDone(transaction);
  return value;
};

const writeRecord = async (database, key, value) => {
  const transaction = database.transaction(REPORT_STORE_NAME, "readwrite");
  transaction.objectStore(REPORT_STORE_NAME).put(value, key);
  await transactionDone(transaction);
};

const dataUrlToBlob = (dataUrl) => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return dataUrl;
  const mimeType = match[1] || "application/octet-stream";
  const binary = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

const blobToDataUrl = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
};

const isBlobValue = (value) =>
  value &&
  typeof value === "object" &&
  typeof value.arrayBuffer === "function" &&
  typeof value.type === "string";

const mapImageValues = async (value, direction) => {
  if (direction === "store" && typeof value === "string" && value.startsWith("data:image/")) {
    return dataUrlToBlob(value);
  }
  if (direction === "load" && isBlobValue(value)) {
    return blobToDataUrl(value);
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => mapImageValues(item, direction)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await mapImageValues(item, direction)]),
    );
    return Object.fromEntries(entries);
  }
  return value;
};

export const serializeReportsForStorage = (reports) => mapImageValues(reports, "store");
export const hydrateReportsFromStorage = (reports) => mapImageValues(reports, "load");

const validateRecord = (record) => {
  if (!record || !Array.isArray(record.reports)) return null;
  const version = Number(record.schemaVersion || 0);
  if (version > REPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported report schema version ${version}`);
  }
  return { ...record, schemaVersion: version };
};

export async function loadReportsFromIndexedDb({
  scopeId,
  legacyStorage,
  indexedDBImpl,
} = {}) {
  const factory = resolveIndexedDb(indexedDBImpl);
  if (!factory) {
    return {
      reports: loadReports(legacyStorage),
      migrated: false,
      persistence: "localStorage-fallback",
    };
  }

  let database;
  try {
    database = await openReportDatabase(factory);
  } catch {
    return {
      reports: loadReports(legacyStorage),
      migrated: false,
      persistence: "localStorage-fallback",
    };
  }
  try {
    const key = reportKey(scopeId);
    const storedRecord = await readRecord(database, key);
    const existing = validateRecord(storedRecord);
    if (existing) {
      let persistedReports = existing.reports;
      if (existing.schemaVersion < REPORT_SCHEMA_VERSION) {
        persistedReports = await serializeReportsForStorage(existing.reports);
        await writeRecord(database, key, {
          ...existing,
          schemaVersion: REPORT_SCHEMA_VERSION,
          reports: persistedReports,
          updatedAt: new Date().toISOString(),
          migratedFromSchema: existing.schemaVersion,
        });
      }
      return {
        reports: await hydrateReportsFromStorage(persistedReports),
        migrated: existing.schemaVersion < REPORT_SCHEMA_VERSION,
        persistence: "indexedDB",
      };
    }

    const legacyReports = loadReports(legacyStorage);
    const persistedReports = await serializeReportsForStorage(legacyReports);
    await writeRecord(database, key, {
      schemaVersion: REPORT_SCHEMA_VERSION,
      reports: persistedReports,
      updatedAt: new Date().toISOString(),
      migratedFrom: "localStorage",
    });
    return { reports: legacyReports, migrated: legacyReports.length > 0, persistence: "indexedDB" };
  } finally {
    database.close();
  }
}

export async function saveReportsToIndexedDb(
  reports,
  { scopeId, indexedDBImpl, legacyStorage } = {},
) {
  let database;
  try {
    database = await openReportDatabase(indexedDBImpl);
  } catch (error) {
    if (!legacyStorage) throw error;
    saveReports(Array.isArray(reports) ? reports : [], legacyStorage);
    return { persistence: "localStorage-fallback" };
  }
  try {
    const persistedReports = await serializeReportsForStorage(Array.isArray(reports) ? reports : []);
    await writeRecord(database, reportKey(scopeId), {
      schemaVersion: REPORT_SCHEMA_VERSION,
      reports: persistedReports,
      updatedAt: new Date().toISOString(),
    });
    return { persistence: "indexedDB" };
  } finally {
    database.close();
  }
}
