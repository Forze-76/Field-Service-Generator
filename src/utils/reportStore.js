import { loadReports, saveReports } from "./fsr";

export const REPORT_DB_NAME = "field-service-generator";
export const REPORT_DB_VERSION = 1;
export const REPORT_STORE_NAME = "report-data";
export const REPORT_SCHEMA_VERSION = 1;

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

const migrateRecord = (record) => {
  if (!record || !Array.isArray(record.reports)) return null;
  const version = Number(record.schemaVersion || 0);
  if (version > REPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported report schema version ${version}`);
  }
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reports: record.reports,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
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
    const existing = migrateRecord(storedRecord);
    if (existing) {
      if (existing.schemaVersion !== storedRecord.schemaVersion) {
        await writeRecord(database, key, existing);
      }
      return { reports: existing.reports, migrated: false, persistence: "indexedDB" };
    }

    const legacyReports = loadReports(legacyStorage);
    await writeRecord(database, key, {
      schemaVersion: REPORT_SCHEMA_VERSION,
      reports: legacyReports,
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
    await writeRecord(database, reportKey(scopeId), {
      schemaVersion: REPORT_SCHEMA_VERSION,
      reports: Array.isArray(reports) ? reports : [],
      updatedAt: new Date().toISOString(),
    });
    return { persistence: "indexedDB" };
  } finally {
    database.close();
  }
}
