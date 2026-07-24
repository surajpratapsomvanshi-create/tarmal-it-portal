/* =====================================================
   WEB APP API (Tickets + App Users)
   Paste this entire file into Apps Script, replacing all code.

   DRIVE SETUP (required once for screenshot uploads):
   1. In Apps Script: Project Settings -> enable "Show appsscript.json"
   2. Paste appsscript.json from this project (includes Drive scope)
   3. Run function "setupDriveAccess" from the editor -> Authorize -> Allow
   4. Deploy -> New deployment -> Web app
===================================================== */

const TASKS_SHEET = "Tasks";
const USERS_SHEET = "AppUsers";
const ASSETS_SHEET = "ITAssets";
const DOCUMENTS_SHEET = "Documents";
const PROCUREMENT_SHEET = "Procurement";
const USER_MASTER_SHEET = "UserMaster";

const USER_HEADERS = [
  "Id", "Name", "Username", "Email", "Password", "Active",
  "Dashboard", "Create Tickets", "Edit Tickets", "Export Data", "Sync Sheet", "Manage Users",
  "View Assets", "Manage Assets", "View Documents", "Manage Documents"
];

const DOCUMENT_HEADERS = [
  "Id",
  "Title",
  "Category",
  "Description",
  "File Name",
  "MIME Type",
  "Drive File Id",
  "Drive URL",
  "Owner User Id",
  "Owner Name",
  "Visibility",
  "Shared With",
  "Uploaded At"
];

const PROCUREMENT_HEADERS = [
  "Id",
  "Material",
  "Quantity",
  "Unit",
  "Requested By",
  "Status",
  "Needed By",
  "Remarks",
  "Quotes JSON",
  "Updated At"
];

const ASSET_HEADERS = [
  "Id",
  "Employee ID",
  "Employee Name",
  "Asset Type",
  "Device Model",
  "Serial / IMEI",
  "Phone Number",
  "Service Provider",
  "Airtime Balance",
  "Airtime Valid Until",
  "Desktop Specs",
  "Status",
  "Notes"
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
  milestone: ["milestone", "milestone date", "mile stone"],
  notes: ["notes", "remarks", "remark", "comment", "comments"],
  bhanuList: ["bhanu list", "bhanulist"],
  parentSheetRow: ["parent sheet row", "parent row", "parent task row", "parent task"]
};

const ATTACHMENTS_FOLDER_NAME = "Tarmal Ticket Screenshots";
const ATTACHMENTS_FOLDER_ID_KEY = "ATTACHMENTS_FOLDER_ID";
const DOCUMENTS_FOLDER_NAME = "Tarmal IT Documents";
const DOCUMENTS_FOLDER_ID_KEY = "DOCUMENTS_FOLDER_ID";
const PROCUREMENT_FOLDER_NAME = "Tarmal Procurement Quotes";
const PROCUREMENT_FOLDER_ID_KEY = "PROCUREMENT_FOLDER_ID";

// Post-save audit / Projects sync / pending email scans are deferred so doPost
// can return as soon as ticket rows are written.
const DEFERRED_POST_SAVE_PROP_ = "deferredPostSaveQueue";
const DEFERRED_POST_SAVE_HANDLER_ = "processDeferredPostSaveWork";
const DEFERRED_POST_SAVE_DELAY_MS_ = 30000;

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

function getOrCreateDocumentsFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedFolderId = props.getProperty(DOCUMENTS_FOLDER_ID_KEY);

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
  const existingFolders = parentFolder.getFoldersByName(DOCUMENTS_FOLDER_NAME);
  const folderExists = existingFolders.hasNext();
  const folder = folderExists
    ? existingFolders.next()
    : parentFolder.createFolder(DOCUMENTS_FOLDER_NAME);

  if (!folderExists) {
    folder.createFile(
      "README - IT Documents.txt",
      [
        "Tarmal IT Portal stores uploaded IT documents in this folder.",
        "Spreadsheet: " + spreadsheet.getName(),
        "Created: " + new Date().toString()
      ].join("\n"),
      MimeType.PLAIN_TEXT
    );
  }

  props.setProperty(DOCUMENTS_FOLDER_ID_KEY, folder.getId());
  return folder;
}

function getOrCreateProcurementFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedFolderId = props.getProperty(PROCUREMENT_FOLDER_ID_KEY);

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
  const existingFolders = parentFolder.getFoldersByName(PROCUREMENT_FOLDER_NAME);
  const folderExists = existingFolders.hasNext();
  const folder = folderExists
    ? existingFolders.next()
    : parentFolder.createFolder(PROCUREMENT_FOLDER_NAME);

  if (!folderExists) {
    folder.createFile(
      "README - Procurement Quotes.txt",
      [
        "Tarmal IT Portal stores procurement quotation PDFs and images in this folder.",
        "Spreadsheet: " + spreadsheet.getName(),
        "Created: " + new Date().toString()
      ].join("\n"),
      MimeType.PLAIN_TEXT
    );
  }

  props.setProperty(PROCUREMENT_FOLDER_ID_KEY, folder.getId());
  return folder;
}

function extensionFromMime_(mimeType, fileName) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  const extFromName = name.includes(".") ? name.split(".").pop() : "";
  if (extFromName) return extFromName;

  if (mime.indexOf("pdf") >= 0) return "pdf";
  if (mime.indexOf("png") >= 0) return "png";
  if (mime.indexOf("jpeg") >= 0 || mime.indexOf("jpg") >= 0) return "jpg";
  if (mime.indexOf("word") >= 0) return "docx";
  if (mime.indexOf("excel") >= 0 || mime.indexOf("spreadsheet") >= 0) return "xlsx";
  if (mime.indexOf("powerpoint") >= 0 || mime.indexOf("presentation") >= 0) return "pptx";
  if (mime.indexOf("plain") >= 0) return "txt";
  if (mime.indexOf("csv") >= 0) return "csv";
  return "bin";
}

function saveDocumentFile_(data) {
  const dataUrl = String(data.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid file data.");
  }

  const mimeType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const folder = getOrCreateDocumentsFolder_();
  const safeTitle = sanitizeAttachmentName_(data.title || data.fileName || "document");
  const extension = extensionFromMime_(mimeType, data.fileName);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const fileName = `${safeTitle}_${stamp}.${extension}`;
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareError) {
    Logger.log(shareError);
  }

  return {
    driveFileId: file.getId(),
    driveUrl: file.getUrl(),
    fileName: file.getName(),
    mimeType: mimeType
  };
}

function saveProcurementFile_(data) {
  const dataUrl = String(data.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid quotation file data.");
  }

  const mimeType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const folder = getOrCreateProcurementFolder_();
  const safeTitle = sanitizeAttachmentName_(data.title || data.fileName || "quote");
  const extension = extensionFromMime_(mimeType, data.fileName);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const fileName = `${safeTitle}_${stamp}.${extension}`;
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareError) {
    Logger.log(shareError);
  }

  return {
    driveFileId: file.getId(),
    driveUrl: file.getUrl(),
    fileName: file.getName(),
    mimeType: mimeType
  };
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

function extractScreenshotLinksFromNotes_(text) {
  const urls = [];
  const pattern = /Screenshot\s+\d+\s*:\s*(https?:\/\/\S+)/gi;
  let match = pattern.exec(String(text || ""));
  while (match) {
    urls.push(match[1]);
    match = pattern.exec(String(text || ""));
  }
  return urls;
}

function stripScreenshotMetadata_(text) {
  return String(text || "")
    .replace(/Screenshot\s+\d+\s*:\s*https?:\/\/\S+/gi, "")
    .replace(/\[\d+ screenshots? attached\]/gi, "")
    .replace(/\[Screenshot attached\]/gi, "")
    .trim();
}

function extractDriveFileIdFromUrl_(url) {
  const value = String(url || "");
  const filePathMatch = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch) return filePathMatch[1];
  const idParamMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && value.indexOf("drive.google.com") >= 0) return idParamMatch[1];
  return "";
}

function dedupeScreenshotUrls_(urls) {
  const seen = {};
  const unique = [];
  (urls || []).forEach((url) => {
    const value = String(url || "").trim();
    if (!value) return;
    const key = extractDriveFileIdFromUrl_(value) || value;
    if (seen[key]) return;
    seen[key] = true;
    unique.push(value);
  });
  return unique;
}

function mergeScreenshotNotes_(existingNotes, incomingNotes) {
  const existingLinks = extractScreenshotLinksFromNotes_(existingNotes);
  const incomingLinks = extractScreenshotLinksFromNotes_(incomingNotes);
  const baseText = stripScreenshotMetadata_(incomingNotes) || stripScreenshotMetadata_(existingNotes);
  const allLinks = dedupeScreenshotUrls_(existingLinks.concat(incomingLinks));
  const linkLines = allLinks.map(function(url, index) {
    return "Screenshot " + (index + 1) + ": " + url;
  });
  return [baseText].concat(linkLines).filter(Boolean).join("\n");
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
    const sourceNotes = String(next.Notes || next.Remarks || "").trim();
    const baseText = stripScreenshotMetadata_(sourceNotes);
    const existingLinks = extractScreenshotLinksFromNotes_(sourceNotes);
    const allLinks = dedupeScreenshotUrls_(existingLinks.concat(links));
    if (!allLinks.length) return next;

    const linkLines = allLinks.map(function(url, index) {
      return "Screenshot " + (index + 1) + ": " + url;
    });
    const mergedNotes = [baseText].concat(linkLines).filter(Boolean).join("\n");

    next.Notes = mergedNotes;
    next.Remarks = mergedNotes;
    return next;
  } catch (error) {
    Logger.log(error);
    throw new Error("Could not save screenshots to Google Drive. Redeploy Apps Script and allow Drive access. " + error.message);
  }
}

function doGet(e) {
  try {
    const resource = e && e.parameter && e.parameter.resource;

    if (resource === "users") {
      return buildResponse_({ ok: true, users: readUsers_() }, e);
    }

    if (resource === "assets") {
      return buildResponse_({ ok: true, assets: readAssets_() }, e);
    }

    if (resource === "documents") {
      return buildResponse_({ ok: true, documents: readDocuments_() }, e);
    }

    if (resource === "procurement") {
      return buildResponse_({ ok: true, procurement: readProcurement_() }, e);
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

    if (resource === "hierarchy") {
      return buildResponse_({ ok: true, hierarchy: readUserMaster_() }, e);
    }

    const tickets = readTickets_();
    const users = readUsers_();
    const assets = readAssets_();
    const documents = readDocuments_();
    const procurement = readProcurement_();
    const hierarchy = readUserMaster_();
    return buildResponse_({
      ok: true,
      tickets: tickets,
      users: users,
      assets: assets,
      documents: documents,
      procurement: procurement,
      hierarchy: hierarchy
    }, e);
  } catch (error) {
    return buildResponse_({ ok: false, error: error.message }, e);
  }
}

function readDeferredPostSaveQueue_() {
  const props = PropertiesService.getScriptProperties();
  try {
    return JSON.parse(props.getProperty(DEFERRED_POST_SAVE_PROP_) || "{}") || {};
  } catch (error) {
    Logger.log(error);
    return {};
  }
}

function writeDeferredPostSaveQueue_(queue) {
  PropertiesService.getScriptProperties().setProperty(
    DEFERRED_POST_SAVE_PROP_,
    JSON.stringify(queue || {})
  );
}

function clearDeferredPostSaveQueue_() {
  PropertiesService.getScriptProperties().deleteProperty(DEFERRED_POST_SAVE_PROP_);
}

function clearDeferredPostSaveTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === DEFERRED_POST_SAVE_HANDLER_) {
      try {
        ScriptApp.deleteTrigger(trigger);
      } catch (error) {
        Logger.log(error);
      }
    }
  });
}

