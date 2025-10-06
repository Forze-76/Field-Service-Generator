/* global __BUILD_INFO__ */

const FALLBACK_BRANCH = "local-dev";
const FALLBACK_SHA = "unknown";

function parseBuildInfo() {
  const raw = typeof __BUILD_INFO__ !== "undefined" ? __BUILD_INFO__ : null;
  const branch = raw?.branch && typeof raw.branch === "string" ? raw.branch : FALLBACK_BRANCH;
  const sha = raw?.sha && typeof raw.sha === "string" ? raw.sha : FALLBACK_SHA;
  const shortSha = raw?.shortSha && typeof raw.shortSha === "string"
    ? raw.shortSha
    : sha && sha !== FALLBACK_SHA
      ? sha.slice(0, 7)
      : FALLBACK_SHA;
  const buildTime = raw?.buildTime && typeof raw.buildTime === "string" ? raw.buildTime : new Date().toISOString();
  return Object.freeze({ branch, sha, shortSha, buildTime });
}

const buildInfo = parseBuildInfo();

export const buildLabel = `Build: ${buildInfo.branch}@${buildInfo.shortSha} (${buildInfo.buildTime})`;

export default buildInfo;
