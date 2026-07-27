/**
 * ADD THIS AS A NEW FILE in Apps Script (do not delete your existing files).
 * Name the file: UserSync
 *
 * Then add the small hooks at the top of your existing doGet / doPost
 * (see comments at the bottom of this file).
 */

const USER_SYNC_SHEET = "AppUsers";

const USER_SYNC_HEADERS = [
  "Id", "Name", "Username", "Email", "Password", "Active",
  "Dashboard", "Create Tickets", "Edit Tickets", "Export Data", "Sync Sheet", "Manage Users",
  "View Assets", "Manage Assets"
];

/** Call at the very start of doGet. Returns a response or null to continue. */
function userSyncHandleDoGet_(e) {
  const resource = e && e.parameter && e.parameter.resource;
  if (resource === "users") {
    return userSyncBuildResponse_({ ok: true, users: userSyncReadUsers_() }, e);
  }
  return null;
}

/** Call at the very start of doPost (after JSON.parse). Returns a response or null. */
function userSyncHandleDoPost_(data, e) {
  if (data && data.action === "syncUsers") {
    userSyncWriteUsers_(data.users || []);
    return userSyncBuildResponse_({ ok: true }, e);
  }
  return null;
}

/** Call before returning ticket data from doGet to include users for the web app. */
function userSyncAttachUsers_(payload) {
  payload.users = userSyncReadUsers_();
  return payload;
}

function userSyncEnsureSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(USER_SYNC_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(USER_SYNC_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(USER_SYNC_HEADERS);
  }

  return sheet;
}

function userSyncReadUsers_() {
  const sheet = userSyncEnsureSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map((row) => userSyncRowToUser_(row));
}

function userSyncWriteUsers_(users) {
  const sheet = userSyncEnsureSheet_();
  const rows = users.map((user) => userSyncUserToRow_(user));

  if (sheet.getLastRow() > 0) {
    sheet.clearContents();
  }

  sheet.appendRow(USER_SYNC_HEADERS);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, USER_SYNC_HEADERS.length).setValues(rows);
  }
}

function userSyncUserToRow_(user) {
  const rights = user.rights || {};
  return [
    user.id || "",
    user.name || "",
    user.username || user.name || "",
    user.email || "",
    user.password || "",
    user.active === false ? "No" : "Yes",
    rights.dashboard ? "Yes" : "No",
    rights.createTicket ? "Yes" : "No",
    rights.editTicket ? "Yes" : "No",
    rights.exportData ? "Yes" : "No",
    rights.syncSheet ? "Yes" : "No",
    rights.manageUsers ? "Yes" : "No",
    rights.viewAssets ? "Yes" : "No",
    rights.manageAssets ? "Yes" : "No"
  ];
}

function userSyncRowToUser_(row) {
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    username: String(row[2] || ""),
    email: String(row[3] || ""),
    password: String(row[4] || ""),
    active: userSyncIsTruthy_(row[5]),
    rights: {
      dashboard: userSyncIsTruthy_(row[6]),
      createTicket: userSyncIsTruthy_(row[7]),
      editTicket: userSyncIsTruthy_(row[8]),
      exportData: userSyncIsTruthy_(row[9]),
      syncSheet: userSyncIsTruthy_(row[10]),
      manageUsers: userSyncIsTruthy_(row[11]),
      viewAssets: userSyncIsTruthy_(row[12]),
      manageAssets: userSyncIsTruthy_(row[13])
    }
  };
}

function userSyncIsTruthy_(value) {
  return /^(yes|true|1)$/i.test(String(value || "").trim());
}

function userSyncBuildResponse_(payload, e) {
  const callback = e && e.parameter && e.parameter.callback;
  const body = JSON.stringify(payload);

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${body});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/*
 * MERGE HOOKS — edit your existing doGet / doPost only (keep everything else):
 *
 * function doGet(e) {
 *   const userOnly = userSyncHandleDoGet_(e);
 *   if (userOnly) return userOnly;
 *
 *   ... your existing ticket read logic ...
 *
 *   return buildResponse_(userSyncAttachUsers_({ ok: true, tickets }), e);
 * }
 *
 * function doPost(e) {
 *   const lock = LockService.getScriptLock();
 *   lock.waitLock(30000);
 *   try {
 *     const data = JSON.parse(e.postData.contents);
 *
 *     const userSync = userSyncHandleDoPost_(data, e);
 *     if (userSync) return userSync;
 *
 *     ... your existing ticket append / row-move POST logic ...
 *   } finally {
 *     lock.releaseLock();
 *   }
 * }
 */