/**
 * Coalesce non-critical post-save work into one ~30s one-shot trigger so
 * doPost can return immediately after writing ticket rows.
 * Approval emails for the saved ticket are still attempted inline in
 * appendTicket_ / updateTicket_; this queue only covers full-sheet scans.
 */
function scheduleDeferredPostSaveWork_(options) {
  const opts = options || {};
  const queue = readDeferredPostSaveQueue_();
  if (opts.audit !== false) queue.audit = true;
  if (opts.projects !== false) queue.projects = true;
  if (opts.taskEmails) queue.taskEmails = true;
  if (opts.approvalEmails) queue.approvalEmails = true;
  queue.requestedAt = Date.now();
  writeDeferredPostSaveQueue_(queue);

  clearDeferredPostSaveTriggers_();
  ScriptApp.newTrigger(DEFERRED_POST_SAVE_HANDLER_)
    .timeBased()
    .after(DEFERRED_POST_SAVE_DELAY_MS_)
    .create();
}

function processDeferredPostSaveWork() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    // Another run is in progress; reschedule so queued work is not dropped.
    clearDeferredPostSaveTriggers_();
    ScriptApp.newTrigger(DEFERRED_POST_SAVE_HANDLER_)
      .timeBased()
      .after(DEFERRED_POST_SAVE_DELAY_MS_)
      .create();
    return;
  }

  try {
    const queue = readDeferredPostSaveQueue_();
    clearDeferredPostSaveQueue_();
    clearDeferredPostSaveTriggers_();

    if (!queue || (!queue.audit && !queue.projects && !queue.taskEmails && !queue.approvalEmails)) {
      return;
    }

    if (queue.audit) {
      try {
        updateHiddenTaskAudit();
      } catch (error) {
        Logger.log(error);
      }
    }
    if (queue.projects) {
      try {
        syncProjectsWithTasks();
      } catch (error) {
        Logger.log(error);
      }
    }
    if (queue.taskEmails) {
      try {
        sendPendingTaskEmails();
      } catch (error) {
        Logger.log(error);
      }
    }
    if (queue.approvalEmails) {
      try {
        sendPendingCompletionApprovalEmails();
      } catch (error) {
        Logger.log(error);
      }
    }
  } finally {
    lock.releaseLock();
  }
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

    if (data.action === "syncAssets") {
      writeAssets_(data.assets || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "syncDocuments") {
      writeDocuments_(data.documents || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "syncProcurement") {
      writeProcurement_(data.procurement || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "uploadDocument") {
      const fileInfo = saveDocumentFile_(data);
      return buildResponse_({ ok: true, file: fileInfo }, e);
    }

    if (data.action === "uploadProcurementAttachment") {
      const fileInfo = saveProcurementFile_(data);
      return buildResponse_({ ok: true, file: fileInfo }, e);
    }

    if (data.action === "deleteTicket") {
      const result = deleteTicket_(data);
      try {
        scheduleDeferredPostSaveWork_({ audit: true, projects: true });
      } catch (postDeleteError) {
        Logger.log(postDeleteError);
      }
      return buildResponse_({ ok: true, sheetRow: result.sheetRow }, e);
    }

    if (data.action === "updateTicket") {
      const result = updateTicket_(data);
      var approvalEmailResult = {
        to: result.approvalSentTo || "",
        error: result.approvalEmailError || ""
      };
      try {
        // Approval for THIS ticket was already attempted in updateTicket_.
        // Defer full-sheet audit/projects (and a batch approval scan only if
        // this update left approval pending without a sent email).
        scheduleDeferredPostSaveWork_({
          audit: true,
          projects: true,
          approvalEmails: result.approvalPending === true && !approvalEmailResult.to
        });
      } catch (postUpdateError) {
        Logger.log(postUpdateError);
      }
      return buildResponse_({
        ok: true,
        notes: result.notes,
        milestone: result.milestone,
        startDate: result.startDate,
        endDate: result.endDate,
        uploadedCount: result.uploadedCount,
        datesPersisted: result.datesPersisted === true,
        parentRemarkAppended: result.parentRemarkAppended === true,
        parentSheetRow: result.parentSheetRow || 0,
        status: result.status || "",
        approvalPending: result.approvalPending === true,
        approvalSentTo: approvalEmailResult.to || result.approvalSentTo || "",
        approvalEmailError: approvalEmailResult.error || result.approvalEmailError || "",
        approvalMessage: result.approvalMessage || "",
        approved: result.approved === true,
        deferredPostSave: true
      }, e);
    }

    if (data.action === "uploadAttachments") {
      const result = uploadTicketAttachmentsOnly_(data);
      return buildResponse_({
        ok: true,
        notes: result.notes,
        uploadedCount: result.uploadedCount
      }, e);
    }

    if (data.action === "createTickets") {
      const items = Array.isArray(data.tickets) ? data.tickets : [];
      if (!items.length) {
        throw new Error("No tickets provided.");
      }

      // Write rows (+ per-ticket approval email) then return immediately.
      // Audit, Projects sync, and pending owner emails run via deferred trigger.
      const results = items.map((ticketData) => appendTicket_(ticketData));
      try {
        scheduleDeferredPostSaveWork_({
          audit: true,
          projects: true,
          taskEmails: true,
          approvalEmails: results.some(function(item) {
            return item.approvalPending === true && !item.approvalSentTo;
          })
        });
      } catch (postAppendError) {
        Logger.log(postAppendError);
      }

      return buildResponse_({
        ok: true,
        count: results.length,
        results: results,
        deferredPostSave: true
      }, e);
    }

    if (data.action) {
      throw new Error(`Unsupported action "${data.action}". Redeploy the Apps Script web app with the latest code.`);
    }

    const appendResult = appendTicket_(data);
    try {
      scheduleDeferredPostSaveWork_({
        audit: true,
        projects: true,
        taskEmails: true,
        approvalEmails: appendResult.approvalPending === true && !appendResult.approvalSentTo
      });
    } catch (postAppendError) {
      Logger.log(postAppendError);
    }

    return buildResponse_({
      ok: true,
      sheetRow: appendResult.sheetRow,
      notes: appendResult.notes,
      milestone: appendResult.milestone,
      startDate: appendResult.startDate,
      endDate: appendResult.endDate,
      uploadedCount: appendResult.uploadedCount,
      status: appendResult.status || "",
      approvalPending: appendResult.approvalPending === true,
      approvalSentTo: appendResult.approvalSentTo || "",
      approvalMessage: appendResult.approvalMessage || "",
      approved: appendResult.approved === true,
      deferredPostSave: true
    }, e);
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

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const columnMap = buildColumnMap_(headers);
  const auditMap = readTaskAuditMap_();
  const tickets = [];

  for (let sheetRow = 2; sheetRow <= lastRow; sheetRow++) {
    const row = sheet.getRange(sheetRow, 1, 1, lastCol).getValues()[0];
    const ticket = rowToTicket_(row, columnMap, sheetRow);
    if (String(ticket.Task || "").trim()) {
      tickets.push(attachTicketAudit_(ticket, auditMap));
    }
  }

  return tickets;
}

function getTicketFieldValues_(data) {
  const milestone = toSheetDate_(data.Milestone);
  const startDate = toSheetDate_(data["Start date"]) || milestone;
  return {
    task: data.Task || "",
    priority: data.Priority || "",
    owner: String(data.Owner || data.owner || "").trim(),
    raisedBy: data["Raised By"] || "",
    status: data.Status || "",
    type: data.Type || "",
    startDate: startDate,
    endDate: toSheetDate_(data["End date"]),
    milestone: milestone,
    notes: data.Notes || data.Remarks || "",
    bhanuList: data["Bhanu List"] || "",
    parentSheetRow: Number(data.parentSheetRow || data["Parent Sheet Row"]) || ""
  };
}

const COLUMN_FALLBACK_INDICES_ = {
  task: 0,
  priority: 1,
  owner: 2,
  raisedBy: 3,
  status: 4,
  type: 5,
  startDate: 6,
  endDate: 7,
  milestone: 8,
  notes: 9,
  bhanuList: 10,
  parentSheetRow: 11
};

function resolveColumnIndex_(columnMap, key) {
  const mapped = columnMap[key];
  if (mapped >= 0) return mapped;
  return Object.prototype.hasOwnProperty.call(COLUMN_FALLBACK_INDICES_, key)
    ? COLUMN_FALLBACK_INDICES_[key]
    : -1;
}

function applyTicketFieldsToRow_(row, columnMap, fields) {
  const assignments = {
    task: fields.task,
    priority: fields.priority,
    owner: fields.owner,
    raisedBy: fields.raisedBy,
    status: fields.status,
    type: fields.type,
    startDate: fields.startDate,
    endDate: fields.endDate,
    milestone: fields.milestone,
    notes: fields.notes,
    bhanuList: fields.bhanuList,
    parentSheetRow: fields.parentSheetRow || ""
  };

  let requiredLength = row.length;
  Object.keys(assignments).forEach((key) => {
    const index = resolveColumnIndex_(columnMap, key);
    if (index >= 0) requiredLength = Math.max(requiredLength, index + 1);
  });
  while (row.length < requiredLength) row.push("");

  Object.keys(assignments).forEach((key) => {
    const index = resolveColumnIndex_(columnMap, key);
    if (index >= 0) row[index] = assignments[key];
  });

  return row;
}

function writeOwnerCell_(sheet, sheetRow, columnMap, ownerValue) {
  const owner = String(ownerValue || "").trim();
  if (!owner) return;
  const ownerIndex = resolveColumnIndex_(columnMap, "owner");
  if (ownerIndex < 0) return;
  sheet.getRange(sheetRow, ownerIndex + 1).setValue(owner);
}

function getTasksSheetHeaders_(sheet) {
  const headerValues = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  let lastColumn = 1;
  for (let i = headerValues.length - 1; i >= 0; i--) {
    if (String(headerValues[i] || "").trim()) {
      lastColumn = i + 1;
      break;
    }
  }
  lastColumn = Math.max(lastColumn, sheet.getLastColumn(), 1);
  return {
    headers: sheet.getRange(1, 1, 1, lastColumn).getValues()[0],
    lastColumn: lastColumn
  };
}

function formatTicketFieldDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

function sheetDateKey_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

function sheetDatesMatch_(left, right) {
  const a = sheetDateKey_(left);
  const b = sheetDateKey_(right);
  if (!a && !b) return true;
  return a === b;
}

function ensureTasksMilestoneColumn_(sheet) {
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const headers = sheetInfo.headers.slice();
  const columnMap = buildColumnMap_(headers);
  if (columnMap.milestone >= 0) return columnMap;

  const milestoneIndex = COLUMN_FALLBACK_INDICES_.milestone;
  while (headers.length <= milestoneIndex) headers.push("");
  headers[milestoneIndex] = "Milestone";
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return buildColumnMap_(headers);
}

function ensureTasksParentColumn_(sheet) {
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const headers = sheetInfo.headers.slice();
  const columnMap = buildColumnMap_(headers);
  if (columnMap.parentSheetRow >= 0) return columnMap;

  const parentIndex = COLUMN_FALLBACK_INDICES_.parentSheetRow;
  while (headers.length <= parentIndex) headers.push("");
  headers[parentIndex] = "Parent Sheet Row";
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return buildColumnMap_(headers);
}

function ensureTasksApprovalEmailColumn_(sheet) {
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const headers = sheetInfo.headers.slice();
  const normalized = headers.map(function(header) {
    return normalizeHeader_(header);
  });
  let approvalCol = normalized.indexOf("approval email sent");
  if (approvalCol >= 0) return approvalCol;

  headers.push("Approval Email Sent");
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers.length - 1;
}

function ensureTasksColumns_(sheet) {
  const columnMap = ensureTasksMilestoneColumn_(sheet);
  ensureTasksApprovalEmailColumn_(sheet);
  return ensureTasksParentColumn_(sheet);
}

function shouldAppendSubtaskCompletion_(oldStatus, ticket) {
  const parentRow = Number(ticket.parentSheetRow || ticket["Parent Sheet Row"]);
  if (!parentRow || parentRow < 2) return false;
  return !isCompletedStatus(oldStatus) && isCompletedStatus(ticket.Status);
}

function appendSubtaskCompletionToParent_(sheet, columnMap, subtask) {
  const parentRow = Number(subtask.parentSheetRow || subtask["Parent Sheet Row"]);
  if (!parentRow || parentRow < 2 || parentRow > sheet.getLastRow()) return false;

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const notesIndex = resolveColumnIndex_(columnMap, "notes");
  if (notesIndex < 0) return false;

  const parentRowValues = sheet.getRange(parentRow, 1, 1, sheetInfo.lastColumn).getValues()[0];
  const parent = rowToTicket_(parentRowValues, columnMap, parentRow);
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const summary = stripScreenshotMetadata_(subtask.Notes || subtask.Remarks || subtask.Task || "");
  const appendLine = "[Sub-task completed " + dateStr + "] " + String(subtask.Task || "Sub-task").trim()
    + (summary ? " — " + summary : "");

  const existingNotes = String(parentRowValues[notesIndex] || parent.Notes || "").trim();
  parentRowValues[notesIndex] = mergeScreenshotNotes_(existingNotes, appendLine);
  sheet.getRange(parentRow, 1, 1, sheetInfo.lastColumn).setValues([parentRowValues]);
  return true;
}

function buildTicketSyncResult_(data, enriched, fields, sheetRow, workflow) {
  const result = {
    notes: String(enriched.Notes || enriched.Remarks || "").trim(),
    milestone: formatTicketFieldDate_(data.Milestone) || formatTicketFieldDate_(fields.milestone),
    startDate: formatTicketFieldDate_(data["Start date"]) || formatTicketFieldDate_(fields.startDate),
    endDate: formatTicketFieldDate_(data["End date"]) || formatTicketFieldDate_(fields.endDate),
    uploadedCount: (data.attachments || []).length,
    status: fields.status || "",
    approvalPending: isPendingApprovalStatus_(fields.status),
    approvalSentTo: "",
    approvalMessage: workflow && workflow.message ? workflow.message : "",
    approved: workflow && workflow.approved === true
  };
  if (sheetRow) {
    result.sheetRow = sheetRow;
  }
  if (workflow && workflow.approvalSent && workflow.manager) {
    result.approvalSentTo = String(workflow.manager.email || "").trim();
  }
  return result;
}

function resolveActorName_(data) {
  return String(data.actorName || data["Actor Name"] || "").trim();
}

function resolveActorEmail_(data) {
  return String(data.actorEmail || data["Actor Email"] || "").trim().toLowerCase();
}

function actorMatchesUserMaster_(actorName, actorEmail, userEntry) {
  if (!userEntry) return false;
  if (namesMatchUserMaster_(actorName, userEntry.user)) return true;
  const entryEmail = String(userEntry.email || "").trim().toLowerCase();
  return Boolean(actorEmail && entryEmail && actorEmail === entryEmail);
}

function prepareTicketSave_(data, oldTicket) {
  assertCompletedHasEndDate_(data);
  const enriched = enrichTicketNotesWithDriveAttachments_(data);
  const fields = getTicketFieldValues_(enriched);
  const oldStatus = oldTicket ? String(oldTicket.Status || "") : "";
  const owner = fields.owner || (oldTicket && oldTicket.Owner) || "";
  const workflow = resolveCompletionWorkflow_(
    oldStatus,
    fields.status,
    owner,
    resolveActorName_(data),
    resolveActorEmail_(data)
  );
  fields.status = workflow.status;
  return {
    enriched: enriched,
    fields: fields,
    workflow: workflow
  };
}

function markApprovalEmailSent_(sheet, sheetRow, value) {
  if (!sheet || !sheetRow || sheetRow < 2) return;
  const approvalCol = ensureTasksApprovalEmailColumn_(sheet);
  sheet.getRange(sheetRow, approvalCol + 1).setValue(value);
}

function sendApprovalEmailIfNeeded_(data, savedTicket, workflow, sheet, sheetRow) {
  if (!workflow || !workflow.approvalSent) {
    return { to: "", error: "" };
  }

  const resolved = resolveManagerEmailForOwner_(savedTicket.Owner || savedTicket.owner);
  if (!resolved.managerEmail) {
    if (sheet && sheetRow) {
      markApprovalEmailSent_(sheet, sheetRow, resolved.error || "Manager email not found in UserMaster.");
    }
    return { to: "", error: resolved.error || "Manager email not found in UserMaster." };
  }

  try {
    sendTaskCompletionApprovalEmail_(
      savedTicket,
      { user: resolved.managerName, email: resolved.managerEmail },
      resolveActorName_(data)
    );
    if (sheet && sheetRow) {
      markApprovalEmailSent_(sheet, sheetRow, "Yes");
    }
    return { to: resolved.managerEmail, error: "" };
  } catch (emailError) {
    Logger.log(emailError);
    const errorText = String(emailError.message || emailError);
    if (sheet && sheetRow) {
      markApprovalEmailSent_(sheet, sheetRow, errorText);
    }
    return { to: "", error: errorText };
  }
}

function writeTicketToSheetRow_(sheet, sheetRow, data) {
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const columnMap = ensureTasksColumns_(sheet);
  const lastColumn = Math.max(sheetInfo.lastColumn, columnMap.milestone >= 0 ? columnMap.milestone + 1 : sheetInfo.lastColumn);
  const existingRow = sheet.getRange(sheetRow, 1, 1, lastColumn).getValues()[0].slice();
  const oldTicket = rowToTicket_(existingRow, columnMap, sheetRow);
  const oldStatus = oldTicket.Status;
  const prepared = prepareTicketSave_(data, oldTicket);
  const enriched = prepared.enriched;
  const fields = prepared.fields;
  const workflow = prepared.workflow;
  const row = existingRow.slice();
  applyTicketFieldsToRow_(row, columnMap, fields);
  sheet.getRange(sheetRow, 1, 1, lastColumn).setValues([row]);

  const writtenRow = sheet.getRange(sheetRow, 1, 1, lastColumn).getValues()[0];
  const savedTicket = rowToTicket_(writtenRow, columnMap, sheetRow);
  const expectedMilestone = formatTicketFieldDate_(data.Milestone);
  const expectedStart = formatTicketFieldDate_(data["Start date"]) || expectedMilestone;
  const expectedEnd = formatTicketFieldDate_(data["End date"]);
  const datesPersisted = sheetDatesMatch_(savedTicket.Milestone, expectedMilestone)
    && sheetDatesMatch_(savedTicket["Start date"], expectedStart)
    && sheetDatesMatch_(savedTicket["End date"], expectedEnd);

  let parentRemarkAppended = false;
  let parentSheetRow = 0;
  if (shouldAppendSubtaskCompletion_(oldStatus, savedTicket)) {
    parentRemarkAppended = appendSubtaskCompletionToParent_(sheet, columnMap, savedTicket);
    parentSheetRow = Number(savedTicket.parentSheetRow) || 0;
  }

  const approvalEmailResult = sendApprovalEmailIfNeeded_(data, savedTicket, workflow, sheet, sheetRow);

  return {
    notes: String(savedTicket.Notes || savedTicket.Remarks || enriched.Notes || enriched.Remarks || "").trim(),
    milestone: savedTicket.Milestone || expectedMilestone,
    startDate: savedTicket["Start date"] || expectedStart,
    endDate: savedTicket["End date"] || expectedEnd,
    uploadedCount: (data.attachments || []).length,
    datesPersisted: datesPersisted,
    parentRemarkAppended: parentRemarkAppended,
    parentSheetRow: parentSheetRow,
    status: savedTicket.Status,
    approvalPending: isPendingApprovalStatus_(savedTicket.Status),
    approvalSentTo: approvalEmailResult.to || "",
    approvalEmailError: approvalEmailResult.error || "",
    approvalMessage: workflow.message || "",
    approved: workflow.approved === true
  };
}

function uploadTicketAttachmentsOnly_(data) {
  const sheetRow = Number(data.sheetRow);
  if (!sheetRow || sheetRow < 2) {
    throw new Error("A valid sheet row is required to upload attachments.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  if (sheetRow > sheet.getLastRow()) {
    throw new Error(`Ticket row ${sheetRow} was not found in the sheet.`);
  }

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const columnMap = buildColumnMap_(sheetInfo.headers);
  const notesIndex = columnMap.notes;

  if (notesIndex < 0) {
    throw new Error('Missing "Notes" column in Tasks sheet.');
  }

  const row = sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).getValues()[0].slice();
  const existingNotes = String(row[notesIndex] || "").trim();
  const mergedInput = Object.assign({}, data, {
    Notes: mergeScreenshotNotes_(existingNotes, data.Notes || data.Remarks || "")
  });
  const enriched = enrichTicketNotesWithDriveAttachments_(mergedInput);
  const notes = String(enriched.Notes || enriched.Remarks || "").trim();
  row[notesIndex] = notes;
  sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).setValues([row]);

  return {
    notes: notes,
    uploadedCount: (data.attachments || []).length
  };
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

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const columnMap = ensureTasksColumns_(sheet);
  const prepared = prepareTicketSave_(data, null);
  const enriched = prepared.enriched;
  const fields = prepared.fields;
  const workflow = prepared.workflow;
  if (!fields.owner) {
    throw new Error("Owner is required for each ticket.");
  }

  const row = new Array(Math.max(sheetInfo.lastColumn, COLUMN_FALLBACK_INDICES_.parentSheetRow + 1)).fill("");
  applyTicketFieldsToRow_(row, columnMap, fields);
  sheet.appendRow(row);
  const sheetRow = sheet.getLastRow();
  writeOwnerCell_(sheet, sheetRow, columnMap, fields.owner);

  const writtenRow = sheet.getRange(sheetRow, 1, 1, row.length).getValues()[0];
  const savedTicket = rowToTicket_(writtenRow, columnMap, sheetRow);
  if (shouldAppendSubtaskCompletion_("", savedTicket)) {
    appendSubtaskCompletionToParent_(sheet, columnMap, savedTicket);
  }

  const result = buildTicketSyncResult_(data, enriched, fields, sheetRow, workflow);
  const approvalEmailResult = sendApprovalEmailIfNeeded_(data, savedTicket, workflow, sheet, sheetRow);
  result.approvalSentTo = approvalEmailResult.to || "";
  result.approvalEmailError = approvalEmailResult.error || "";
  return result;
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

  return writeTicketToSheetRow_(sheet, sheetRow, data);
}

function removeTaskAuditEntry_(taskKey) {
  const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TaskAudit");
  if (!auditSheet || !taskKey) return;

  const lastRow = auditSheet.getLastRow();
  if (lastRow < 2) return;

  const keys = auditSheet.getRange(2, 1, lastRow, 1).getValues();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (String(keys[i][0] || "").trim() === taskKey) {
      auditSheet.deleteRow(i + 2);
    }
  }
}

