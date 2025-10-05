const RESERVED_KEYS = new Set(["fsr.users", "fsr.deviceSalt", "fsr.currentUserId"]);

const SCOPE_PREFIX = "fsr.";

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return null;
};

export const toScopedKey = (key, userId) => {
  if (!key.startsWith(SCOPE_PREFIX)) return key;
  if (RESERVED_KEYS.has(key)) return key;
  const segments = key.split(".");
  if (segments.length >= 3) {
    return key;
  }
  if (!userId) return key;
  const suffix = segments.slice(1).join(".");
  return `${SCOPE_PREFIX}${userId}.${suffix}`;
};

export const createScopedStorage = (userId, storage) => {
  const backing = resolveStorage(storage);
  if (!backing) {
    throw new Error("localStorage is not available in this environment");
  }
  return {
    scopeId: userId || "",
    key: (rawKey) => toScopedKey(rawKey, userId),
    getItem: (rawKey) => backing.getItem(toScopedKey(rawKey, userId)),
    setItem: (rawKey, value) => backing.setItem(toScopedKey(rawKey, userId), value),
    removeItem: (rawKey) => backing.removeItem(toScopedKey(rawKey, userId)),
    clear: () => backing.clear(),
    backing,
  };
};

export const listGlobalFsrKeys = (storage) => {
  const backing = resolveStorage(storage);
  if (!backing) return [];
  const keys = [];
  for (let i = 0; i < backing.length; i += 1) {
    const key = backing.key(i);
    if (!key) continue;
    if (!key.startsWith(SCOPE_PREFIX)) continue;
    if (RESERVED_KEYS.has(key)) continue;
    const segments = key.split(".");
    if (segments.length === 2) {
      keys.push(key);
    }
  }
  return keys;
};

export const hasUserScopedData = (storage) => {
  const backing = resolveStorage(storage);
  if (!backing) return false;
  for (let i = 0; i < backing.length; i += 1) {
    const key = backing.key(i);
    if (!key) continue;
    if (!key.startsWith(SCOPE_PREFIX)) continue;
    if (RESERVED_KEYS.has(key)) continue;
    const segments = key.split(".");
    if (segments.length >= 3) {
      return true;
    }
  }
  return false;
};
