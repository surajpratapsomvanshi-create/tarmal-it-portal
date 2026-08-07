# Save / Sync Fixes (Waves A–C) — Deploy Notes

**Date:** 2026-08-07  
**Cache buster:** `app.js?v=137`, `styles.css?v=100`

## Apps Script redeploy (required)

Portal sheet writes will not pick up server-side identity checks, soft-delete, Ticket ID column, busy/lock handling, or status conflict guards until you redeploy:

1. Open the Apps Script project bound to the Tasks spreadsheet.
2. Replace **all** script code with the contents of `google-apps-script-full-merged.gs` from this repo.
3. Deploy → **Manage deployments** → edit the existing Web app deployment → **New version** → Deploy.
4. Confirm the Web app URL still matches `Auth.SHEET_WEB_APP_URL` / the portal config.
5. First successful create/update after redeploy will add a **Ticket ID** column header if missing.

Until redeploy: the client still improves local merge/pending behavior, but server row safety (Task/Owner/ticketId verify, soft-delete, Completed←PA block) will not be active.

## Soft-delete behavior

Deletes now set Status to `Deleted` and hide the row instead of `sheet.deleteRow`, so later row numbers stay stable. Soft-deleted rows are omitted from GET ticket lists.

## Dist mirrors

Root `app.js` was mirrored to:

- `dist/TarmalTaskTicketing/app.js`
- `dist/TarmalITPortal-CopyReady/app.js`
