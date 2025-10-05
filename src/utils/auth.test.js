import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCKOUT_DURATION_MS,
  createLocalAccount,
  getCurrentUserId,
  hashPin,
  loadUsers,
  migrateLegacyData,
  resetAuthThrottle,
  signInWithPin,
} from "./auth";
import { loadReports, loadTypes } from "./fsr";
import { createScopedStorage } from "./storage";

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

const createReport = (id) => ({ id, jobNo: `J#${id}`, tripType: "Service", model: "A" });

describe("auth.hashPin", () => {
  it("produces deterministic hashes for the same input", async () => {
    const hashA = await hashPin("device-salt", "tech@example.com", "123456");
    const hashB = await hashPin("device-salt", "tech@example.com", "123456");
    expect(hashA).toBe(hashB);
  });

  it("varies hash when email or pin changes", async () => {
    const base = await hashPin("device-salt", "tech@example.com", "123456");
    const differentEmail = await hashPin("device-salt", "other@example.com", "123456");
    const differentPin = await hashPin("device-salt", "tech@example.com", "654321");
    expect(base).not.toBe(differentEmail);
    expect(base).not.toBe(differentPin);
  });
});

describe("auth.migration", () => {
  it("moves global data into a default local user namespace", async () => {
    const storage = createMemoryStorage();
    storage.setItem("fsr.deviceSalt", "device-salt");
    storage.setItem("fsr.reports", JSON.stringify([createReport("001")]));
    storage.setItem("fsr.tripTypes", JSON.stringify(["Service", "Warranty"]));

    const result = await migrateLegacyData(storage);
    expect(result.migrated).toBe(true);

    const scopedReports = storage.getItem("fsr.local-default.reports");
    const scopedTypes = storage.getItem("fsr.local-default.tripTypes");
    expect(scopedReports).toBeTruthy();
    expect(scopedTypes).toBeTruthy();
    expect(storage.getItem("fsr.reports")).toBeNull();
    expect(storage.getItem("fsr.tripTypes")).toBeNull();

    const users = loadUsers(storage);
    const defaultUser = users.find((user) => user.id === "local-default");
    expect(defaultUser).toBeTruthy();
    expect(getCurrentUserId(storage)).toBe("local-default");

    const scoped = createScopedStorage("local-default", storage);
    const reports = loadReports(scoped);
    const types = loadTypes(scoped);
    expect(reports).toHaveLength(1);
    expect(types).toContain("Warranty");
  });
});

describe("auth.signIn", () => {
  let storage;

  beforeEach(async () => {
    storage = createMemoryStorage();
    storage.setItem("fsr.deviceSalt", "static-salt");
    resetAuthThrottle();
    const createResult = await createLocalAccount({
      email: "tech@example.com",
      pin: "123456",
      name: "Field Tech",
      storage,
    });
    expect(createResult.ok).toBe(true);
  });

  afterEach(() => {
    resetAuthThrottle();
    vi.useRealTimers();
  });

  it("authenticates with the correct PIN and updates last login", async () => {
    const result = await signInWithPin({ email: "tech@example.com", pin: "123456", storage });
    expect(result.ok).toBe(true);
    const updated = loadUsers(storage).find((user) => user.email === "tech@example.com");
    expect(updated?.lastLoginAt).toBeTruthy();
  });

  it("rejects incorrect PIN attempts", async () => {
    const result = await signInWithPin({ email: "tech@example.com", pin: "000000", storage });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid-pin");
  });

  it("throttles repeated failures after three attempts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    await signInWithPin({ email: "tech@example.com", pin: "000000", storage });
    await signInWithPin({ email: "tech@example.com", pin: "000000", storage });
    const third = await signInWithPin({ email: "tech@example.com", pin: "000000", storage });
    expect(third.ok).toBe(false);
    expect(third.error).toBe("throttled");
    expect(third.retryAt).toBe(Date.now() + LOCKOUT_DURATION_MS);

    vi.setSystemTime(new Date(Date.now() + LOCKOUT_DURATION_MS + 1));
    const success = await signInWithPin({ email: "tech@example.com", pin: "123456", storage });
    expect(success.ok).toBe(true);
  });
});