function normalizeTicketIdentity_(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function deleteTicket_(data) {
  const sheetRow = Number(data.sheetRow);
  if (!sheetRow || sheetRow < 2) {
    throw new Error("A valid sheet row is required to delete a ticket.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  if (sheetRow > sheet.getLastRow()) {
    throw new Error(`Ticket row ${sheetRow} was not found in the sheet.`);
  }

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const columnMap = buildColumnMap_(sheetInfo.headers);
  const row = sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).getValues()[0];
  const ticket = rowToTicket_(row, columnMap, sheetRow);
  const expectedTask = String(data.Task || "").trim();
  const expectedOwner = String(data.Owner || "").trim();

  if (expectedTask && normalizeTicketIdentity_(ticket.Task) !== normalizeTicketIdentity_(expectedTask)) {
    throw new Error(`Ticket row ${sheetRow} does not match the selected task. Refresh and try again.`);
  }

  if (expectedOwner && normalizeTicketIdentity_(ticket.Owner) !== normalizeTicketIdentity_(expectedOwner)) {
    throw new Error(`Ticket row ${sheetRow} does not match the selected owner. Refresh and try again.`);
  }

  const taskKey = buildTaskKey(ticket.Task, ticket.Owner);
  sheet.deleteRow(sheetRow);
  removeTaskAuditEntry_(taskKey);

  return { sheetRow: sheetRow, task: ticket.Task, owner: ticket.Owner };
}

function readTaskAuditMap_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TaskAudit");
  if (!sheet) return {};

  const auditData = sheet.getDataRange().getValues();
  const map = {};

  for (let i = 1; i < auditData.length; i++) {
    const key = String(auditData[i][0] || "").trim();
    if (!key) continue;

    map[key] = {
      createdOn: auditData[i][2],
      lastUpdated: auditData[i][3],
      closedOn: auditData[i][4]
    };
  }

  return map;
}

