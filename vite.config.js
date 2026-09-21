import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

const gitValue = (args, fallback) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback
  } catch {
    return fallback
  }
}

const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME ||
  gitValue(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown')
const commit = process.env.GITHUB_SHA || gitValue(['rev-parse', '--short', 'HEAD'], 'unknown')
const buildTime = new Date().toISOString()

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(branch),
    'import.meta.env.VITE_GIT_SHA': JSON.stringify(commit),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime)
  },
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.js'
  }
})
