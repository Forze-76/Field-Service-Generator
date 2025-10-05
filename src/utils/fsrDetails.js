import { uid } from "./fsr";

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
