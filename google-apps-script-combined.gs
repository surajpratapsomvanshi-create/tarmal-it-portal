const TASKS_SHEET = "Tasks";
const USERS_SHEET = "AppUsers";

const USER_HEADERS = [
  "Id", "Name", "Username", "Email", "Password", "Active",
  "Dashboard", "Create Tickets", "Edit Tickets", "Export Data", "Sync Sheet", "Manage Users",
  "View Assets", "Manage Assets"
];

const COLUMN_ALIASES = {
  task: ["task"],
  priority: ["priority"],
  owner: ["owner"],
  raisedBy: ["raised by", "raisedby", "requester"],
  status: ["status"],
  type: ["type"],
  startDate: ["start date", "start", "startdate"],
  endDate: ["end date", "end", "enddate"],
  milestone: ["milestone"],
  notes: ["notes", "remarks", "remark", "comment", "comments"],
  bhanuList: ["bhanu list", "bhanulist"]
};

const ATTACHMENTS_FOLDER_NAME = "Tarmal Ticket Screenshots";
const ATTACHMENTS_FOLDER_ID_KEY = "ATTACHMENTS_FOLDER_ID";

function sanitizeAttachmentName_(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "ticket";
}

function getOrCreateAttachmentsFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedFolderId = props.getProperty(ATTACHMENTS_FOLDER_ID_KEY);

  if (savedFolderId) {
    try {
      return DriveApp.getFolderById(savedFolderId);
    } catch (error) {
      Logger.log(error);
    }
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());
  const parents = spreadsheetFile.getParents();
  const parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existingFolders = parentFolder.getFoldersByName(ATTACHMENTS_FOLDER_NAME);
  const folderExists = existingFolders.hasNext();
  const folder = folderExists
    ? existingFolders.next()
    : parentFolder.createFolder(ATTACHMENTS_FOLDER_NAME);

  if (!folderExists) {
    folder.createFile(
      "README - Ticket Screenshots.txt",
      [
        "Tarmal Task Ticketing stores pasted ticket screenshots in this folder.",
        "Spreadsheet: " + spreadsheet.getName(),
        "Created: " + new Date().toString()
      ].join("\n"),
      MimeType.PLAIN_TEXT
    );
  }

  props.setProperty(ATTACHMENTS_FOLDER_ID_KEY, folder.getId());
  return folder;
}

function countFolderFiles_(folder) {
  let count = 0;
  const files = folder.getFiles();
  while (files.hasNext()) {
    files.next();
    count += 1;
  }
  return count;
}

function getAttachmentsFolderInfo_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const folder = getOrCreateAttachmentsFolder_();
  let parentName = "My Drive";

  try {
    const parents = folder.getParents();
    if (parents.hasNext()) {
      parentName = parents.next().getName();
    }
  } catch (error) {
    Logger.log(error);
  }

  return {
    id: folder.getId(),
    name: folder.getName(),
    url: "https://drive.google.com/drive/folders/" + folder.getId(),
    parentName: parentName,
    spreadsheetName: spreadsheet.getName(),
    fileCount: countFolderFiles_(folder)
  };
}

function saveTicketAttachments_(data) {
  const attachments = data.attachments || [];
  if (!attachments.length) return [];

  const folder = getOrCreateAttachmentsFolder_();
  const taskLabel = sanitizeAttachmentName_(data.Task);
  const ownerLabel = sanitizeAttachmentName_(data.Owner);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const links = [];

  attachments.forEach((attachment, index) => {
    const match = String(attachment.dataUrl || "").match(/^data:(image\/[\w.+-]+);base64,(.+)$/i);
    if (!match) return;

    const mimeType = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const extension = mimeType.indexOf("png") >= 0 ? "png" : "jpg";
    const fileName = `${stamp}_${ownerLabel}_${taskLabel}_${index + 1}.${extension}`;
    const file = folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareError) {
      Logger.log(shareError);
    }

    links.push(file.getUrl());
  });

  return links;
}

function enrichTicketNotesWithDriveAttachments_(data) {
  const next = Object.assign({}, data);
  delete next.attachments;

  try {
    const links = saveTicketAttachments_(data);
    if (!links.length) return next;

    const baseNotes = String(next.Notes || next.Remarks || "").trim();
    const linkLines = links.map((url, index) => "Screenshot " + (index + 1) + ": " + url);
    const mergedNotes = [baseNotes].concat(linkLines).filter(Boolean).join("\n");

    next.Notes = mergedNotes;
    next.Remarks = mergedNotes;
    return next;
  } catch (error) {
    Logger.log(error);
    throw new Error("Could not save screenshots to Google Drive. Redeploy Apps Script and allow Drive access. " + error.message);
  }
}

