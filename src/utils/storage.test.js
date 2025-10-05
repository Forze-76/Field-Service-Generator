import { describe, expect, it } from "vitest";
import { createScopedStorage, toScopedKey } from "./storage";

const createMemoryStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};

describe("storage.scoped", () => {
  it("prefixes fsr keys with the active user id", () => {
    const base = createMemoryStorage();
    const scopedA = createScopedStorage("user-a", base);
    const scopedB = createScopedStorage("user-b", base);

    scopedA.setItem("fsr.reports", "alpha");
    scopedB.setItem("fsr.reports", "bravo");

    expect(base.getItem("fsr.user-a.reports")).toBe("alpha");
    expect(base.getItem("fsr.user-b.reports")).toBe("bravo");
    expect(scopedA.getItem("fsr.reports")).toBe("alpha");
    expect(scopedB.getItem("fsr.reports")).toBe("bravo");
  });

  it("respects reserved keys without additional scoping", () => {
    const base = createMemoryStorage();
    const scoped = createScopedStorage("user-a", base);
    scoped.setItem("fsr.currentUserId", "user-a");
    expect(base.getItem("fsr.currentUserId")).toBe("user-a");
  });

  it("exposes helper key conversion", () => {
    expect(toScopedKey("fsr.tripTypes", "user-a")).toBe("fsr.user-a.tripTypes");
    expect(toScopedKey("app.settings", "user-a")).toBe("app.settings");
  });
});
