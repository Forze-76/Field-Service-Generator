import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const BUILD_LOG_FLAG = "__fsrBuildLogged__";

const resolveEnvValue = (keys, fallback = "") => {
  for (const key of keys) {
    const value = import.meta.env?.[key];
    if (value) return value;
  }
  return fallback;
};

if (typeof window !== "undefined" && !window[BUILD_LOG_FLAG]) {
  const branch =
    resolveEnvValue([
      "VITE_GIT_BRANCH",
      "VITE_BRANCH",
      "VERCEL_GIT_COMMIT_REF",
      "GIT_BRANCH",
    ]) || import.meta.env.MODE || "unknown";
  const sha =
    resolveEnvValue([
      "VITE_GIT_SHA",
      "VITE_COMMIT_SHA",
      "VITE_COMMIT",
      "VERCEL_GIT_COMMIT_SHA",
      "GIT_COMMIT_SHA",
    ]) || "unknown";
  const time =
    resolveEnvValue([
      "VITE_BUILD_TIME",
      "VITE_APP_BUILD_TIME",
      "VITE_COMMIT_TIME",
    ]) || new Date().toISOString();
  window[BUILD_LOG_FLAG] = true;
  console.info(`Build ${branch}@${sha} ${time}`);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