function doGet(e) {
  const resource = e && e.parameter && e.parameter.resource;

  if (resource === "users") {
    return buildResponse_({ ok: true, users: readUsers_() }, e);
  }

  if (resource === "attachmentsFolder") {
    try {
      return buildResponse_({ ok: true, folder: getAttachmentsFolderInfo_() }, e);
    } catch (error) {
      return buildResponse_({
        ok: false,
        needsDriveAuth: true,
        error: error.message
      }, e);
    }
  }

  const tickets = readTickets_();
  const users = readUsers_();
  return buildResponse_({ ok: true, tickets: tickets, users: users }, e);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "syncUsers") {
      writeUsers_(data.users || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "updateTicket") {
      updateTicket_(data);
      return buildResponse_({ ok: true }, e);
    }

    appendTicket_(data);
    return buildResponse_({ ok: true }, e);
  } catch (error) {
    return buildResponse_({ ok: false, error: error.message }, e);
  } finally {
    lock.releaseLock();
  }
}

function readTickets_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];

  const columnMap = buildColumnMap_(values[0]);
  return values.slice(1)
    .map((row, index) => rowToTicket_(row, columnMap, index + 2))
    .filter((ticket) => String(ticket.Task || "").trim());
}

function ticketToRow_(data) {
  return [
    data.Task || "",
    data.Priority || "",
    data.Owner || "",
    data["Raised By"] || "",
    data.Status || "",
    data.Type || "",
    toSheetDate_(data["Start date"]),
    toSheetDate_(data["End date"]),
    toSheetDate_(data.Milestone),
    data.Notes || data.Remarks || "",
    data["Bhanu List"] || ""
  ];
}

function appendTicket_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  sheet.appendRow(ticketToRow_(enrichTicketNotesWithDriveAttachments_(data)));
}

function updateTicket_(data) {
  const sheetRow = Number(data.sheetRow);
  if (!sheetRow || sheetRow < 2) {
    throw new Error("A valid sheet row is required to update a ticket.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  if (sheetRow > sheet.getLastRow()) {
    throw new Error(`Ticket row ${sheetRow} was not found in the sheet.`);
  }

  const row = ticketToRow_(enrichTicketNotesWithDriveAttachments_(data));
  sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
}

function ensureUsersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(USERS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(USERS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(USER_HEADERS);
  }

  return sheet;
}

function readUsers_() {
  const sheet = ensureUsersSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map((row) => rowToUser_(row));
}

function writeUsers_(users) {
  const sheet = ensureUsersSheet_();
  const rows = users.map((user) => userToRow_(user));

  if (sheet.getLastRow() > 0) {
    sheet.clearContents();
  }

  sheet.appendRow(USER_HEADERS);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, USER_HEADERS.length).setValues(rows);
  }
}

function userToRow_(user) {
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

function rowToUser_(row) {
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    username: String(row[2] || ""),
    email: String(row[3] || ""),
    password: String(row[4] || ""),
    active: isTruthy_(row[5]),
    rights: {
      dashboard: isTruthy_(row[6]),
      createTicket: isTruthy_(row[7]),
      editTicket: isTruthy_(row[8]),
      exportData: isTruthy_(row[9]),
      syncSheet: isTruthy_(row[10]),
      manageUsers: isTruthy_(row[11]),
      viewAssets: isTruthy_(row[12]),
      manageAssets: isTruthy_(row[13])
    }
  };
}

function isTruthy_(value) {
  return /^(yes|true|1)$/i.test(String(value || "").trim());
}

function buildColumnMap_(headers) {
  const normalizedHeaders = headers.map((header) => normalizeHeader_(header));
  const map = {};

  Object.keys(COLUMN_ALIASES).forEach((key) => {
    const aliases = COLUMN_ALIASES[key];
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    map[key] = index;
  });

  return map;
}

function normalizeHeader_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readCell_(row, index, fallbackIndex) {
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return resolvedIndex >= 0 && resolvedIndex < row.length ? row[resolvedIndex] : "";
}

function rowToTicket_(row, columnMap, sheetRow) {
  const notes = String(readCell_(row, columnMap.notes, 9) || "").trim();
  const bhanuList = String(readCell_(row, columnMap.bhanuList, 10) || "").trim();
  const remarks = notes || (/^(yes|no)$/i.test(bhanuList) ? "" : bhanuList);

  return {
    Task: readCell_(row, columnMap.task, 0) || "",
    Priority: readCell_(row, columnMap.priority, 1) || "",
    Owner: readCell_(row, columnMap.owner, 2) || "",
    "Raised By": readCell_(row, columnMap.raisedBy, 3) || "",
    Status: readCell_(row, columnMap.status, 4) || "",
    Type: readCell_(row, columnMap.type, 5) || "",
    "Start date": formatTicketDate_(readCell_(row, columnMap.startDate, 6)),
    "End date": formatTicketDate_(readCell_(row, columnMap.endDate, 7)),
    Milestone: formatTicketDate_(readCell_(row, columnMap.milestone, 8)),
    Notes: remarks,
    Remarks: remarks,
    "Bhanu List": bhanuList,
    sheetRow: sheetRow
  };
}

function formatTicketDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

function toSheetDate_(value) {
  if (!value) return "";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function buildResponse_(payload, e) {
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

/**
 * Run once from the Apps Script editor to grant Google Drive access.
 */
function setupDriveAccess() {
  const info = getAttachmentsFolderInfo_();
  Logger.log("Drive folder ready: " + info.url);
  return info;
}