function attachTicketAudit_(ticket, auditMap) {
  const taskKey = String(ticket.Task || "").trim() + "||" + String(ticket.Owner || "").trim();
  const audit = auditMap[taskKey];

  if (!audit) return ticket;

  ticket.createdOn = formatTicketDateTime_(audit.createdOn);
  ticket.lastUpdated = formatTicketDateTime_(audit.lastUpdated);
  ticket.closedOn = formatTicketDateTime_(audit.closedOn);
  return ticket;
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
    .filter((row) => String(row[0] || "").trim() && (String(row[1] || "").trim() || String(row[2] || "").trim()))
    .map((row) => rowToUser_(row));
}


function readUserMaster_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USER_MASTER_SHEET);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(function(header) {
    return String(header || "").trim().toLowerCase();
  });
  const userCol = headers.indexOf("user");
  const managerCol = headers.indexOf("manager");
  const emailCol = headers.indexOf("email");

  if (userCol === -1) return [];

  return values.slice(1)
    .map(function(row) {
      return {
        user: String(row[userCol] || "").trim(),
        manager: managerCol >= 0 ? String(row[managerCol] || "").trim() : "",
        email: emailCol >= 0 ? String(row[emailCol] || "").trim() : ""
      };
    })
    .filter(function(entry) { return entry.user; });
}
function writeUsers_(users) {
  const sheet = ensureUsersSheet_();
  const rows = users.map((user) => userToRow_(user));
  const output = [USER_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, USER_HEADERS.length).setValues(output);
  }
}

function ensureAssetsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(ASSETS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(ASSETS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ASSET_HEADERS);
  }

  return sheet;
}

function readAssets_() {
  const sheet = ensureAssetsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map((row) => rowToAsset_(row));
}

function writeAssets_(assets) {
  const sheet = ensureAssetsSheet_();
  const rows = assets.map((asset) => assetToRow_(asset));
  const output = [ASSET_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, ASSET_HEADERS.length).setValues(output);
  }
}

function assetToRow_(asset) {
  return [
    asset.id || "",
    asset.employeeId || "",
    asset.employeeName || "",
    asset.assetType || "",
    asset.deviceModel || "",
    asset.serialImei || "",
    asset.phoneNumber || "",
    asset.serviceProvider || "",
    asset.airtimeBalance || "",
    toSheetDate_(asset.airtimeValidUntil),
    asset.desktopSpecs || "",
    asset.status || "Active",
    asset.notes || ""
  ];
}

function rowToAsset_(row) {
  return {
    id: String(row[0] || ""),
    employeeId: String(row[1] || ""),
    employeeName: String(row[2] || ""),
    assetType: String(row[3] || ""),
    deviceModel: String(row[4] || ""),
    serialImei: String(row[5] || ""),
    phoneNumber: String(row[6] || ""),
    serviceProvider: String(row[7] || ""),
    airtimeBalance: String(row[8] || ""),
    airtimeValidUntil: formatTicketDate_(row[9]),
    desktopSpecs: String(row[10] || ""),
    status: String(row[11] || "Active"),
    notes: String(row[12] || "")
  };
}

function ensureDocumentsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(DOCUMENTS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(DOCUMENTS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(DOCUMENT_HEADERS);
  }

  return sheet;
}

function readDocuments_() {
  const sheet = ensureDocumentsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map((row) => rowToDocument_(row));
}

function writeDocuments_(documents) {
  const sheet = ensureDocumentsSheet_();
  const rows = documents.map((document) => documentToRow_(document));
  const output = [DOCUMENT_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, DOCUMENT_HEADERS.length).setValues(output);
  }
}

function documentToRow_(document) {
  return [
    document.id || "",
    document.title || "",
    document.category || "",
    document.description || "",
    document.fileName || "",
    document.mimeType || "",
    document.driveFileId || "",
    document.driveUrl || "",
    document.ownerUserId || "",
    document.ownerName || "",
    document.visibility || "restricted",
    document.sharedWith || "",
    document.uploadedAt || ""
  ];
}

function rowToDocument_(row) {
  return {
    id: String(row[0] || ""),
    title: String(row[1] || ""),
    category: String(row[2] || ""),
    description: String(row[3] || ""),
    fileName: String(row[4] || ""),
    mimeType: String(row[5] || ""),
    driveFileId: String(row[6] || ""),
    driveUrl: String(row[7] || ""),
    ownerUserId: String(row[8] || ""),
    ownerName: String(row[9] || ""),
    visibility: String(row[10] || "restricted"),
    sharedWith: String(row[11] || ""),
    uploadedAt: String(row[12] || "")
  };
}

function ensureProcurementSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(PROCUREMENT_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PROCUREMENT_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(PROCUREMENT_HEADERS);
  }

  return sheet;
}

function parseQuotesJson_(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    Logger.log(error);
    return [];
  }
}

function readProcurement_() {
  const sheet = ensureProcurementSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map((row) => rowToProcurement_(row));
}

function writeProcurement_(items) {
  const sheet = ensureProcurementSheet_();
  const rows = (items || []).map((item) => procurementToRow_(item));
  const output = [PROCUREMENT_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, PROCUREMENT_HEADERS.length).setValues(output);
  }
}

function procurementToRow_(item) {
  const quotes = Array.isArray(item.quotes) ? item.quotes : parseQuotesJson_(item.quotesJson || item.quotes);
  return [
    item.id || "",
    item.material || "",
    item.quantity || "",
    item.unit || "",
    item.requestedBy || "",
    item.status || "Requested",
    toSheetDate_(item.neededBy),
    item.remarks || "",
    JSON.stringify(quotes || []),
    item.updatedAt || ""
  ];
}

function rowToProcurement_(row) {
  return {
    id: String(row[0] || ""),
    material: String(row[1] || ""),
    quantity: String(row[2] || ""),
    unit: String(row[3] || ""),
    requestedBy: String(row[4] || ""),
    status: String(row[5] || "Requested"),
    neededBy: formatTicketDate_(row[6]),
    remarks: String(row[7] || ""),
    quotes: parseQuotesJson_(row[8]),
    updatedAt: String(row[9] || "")
  };
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
    rights.manageAssets ? "Yes" : "No",
    rights.viewDocuments ? "Yes" : "No",
    rights.manageDocuments ? "Yes" : "No"
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
      manageAssets: isTruthy_(row[13]),
      viewDocuments: isTruthy_(row[14]),
      manageDocuments: isTruthy_(row[15])
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
  const remarks = notes || (/^bhanu$/i.test(bhanuList) ? "" : bhanuList);

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
    parentSheetRow: Number(readCell_(row, columnMap.parentSheetRow, 11)) || 0,
    sheetRow: sheetRow
  };
}

function isPlaceholderDate_(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === "m/d/yyyy" || text === "mm/dd/yyyy" || text === "notes" || text === "task";
}

