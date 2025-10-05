import { uid } from "./id";
import { createScopedStorage, hasUserScopedData, listGlobalFsrKeys, toScopedKey } from "./storage";

export const USERS_KEY = "fsr.users";
export const CURRENT_USER_KEY = "fsr.currentUserId";
export const DEVICE_SALT_KEY = "fsr.deviceSalt";

const LOCKOUT_THRESHOLD = 3;
export const LOCKOUT_DURATION_MS = 10_000;

const attemptState = new Map();

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  throw new Error("localStorage is not available");
};

const getCrypto = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  throw new Error("Web Crypto API is not available");
};

const encoder = new TextEncoder();

const encodeBase64 = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(binary, "binary").toString("base64");
  }
  throw new Error("Base64 encoding is not supported in this environment");
};

const randomBytesBase64 = (size = 16) => {
  const arr = new Uint8Array(size);
  getCrypto().getRandomValues(arr);
  return encodeBase64(arr);
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const ensureDeviceSalt = (storage) => {
  const backing = resolveStorage(storage);
  let salt = backing.getItem(DEVICE_SALT_KEY);
  if (salt) return salt;
  salt = randomBytesBase64(16);
  backing.setItem(DEVICE_SALT_KEY, salt);
  return salt;
};

export const hashPin = async (deviceSalt, email, pin) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPin = String(pin ?? "").trim();
  const payload = `${deviceSalt}:${normalizedEmail}:${normalizedPin}`;
  const digest = await getCrypto().subtle.digest("SHA-256", encoder.encode(payload));
  return encodeBase64(digest);
};

export const loadUsers = (storage) => {
  const backing = resolveStorage(storage);
  try {
    const raw = backing.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (error) {
    console.error("Failed to parse local users", error);
    return [];
  }
};

export const saveUsers = (users, storage) => {
  const backing = resolveStorage(storage);
  backing.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUserId = (storage) => {
  const backing = resolveStorage(storage);
  return backing.getItem(CURRENT_USER_KEY);
};

export const setCurrentUserId = (userId, storage) => {
  const backing = resolveStorage(storage);
  if (!userId) {
    backing.removeItem(CURRENT_USER_KEY);
  } else {
    backing.setItem(CURRENT_USER_KEY, userId);
  }
};

export const createUserRecord = async ({ email, pin, name, storage }) => {
  const backing = resolveStorage(storage);
  const deviceSalt = ensureDeviceSalt(backing);
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const pinHash = await hashPin(deviceSalt, normalizedEmail, pin);
  const salt = randomBytesBase64(16);
  const cryptoRef = getCrypto();
  const id = typeof cryptoRef.randomUUID === "function" ? cryptoRef.randomUUID() : `user_${uid()}`;
  return {
    id,
    email: normalizedEmail,
    name: (name || "").trim(),
    pinHash,
    salt,
    createdAt: now,
    lastLoginAt: now,
  };
};

export const findUserByEmail = (email, users) => {
  const normalizedEmail = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
};

const getAttemptState = (email) => {
  const normalized = normalizeEmail(email);
  const existing = attemptState.get(normalized);
  if (existing) return existing;
  const fresh = { attempts: 0, lockedUntil: 0 };
  attemptState.set(normalized, fresh);
  return fresh;
};

export const resetAuthThrottle = () => {
  attemptState.clear();
};

const registerFailure = (email) => {
  const state = getAttemptState(email);
  const now = Date.now();
  if (state.lockedUntil && now >= state.lockedUntil) {
    state.lockedUntil = 0;
    state.attempts = 0;
  }
  state.attempts += 1;
  if (state.attempts >= LOCKOUT_THRESHOLD) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS;
    state.attempts = 0;
  }
  return state.lockedUntil ? { lockedUntil: state.lockedUntil } : null;
};

const clearFailures = (email) => {
  const normalized = normalizeEmail(email);
  attemptState.delete(normalized);
};

export const signInWithPin = async ({ email, pin, storage }) => {
  const backing = resolveStorage(storage);
  const normalizedEmail = normalizeEmail(email);
  const state = getAttemptState(normalizedEmail);
  const now = Date.now();
  if (state.lockedUntil && now < state.lockedUntil) {
    return { ok: false, error: "throttled", retryAt: state.lockedUntil };
  }

  const users = loadUsers(backing);
  const user = findUserByEmail(normalizedEmail, users);
  if (!user) {
    registerFailure(normalizedEmail);
    return { ok: false, error: "not-found" };
  }
  if (!user.pinHash) {
    clearFailures(normalizedEmail);
    return { ok: true, user, users };
  }

  const deviceSalt = ensureDeviceSalt(backing);
  const attemptHash = await hashPin(deviceSalt, normalizedEmail, pin);
  if (attemptHash !== user.pinHash) {
    const throttle = registerFailure(normalizedEmail);
    if (throttle) {
      return { ok: false, error: "throttled", retryAt: throttle.lockedUntil };
    }
    return { ok: false, error: "invalid-pin" };
  }

  clearFailures(normalizedEmail);
  const nextUsers = users.map((entry) =>
    entry.id === user.id ? { ...entry, lastLoginAt: new Date().toISOString() } : entry,
  );
  saveUsers(nextUsers, backing);
  const refreshedUser = nextUsers.find((entry) => entry.id === user.id) || user;
  return { ok: true, user: refreshedUser, users: nextUsers };
};

export const createLocalAccount = async ({ email, pin, storage, name }) => {
  const backing = resolveStorage(storage);
  const normalizedEmail = normalizeEmail(email);
  const users = loadUsers(backing);
  if (findUserByEmail(normalizedEmail, users)) {
    return { ok: false, error: "duplicate-email" };
  }
  const user = await createUserRecord({ email: normalizedEmail, pin, name, storage: backing });
  const nextUsers = [...users, user];
  saveUsers(nextUsers, backing);
  clearFailures(normalizedEmail);
  return { ok: true, user, users: nextUsers };
};

export const migrateLegacyData = async (storage) => {
  const backing = resolveStorage(storage);
  const globalKeys = listGlobalFsrKeys(backing);
  if (!globalKeys.length) {
    return { migrated: false, userCreated: false };
  }

  if (hasUserScopedData(backing)) {
    globalKeys.forEach((key) => backing.removeItem(key));
    return { migrated: true, userCreated: false };
  }

  const deviceSalt = ensureDeviceSalt(backing);
  const users = loadUsers(backing);
  let defaultUser = users.find((user) => user.id === "local-default");
  let userCreated = false;

  if (!defaultUser) {
    const defaultPin = "000000";
    const pinHash = await hashPin(deviceSalt, "(local)", defaultPin);
    defaultUser = {
      id: "local-default",
      email: "(local)",
      name: "Local Tech",
      pinHash,
      salt: randomBytesBase64(16),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.push(defaultUser);
    userCreated = true;
    saveUsers(users, backing);
  }

  globalKeys.forEach((key) => {
    const targetKey = toScopedKey(key, defaultUser.id);
    if (backing.getItem(targetKey) === null) {
      const value = backing.getItem(key);
      if (value !== null) {
        backing.setItem(targetKey, value);
      }
    }
    backing.removeItem(key);
  });

  if (!backing.getItem(CURRENT_USER_KEY)) {
    backing.setItem(CURRENT_USER_KEY, defaultUser.id);
  }

  return { migrated: true, userCreated };
};

export const removeCurrentUserId = (storage) => {
  const backing = resolveStorage(storage);
  backing.removeItem(CURRENT_USER_KEY);
};

export const scopeStorageForUser = (userId, storage) => createScopedStorage(userId, resolveStorage(storage));
