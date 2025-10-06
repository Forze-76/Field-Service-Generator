# Field Service Generator (Web)

Vite + React + Tailwind demo. Front-end only. Saves to localStorage.

## Quick start
npm ci
npm run dev
# open http://localhost:5173

## Build metadata badge

- The app header shows a build badge (`Build: <branch>@<short-sha> (<time>)`) next to the user menu and in export footers.
- Vite injects metadata at build time via `GIT_BRANCH`, `GIT_SHA`, and `BUILD_TIME` environment variables. Each value is optional.
  - `GIT_BRANCH`: human-readable branch name (defaults to `local-dev` or the current git branch).
  - `GIT_SHA`: full commit SHA. The badge shows the first 7 characters; clicking the badge copies the full SHA. Defaults to `unknown`.
  - `BUILD_TIME`: ISO timestamp. Defaults to the current time at build/dev startup.
- You can override these values for ad-hoc builds by exporting the variables before running `npm run dev` or `npm run build`, e.g.

  ```bash
  GIT_BRANCH=feature-x GIT_SHA=$(git rev-parse HEAD) BUILD_TIME=$(date -Iseconds) npm run build
  ```

- During local development without git metadata, the badge falls back to `local-dev@unknown` with the current timestamp.

## Build
npm run build
npm run preview