function formatTicketDate_(value) {
  if (!value || isPlaceholderDate_(value)) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

function formatTicketDateTime_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
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


/* =====================================================
   SHEET TRIGGERS
===================================================== */

function onEdit(e) {
  if (!e) return;

  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();

  if (row === 1) return;

  if (sheetName === "Tasks") {
    updateHiddenTaskAudit();
    syncProjectsWithTasks();
    sendPendingTaskEmails();
    return;
  }

  if (sheetName === "Projects") {
    updateTasksFromProjects(e);
    updateHiddenTaskAudit();
    syncProjectsWithTasks();
    return;
  }
}


function onChange(e) {
  if (!e) return;

  if (
    e.changeType === "REMOVE_ROW" ||
    e.changeType === "INSERT_ROW" ||
    e.changeType === "EDIT"
  ) {
    updateHiddenTaskAudit();
    syncProjectsWithTasks();
  }
}


/* =====================================================
   HIDDEN AUDIT SHEET
   No extra columns required in Tasks sheet
===================================================== */

function updateHiddenTaskAudit() {

  const TASK_SHEET = "Tasks";
  const AUDIT_SHEET = "TaskAudit";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName(TASK_SHEET);

  if (!taskSheet) return;

  let auditSheet = ss.getSheetByName(AUDIT_SHEET);

  if (!auditSheet) {
    auditSheet = ss.insertSheet(AUDIT_SHEET);
    auditSheet.hideSheet();
    auditSheet.getRange(1, 1, 1, 7).setValues([[
      "Task Key",
      "Task",
      "Created On",
      "Last Updated",
      "Closed On",
      "Last Status",
      "Last Signature"
    ]]);
  }

  const taskData = taskSheet.getDataRange().getValues();
  if (taskData.length <= 1) return;

  const headers = taskData[0];

  const taskCol = headers.indexOf("Task");
  const priorityCol = headers.indexOf("Priority");
  const ownerCol = headers.indexOf("Owner");
  const raisedByCol = headers.indexOf("Raised By");
  const statusCol = headers.indexOf("Status");
  const typeCol = headers.indexOf("Type");
  const startDateCol = headers.indexOf("Start date");
  const endDateCol = headers.indexOf("End date");
  const notesCol = headers.indexOf("Notes");

  if (
    taskCol === -1 ||
    ownerCol === -1 ||
    statusCol === -1 ||
    typeCol === -1
  ) {
    throw new Error("Missing required columns in Tasks sheet: Task, Owner, Status, Type.");
  }

  const auditData = auditSheet.getDataRange().getValues();
  const auditMap = {};

  for (let i = 1; i < auditData.length; i++) {
    const key = String(auditData[i][0] || "").trim();

    if (key) {
      auditMap[key] = {
        rowNumber: i + 1,
        task: auditData[i][1],
        createdOn: auditData[i][2],
        lastUpdated: auditData[i][3],
        closedOn: auditData[i][4],
        lastStatus: auditData[i][5],
        lastSignature: auditData[i][6]
      };
    }
  }

  const now = new Date();
  const newAuditRows = [];

  for (let i = 1; i < taskData.length; i++) {
    const row = taskData[i];

    const taskName = row[taskCol];
    if (!taskName) continue;

    const owner = ownerCol >= 0 ? row[ownerCol] : "";
    const status = statusCol >= 0 ? row[statusCol] : "";

    const taskKey = buildTaskKey(taskName, owner);
    const signature = buildTaskSignature(row, {
      taskCol,
      priorityCol,
      ownerCol,
      raisedByCol,
      statusCol,
      typeCol,
      startDateCol,
      endDateCol,
      notesCol
    });

    const completed = isCompletedStatus(status);

    if (!auditMap[taskKey]) {
      const closedOn = completed ? now : "";

      newAuditRows.push([
        taskKey,
        taskName,
        now,
        now,
        closedOn,
        status,
        signature
      ]);
    } else {
      const audit = auditMap[taskKey];

      let closedOnValue = audit.closedOn;

      if (completed && !closedOnValue) {
        closedOnValue = now;
      }

      if (!completed) {
        closedOnValue = "";
      }

      if (String(audit.lastSignature || "") !== String(signature || "")) {
        auditSheet.getRange(audit.rowNumber, 4).setValue(now);
      }

      auditSheet.getRange(audit.rowNumber, 2).setValue(taskName);
      auditSheet.getRange(audit.rowNumber, 5).setValue(closedOnValue);
      auditSheet.getRange(audit.rowNumber, 6).setValue(status);
      auditSheet.getRange(audit.rowNumber, 7).setValue(signature);
    }
  }

  if (newAuditRows.length > 0) {
    const startRow = auditSheet.getLastRow() + 1;
    auditSheet
      .getRange(startRow, 1, newAuditRows.length, 7)
      .setValues(newAuditRows);
  }

  auditSheet.hideSheet();
}


function isProjectType_(typeValue) {
  const value = String(typeValue || "").trim();
  if (!value) return false;

  const lower = value.toLowerCase();
  if (lower.indexOf("daily") !== -1) return false;

  return lower === "sap" || lower === "infra";
}

function isPlaceholderTaskRow_(taskName) {
  const task = String(taskName || "").trim().toLowerCase();
  return !task || task === "task" || task === "name" || task === "notes" || task === "untitled";
}

function summarizeTaskTypes_(taskSheet) {
  const data = taskSheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  const columnMap = buildColumnMap_(data[0]);
  const typeCol = resolveColumnIndex_(columnMap, "type");
  const counts = {};

  for (let i = 1; i < data.length; i++) {
    const type = String(readCell_(data[i], typeCol, 5) || "").trim() || "(blank)";
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

function formatTaskTypeSummary_(counts) {
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 6)
    .map((type) => `${type}: ${counts[type]}`)
    .join(", ");
}


function buildTaskKey(taskName, owner) {
  return String(taskName || "").trim() + "||" + String(owner || "").trim();
}


function buildTaskSignature(row, cols) {
  return [
    row[cols.taskCol],
    cols.priorityCol >= 0 ? row[cols.priorityCol] : "",
    cols.ownerCol >= 0 ? row[cols.ownerCol] : "",
    cols.raisedByCol >= 0 ? row[cols.raisedByCol] : "",
    cols.statusCol >= 0 ? row[cols.statusCol] : "",
    cols.typeCol >= 0 ? row[cols.typeCol] : "",
    cols.startDateCol >= 0 ? formatDateValue(row[cols.startDateCol]) : "",
    cols.endDateCol >= 0 ? formatDateValue(row[cols.endDateCol]) : "",
    cols.notesCol >= 0 ? row[cols.notesCol] : ""
  ].join("||");
}


/* =====================================================
   TASKS TO PROJECTS SYNC
   Only SAP and Infra appear in Projects
===================================================== */

function syncProjectsWithTasks() {

  const TASK_SHEET = "Tasks";
  const PROJECT_SHEET = "Projects";

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const taskSheet = ss.getSheetByName(TASK_SHEET);
  const projectSheet = ss.getSheetByName(PROJECT_SHEET);

  if (!taskSheet || !projectSheet) return 0;

  const lastRow = taskSheet.getLastRow();
  const lastCol = taskSheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return 0;

  const taskData = taskSheet.getRange(1, 1, lastRow, lastCol).getValues();
  const taskHeaders = taskData[0];
  const columnMap = buildColumnMap_(taskHeaders);
  const taskCol = resolveColumnIndex_(columnMap, "task");
  const typeCol = resolveColumnIndex_(columnMap, "type");

  if (taskCol < 0 || typeCol < 0) {
    throw new Error('Missing "Task" or "Type" column in Tasks sheet.');
  }

  const projectRows = [];

  for (let i = 1; i < taskData.length; i++) {
    const row = taskData[i];
    const taskName = String(readCell_(row, taskCol, 0) || "").trim();
    const typeValue = String(readCell_(row, typeCol, 5) || "").trim();

    if (isPlaceholderTaskRow_(taskName)) continue;
    if (!isProjectType_(typeValue)) continue;

    const normalizedRow = row.slice(0, lastCol);
    while (normalizedRow.length < lastCol) normalizedRow.push("");
    projectRows.push(normalizedRow);
  }

  writeProjectSheet_(projectSheet, taskData[0].slice(0, lastCol), projectRows, lastCol);

  return projectRows.length;
}

function writeProjectSheet_(projectSheet, headers, projectRows, lastCol) {
  const filter = projectSheet.getFilter();
  if (filter) filter.remove();

  while (headers.length < lastCol) headers.push("");
  const headerRow = [headers.slice(0, lastCol)];

  projectSheet.clearContents();
  projectSheet.getRange(1, 1, 1, lastCol).setValues(headerRow).setFontWeight("bold");

  if (projectRows.length > 0) {
    const neededRows = projectRows.length + 1;
    if (projectSheet.getMaxRows() < neededRows) {
      projectSheet.insertRowsAfter(projectSheet.getMaxRows(), neededRows - projectSheet.getMaxRows());
    }
    projectSheet.getRange(2, 1, projectRows.length, lastCol).setValues(projectRows);
  }

  trimProjectSheetRows_(projectSheet, projectRows.length, lastCol);
  projectSheet.setFrozenRows(1);
}

function trimProjectSheetRows_(projectSheet, dataRowCount) {
  const keepRows = Math.max(1, dataRowCount + 1);
  const maxRows = projectSheet.getMaxRows();

  if (maxRows > keepRows) {
    projectSheet.deleteRows(keepRows + 1, maxRows - keepRows);
  }
}

function refreshProjectsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName("Tasks");
  const count = syncProjectsWithTasks();
  let message = "";

  if (count > 0) {
    message = `Synced ${count} long-term project${count === 1 ? "" : "s"} (Type = SAP or Infra). Daily tasks excluded.`;
  } else if (taskSheet) {
    const summary = formatTaskTypeSummary_(summarizeTaskTypes_(taskSheet));
    message = summary
      ? `No SAP/Infra projects found. Tasks types: ${summary}. Change long-term work to Type SAP or Infra.`
      : "No SAP or Infra tasks found in Tasks. Set Type to SAP or Infra on long-term work.";
  } else {
    message = "Tasks sheet not found.";
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(message, "Tarmal IT", 10);
}

function clearProjectsFilter() {
  const projectSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Projects");
  if (!projectSheet) return;
  const filter = projectSheet.getFilter();
  if (filter) filter.remove();
  SpreadsheetApp.getActiveSpreadsheet().toast("Projects filter removed.", "Tarmal IT", 4);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Tarmal IT")
    .addItem("Refresh Projects (SAP & Infra only)", "refreshProjectsSheet")
    .addItem("Clear Projects filter", "clearProjectsFilter")
    .addItem("Send pending approval emails", "sendPendingCompletionApprovalEmailsManual")
    .addItem("Test approval email", "testCompletionApprovalEmail")
    .addToUi();
}


/* =====================================================
   PROJECTS TO TASKS SYNC
   Notes and Type changed in Projects update Tasks
===================================================== */

function updateTasksFromProjects(e) {

  const TASK_SHEET = "Tasks";
  const PROJECT_SHEET = "Projects";

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const taskSheet = ss.getSheetByName(TASK_SHEET);
  const projectSheet = ss.getSheetByName(PROJECT_SHEET);

  if (!taskSheet || !projectSheet) return;

  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();

  if (editedRow === 1) return;

  const projectHeaders = projectSheet
    .getRange(1, 1, 1, projectSheet.getLastColumn())
    .getValues()[0];

  const taskHeaders = taskSheet
    .getRange(1, 1, 1, taskSheet.getLastColumn())
    .getValues()[0];

  const taskColProject = projectHeaders.indexOf("Task") + 1;
  const taskColTask = taskHeaders.indexOf("Task") + 1;

  if (taskColProject === 0 || taskColTask === 0) {
    throw new Error("Task column not found.");
  }

  const projectTaskName = projectSheet
    .getRange(editedRow, taskColProject)
    .getValue();

  if (!projectTaskName) return;

  const editedHeader = projectHeaders[editedCol - 1];

  const matchingTaskCol = taskHeaders.indexOf(editedHeader) + 1;

  if (matchingTaskCol === 0) return;

  const newValue = e.range.getValue();

  const taskData = taskSheet.getDataRange().getValues();

  for (let i = 1; i < taskData.length; i++) {

    if (
      String(taskData[i][taskColTask - 1]).trim() ===
      String(projectTaskName).trim()
    ) {
      taskSheet
        .getRange(i + 1, matchingTaskCol)
        .setValue(newValue);

      break;
    }
  }
}

/* =====================================================
   NEW TASK ASSIGNED EMAIL
===================================================== */

function hasPendingTaskEmailRows_(taskSheet) {
  const lastRow = taskSheet.getLastRow();
  const lastCol = taskSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;

  const headers = taskSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const taskCol = headers.indexOf("Task");
  const ownerCol = headers.indexOf("Owner");
  const emailSentCol = headers.indexOf("Email Sent");
  if (taskCol === -1 || ownerCol === -1 || emailSentCol === -1) return false;

  const taskValues = taskSheet.getRange(2, taskCol + 1, lastRow - 1, 1).getValues();
  const ownerValues = taskSheet.getRange(2, ownerCol + 1, lastRow - 1, 1).getValues();
  const sentValues = taskSheet.getRange(2, emailSentCol + 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < sentValues.length; i++) {
    const hasIdentity = String(taskValues[i][0] || "").trim() && String(ownerValues[i][0] || "").trim();
    // Only blank flags count as pending; rows already flagged (Yes / "No email
    // found" / error text) must not trigger a full scan on every request.
    if (hasIdentity && !String(sentValues[i][0] || "").trim()) return true;
  }
  return false;
}

function sendPendingTaskEmails() {

  const TASK_SHEET = "Tasks";
  const USER_MASTER_SHEET = "UserMaster";

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const taskSheet = ss.getSheetByName(TASK_SHEET);
  const userSheet = ss.getSheetByName(USER_MASTER_SHEET);

  if (!taskSheet || !userSheet) return;

  // Fast exit: skip the full-sheet scan when no row is awaiting an email.
  if (!hasPendingTaskEmailRows_(taskSheet)) return;

  const taskData = taskSheet.getDataRange().getValues();
  const userData = userSheet.getDataRange().getValues();

  if (taskData.length <= 1 || userData.length <= 1) return;

  const taskHeaders = taskData[0];
  const userHeaders = userData[0];

  const taskCol = taskHeaders.indexOf("Task");
  const ownerCol = taskHeaders.indexOf("Owner");
  const statusCol = taskHeaders.indexOf("Status");
  const typeCol = taskHeaders.indexOf("Type");
  const startDateCol = taskHeaders.indexOf("Start date");
  const endDateCol = taskHeaders.indexOf("End date");
  const notesCol = taskHeaders.indexOf("Notes");
  const emailSentCol = taskHeaders.indexOf("Email Sent");

  const userNameCol = userHeaders.indexOf("User");
  const userEmailCol = userHeaders.indexOf("Email");

  if (
    taskCol === -1 ||
    ownerCol === -1 ||
    emailSentCol === -1 ||
    userNameCol === -1 ||
    userEmailCol === -1
  ) {
    throw new Error(
      "Missing required column. Please check Task, Owner, Email Sent in Tasks and User, Email in UserMaster."
    );
  }

  const userEmailMap = {};

  for (let i = 1; i < userData.length; i++) {
    const userName = String(userData[i][userNameCol]).trim();
    const email = String(userData[i][userEmailCol]).trim();

    if (userName && email) {
      userEmailMap[userName] = email;
    }
  }

  for (let i = 1; i < taskData.length; i++) {

    const row = taskData[i];

    const taskName = row[taskCol];
    const owner = String(row[ownerCol]).trim();
    const typeValue = typeCol >= 0 ? String(row[typeCol]).trim() : "";
    const emailSent = String(row[emailSentCol]).trim();

    if (!taskName || !owner) continue;

    if (emailSent === "Yes") continue;

    const recipientEmail = userEmailMap[owner];

    if (!recipientEmail) {
      taskSheet
        .getRange(i + 1, emailSentCol + 1)
        .setValue("No email found");

      continue;
    }

    const status = statusCol >= 0 ? row[statusCol] : "";
    const startDate = startDateCol >= 0 ? row[startDateCol] : "";
    const endDate = endDateCol >= 0 ? row[endDateCol] : "";
    const notes = notesCol >= 0 ? row[notesCol] : "";

    const formattedStartDate = formatDateValue(startDate);
    const formattedEndDate = formatDateValue(endDate);

    const subject = "New Task Assigned | " + taskName;

    const plainBody =
      "Hi " + owner + ",\n\n" +
      "A new task has been assigned to you.\n\n" +
      "Task: " + taskName + "\n" +
      "Type: " + typeValue + "\n" +
      "Status: " + (status || "") + "\n" +
      "Start Date: " + formattedStartDate + "\n" +
      "End Date: " + formattedEndDate + "\n" +
      "Notes: " + (notes || "") + "\n\n" +
      "Please review the task and update the progress accordingly.\n\n" +
      "This is an automated notification from the Task Management System.";

    const htmlBody = `
      <div style="margin:0; padding:24px; background:#eef2f7; font-family:Arial, sans-serif;">
        <div style="max-width:580px; margin:0 auto; background:#ffffff; border:1px solid #d9e1e7; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.10);">
          
          <div style="background:#1f4e78; color:#ffffff; padding:20px 24px;">
            <div style="font-size:20px; font-weight:bold;">New Task Assigned</div>
            <div style="font-size:12px; margin-top:5px; opacity:0.9;">Task Management System</div>
          </div>
          
          <div style="padding:24px; color:#333333; font-size:14px; line-height:1.6;">
            <p style="margin:0 0 12px 0;">Hi <strong>${escapeHtml(owner)}</strong>,</p>
            
            <p style="margin:0 0 18px 0;">
              A new task has been assigned to you. Please review the details below:
            </p>

            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc; width:35%;"><strong>Task</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(taskName)}</td>
              </tr>
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Type</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(typeValue)}</td>
              </tr>
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Status</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${getStatusBadge(status)}</td>
              </tr>
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Start Date</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(formattedStartDate)}</td>
              </tr>
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>End Date</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(formattedEndDate)}</td>
              </tr>
              <tr>
                <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Notes</strong></td>
                <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(notes || "")}</td>
              </tr>
            </table>

            <p style="margin:18px 0 0 0;">
              Please update the task progress once reviewed.
            </p>

            <div style="margin-top:20px; padding:12px; background:#f8fafc; border-left:4px solid #1f4e78; font-size:12px; color:#555555;">
              This is an automated notification from the Task Management System.
            </div>
          </div>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody
    });

    taskSheet
      .getRange(i + 1, emailSentCol + 1)
      .setValue("Yes");
  }
}


/* =====================================================
   OPEN TASK SUMMARY EMAIL TO EACH OWNER
===================================================== */

function sendPendingTaskListEmails() {

  const TASK_SHEET = "Tasks";
  const USER_MASTER_SHEET = "UserMaster";

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const taskSheet = ss.getSheetByName(TASK_SHEET);
  const userSheet = ss.getSheetByName(USER_MASTER_SHEET);

  if (!taskSheet || !userSheet) return;

  const taskData = taskSheet.getDataRange().getValues();
  const userData = userSheet.getDataRange().getValues();

  if (taskData.length <= 1 || userData.length <= 1) return;

  const taskHeaders = taskData[0];
  const userHeaders = userData[0];

  const taskCol = taskHeaders.indexOf("Task");
  const priorityCol = taskHeaders.indexOf("Priority");
  const ownerCol = taskHeaders.indexOf("Owner");
  const raisedByCol = taskHeaders.indexOf("Raised By");
  const statusCol = taskHeaders.indexOf("Status");
  const typeCol = taskHeaders.indexOf("Type");
  const endDateCol = taskHeaders.indexOf("End date");
  const notesCol = taskHeaders.indexOf("Notes");

  const userNameCol = userHeaders.indexOf("User");
  const userEmailCol = userHeaders.indexOf("Email");

  if (
    taskCol === -1 ||
    ownerCol === -1 ||
    statusCol === -1 ||
    userNameCol === -1 ||
    userEmailCol === -1
  ) {
    throw new Error(
      "Missing required columns. Please check Task, Owner, Status in Tasks and User, Email in UserMaster."
    );
  }

  const userEmailMap = {};

  for (let i = 1; i < userData.length; i++) {
    const userName = String(userData[i][userNameCol]).trim();
    const email = String(userData[i][userEmailCol]).trim();

    if (userName && email) {
      userEmailMap[userName] = email;
    }
  }

  const ownerTasks = {};

  for (let i = 1; i < taskData.length; i++) {
    const row = taskData[i];

    const taskName = row[taskCol];
    const owner = String(row[ownerCol]).trim();
    const status = String(row[statusCol]).trim();

    if (!taskName || !owner) continue;

    if (isCompletedStatus(status)) continue;

    if (!ownerTasks[owner]) {
      ownerTasks[owner] = [];
    }

    ownerTasks[owner].push({
      task: taskName,
      priority: priorityCol >= 0 ? row[priorityCol] : "",
      status: status,
      type: typeCol >= 0 ? row[typeCol] : "",
      endDate: endDateCol >= 0 ? row[endDateCol] : "",
      notes: notesCol >= 0 ? row[notesCol] : ""
    });
  }

  for (const owner in ownerTasks) {

    const recipientEmail = userEmailMap[owner];
    if (!recipientEmail) continue;

    const tasks = ownerTasks[owner];
    const subject = "Open Task Summary | " + owner;

    let taskRowsHtml = "";

    tasks.forEach(function(task, index) {
      taskRowsHtml += `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;"><strong>${escapeHtml(task.task)}</strong></td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${getPriorityBadge(task.priority)}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${getStatusBadge(task.status)}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${escapeHtml(task.type)}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${escapeHtml(formatDateValue(task.endDate))}</td>
        </tr>
      `;
    });

    const htmlBody = `
      <div style="margin:0; padding:26px; background:#eef2f7; font-family:Arial, sans-serif;">
        <div style="max-width:900px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
          <div style="background:#1f4e78; color:#ffffff; padding:24px 28px;">
            <div style="font-size:24px; font-weight:bold;">Open Task Summary</div>
          </div>

          <div style="padding:24px 28px;">
            <p>Hi <strong>${escapeHtml(owner)}</strong>,</p>
            <p>Please review your current open task list below.</p>

            <p><strong>Total Open Tasks:</strong> ${tasks.length}</p>

            <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="text-align:left; padding:12px;">#</th>
                  <th style="text-align:left; padding:12px;">Task</th>
                  <th style="text-align:left; padding:12px;">Priority</th>
                  <th style="text-align:left; padding:12px;">Status</th>
                  <th style="text-align:left; padding:12px;">Type</th>
                  <th style="text-align:left; padding:12px;">Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${taskRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const plainBody =
      "Hi " + owner + ",\n\n" +
      "Please find your open task list below.\n\n" +
      "Total Open Tasks: " + tasks.length;

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody
    });
  }
}


/* =====================================================
   DAILY IT DEPARTMENT REPORT
   Sends to UserMaster Report column
===================================================== */

function sendDailyITDepartmentReport() {

  updateHiddenTaskAudit();

  const TASK_SHEET = "Tasks";
  const USER_MASTER_SHEET = "UserMaster";
  const AUDIT_SHEET = "TaskAudit";

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const taskSheet = ss.getSheetByName(TASK_SHEET);
  const userSheet = ss.getSheetByName(USER_MASTER_SHEET);
  const auditSheet = ss.getSheetByName(AUDIT_SHEET);

  if (!taskSheet || !userSheet || !auditSheet) return;

  const taskData = taskSheet.getDataRange().getValues();
  const userData = userSheet.getDataRange().getValues();
  const auditData = auditSheet.getDataRange().getValues();

  if (taskData.length <= 1 || userData.length <= 1 || auditData.length <= 1) return;

  const taskHeaders = taskData[0];
  const userHeaders = userData[0];

  const taskCol = taskHeaders.indexOf("Task");
  const priorityCol = taskHeaders.indexOf("Priority");
  const ownerCol = taskHeaders.indexOf("Owner");
  const raisedByCol = taskHeaders.indexOf("Raised By");
  const statusCol = taskHeaders.indexOf("Status");
  const typeCol = taskHeaders.indexOf("Type");
  const endDateCol = taskHeaders.indexOf("End date");
  const notesCol = taskHeaders.indexOf("Notes");

  const reportCol = userHeaders.indexOf("Report");

  if (
    taskCol === -1 ||
    ownerCol === -1 ||
    statusCol === -1 ||
    typeCol === -1 ||
    reportCol === -1
  ) {
    throw new Error("Missing required columns. Check Tasks columns and UserMaster Report column.");
  }

  const reportEmails = [];

  for (let i = 1; i < userData.length; i++) {
    const emails = String(userData[i][reportCol] || "").trim();

    if (emails) {
      emails.split(/[;,]/).forEach(function(email) {
        const cleanEmail = email.trim();

        if (cleanEmail && reportEmails.indexOf(cleanEmail) === -1) {
          reportEmails.push(cleanEmail);
        }
      });
    }
  }

  if (reportEmails.length === 0) return;

  const auditMap = {};

  for (let i = 1; i < auditData.length; i++) {
    const key = String(auditData[i][0] || "").trim();

    if (key) {
      auditMap[key] = {
        createdOn: auditData[i][2],
        lastUpdated: auditData[i][3],
        closedOn: auditData[i][4]
      };
    }
  }

  const today = new Date();

  const createdToday = [];
  const closedToday = [];
  const updatedToday = [];

  for (let i = 1; i < taskData.length; i++) {
    const row = taskData[i];

    const taskName = row[taskCol];
    if (!taskName) continue;

    const owner = row[ownerCol];
    const status = String(row[statusCol] || "").trim();

    const taskKey = buildTaskKey(taskName, owner);
    const audit = auditMap[taskKey];

    if (!audit) continue;

    const completed = isCompletedStatus(status);

    const createdTodayFlag = isSameDate(audit.createdOn, today);
    const closedTodayFlag = isSameDate(audit.closedOn, today);
    const updatedTodayFlag = isSameDate(audit.lastUpdated, today);

    const taskObject = {
      task: row[taskCol],
      priority: priorityCol >= 0 ? row[priorityCol] : "",
      owner: row[ownerCol],
      raisedBy: raisedByCol >= 0 ? row[raisedByCol] : "",
      status: row[statusCol],
      type: row[typeCol],
      endDate: endDateCol >= 0 ? row[endDateCol] : "",
      notes: notesCol >= 0 ? row[notesCol] : ""
    };

    if (createdTodayFlag) {
      createdToday.push(taskObject);
    }

    if (closedTodayFlag) {
      closedToday.push(taskObject);
    }

    if (updatedTodayFlag && (!completed || closedTodayFlag)) {
      if (!createdTodayFlag && !closedTodayFlag) {
        updatedToday.push(taskObject);
      }
    }
  }

  const subject =
    "Daily IT Department Task Report | " +
    Utilities.formatDate(today, Session.getScriptTimeZone(), "dd-MMM-yyyy");

  const htmlBody = `
    <div style="font-family:Arial, sans-serif; background:#f3f6f9; padding:24px;">
      <div style="max-width:1100px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #d9e1e7;">
        
        <div style="background:#244236; color:#ffffff; padding:20px 24px;">
          <div style="font-size:22px; font-weight:bold;">Daily IT Department Task Report</div>
          <div style="font-size:13px; margin-top:5px;">
            ${Utilities.formatDate(today, Session.getScriptTimeZone(), "dd-MMM-yyyy")}
          </div>
        </div>

        <div style="padding:24px;">
          ${buildReportSection("Tasks Created Today", createdToday)}
          ${buildReportSection("Tasks Closed Today", closedToday)}
          ${buildReportSection("Other Previous Tasks Updated Today", updatedToday)}
        </div>

      </div>
    </div>
  `;

  const plainBody =
    "Daily IT Department Task Report\n\n" +
    "Tasks Created Today: " + createdToday.length + "\n" +
    "Tasks Closed Today: " + closedToday.length + "\n" +
    "Other Previous Tasks Updated Today: " + updatedToday.length;

  MailApp.sendEmail({
    to: reportEmails.join(","),
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody
  });
}


/* =====================================================
   CREATE DAILY REPORT TRIGGER
   Run manually once only
===================================================== */

function createDailyITReportTrigger() {

  ScriptApp.newTrigger("sendDailyITDepartmentReport")
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .create();
}


/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function buildReportSection(title, tasks) {

  let rows = "";

  if (tasks.length === 0) {
    rows = `
      <tr>
        <td colspan="9" style="padding:12px; border:1px solid #e5e7eb; color:#6b7280;">
          No records found.
        </td>
      </tr>
    `;
  } else {
    tasks.forEach(function(task, index) {
      rows += `
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${escapeHtml(task.task)}</strong></td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.priority)}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.owner)}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.raisedBy)}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.status)}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.type)}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(formatDateValue(task.endDate))}</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${escapeHtml(task.notes)}</td>
        </tr>
      `;
    });
  }

  return `
    <h3 style="margin:22px 0 10px 0; color:#244236;">
      ${title} (${tasks.length})
    </h3>

    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
      <thead>
        <tr style="background:#eef2f7;">
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">#</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Task</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Priority</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Owner</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Raised By</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Status</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Type</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">End Date</th>
          <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}


const PENDING_APPROVAL_STATUS = "Pending Approval";

function isPendingApprovalStatus_(status) {
  const value = String(status || "").trim().toLowerCase();
  return value === "pending approval";
}

function normalizeUserMasterKey_(name) {
  return String(name || "").trim().toLowerCase();
}

function namesMatchUserMaster_(a, b) {
  const left = String(a || "").trim().toLowerCase();
  const right = String(b || "").trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  const leftFirst = left.split(/\s+/)[0];
  const rightFirst = right.split(/\s+/)[0];
  return leftFirst === right || rightFirst === left
    || left.indexOf(right + " ") === 0
    || right.indexOf(left + " ") === 0;
}

function readUserMasterMaps_() {
  const entries = readUserMaster_();
  const byUser = {};
  entries.forEach(function(entry) {
    const key = normalizeUserMasterKey_(entry.user);
    if (key && !byUser[key]) {
      byUser[key] = entry;
    }
  });
  return { entries: entries, byUser: byUser };
}

function findUserMasterEntry_(userName, maps) {
  if (!userName) return null;
  maps = maps || readUserMasterMaps_();
  const key = normalizeUserMasterKey_(userName);
  if (maps.byUser[key]) return maps.byUser[key];
  return maps.entries.find(function(entry) {
    return namesMatchUserMaster_(userName, entry.user);
  }) || null;
}

function getManagerEntryForUser_(ownerName, maps) {
  const ownerEntry = findUserMasterEntry_(ownerName, maps);
  if (!ownerEntry || !String(ownerEntry.manager || "").trim()) return null;
  const managerEntry = findUserMasterEntry_(ownerEntry.manager, maps);
  const managerName = managerEntry
    ? managerEntry.user
    : String(ownerEntry.manager || "").trim();
  const managerEmail = managerEntry
    ? String(managerEntry.email || "").trim()
    : lookupUserMasterEmail_(managerName, maps);
  return {
    user: managerName,
    manager: managerEntry ? managerEntry.manager : "",
    email: managerEmail
  };
}

function lookupUserMasterEmail_(userName, maps) {
  const entry = findUserMasterEntry_(userName, maps);
  return entry ? String(entry.email || "").trim() : "";
}

function resolveManagerEmailForOwner_(ownerName, maps) {
  maps = maps || readUserMasterMaps_();
  const owner = String(ownerName || "").trim();
  const ownerEntry = findUserMasterEntry_(owner, maps);
  if (!ownerEntry) {
    return {
      managerName: "",
      managerEmail: "",
      error: "Owner \"" + owner + "\" was not found in UserMaster."
    };
  }
  if (!String(ownerEntry.manager || "").trim()) {
    return {
      managerName: "",
      managerEmail: "",
      error: "Owner \"" + owner + "\" has no manager in UserMaster."
    };
  }

  const manager = getManagerEntryForUser_(owner, maps);
  const managerName = manager ? manager.user : ownerEntry.manager;
  const managerEmail = manager ? String(manager.email || "").trim() : lookupUserMasterEmail_(managerName, maps);
  if (!managerEmail) {
    return {
      managerName: managerName,
      managerEmail: "",
      error: "No email found for manager \"" + managerName + "\" in UserMaster."
    };
  }

  return {
    managerName: managerName,
    managerEmail: managerEmail,
    error: ""
  };
}

function ownerRequiresCompletionApproval_(ownerName, maps) {
  const ownerEntry = findUserMasterEntry_(ownerName, maps);
  return Boolean(ownerEntry && String(ownerEntry.manager || "").trim());
}

function canUserApproveCompletion_(actorName, actorEmail, ownerName, maps) {
  if (!ownerRequiresCompletionApproval_(ownerName, maps)) return false;
  const manager = getManagerEntryForUser_(ownerName, maps);
  if (!manager) return false;
  return actorMatchesUserMaster_(actorName, actorEmail, manager);
}

function resolveCompletionWorkflow_(oldStatus, requestedStatus, owner, actorName, actorEmail) {
  const wantsComplete = isCompletedStatus(requestedStatus);
  const wasPending = isPendingApprovalStatus_(oldStatus);
  const wasComplete = isCompletedStatus(oldStatus);
  const maps = readUserMasterMaps_();

  if (wasPending && wantsComplete) {
    if (!canUserApproveCompletion_(actorName, actorEmail, owner, maps)) {
      throw new Error("Only the task owner's manager can approve completion.");
    }
    return {
      status: "Completed",
      approvalSent: false,
      approved: true,
      message: "Completion approved."
    };
  }

  if (wantsComplete && !wasPending) {
    if (wasComplete) {
      return { status: requestedStatus, approvalSent: false };
    }
    if (!ownerRequiresCompletionApproval_(owner, maps)) {
      return { status: "Completed", approvalSent: false };
    }
    if (canUserApproveCompletion_(actorName, actorEmail, owner, maps)) {
      return { status: "Completed", approvalSent: false, approved: true };
    }
    const manager = getManagerEntryForUser_(owner, maps);
    return {
      status: PENDING_APPROVAL_STATUS,
      approvalSent: true,
      manager: manager,
      message: "Completion sent for manager approval."
    };
  }

  return { status: requestedStatus, approvalSent: false };
}

function sendTaskCompletionApprovalEmail_(ticket, managerEntry, requesterName) {
  const managerEmail = String(managerEntry.email || "").trim();
  if (!managerEmail) return false;

  const taskName = String(ticket.Task || "").trim() || "Task";
  const owner = String(ticket.Owner || ticket.owner || "").trim();
  const requester = String(requesterName || owner).trim();
  const managerName = String(managerEntry.user || "").trim() || "Manager";
  const typeValue = String(ticket.Type || "").trim();
  const endDate = formatDateValue(ticket["End date"] || ticket.endDate);
  const notes = String(ticket.Notes || ticket.Remarks || "").trim();

  const subject = "Completion approval required | " + taskName;
  const plainBody =
    "Hi " + managerName + ",\n\n" +
    requester + " has requested completion approval for a task assigned to " + owner + ".\n\n" +
    "Task: " + taskName + "\n" +
    "Owner: " + owner + "\n" +
    "Type: " + typeValue + "\n" +
    "End Date: " + endDate + "\n" +
    "Notes: " + notes + "\n\n" +
    "Open the Tarmal IT Portal, find this ticket, and set the status to Completed to approve.\n\n" +
    "This is an automated notification from the Task Management System.";

  const htmlBody = `
    <div style="margin:0; padding:24px; background:#eef2f7; font-family:Arial, sans-serif;">
      <div style="max-width:580px; margin:0 auto; background:#ffffff; border:1px solid #d9e1e7; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.10);">
        <div style="background:#9a3412; color:#ffffff; padding:20px 24px;">
          <div style="font-size:20px; font-weight:bold;">Completion Approval Required</div>
          <div style="font-size:12px; margin-top:5px; opacity:0.9;">Task Management System</div>
        </div>
        <div style="padding:24px; color:#333333; font-size:14px; line-height:1.6;">
          <p style="margin:0 0 12px 0;">Hi <strong>${escapeHtml(managerName)}</strong>,</p>
          <p style="margin:0 0 18px 0;">
            <strong>${escapeHtml(requester)}</strong> has requested completion approval for a task assigned to
            <strong>${escapeHtml(owner)}</strong>.
          </p>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc; width:35%;"><strong>Task</strong></td>
              <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(taskName)}</td>
            </tr>
            <tr>
              <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Owner</strong></td>
              <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(owner)}</td>
            </tr>
            <tr>
              <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Type</strong></td>
              <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(typeValue)}</td>
            </tr>
            <tr>
              <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>End Date</strong></td>
              <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(endDate)}</td>
            </tr>
            <tr>
              <td style="padding:11px; border:1px solid #e5e7eb; background:#f8fafc;"><strong>Notes</strong></td>
              <td style="padding:11px; border:1px solid #e5e7eb;">${escapeHtml(notes)}</td>
            </tr>
          </table>
          <p style="margin:18px 0 0 0;">
            Open the Tarmal IT Portal, find this ticket, and set the status to <strong>Completed</strong> to approve.
          </p>
        </div>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: managerEmail,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody
  });
  return true;
}

