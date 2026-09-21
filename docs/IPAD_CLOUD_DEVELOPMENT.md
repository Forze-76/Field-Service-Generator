# iPad cloud development with GitHub Codespaces

GitHub Codespaces runs the repository in a cloud development environment. The iPad only needs an internet connection; it does not need to share Wi-Fi with the Windows PC.

## Create the codespace

1. In Safari, open the repository on GitHub.
2. Select the `codex/ipad-pwa-foundation` branch.
3. Tap **Code**, then **Codespaces**, then **Create codespace on codex/ipad-pwa-foundation**.
4. Wait for dependency installation and the development server to start.
5. In the **Ports** panel, open port `5173`. The preview address will have this form:

   `https://CODESPACE-NAME-5173.app.github.dev`

The port is configured for HTTPS and remains private to the signed-in GitHub account.

## Authorize Google sign-in

Google requires the exact HTTPS preview origin:

1. Copy the Codespaces preview address without a trailing slash or path.
2. In Google Cloud Console, open **Google Auth Platform → Clients → Field Service Report Web App**.
3. Add the address under **Authorized JavaScript origins** and save.

The origin remains valid when the same codespace stops and restarts. A newly created codespace gets a different address and must be added separately.

## Work from the iPad

- Edit files in the browser-based VS Code editor.
- Use **Terminal → New Terminal** for Git and npm commands.
- Open the running application from the **Ports** panel.
- Commit and push only to the development branch until changes have been tested.

## Stop compute charges

Stop the codespace when finished. In GitHub, open **Codespaces**, tap the codespace menu, and choose **Stop codespace**. Restart the same codespace later to keep its files and preview hostname.
