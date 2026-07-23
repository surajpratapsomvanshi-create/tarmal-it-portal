# Tarmal Task Ticketing App

This is a simple browser-based ticketing tool that matches the columns visible in your Google Sheet and Power BI report.

## Files

- `index.html` opens the app.
- `styles.css` controls the layout and visual design.
- `app.js` stores local previews and sends tickets to Google Sheets.
- `google-apps-script.gs` is the Google Sheet backend script.

## Connect It To Google Sheets

1. Open your Google Sheet.
2. Go to `Extensions` > `Apps Script`.
3. Paste the contents of `google-apps-script-combined.gs` (replaces both old script files).
4. Confirm the sheet tab is named `Tasks`. The script will auto-create an `AppUsers` tab for login accounts.
5. Click `Deploy` > `Manage deployments` > edit > `New version` > `Deploy` (or create a new deployment).
6. Set `Execute as` to `Me`.
7. Set `Who has access` to `Anyone with the link` or your organization option.
8. Copy the Web App URL.
9. Open `auth.js` and paste the URL in `SHEET_WEB_APP_URL`.

### User sync

Users are stored in the **AppUsers** sheet tab and sync across all computers.
After creating a user on one machine, click **Refresh Users** on another machine (or reopen the app).

## Expected Sheet Columns

The script appends data in this order:

`Task`, `Priority`, `Owner`, `Raised By`, `Status`, `Type`, `Start date`, `End date`, `Milestone`, `Notes`, `Bhanu List`

If your live sheet has a different column order, adjust the `row` array in `google-apps-script.gs` to match it.

## Power BI

Once the row appears in Google Sheets, refresh the Power BI report or scheduled dataset refresh. The Power BI report will only update after it refreshes its data source.