function hasPendingApprovalEmailRows_(taskSheet) {
  const lastRow = taskSheet.getLastRow();
  const lastCol = taskSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;

  const headers = taskSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const normalized = headers.map(function(header) {
    return normalizeHeader_(header);
  });
  const statusCol = normalized.indexOf("status");
  if (statusCol === -1) return false;
  const approvalCol = normalized.indexOf("approval email sent");

  const statusValues = taskSheet.getRange(2, statusCol + 1, lastRow - 1, 1).getValues();
  const flagValues = approvalCol >= 0
    ? taskSheet.getRange(2, approvalCol + 1, lastRow - 1, 1).getValues()
    : null;

  for (var i = 0; i < statusValues.length; i++) {
    if (!isPendingApprovalStatus_(statusValues[i][0])) continue;
    // Only blank flags count as pending; rows already flagged (Yes or an
    // error message) must not trigger a full scan on every request.
    const flag = flagValues ? String(flagValues[i][0] || "").trim() : "";
    if (!flag) return true;
  }
  return false;
}

function sendPendingCompletionApprovalEmails(force) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName(TASKS_SHEET);
  if (!taskSheet) return { sent: 0, lastSentTo: "", errors: [] };

  // Fast exit: skip the full-sheet scan when no row is awaiting an approval
  // email. Pass force=true (manual/menu runs) to always run the full scan,
  // which also retries rows whose previous send attempt failed.
  if (force !== true && !hasPendingApprovalEmailRows_(taskSheet)) {
    return { sent: 0, lastSentTo: "", errors: [] };
  }

  const approvalCol = ensureTasksApprovalEmailColumn_(taskSheet);
  const sheetInfo = getTasksSheetHeaders_(taskSheet);
  const columnMap = buildColumnMap_(sheetInfo.headers);
  const maps = readUserMasterMaps_();
  const values = taskSheet.getDataRange().getValues();
  const errors = [];
  var sent = 0;
  var lastSentTo = "";

  if (values.length <= 1) return { sent: 0, lastSentTo: "", errors: errors };

  for (var i = 1; i < values.length; i++) {
    const row = values[i];
    const ticket = rowToTicket_(row, columnMap, i + 1);
    if (!isPendingApprovalStatus_(ticket.Status)) continue;

    const sentFlag = String(row[approvalCol] || "").trim();
    if (sentFlag === "Yes") continue;

    const resolved = resolveManagerEmailForOwner_(ticket.Owner, maps);
    if (!resolved.managerEmail) {
      const errorText = resolved.error || "No manager email found.";
      taskSheet.getRange(i + 1, approvalCol + 1).setValue(errorText);
      errors.push(errorText);
      continue;
    }

    try {
      sendTaskCompletionApprovalEmail_(
        ticket,
        { user: resolved.managerName, email: resolved.managerEmail },
        ticket.Owner
      );
      taskSheet.getRange(i + 1, approvalCol + 1).setValue("Yes");
      sent++;
      lastSentTo = resolved.managerEmail;
    } catch (emailError) {
      const errorText = String(emailError.message || emailError);
      taskSheet.getRange(i + 1, approvalCol + 1).setValue(errorText);
      errors.push(errorText);
      Logger.log(emailError);
    }
  }

  return { sent: sent, lastSentTo: lastSentTo, errors: errors };
}

