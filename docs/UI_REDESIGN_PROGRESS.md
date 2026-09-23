# Field workflow redesign

Starting point: main / d9d8766. Branch: codex/field-workflow-redesign.

## Direction
Navy/teal field workspace, editable saved trip setup, shared headers, persistent stages, direct review/export. Reuse current data model, native export routines, import/authentication and IndexedDB. New trips follow suggested order; existing document order is preserved. Inspection and Startup Checklist remain explicitly unavailable.

User's replacement point 3 applies: full freedom to redesign FSR interactions while preserving capabilities, saved data and exports.

## Research
- https://www.nngroup.com/articles/progressive-disclosure/ — keep frequent tasks visible and reveal secondary details on demand; avoid rigid sequential stages for interdependent work.
- https://www.servicenow.com/docs/r/xanadu/field-service-management/work-offline-fieldservice-mobile.html — field apps explicitly support disconnected work. Preserve existing offline/save feedback and report storage.

## Milestone 1
Repository verified and dependencies installed. Implemented frontend setup gate derived from export requirements, draft creation without fabricated dates, responsive shell, phone report list, document statuses and navigation. Unsupported forms remain visible with explanatory text. No schema migration or backend changes.

## Verification
In progress. No passing test or judge score claimed yet.

## Next action
Run preflight, exercise actual browser workflows at tablet/phone widths, fix defects, obtain independent rendered-screen review, save screenshots and commit verified checkpoint. Do not merge/deploy.

## Milestone 2 — rendered workflow and focused refinements
- Unit suite expanded to 105 passing tests; lint and production build pass. Browser found blank draft dates crashing the shared input formatter; corrected it to preserve blank dates safely.
- Browser verified draft header gating, serial-tag gate, issue creation/edit/collapse, two attachment photos and order controls, internal entry/reorder, direct motor/acceptance navigation, parts/labor editing and document management. Native export smoke is being finalized with a synthetic template; do not interpret synthetic fixtures as production-template or Google OAuth acceptance.
- Independent judge's first score was 7.0; first focused refinement score was 7.7. Applied compact phone header, active-tab reveal, motor table scroll, skip unavailable Next stages, clearer template explanation and accessible entry labels. Final allowed refinement moves build stamp into normal footer flow and adds visible measurement scroll guidance. Judge final verification pending.
- Progress survived credit interruption. No code has been merged or deployed.

## Current next action
Finish scripts/ui-redesign-smoke.mjs, inspect native draft/completed downloads, obtain final judge result, update device checklist, rerun preflight, then commit and push this development branch. Keep unsupported Inspection/Startup forms and live OAuth/device limitations explicit.

## Final verified checkpoint — September 23, 2026

Implementation is ready for review on `codex/field-workflow-redesign`, based on `main` at `d9d8766`. No merge or deployment was performed.

### Delivered
- Navy/teal responsive Fieldwork shell; phone-accessible report library; build identity in a normal-flow footer.
- Manual/Gmail/ICS entry route into a saved setup draft. Blank dates remain blank. Applicable shared header requirements come from existing export readiness mappings; no signatures, work results or acceptance decisions are required at setup. Missing values link to their inputs. Existing saved work has a correction route.
- Persistent document stages, current-stage heading, supported next action, direct backwards/jump navigation, document add/remove/reorder controls. Existing saved document order is retained; new trips follow recommended order. Unavailable forms are clearly labeled and skipped by Next.
- Preserved FSR entry types, serial-tag gate, editing/collapse/reorder and internal separation. Added photo order controls, accessible entry labels, work-summary/installed-parts editing and numbered parts/labor review using existing data structures.
- Review/export entry point, selected-document review rows, actionable missing fields even before template sync, explicit once-per-device template instructions, existing draft/completed/batch behavior. Photo export is accessible; corrected the blank-window opener behavior while detaching the new window from its opener.
- Existing report/authentication/storage/import APIs and native export mappings retained; no new backend, database, schema migration or paid dependencies.

### Verification actually completed
- `npm run preflight`: lint passed, **105 tests in 25 files passed**, production build passed. Existing large-bundle (~953 kB minified JS) and stale browser-data warnings remain.
- `node scripts/ui-redesign-smoke.mjs`: live desktop Chromium at 1024×900 and 390×844 passed manual draft setup, blank dates, header gate, serial gate, two attachments and reorder, issue edit/collapse/reorder, internal entry, motor/acceptance navigation, pending acceptance, parts summary editing, document add/remove/reorder, photo-vault reorder and photo export popup, draft/completed DOCX download, completed-only batch download, completion invalidation, missing-field focus, phone report selection, save/reopen/reload, manual ICS import and duplicate reopening. No JavaScript page errors or FSR page-width overflow.
- Downloaded synthetic-template DOCX archives inspected: edited issue, serial 23456 and installed part are present; INTERNAL_SENTINEL is absent from customer output. This verifies the UI-to-export path, not production-template visual acceptance.
- Independent rendered review: initial 7.0, first refinement 7.7, final **7.8 overall**. All five design/usability categories score **8/10**; independent preservation confidence is **7/10**. Both allowed refinement rounds used. No unresolved critical visual defect observed. The overall 8/10 target was not fully reached; no score is represented as a full pass.

### Evidence and reproduction
`docs/screenshots/tablet-setup.png`, `tablet-workspace.png`, `tablet-review.png`, `phone-workspace.png`, `phone-reports.png`, plus independent `judge-*` screenshots. Screenshots use synthetic data and show the starting commit stamp because they were captured before committing this checkpoint.

To reproduce: `npm ci`, then `npm run preflight`, then install Chromium with `npx playwright install chromium` if necessary and run `node scripts/ui-redesign-smoke.mjs`. The smoke script starts/stops its own Vite process at 127.0.0.1:5173 and uses a fresh browser profile.

### Remaining limitations / exact next action
1. Review this development branch and screenshots with the user. Do not merge/deploy without approval.
2. Perform consolidated physical iPad/iPhone Safari acceptance in `docs/IPAD_TEST_RUN.md`, including live Gmail OAuth, Google Drive template sync, actual approved native templates, historical account data, camera/share/download, backup/restore and HTTPS offline behavior. Automated Gmail/auth/storage/export tests pass, but live Google consent and physical Safari were not established here.
3. Inspection Sheet and Startup Checklist remain unavailable forms; inspection answer mapping is still unfinished. They must not be represented as completed functional forms.
4. Reports remain device-local. Cross-device report synchronization was not added.

## Remote preservation blocker
Code checkpoint: `d0e4a06`. Automatic approval review rejected `git push -u origin codex/field-workflow-redesign` because the current turn did not explicitly authorize exporting repository code to the GitHub remote. No alternate push route was attempted. The changes are committed locally; remote preservation is not confirmed.

Exact next action: obtain explicit user approval to push the committed redesign branch to `Forze-76/Field-Service-Generator`, then run the push and verify the remote branch. This is separate from approval to merge or deploy, neither of which has been performed.

## Push authorization received
The user explicitly approved saving/pushing this branch on September 23, 2026 ("Approved, save it."). The previous authorization blocker is resolved. Push this checkpoint to `origin/codex/field-workflow-redesign` and verify its remote SHA. Merge and deployment remain unapproved. Next product step: review the saved redesign and complete the remaining acceptance checks above.

The approved terminal push could not authenticate (no terminal GitHub credentials). Preservation uses the connected GitHub integration instead, with a commit based on the same starting revision and an identical final file tree. The remote commit ID can differ from local checkpoint IDs because commit metadata is generated by GitHub. Verify the remote tree hash against the local checkpoint before reporting success.
