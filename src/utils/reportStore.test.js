import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { loadReportsFromIndexedDb, saveReportsToIndexedDb } from "./reportStore";

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

describe("reportStore", () => {
  it("migrates existing localStorage reports on first load", async () => {
    const indexedDBImpl = new IDBFactory();
    const legacyStorage = createMemoryStorage();
    const legacyReports = [{ id: "report-1", jobNo: "J#20021", documents: [] }];
    legacyStorage.setItem("fsr.reports", JSON.stringify(legacyReports));

    const first = await loadReportsFromIndexedDb({
      scopeId: "tech-a",
      legacyStorage,
      indexedDBImpl,
    });
    legacyStorage.setItem("fsr.reports", "[]");
    const second = await loadReportsFromIndexedDb({
      scopeId: "tech-a",
      legacyStorage,
      indexedDBImpl,
    });

    expect(first.migrated).toBe(true);
    expect(first.persistence).toBe("indexedDB");
    expect(second.reports).toEqual(legacyReports);
  });

  it("round-trips reports and keeps user scopes separate", async () => {
    const indexedDBImpl = new IDBFactory();
    const legacyStorage = createMemoryStorage();

    await saveReportsToIndexedDb([{ id: "alpha" }], { scopeId: "tech-a", indexedDBImpl });
    await saveReportsToIndexedDb([{ id: "bravo" }], { scopeId: "tech-b", indexedDBImpl });

    const alpha = await loadReportsFromIndexedDb({ scopeId: "tech-a", legacyStorage, indexedDBImpl });
    const bravo = await loadReportsFromIndexedDb({ scopeId: "tech-b", legacyStorage, indexedDBImpl });

    expect(alpha.reports).toEqual([{ id: "alpha" }]);
    expect(bravo.reports).toEqual([{ id: "bravo" }]);
  });

  it("falls back to legacy storage when IndexedDB is unavailable", async () => {
    const legacyStorage = createMemoryStorage();
    legacyStorage.setItem("fsr.reports", JSON.stringify([{ id: "legacy" }]));

    const result = await loadReportsFromIndexedDb({
      scopeId: "tech-a",
      legacyStorage,
      indexedDBImpl: null,
    });

    expect(result.persistence).toBe("localStorage-fallback");
    expect(result.reports).toEqual([{ id: "legacy" }]);
  });

  it("saves to legacy storage when IndexedDB is unavailable", async () => {
    const legacyStorage = createMemoryStorage();

    const result = await saveReportsToIndexedDb([{ id: "fallback" }], {
      scopeId: "tech-a",
      legacyStorage,
      indexedDBImpl: null,
    });

    expect(result.persistence).toBe("localStorage-fallback");
    expect(JSON.parse(legacyStorage.getItem("fsr.reports"))).toEqual([{ id: "fallback" }]);
  });
});