function sendPendingCompletionApprovalEmailsManual() {
  const result = sendPendingCompletionApprovalEmails(true);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Approval emails sent: " + result.sent +
      (result.errors.length ? " | Errors: " + result.errors.length : ""),
    "Tarmal IT",
    8
  );
}

function testCompletionApprovalEmail() {
  const maps = readUserMasterMaps_();
  const resolved = resolveManagerEmailForOwner_("Sushil", maps);
  if (!resolved.managerEmail) {
    throw new Error(resolved.error || "Could not resolve manager email for Sushil.");
  }

  sendTaskCompletionApprovalEmail_(
    {
      Task: "Approval email test",
      Owner: "Sushil",
      Type: "Daily - SAP",
      "End date": new Date(),
      Notes: "This is a test email from Tarmal IT Portal."
    },
    { user: resolved.managerName, email: resolved.managerEmail },
    "System Test"
  );

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Test approval email sent to " + resolved.managerEmail,
    "Tarmal IT",
    8
  );
}

function isCompletedStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  return (
    value === "completed" ||
    value === "complete"
  );
}

function assertCompletedHasEndDate_(data) {
  if (!isCompletedStatus(data && data.Status)) {
    return;
  }

  const endDate = data["End date"] || data.endDate;
  if (!String(endDate || "").trim()) {
    throw new Error("End date is required before marking a ticket as Completed.");
  }
}


