# Gmail calendar invitation import

In **New Report**, choose **Choose from Gmail**, grant read-only access, and select an invitation by subject. Review the job, type, dates, site and contacts, choose the missing model, then create the report. **Import Calendar Invite** continues to accept a downloaded ICS file without Google sign-in.

The picker searches for `.ics` and `.ical` attachments, twenty messages per page. Use **Load older invitations** to continue. Calendar bodies without an attachment filename may not appear in that search; download their ICS file and use manual import. A calendar file must contain one event. Cancelled events and recurring series without a specific occurrence are rejected. Unknown time zones require an export containing its VTIMEZONE definition.

Timed events display in the device's time zone. All-day End shows 23:59 on the final included day, converting the calendar's exclusive end date. Missing model/serial information remains blank. Duplicate invitations reopen an existing report by calendar UID and recurrence instance; older reports without UID use a summary/date fallback. Updated invitations do not silently overwrite existing reports.

## Google project setup

The public OAuth client ID is in `src/utils/googleAuth.js`; the same client supports existing Drive template access. No client secret belongs in this front-end project.

1. Enable the Gmail API in the Google Cloud project that owns this OAuth client.
2. Configure its OAuth audience and consent screen for `https://www.googleapis.com/auth/gmail.readonly`. For a testing audience, include the account performing acceptance; production use must meet Google's applicable OAuth requirements.
3. Add the exact app origin (scheme, hostname and port) to the web client's authorized JavaScript origins. Local Vite and the deployed HTTPS origin are separate entries. This uses the Google Identity Services token popup flow.
4. On the deployed app, sign in with the intended account. Confirm the invitation list loads, select a real invite, compare dates/site/contacts, edit and save, reload, and verify manual/Gmail re-import opens the existing report. Repeat on the field iPad.
5. Test declining access and reconnecting. HTTP 401 requires reconnecting; HTTP 403 can indicate missing permission, a disabled API or account/project restrictions.

Only read-only Gmail scope is requested for this picker. Tokens stay in memory for the open report dialog and are never persisted with reports. Requests do not send messages, change labels or mark messages read. Saving a report persists its selected invitation metadata and imported details in the existing device-local report store.

Automated tests use synthetic API and OAuth responses. They cannot establish that live Google project settings, consent or authorized origins are correct.

References: [Gmail messages list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [Gmail attachments get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get), [Google Identity token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).
