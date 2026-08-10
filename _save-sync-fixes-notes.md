# Save / Sync Fixes (Waves A–C) — Deploy Notes

**Date:** 2026-08-10  
**Cache buster:** `app.js?v=177`, `styles.css?v=175`

## Apps Script redeploy (required)

**2026-08-10 sync speed + busy-lock:** Redeploy is required for server-side speedups and prior busy-lock / Ticket ID identity fixes.

Portal sheet writes will not pick up server-side identity checks, soft-delete, Ticket ID column, busy/lock handling, status conflict guards, or the speed path until you redeploy:

1. Open the Apps Script project bound to the Tasks spreadsheet.
2. Replace **all** script code with the contents of `google-apps-script-full-merged.gs` from this repo.
3. Deploy → **Manage deployments** → edit the existing Web app deployment → **New version** → Deploy.
4. Confirm the Web app URL still matches `Auth.SHEET_WEB_APP_URL` / the portal config.
5. First successful create/update after redeploy will add a **Ticket ID** column header if missing.

Until redeploy: the client (`?v=177`) still avoids double GET races and skips a blocking post-save refresh when parent notes are returned, but server speedups (header cache, deferred emails, audit/users cache, `lite=1`) will not be active.

## Soft-delete behavior

Deletes now set Status to `Deleted` and hide the row instead of `sheet.deleteRow`, so later row numbers stay stable. Soft-deleted rows are omitted from GET ticket lists.

## Speed findings (2026-08-10)

**Why sync felt slow**
- Every save scheduled deferred work by **deleting + recreating** a ScriptApp trigger (often 1–3s).
- Approval emails still ran on the request path after the lock (Gmail latency on save).
- Each update re-read Tasks headers many times (`getMaxColumns` + per-column ensure) and re-read the written row.
- Compact GET always joined TaskAudit + re-read users/hierarchy; client raced **HTTP + JSONP** (double Apps Script work).
- Subtask completion forced a **blocking full refresh** after a successful update.

**Safe speedups shipped**
- Coalesce deferred triggers (update queue only if a trigger already exists).
- Fully defer approval emails off the save critical path.
- Per-invocation Tasks header cache + single-pass column ensure; skip post-write row re-read.
- Cache TaskAudit / users / hierarchy briefly; `lite=1` skips audit on auto-refresh.
- Client: HTTP then JSONP fallback (no dual race); apply `parentNotes` locally; bump `lastSheetRefreshAt` after save.

**Expected improvement**
- Save critical path no longer waits for email or trigger churn; typical update should feel closer to “sheet write only.”
- Auto-refresh load roughly halved vs dual HTTP+JSONP, with lighter payloads when redeployed.

## Dist mirrors

Root `app.js` / `google-apps-script-full-merged.gs` mirrored to:

- `dist/TarmalTaskTicketing/`
- `dist/TarmalITPortal-CopyReady/`
