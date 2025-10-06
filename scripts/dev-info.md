# Dev diagnostics

- App boot emits a single `console.info` line: `Build <branch>@<sha> <time>`.
- The logger lives in `src/main.jsx` and is guarded by `window.__fsrBuildLogged__` to avoid duplicate logs during re-renders or HMR cycles.
- Branch and commit metadata are pulled from standard Vite `import.meta.env` keys with graceful fallbacks when CI does not supply values.
- Update the env vars (`VITE_GIT_BRANCH`, `VITE_GIT_SHA`, `VITE_BUILD_TIME`) in your build pipeline to surface richer metadata locally and in preview builds.
