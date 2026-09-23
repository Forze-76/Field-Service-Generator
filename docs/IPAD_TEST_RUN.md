# iPad local test run

This test checks the field-report workflow over the same Wi-Fi network. Because the URL uses HTTP, it does not verify Home Screen installation or true offline/service-worker behavior.

## Start on the Windows PC

1. Connect the PC and iPad to the same private Wi-Fi network.
2. Open PowerShell in the project folder.
3. Run `npm install` if dependencies are not already installed.
4. Run `npm run ipad:test`.
5. Copy the `Network` URL printed by Vite (for example, `http://192.168.1.25:5173`).
6. If Windows Firewall asks, allow access on private networks only.

## Open on the iPad

1. Open the Network URL in Safari. Do not use Private Browsing.
2. Use dummy customer and job details for this test.
3. Create a report, edit each section, and confirm the save indicator reaches **Saved on this iPad**.
4. Add photos from the Photo Library and Camera, close the report, reopen it, and verify the photos remain.
5. Refresh Safari and verify the report still appears.
6. From the user menu, open **Backup & Restore**, tap **Create backup**, and save the JSON file to Files or iCloud Drive.
7. Make a visible change, then restore the backup. Review the preview and confirm replacement only when the report count is correct.
8. In the user menu, open **Export Documents**, tap **Sync Start Up**, and grant read-only Google Drive access.
9. Confirm the approved Start Up templates appear with their filenames and formats. Close and reopen the app, then confirm the templates remain available from the device cache.
10. Open a report, return to **Export Documents**, and export each available template.
11. Open every output in its native app and verify the original layout is retained: PDFs in a PDF viewer, DOCX files in Word, and the XLSX workbook in Excel.
12. Confirm the job, site, model, serial number, date, technician, and report-detail fields contain the report's data.
13. Generate the final field report and verify its text and photo order.

## Final acceptance checklist

Complete this checklist after all remaining development points are merged:

- [ ] Open the deployed HTTPS app in regular Safari on the field iPad and confirm the expected build stamp is visible.
- [ ] Connect Gmail with read-only access, select a real invitation by subject, and compare its job, site, dates and contacts with the email.
- [ ] Confirm importing the same invitation again through Gmail or manual ICS opens the existing report instead of creating a duplicate.
- [ ] Open **Export Documents**, tap every displayed missing-field button, and confirm Safari opens the correct document tab, scrolls to the correct input and focuses it.
- [ ] Fill the missing fields and confirm the document changes from **Draft** to **Ready to mark complete**.
- [ ] Mark the document complete and confirm it changes to **Completed** and becomes eligible for **Export All Completed**.
- [ ] Clear one required field and confirm the document is removed from completed batch eligibility until the field is restored.
- [ ] Export an unfinished document and confirm its filename begins with `DRAFT`.
- [ ] Export the completed version and confirm `DRAFT` is absent from its filename.
- [ ] Open/share the exported DOCX in Word, PDFs in a PDF viewer and XLSX in Excel; verify job, numeric serial, model, site, contacts, dates and technician.
- [ ] Confirm customer documents exclude Internal entries and the internal report includes them.
- [ ] Confirm numbered parts/labor rows, long notes, extra pages and photo order are correct.
- [ ] Complete the full save/reopen, backup/restore, phone navigation, Home Screen, offline reload and reconnection checks from the final workflow.

Templates are stored privately in the browser database on that iPad. They are not uploaded to GitHub. Clearing Safari website data removes them, so keep the originals in OneDrive or Files for recovery.

## Expected limitation

Do not use Airplane Mode for this run: the iPad must remain connected to the PC. A later HTTPS test is required for Add to Home Screen, app-like launching, and offline reloads.

## Stop the test server

Return to PowerShell and press `Ctrl+C`.

## Frontend redesign acceptance (development branch)

Branch: `codex/field-workflow-redesign`. Do not merge or deploy until the finished result is approved.

- [ ] Import a real Gmail invitation and a manual ICS; verify dates, site and contacts; confirm missing model/serial stay blank and all imported values remain editable.
- [ ] Save an incomplete setup draft, close Safari, reopen it, and finish the actionable header checklist. Verify Start report remains unavailable until applicable headers are present.
- [ ] Open an older report with incomplete headers and existing work; use Access saved work for correction and confirm no existing entries/photos are lost.
- [ ] On phone, open Reports, select a saved trip, navigate backwards/jump ahead, and use Next. Check active-tab visibility and local sideways scrolling of motor measurements.
- [ ] Add/remove/reorder applicable document pages. Confirm Inspection and Startup Checklist are clearly unavailable; they are not completed forms.
- [ ] Confirm the serial-tag photo / None available gate, then add/edit/collapse/reorder entries and multiple photos. Verify internal notes remain internal in exported documents.
- [ ] Review report details and numbered parts/labor rows, including installed parts, parts orders and correction labor.
- [ ] Leave acceptance pending; export other completed documents. Correct missing fields from Review & export and confirm focus goes to the intended input.
- [ ] Check draft/completed native filenames, completed-only batch export, photo export, Safari share/download behavior and real approved template formatting.
- [ ] Verify camera/photo library picker, touch targets, onscreen keyboard, portrait/landscape, focus, VoiceOver and footer build stamp on physical iPad/iPhone.
- [ ] Repeat backup/restore and HTTPS offline/reconnection tests above. Reports remain device-local; template synchronization is not report synchronization.

Desktop Chromium evidence is recorded in `docs/UI_REDESIGN_PROGRESS.md`; it does not substitute for physical Safari acceptance.