function isSameDate(value, dateToCompare) {
  if (!value) return false;

  const dateValue = new Date(value);

  if (isNaN(dateValue)) return false;

  return (
    dateValue.getFullYear() === dateToCompare.getFullYear() &&
    dateValue.getMonth() === dateToCompare.getMonth() &&
    dateValue.getDate() === dateToCompare.getDate()
  );
}


function getPriorityBadge(priority) {
  const value = String(priority || "").trim();

  let bg = "#e5e7eb";
  let color = "#374151";
  let label = value || "N/A";

  if (value === "20") {
    bg = "#fee2e2";
    color = "#991b1b";
    label = "High - 20";
  } else if (value === "50") {
    bg = "#fef3c7";
    color = "#92400e";
    label = "Medium - 50";
  } else if (value === "80") {
    bg = "#dcfce7";
    color = "#166534";
    label = "Low - 80";
  }

  return `
    <span style="display:inline-block; padding:5px 10px; border-radius:999px; background:${bg}; color:${color}; font-size:12px; font-weight:bold; white-space:nowrap;">
      ${escapeHtml(label)}
    </span>
  `;
}


function getStatusBadge(status) {
  const value = String(status || "").trim();

  let bg = "#e5e7eb";
  let color = "#374151";
  let label = value || "Blank";

  if (
    value === "Pending" ||
    value === "Not started" ||
    value === "Not Started"
  ) {
    bg = "#fee2e2";
    color = "#991b1b";
  } else if (
    value === "In Progress" ||
    value === "In progress"
  ) {
    bg = "#fef3c7";
    color = "#92400e";
  } else if (
    value === "Completed" ||
    value === "Complete"
  ) {
    bg = "#dcfce7";
    color = "#166534";
  } else if (value === PENDING_APPROVAL_STATUS) {
    bg = "#ffedd5";
    color = "#9a3412";
  }

  return `
    <span style="display:inline-block; padding:5px 10px; border-radius:999px; background:${bg}; color:${color}; font-size:12px; font-weight:bold; white-space:nowrap;">
      ${escapeHtml(label)}
    </span>
  `;
}


function formatDateValue(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd-MMM-yyyy");
  }

  return String(value);
}


function escapeHtml(text) {
  if (text === null || text === undefined) return "";

  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

/**
 * Run this once from the Apps Script editor to grant Google Drive access.
 * Select setupDriveAccess in the Run menu, click Run, then Authorize.
 */
function setupDriveAccess() {
  const folder = getOrCreateAttachmentsFolder_();
  const info = getAttachmentsFolderInfo_();
  Logger.log("Drive folder ready: " + info.url);
  Logger.log("Parent folder: " + info.parentName);
  Logger.log("Files in folder: " + info.fileCount);
  return info;
}
