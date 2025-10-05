import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createLocalAccount,
  ensureDeviceSalt,
  getCurrentUserId,
  loadUsers,
  migrateLegacyData,
  removeCurrentUserId,
  scopeStorageForUser,
  setCurrentUserId,
  signInWithPin,
} from "../utils/auth";

const AuthContext = createContext(null);

const resolveBaseStorage = () => {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  const memory = new Map();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => {
      memory.set(key, String(value));
    },
    removeItem: (key) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: (index) => Array.from(memory.keys())[index] ?? null,
    get length() {
      return memory.size;
    },
  };
};

export function AuthProvider({ children }) {
  const storageRef = useRef(null);
  if (storageRef.current === null) {
    storageRef.current = resolveBaseStorage();
  }
  const baseStorage = storageRef.current;

  const [status, setStatus] = useState("loading");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [lockedUser, setLockedUser] = useState(null);
  const [rememberSelection, setRememberSelection] = useState(true);
  const [initialEmail, setInitialEmail] = useState("");
  const [justSignedIn, setJustSignedIn] = useState(false);
  const clearJustSignedIn = useCallback(() => setJustSignedIn(false), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        ensureDeviceSalt(baseStorage);
        await migrateLegacyData(baseStorage);
        const loadedUsers = loadUsers(baseStorage);
        if (!mounted) return;
        setUsers(loadedUsers);
        const storedId = getCurrentUserId(baseStorage);
        if (storedId) {
          const existing = loadedUsers.find((user) => user.id === storedId);
          if (existing) {
            setCurrentUser(existing);
            setInitialEmail(existing.email || "");
            setStatus("ready");
            setJustSignedIn(false);
            return;
          }
          removeCurrentUserId(baseStorage);
        }
        setStatus("signedOut");
      } catch (error) {
        console.error("Failed to initialize auth", error);
        if (mounted) {
          setStatus("signedOut");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [baseStorage]);

  const scopedStorage = useMemo(() => {
    if (!currentUser) return null;
    return scopeStorageForUser(currentUser.id, baseStorage);
  }, [baseStorage, currentUser]);

  const handleSuccessfulAuth = ({ user, remember, snapshot }) => {
    if (snapshot) {
      setUsers(snapshot);
    } else {
      setUsers(loadUsers(baseStorage));
    }
    setCurrentUser(user);
    setInitialEmail(user.email || "");
    setLockedUser(null);
    setStatus("ready");
    setRememberSelection(remember);
    setJustSignedIn(true);
    if (remember) {
      setCurrentUserId(user.id, baseStorage);
    } else {
      removeCurrentUserId(baseStorage);
    }
  };

  const signIn = async ({ email, pin, remember }) => {
    const result = await signInWithPin({ email, pin, storage: baseStorage });
    if (!result.ok) {
      if (result.error === "not-found") {
        setInitialEmail(email.trim());
      }
      return result;
    }
    handleSuccessfulAuth({ user: result.user, remember, snapshot: result.users });
    return { ok: true, user: result.user };
  };

  const createAccount = async ({ email, pin, name, remember }) => {
    const result = await createLocalAccount({ email, pin, name, storage: baseStorage });
    if (!result.ok) {
      return result;
    }
    handleSuccessfulAuth({ user: result.user, remember, snapshot: result.users });
    return { ok: true, user: result.user };
  };

  const signOut = () => {
    setCurrentUser(null);
    setLockedUser(null);
    setStatus("signedOut");
    removeCurrentUserId(baseStorage);
    setJustSignedIn(false);
    setInitialEmail("");
  };

  const lock = () => {
    if (!currentUser) return;
    setLockedUser(currentUser);
    setInitialEmail(currentUser.email || "");
    setCurrentUser(null);
    setStatus("locked");
    setJustSignedIn(false);
    if (rememberSelection) {
      setCurrentUserId(currentUser.id, baseStorage);
    }
  };

  const switchUser = () => {
    setCurrentUser(null);
    setLockedUser(null);
    setStatus("signedOut");
    removeCurrentUserId(baseStorage);
    setJustSignedIn(false);
    setInitialEmail("");
  };

  const value = useMemo(
    () => ({
      status,
      users,
      currentUser,
      scopedStorage,
      rememberSelection,
      setRememberSelection,
      initialEmail,
      lockedUser,
      justSignedIn,
      signIn,
      createAccount,
      signOut,
      switchUser,
      lock,
      clearJustSignedIn,
    }),
    [
      status,
      users,
      currentUser,
      scopedStorage,
      rememberSelection,
      initialEmail,
      lockedUser,
      justSignedIn,
      clearJustSignedIn,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
