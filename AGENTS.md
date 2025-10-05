# How to work in this repo

## Install & run
- Node 18+ (prefer 20)
- Commands:
  - Install: npm ci
  - Dev: npm run dev
  - Build: npm run build
  - Preview: npm run preview

## Tech
- Vite + React + Tailwind + lucide-react
- Front-end only; localStorage keys: fsr.reports, fsr.tripTypes
- iPad-friendly UI; compact forms

## Guardrails
- Keep Serial Tag gate before allowing issues.
- Keep Export buttons and behavior intact (report + photos).
- Preserve data shape for saved reports (don’t break localStorage schema).
- Keep parts tables + report details in FSR.

## Definition of done
- Dev server runs with no console errors.
- Build succeeds.
- Manual smoke: create report → attach serial tag or “None available” → add issue → fill Service Summary → export.
