# Field Service Generator completion plan

Audit date: September 22, 2026. Source: `codex/ipad-pwa-foundation` at `4cdb350`.

## Current baseline

- Manual calendar `.ics` import, branch/build stamp, local report storage, backup/restore, native template sync and export readiness are implemented.
- Gmail invite picker is absent from this branch. Earlier work reported local commit `3190478`; that implementation is not available in this checkout. Recover its patch or reimplement against this baseline.
- Report storage is device-local. The account menu still labels report synchronization as coming soon; Google Drive template synchronization does not synchronize reports.
- Startup Checklist and other unsupported document tabs render a placeholder instead of a form.

## Ordered remaining work

1. **Make native document exports complete and trustworthy.** Validate the actual approved Start Up PDF/DOCX templates first. Unify header values across all documents: job, site/address, contacts, dates, technician, numeric serial and model. Keep missing facts blank and clearly identified. Native DOCX currently edits only `word/document.xml`, so inspect actual header/footer XML too. Implement numbered parts/labor rows and photo output; the current DOCX filler only substitutes text placeholders. Filter Internal entries out of customer documents; the current filler maps every entry regardless of its type and only changes a label for internal exports. Check long notes, page breaks, photo order, all PDF fields and signature/time-log handling. Pass: open real exported files and visually verify every required value and layout.
2. **Recover or rebuild Gmail invitation import.** Use read-only Gmail access, list invitations by subject/name, import the selected invitation into an editable report draft, retain manual ICS upload, and prevent duplicate imports. Verify Gmail API/OAuth scope and deployed origin with a real account. Preserve absent model/serial as blank. Correct and test date handling: current parser drops UTC/time-zone information and does not explicitly convert all-day exclusive end dates. Pass: selected invite's job, site, dates and contacts match the resulting draft and documents.
3. **Make readiness actionable.** Replace plain missing-field text with navigation to the corresponding form/input. Reconcile readiness with actual exported values (for example, serial fallback differs between readiness and DOCX). Distinguish incomplete draft export from completed documents. Pass: every reported missing field can be reached, filled and reflected in export readiness.
4. **Finish Inspection and Startup Checklist.** Implement the missing form UI and persist answers using compatible report data. Inspection XLSX currently writes only C6, B9, C9, D9, E9 and G9 in General Inspection; map the actual inspection answers, results and relevant sheets after inspecting the approved workbook. Pass: entered answers appear in the expected workbook cells without damaging formulas or formatting.
5. **Fix phone report navigation, then verify the complete field workflow on iPad/iPhone.** The saved-report sidebar uses `hidden md:block` and the home screen has no alternate saved-report list; provide a visible report picker at phone widths. Create/import report, verify serial-tag gate, add/reorder issues and photos, complete summary/acceptance/motor data, save, reopen, backup/restore and export. Test native file downloads/share sheets and batch exports in Safari. On HTTPS, test Home Screen installation, offline reload, reconnection and receiving a newer build. Confirm no unsaved data is lost. Desktop Chromium checks do not replace real Safari/device tests.
6. **Complete cross-device continuation.** Add report/photo synchronization with conflict handling if seamless iPhone/iPad continuation is required; until implemented, backup/restore is the explicit transfer path. Verify different devices receive the same report and preserve offline changes. Do not present template sync or a local PIN profile as cloud report sync.
7. **Release only after acceptance.** Run preflight and the workflow above, verify the branch/build stamp on the deployment, commit tested feature batches to this development branch, then merge/release after acceptance. Refresh the outdated iPad test instructions (they still describe a template-upload UI that is no longer in the current modal). Treat bundle splitting and browser-data updates as follow-up maintenance, not substitutes for functional acceptance.

## Validation in this audit

- Baseline preflight: lint passed; 68 tests passed and three Service Summary tests failed because prior renders remained mounted.
- Added explicit Testing Library cleanup after each test in `setupTests.js`.
- After cleanup: all 71 tests across 21 files pass; lint and production build pass.
- Build emits an oversized-bundle warning (approximately 831 kB minified JavaScript) and stale browser compatibility data notices.
- Desktop Chromium smoke (1024×768): created a local test profile/report, confirmed the serial-tag gate, added an issue, filled Service Summary, saved, reloaded, reopened and verified both saved values. Export readiness correctly required missing templates. No page runtime errors were observed. This run did not produce native files because real templates were not installed.
- Actual customer template visual checks, authenticated Gmail/Drive checks and physical iPad/iPhone acceptance remain outstanding. Automated native-template tests alone do not establish that every production document is complete.

This commit records the completion plan and repairs test isolation; it does not claim to implement the remaining features.
