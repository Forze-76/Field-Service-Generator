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
8. Generate the final field report and verify its text and photo order.

## Expected limitation

Do not use Airplane Mode for this run: the iPad must remain connected to the PC. A later HTTPS test is required for Add to Home Screen, app-like launching, and offline reloads.

## Stop the test server

Return to PowerShell and press `Ctrl+C`.
