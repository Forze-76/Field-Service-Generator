import { uid } from "./id";

export const makeEmptyDetails = () => ({
  workSummary: "",
  partsInstalled: [],
  partsNeeded: [],
});

const cloneState = (details = {}) => ({
  workSummary: typeof details.workSummary === "string" ? details.workSummary : "",
  partsInstalled: Array.isArray(details.partsInstalled) ? [...details.partsInstalled] : [],
  partsNeeded: Array.isArray(details.partsNeeded) ? [...details.partsNeeded] : [],
});

const STORE_KEY = "__pflowFsrDetailsScopes";
const DEFAULT_SCOPE = "default";

const getStore = () => {
  const root = typeof globalThis !== "undefined" ? globalThis : {};
  if (!root[STORE_KEY]) {
    root[STORE_KEY] = new Map();
  }
  return root[STORE_KEY];
};

const scopedStore = getStore();

const scopeId = (scope) => {
  if (scope === undefined || scope === null || scope === "") return DEFAULT_SCOPE;
  return String(scope);
};

export function updateDetails(details, action) {
  const state = cloneState(details ?? makeEmptyDetails());
  switch (action?.type) {
    case "setWorkSummary": {
      return { ...state, workSummary: action.value ?? "" };
    }
    case "addPartInstalled": {
      const value = action.value?.trim();
      if (!value) return state;
      return {
        ...state,
        partsInstalled: [...state.partsInstalled, { id: action.id || uid(), text: value }],
      };
    }
    case "removePartInstalled": {
      if (!action?.id) return state;
      return {
        ...state,
        partsInstalled: state.partsInstalled.filter((item) => item.id !== action.id),
      };
    }
    case "addPartNeeded": {
      const value = action.value?.trim();
      if (!value) return state;
      return {
        ...state,
        partsNeeded: [...state.partsNeeded, { id: action.id || uid(), text: value }],
      };
    }
    case "removePartNeeded": {
      if (!action?.id) return state;
      return {
        ...state,
        partsNeeded: state.partsNeeded.filter((item) => item.id !== action.id),
      };
    }
    default:
      return state;
  }
}

export function ensureDetailsScope(scope) {
  const key = scopeId(scope);
  if (!scopedStore.has(key)) {
    scopedStore.set(key, makeEmptyDetails());
  }
  return scopedStore.get(key);
}

export function setDetailsScope(scope, details) {
  const key = scopeId(scope);
  const next = cloneState(details);
  scopedStore.set(key, next);
  return next;
}

export function updateDetailsInScope(scope, action) {
  const key = scopeId(scope);
  const current = ensureDetailsScope(scope);
  const next = updateDetails(current, action);
  scopedStore.set(key, next);
  return next;
}

export function clearDetailsScope(scope) {
  const key = scopeId(scope);
  scopedStore.delete(key);
}

export function resetDetailsScopes() {
  scopedStore.clear();
}
