import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function readGit(command, fallback) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback
  } catch (error) {
    return fallback
  }
}

const envBranch = process.env.GIT_BRANCH && process.env.GIT_BRANCH.trim()
const envSha = process.env.GIT_SHA && process.env.GIT_SHA.trim()
const envBuildTime = process.env.BUILD_TIME && process.env.BUILD_TIME.trim()

const fullSha = envSha || readGit('git rev-parse HEAD', 'unknown')
const shortSha = fullSha && fullSha !== 'unknown' ? fullSha.slice(0, 7) : 'unknown'

const gitBranch = envBranch || readGit('git rev-parse --abbrev-ref HEAD', 'local-dev')
const normalizedBranch = gitBranch === 'HEAD' ? 'local-dev' : gitBranch

const buildInfo = {
  branch: normalizedBranch,
  sha: fullSha,
  shortSha,
  buildTime: envBuildTime || new Date().toISOString()
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.js'
  },
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo)
  }
})
