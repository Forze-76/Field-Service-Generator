import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import buildInfo, { buildLabel } from './utils/buildInfo'

if (typeof console !== 'undefined') {
  const fullSha = buildInfo.sha && buildInfo.sha !== 'unknown' ? ` (full: ${buildInfo.sha})` : ''
  console.info(`[Build info] ${buildLabel}${fullSha}`)
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
