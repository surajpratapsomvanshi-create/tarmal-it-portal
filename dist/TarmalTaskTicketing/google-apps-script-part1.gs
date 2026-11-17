/* =====================================================
   WEB APP API (Tickets + App Users)
   Paste this entire file into Apps Script, replacing all code.

   DRIVE SETUP (required once for screenshot uploads):
   1. In Apps Script: Project Settings -> enable "Show appsscript.json"
   2. Paste appsscript.json from this project (includes Drive scope)
   3. Run function "setupDriveAccess" from the editor -> Authorize -> Allow
   4. Deploy -> New deployment -> Web app

   RECURRING TASKS:
   - Saving a recurring ticket installs the hourly trigger and immediately creates any due copies.
   - Or run setupRecurringTicketsTrigger / setupDriveAccess once, or use
     Spreadsheet menu: Tarmal IT -> Setup recurring tasks trigger.
   - Handler: processRecurringTickets (also runnable manually from the menu).
   - MUST redeploy the web app after pasting this file or recurrence will not run.

   EXTERNAL SIGN-IN:
   - verifyExternalLogin checks a Google or Microsoft ID token, then reads UserMaster.
   - It does not insert, update, or delete anything.
   - Paste the real client IDs into EXTERNAL_LOGIN_GOOGLE_CLIENT_ID and
     EXTERNAL_LOGIN_MICROSOFT_CLIENT_ID (same values as auth.js). For a
     single-tenant Entra app also paste the Directory (tenant) ID into
     EXTERNAL_LOGIN_MICROSOFT_TENANT_ID (same as Auth.MICROSOFT_TENANT_ID), then
     Deploy -> Manage deployments -> Edit -> New version.
   - resource=users also returns the UserMaster rows (read-only) so password
     login can require a UserMaster match.
===================================================== */

const TASKS_SHEET = "Tasks";
const USERS_SHEET = "AppUsers";
const ASSETS_SHEET = "ITAssets";
const CONSUMABLES_SHEET = "ITConsumables";
const DOCUMENTS_SHEET = "Documents";
const PROCUREMENT_SHEET = "Procurement";
const USER_MASTER_SHEET = "UserMaster";

// Same OAuth client IDs as Auth.GOOGLE_CLIENT_ID / Auth.MICROSOFT_CLIENT_ID in auth.js.
// Leave blank until the Google Cloud and Azure app registrations exist.
// Google authorized JavaScript origin: https://surajpratapsomvanshi-create.github.io
// Microsoft SPA redirect URI: https://surajpratapsomvanshi-create.github.io/tarmal-it-portal/login.html
const EXTERNAL_LOGIN_GOOGLE_CLIENT_ID = "";
const EXTERNAL_LOGIN_MICROSOFT_CLIENT_ID = "67b1d187-9adf-43a4-b98d-a80acaeba55c";
// Directory (tenant) ID GUID for a single-tenant Entra app. Blank = accept any tenant.
// Tarmal Wire Products Limited.
const EXTERNAL_LOGIN_MICROSOFT_TENANT_ID = "f495e0ee-7478-4c10-87ac-9281b4b96f4f";

const USER_HEADERS = [
  "Id", "Name", "Username", "Email", "Password", "Active",
  "Dashboard", "Create Tickets", "Edit Tickets", "Export Data", "Sync Sheet", "Manage Users",
  "View Assets", "Manage Assets", "View Documents", "Manage Documents", "Delete Documents",
  "View Consumables", "Manage Consumables", "Edit Consumable History"
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
  "Notes",
  "Asset ID",
  "Department",
  "Purchase Date",
  "Warranty / Expiry",
  "Vendor",
  "License Seats",
  "License Key Last4",
  "History JSON",
  "Handovers JSON",
  "Declaration Generated At",
  "Declaration Signed File Name",
  "Declaration Signed Drive File Id",
  "Declaration Signed Drive URL",
  "Declaration Signed Uploaded At"
];

const CONSUMABLE_HEADERS = [
  "Id",
  "Item ID",
  "Name",
  "Category",
  "Unit",
  "Reorder Level",
  "Current Stock",
  "Vendor",
  "Notes",
  "Movements JSON",
  "Opening Stock"
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
  parentSheetRow: ["parent sheet row", "parent row", "parent task row", "parent task"],
  ticketId: ["ticket id", "ticketid", "ticket uuid"],
  recurrence: ["recurrence", "recurring", "repeat"],
  recurrenceNext: ["recurrence next", "recurrencenext", "next recurrence", "recurrence due"],
  recurrenceParentId: ["recurrence parent id", "recurrenceparentid", "recurrence template id", "recurring parent id"],
  outsideHours: ["outside hours", "outside office hours", "outsidehours", "after hours"]
};

const SOFT_DELETED_STATUS_ = "Deleted";
const TICKET_ID_HEADER_ = "Ticket ID";
const RECURRENCE_HEADER_ = "Recurrence";
const RECURRENCE_NEXT_HEADER_ = "Recurrence Next";
const RECURRENCE_PARENT_ID_HEADER_ = "Recurrence Parent Id";
const OUTSIDE_HOURS_HEADER_ = "Outside Hours";
const RECURRING_TICKETS_HANDLER_ = "processRecurringTickets";
const MILESTONE_ROLLOVER_HANDLER_ = "processOpenMilestoneRollover";
const RECURRING_CATCH_UP_PER_TEMPLATE_ = 5;

const ATTACHMENTS_FOLDER_NAME = "Tarmal Ticket Screenshots";
const ATTACHMENTS_FOLDER_ID_KEY = "ATTACHMENTS_FOLDER_ID";
const DOCUMENTS_FOLDER_NAME = "Tarmal IT Documents";
const DOCUMENTS_FOLDER_ID_KEY = "DOCUMENTS_FOLDER_ID";
const PROCUREMENT_FOLDER_NAME = "Tarmal Procurement Quotes";
const PROCUREMENT_FOLDER_ID_KEY = "PROCUREMENT_FOLDER_ID";
const ASSET_DECLARATIONS_FOLDER_NAME = "Tarmal Asset Declarations";
const ASSET_DECLARATIONS_FOLDER_ID_KEY = "ASSET_DECLARATIONS_FOLDER_ID";

// Post-save audit / Projects sync / pending email scans are deferred so doPost
// can return as soon as ticket rows are written.
const DEFERRED_POST_SAVE_PROP_ = "deferredPostSaveQueue";
const DEFERRED_POST_SAVE_HANDLER_ = "processDeferredPostSaveWork";
const DEFERRED_POST_SAVE_DELAY_MS_ = 30000;
// Skip getProjectTriggers() on the save hot path — listing triggers is slow and can
// push doPost past Google's HTTP deadline (HTML error page after a successful write).
const DEFERRED_POST_SAVE_TRIGGER_CACHE_KEY_ = "deferredPostSaveTriggerPending";
const DEFERRED_POST_SAVE_TRIGGER_CACHE_TTL_SEC_ = 50;
// Deferred work must NEVER take LockService.getScriptLock() — that lock serializes
// user saves. Use a CacheService lease with TTL so a crashed run cannot block forever.
const DEFERRED_POST_SAVE_LEASE_KEY_ = "deferredPostSaveLease";
const DEFERRED_POST_SAVE_LEASE_TTL_SEC_ = 180;
// Fail-fast write lock: client retries quietly. ScriptLock also auto-expires ~30s.
const WRITE_LOCK_WAIT_MS_ = 8000;
// Short-lived caches cut repeated sheet reads within / across nearby GET/POST runs.
const TASK_AUDIT_CACHE_KEY_ = "taskAuditMapV1";
const TASK_AUDIT_CACHE_TTL_SEC_ = 90;
const USERS_CACHE_KEY_ = "usersJsonV2";
const HIERARCHY_CACHE_KEY_ = "hierarchyJsonV1";
const META_CACHE_TTL_SEC_ = 120;
// Per-execution Tasks header cache (Apps Script keeps globals for one invocation).
var tasksHeaderCache_ = null;

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

function getOrCreateAssetDeclarationsFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedFolderId = props.getProperty(ASSET_DECLARATIONS_FOLDER_ID_KEY);

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
  const existingFolders = parentFolder.getFoldersByName(ASSET_DECLARATIONS_FOLDER_NAME);
  const folderExists = existingFolders.hasNext();
  const folder = folderExists
    ? existingFolders.next()
    : parentFolder.createFolder(ASSET_DECLARATIONS_FOLDER_NAME);

  if (!folderExists) {
    folder.createFile(
      "README - Asset Declarations.txt",
      [
        "Tarmal IT Portal stores signed asset Declaration Cum Undertaking scans in this folder.",
        "Spreadsheet: " + spreadsheet.getName(),
        "Created: " + new Date().toString()
      ].join("\n"),
      MimeType.PLAIN_TEXT
    );
  }

  props.setProperty(ASSET_DECLARATIONS_FOLDER_ID_KEY, folder.getId());
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

function saveAssetDeclarationFile_(data) {
  const dataUrl = String(data.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid signed declaration file data.");
  }

  const mimeType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const folder = getOrCreateAssetDeclarationsFolder_();
  const assetCode = sanitizeAttachmentName_(data.assetCode || data.assetId || "asset");
  const safeTitle = sanitizeAttachmentName_(data.title || data.fileName || ("Signed-Declaration-" + assetCode));
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
  const incomingBase = stripScreenshotMetadata_(incomingNotes);
  const existingBase = stripScreenshotMetadata_(existingNotes);
  // Prefer the longer remark base so stale attachment-only uploads cannot clobber newer sheet text.
  var baseText = incomingBase;
  if (existingBase && (!incomingBase || existingBase.length > incomingBase.length)) {
    baseText = existingBase;
  } else if (!incomingBase) {
    baseText = existingBase;
  }
  const allLinks = dedupeScreenshotUrls_(existingLinks.concat(incomingLinks));
  const linkLines = allLinks.map(function(url, index) {
    return "Screenshot " + (index + 1) + ": " + url;
  });
  return [baseText].concat(linkLines).filter(Boolean).join("\n");
}

function mergeNotesWithNewDriveLinks_(baseText, existingNotes, newLinks) {
  const existingLinks = extractScreenshotLinksFromNotes_(existingNotes);
  const allLinks = dedupeScreenshotUrls_(existingLinks.concat(newLinks || []));
  const text = stripScreenshotMetadata_(baseText) || stripScreenshotMetadata_(existingNotes);
  if (!allLinks.length) return text;
  const linkLines = allLinks.map(function(url, index) {
    return "Screenshot " + (index + 1) + ": " + url;
  });
  return [text].concat(linkLines).filter(Boolean).join("\n");
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
    const compact = e && e.parameter && (String(e.parameter.compact || "") === "1"
      || String(e.parameter.compact || "").toLowerCase() === "true");

    if (resource === "users") {
      return buildResponse_({ ok: true, users: readUsers_(), hierarchy: readUserMaster_() }, e);
    }

    if (resource === "assets") {
      return buildResponse_({ ok: true, assets: readAssets_() }, e);
    }

    if (resource === "consumables") {
      return buildResponse_({ ok: true, consumables: readConsumables_() }, e);
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

    // compact=1: list payload for portal boot/refresh — tickets + users + hierarchy only,
    // with heavy note/base64 content trimmed. Frontend requests this on every refresh.
    // lite=1: skip TaskAudit join + skip Notes column read (fastest auto-refresh / boot).
    // Notes catch up on full (non-lite) compact refresh; client keeps local notes meanwhile.
    if (compact) {
      const lite = e && e.parameter && (String(e.parameter.lite || "") === "1"
        || String(e.parameter.lite || "").toLowerCase() === "true");
      const tickets = readTickets_({
        includeAudit: !lite,
        omitNotes: lite
      }).map(compactTicketForList_);
      const payload = {
        ok: true,
        compact: true,
        lite: Boolean(lite),
        notesOmitted: Boolean(lite),
        tickets: tickets
      };
      // Users/hierarchy already cached client-side; skip sheet reads on lite polls.
      if (!lite) {
        payload.users = readUsersCached_();
        payload.hierarchy = readUserMasterCached_();
      }
      return buildResponse_(payload, e);
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

/**
 * Shrink list payloads: drop base64 images, keep Drive screenshot URLs + note text.
 * Does not truncate note body (avoids clobbering richer local remarks on merge).
 */
function compactTicketForList_(ticket) {
  const source = ticket || {};
  const notes = String(source.Notes || source.Remarks || "");
  const cleaned = notes.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "[image]");
  const links = extractScreenshotLinksFromNotes_(cleaned);
  const text = stripScreenshotMetadata_(cleaned)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  let compactNotes = text;
  if (links.length) {
    compactNotes = (compactNotes ? compactNotes + "\n" : "")
      + links.map(function(url, index) {
        return "Screenshot " + (index + 1) + ": " + url;
      }).join("\n");
  }
  const out = Object.assign({}, source, {
    Notes: compactNotes,
    Remarks: compactNotes
  });
  if (out.NotesHtml) delete out.NotesHtml;
  if (out.ScreenshotUrls) delete out.ScreenshotUrls;
  if (out.screenshots) delete out.screenshots;
  return out;
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
  try {
    CacheService.getScriptCache().remove(DEFERRED_POST_SAVE_TRIGGER_CACHE_KEY_);
  } catch (cacheError) {
    Logger.log(cacheError);
  }
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
 * Approval emails + recurring kicks are deferred here too (not on the save
 * critical path). Avoid ScriptApp.getProjectTriggers() here — it is slow.
 */
function scheduleDeferredPostSaveWork_(options) {
  const opts = options || {};
  const queue = readDeferredPostSaveQueue_();
  if (opts.audit !== false) queue.audit = true;
  if (opts.projects !== false) queue.projects = true;
  if (opts.taskEmails) queue.taskEmails = true;
  if (opts.approvalEmails) queue.approvalEmails = true;
  if (opts.recurring) queue.recurring = true;
  queue.requestedAt = Date.now();
  writeDeferredPostSaveQueue_(queue);

  const cache = CacheService.getScriptCache();
  try {
    if (cache.get(DEFERRED_POST_SAVE_TRIGGER_CACHE_KEY_)) {
      return;
    }
  } catch (cacheReadError) {
    Logger.log(cacheReadError);
  }

  try {
    cache.put(
      DEFERRED_POST_SAVE_TRIGGER_CACHE_KEY_,
      "1",
      DEFERRED_POST_SAVE_TRIGGER_CACHE_TTL_SEC_
    );
  } catch (cacheWriteError) {
    Logger.log(cacheWriteError);
  }

  try {
    ScriptApp.newTrigger(DEFERRED_POST_SAVE_HANDLER_)
      .timeBased()
      .after(DEFERRED_POST_SAVE_DELAY_MS_)
      .create();
  } catch (triggerError) {
    Logger.log(triggerError);
    try {
      cache.remove(DEFERRED_POST_SAVE_TRIGGER_CACHE_KEY_);
    } catch (cacheClearError) {
      Logger.log(cacheClearError);
    }
  }
}

function tryAcquireDeferredPostSaveLease_() {
  const cache = CacheService.getScriptCache();
  if (cache.get(DEFERRED_POST_SAVE_LEASE_KEY_)) {
    return false;
  }
  // putIfAbsent is not available on all runtimes; check-then-put is enough with TTL reclaim.
  cache.put(DEFERRED_POST_SAVE_LEASE_KEY_, String(Date.now()), DEFERRED_POST_SAVE_LEASE_TTL_SEC_);
  return true;
}

function releaseDeferredPostSaveLease_() {
  try {
    CacheService.getScriptCache().remove(DEFERRED_POST_SAVE_LEASE_KEY_);
  } catch (error) {
    Logger.log(error);
  }
}

function releaseWriteLock_(lock, lockAcquired) {
  if (!lockAcquired || !lock) return false;
  try {
    lock.releaseLock();
  } catch (releaseError) {
    Logger.log(releaseError);
  }
  return false;
}

function processDeferredPostSaveWork() {
  // Intentionally does NOT use LockService.getScriptLock(): that lock is reserved for
  // mutating doPost sheet writes so background audit/email work cannot block saves.
  if (!tryAcquireDeferredPostSaveLease_()) {
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

    if (!queue || (!queue.audit && !queue.projects && !queue.taskEmails
      && !queue.approvalEmails && !queue.recurring)) {
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
    if (queue.recurring) {
      try {
        kickRecurringTicketsAfterSave_();
      } catch (error) {
        Logger.log(error);
      }
    }
  } finally {
    releaseDeferredPostSaveLease_();
  }
}

function doPost(e) {
  // Read-only sign-in must not take the sheet write lock or wait behind ticket saves.
  var externalLoginResponse = routeVerifyExternalLogin_(e);
  if (externalLoginResponse) return externalLoginResponse;

  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    // Short wait so a contended lock fails fast; client retries quietly.
    // LockService also auto-expires held locks (~30s) if a run dies mid-flight.
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
  } catch (lockError) {
    lockAcquired = false;
  }

  if (!lockAcquired) {
    return buildResponse_({
      ok: false,
      busy: true,
      retryAfterMs: 2000,
      error: "Sheet sync is temporarily locked. Retrying is safe — no data was written."
    }, e);
  }

  try {
    const raw = (e && e.postData && e.postData.contents != null)
      ? String(e.postData.contents).replace(/^\uFEFF/, "")
      : "";
    if (!raw) {
      return buildResponse_({
        ok: false,
        error: "Empty request body. The browser may have lost the POST on redirect — try again."
      }, e);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      return buildResponse_({
        ok: false,
        error: "Invalid JSON in request body: " + parseError.message
      }, e);
    }

    if (data.action === "syncUsers") {
      writeUsers_(data.users || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "syncAssets") {
      writeAssets_(data.assets || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "syncConsumables") {
      writeConsumables_(data.consumables || []);
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
      // Drive I/O outside the write lock so ticket saves are never blocked by uploads.
      lockAcquired = releaseWriteLock_(lock, lockAcquired);
      const fileInfo = saveDocumentFile_(data);
      return buildResponse_({ ok: true, file: fileInfo }, e);
    }

    if (data.action === "uploadProcurementAttachment") {
      lockAcquired = releaseWriteLock_(lock, lockAcquired);
      const fileInfo = saveProcurementFile_(data);
      return buildResponse_({ ok: true, file: fileInfo }, e);
    }

    if (data.action === "uploadAssetDeclaration") {
      lockAcquired = releaseWriteLock_(lock, lockAcquired);
      const fileInfo = saveAssetDeclarationFile_(data);
      return buildResponse_({ ok: true, file: fileInfo }, e);
    }

    if (data.action === "deleteTicket") {
      const result = deleteTicket_(data);
      try {
        scheduleDeferredPostSaveWork_({ audit: true, projects: true });
      } catch (postDeleteError) {
        Logger.log(postDeleteError);
      }
      return buildResponse_({ ok: true, sheetRow: result.sheetRow, softDeleted: true }, e);
    }

    // sheetRow present ⇒ update, never append (even if action was omitted/stripped).
    const incomingSheetRow = Number(data.sheetRow) || 0;
    if (data.action === "updateTicket" || (!data.action && incomingSheetRow >= 2)) {
      // Sheet write under lock; approval email is fully deferred so Gmail latency
      // never blocks the save response (client already treats approval as pending).
      data.deferApprovalEmail = true;
      data.action = "updateTicket";
      const result = updateTicket_(data);
      const hadRecurrence = Boolean(result && (
        result.recurrence || result.needsRecurringKick
      ));
      lockAcquired = releaseWriteLock_(lock, lockAcquired);

      const needsApprovalEmail = result
        && result.approvalPending === true
        && (result._pendingApprovalEmail === true || !result.approvalSentTo);

      try {
        scheduleDeferredPostSaveWork_({
          audit: true,
          projects: true,
          approvalEmails: needsApprovalEmail,
          recurring: hadRecurrence
        });
      } catch (postUpdateError) {
        Logger.log(postUpdateError);
      }

      if (result) {
        delete result._pendingApprovalEmail;
        delete result._approvalEmailContext;
      }

      return buildResponse_({
        ok: result.ok !== false,
        sheetRow: Number(data.sheetRow) || Number(result.sheetRow) || 0,
        conflict: result.conflict === true,
        stale: result.stale === true,
        notes: result.notes,
        milestone: result.milestone,
        startDate: result.startDate,
        endDate: result.endDate,
        uploadedCount: result.uploadedCount,
        datesPersisted: result.datesPersisted === true,
        parentRemarkAppended: result.parentRemarkAppended === true,
        parentSheetRow: result.parentSheetRow || 0,
        parentNotes: result.parentNotes || "",
        status: result.status || "",
        ticketId: result.ticketId || "",
        lastUpdated: result.lastUpdated || "",
        closedOn: result.closedOn || "",
        approvalPending: result.approvalPending === true,
        approvalSentTo: result.approvalSentTo || "",
        approvalEmailError: result.approvalEmailError || "",
        approvalMessage: result.approvalMessage || "",
        approved: result.approved === true,
        error: result.error || "",
        deferredPostSave: true,
        deferredApprovalEmail: needsApprovalEmail,
        deferredRecurring: hadRecurrence,
        recurringCreated: 0
      }, e);
    }

    if (data.action === "uploadAttachments") {
      // Drive uploads run inside uploadTicketAttachmentsOnly_; release the doPost lock first.
      lockAcquired = releaseWriteLock_(lock, lockAcquired);
      const result = uploadTicketAttachmentsOnly_(data);
      return buildResponse_({
        ok: true,
        notes: result.notes,
        uploadedCount: result.uploadedCount,
        ticketId: result.ticketId || ""
      }, e);
    }

    if (data.action === "createTickets") {
      const items = Array.isArray(data.tickets) ? data.tickets : [];
      if (!items.length) {
        throw new Error("No tickets provided.");
      }

      const results = items.map(function(ticketData) {
        try {
          ticketData.deferApprovalEmail = true;
          const item = appendTicket_(ticketData);
          item.ok = true;
          if (item._pendingApprovalEmail) {
            item.deferredApprovalEmail = true;
          }
          delete item._pendingApprovalEmail;
          delete item._approvalEmailContext;
          return item;
        } catch (itemError) {
          Logger.log(itemError);
          return {
            ok: false,
            error: String(itemError.message || itemError),
            ticketId: String(ticketData.ticketId || ""),
            submissionId: String(ticketData.submissionId || "")
          };
        }
      });

      const hadRecurrence = results.some(function(item) {
        return item && item.ok !== false && (item.recurrence || item.needsRecurringKick);
      });
      lockAcquired = releaseWriteLock_(lock, lockAcquired);

      const successCount = results.filter(function(item) { return item.ok !== false; }).length;
      try {
        scheduleDeferredPostSaveWork_({
          audit: true,
          projects: true,
          taskEmails: true,
          approvalEmails: results.some(function(item) {
            return item.ok !== false && item.approvalPending === true;
          }),
          recurring: hadRecurrence
        });
      } catch (postAppendError) {
        Logger.log(postAppendError);
      }

      return buildResponse_({
        ok: successCount > 0,
        count: successCount,
        results: results,
        deferredPostSave: true,
        deferredRecurring: hadRecurrence,
        recurringCreated: 0,
        error: successCount === 0 ? "All ticket creates failed." : ""
      }, e);
    }

    if (data.action === "processRecurringTickets") {
      lockAcquired = releaseWriteLock_(lock, lockAcquired);
      const kick = kickRecurringTicketsAfterSave_();
      return buildResponse_({
        ok: kick.processOk !== false,
        created: kick.created || 0,
        advanced: kick.advanced || 0,
        triggerCreated: kick.triggerCreated === true,
        triggerError: kick.triggerError || "",
        error: kick.processError || ""
      }, e);
    }

    if (data.action) {
      throw new Error(`Unsupported action "${data.action}". Redeploy the Apps Script web app with the latest code.`);
    }

    // Create path only — never append when a sheet row was supplied (edit must update).
    if ((Number(data.sheetRow) || 0) >= 2) {
      throw new Error("A sheet row was provided without updateTicket. Refresh and try again — refusing to create a duplicate.");
    }

    data.deferApprovalEmail = true;
    const appendResult = appendTicket_(data);
    const needsAppendApprovalEmail = appendResult
      && appendResult.approvalPending === true
      && appendResult._pendingApprovalEmail === true;
    lockAcquired = releaseWriteLock_(lock, lockAcquired);

    if (appendResult) {
      delete appendResult._pendingApprovalEmail;
      delete appendResult._approvalEmailContext;
    }

    try {
      scheduleDeferredPostSaveWork_({
        audit: true,
        projects: true,
        taskEmails: true,
        approvalEmails: needsAppendApprovalEmail,
        recurring: Boolean(appendResult && (appendResult.recurrence || appendResult.needsRecurringKick))
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
      ticketId: appendResult.ticketId || "",
      lastUpdated: appendResult.lastUpdated || "",
      closedOn: appendResult.closedOn || "",
      approvalPending: appendResult.approvalPending === true,
      approvalSentTo: appendResult.approvalSentTo || "",
      approvalMessage: appendResult.approvalMessage || "",
      approved: appendResult.approved === true,
      deferredPostSave: true,
      deferredApprovalEmail: needsAppendApprovalEmail,
      deferredRecurring: Boolean(appendResult && (appendResult.recurrence || appendResult.needsRecurringKick))
    }, e);
  } catch (error) {
    return buildResponse_({ ok: false, error: error.message }, e);
  } finally {
    // Always release on success, failure, timeout, and exception paths.
    releaseWriteLock_(lock, lockAcquired);
  }
}

/**
 * Read task rows. When omitNotes is true, skip the Notes column entirely so huge
 * base64 cells are never transferred from Sheets (biggest GET latency win).
 */
function readTicketGridValues_(sheet, lastRow, lastCol, notesIndex, omitNotes) {
  if (!omitNotes || notesIndex < 0 || notesIndex >= lastCol) {
    return sheet.getRange(2, 1, lastRow, lastCol).getValues();
  }

  const rowCount = lastRow - 1;
  const values = [];
  for (let r = 0; r < rowCount; r++) {
    values.push(new Array(lastCol).fill(""));
  }

  // Columns left of Notes (1-indexed end = notesIndex).
  if (notesIndex > 0) {
    const left = sheet.getRange(2, 1, lastRow, notesIndex).getValues();
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < notesIndex; c++) {
        values[r][c] = left[r][c];
      }
    }
  }

  // Columns right of Notes.
  if (notesIndex + 1 < lastCol) {
    const rightStart = notesIndex + 2;
    const right = sheet.getRange(2, rightStart, lastRow, lastCol).getValues();
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < right[r].length; c++) {
        values[r][notesIndex + 1 + c] = right[r][c];
      }
    }
  }

  return values;
}

function readTickets_(options) {
  const opts = options || {};
  const includeAudit = opts.includeAudit !== false;
  const omitNotes = opts.omitNotes === true;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  // Ensure Recurrence columns exist so templates round-trip on GET after first deploy.
  const columnMap = ensureTasksColumns_(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const auditMap = includeAudit ? readTaskAuditMap_() : {};
  const notesIndex = resolveColumnIndex_(columnMap, "notes");
  const values = readTicketGridValues_(sheet, lastRow, lastCol, notesIndex, omitNotes);
  const tickets = [];

  for (let i = 0; i < values.length; i++) {
    const sheetRow = i + 2;
    const ticket = rowToTicket_(values[i], columnMap, sheetRow);
    if (!String(ticket.Task || "").trim()) continue;
    if (isSoftDeletedStatus_(ticket.Status)) continue;
    if (omitNotes) ticket.notesOmitted = true;
    tickets.push(includeAudit ? attachTicketAudit_(ticket, auditMap) : ticket);
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
    parentSheetRow: Number(data.parentSheetRow || data["Parent Sheet Row"]) || "",
    ticketId: String(data.ticketId || data.TicketId || data["Ticket ID"] || "").trim(),
    recurrence: normalizeRecurrenceValue_(data.Recurrence || data.recurrence || ""),
    recurrenceNext: toSheetDate_(data.RecurrenceNext || data["Recurrence Next"] || data.recurrenceNext || ""),
    recurrenceParentId: String(
      data.RecurrenceParentId
      || data["Recurrence Parent Id"]
      || data.recurrenceParentId
      || ""
    ).trim(),
    outsideHours: normalizeOutsideHoursFlag_(data["Outside Hours"] || data.outsideHours || "")
  };
}

function normalizeOutsideHoursFlag_(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text === "yes" || text === "y" || text === "true" || text === "1") return "Yes";
  return "";
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
  parentSheetRow: 11,
  ticketId: 12
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
    parentSheetRow: fields.parentSheetRow || "",
    ticketId: fields.ticketId || "",
    recurrence: fields.recurrence || "",
    recurrenceNext: fields.recurrenceNext || "",
    recurrenceParentId: fields.recurrenceParentId || "",
    outsideHours: fields.outsideHours || ""
  };

  let requiredLength = row.length;
  Object.keys(assignments).forEach((key) => {
    const index = resolveColumnIndex_(columnMap, key);
    if (index >= 0) requiredLength = Math.max(requiredLength, index + 1);
  });
  while (row.length < requiredLength) row.push("");

  Object.keys(assignments).forEach((key) => {
    const index = resolveColumnIndex_(columnMap, key);
    if (index >= 0) {
      // Do not blank an existing ticketId with an empty incoming value.
      if (key === "ticketId" && !assignments[key] && row[index]) return;
      row[index] = assignments[key];
    }
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

function invalidateTasksHeaderCache_() {
  tasksHeaderCache_ = null;
}

function getTasksSheetHeaders_(sheet) {
  const sheetId = sheet.getSheetId();
  if (tasksHeaderCache_ && tasksHeaderCache_.sheetId === sheetId) {
    return {
      headers: tasksHeaderCache_.headers.slice(),
      lastColumn: tasksHeaderCache_.lastColumn
    };
  }

  // Read only used columns once (avoid getMaxColumns + second getValues).
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  tasksHeaderCache_ = {
    sheetId: sheetId,
    headers: headers.slice(),
    lastColumn: lastColumn
  };
  return {
    headers: headers.slice(),
    lastColumn: lastColumn
  };
}

function setTasksHeaderCache_(sheet, headers) {
  const trimmed = headers.slice();
  tasksHeaderCache_ = {
    sheetId: sheet.getSheetId(),
    headers: trimmed,
    lastColumn: Math.max(trimmed.length, 1)
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

/**
 * Calendar day for occurrence identity. Date cells and yyyy-MM-dd stay as-is.
 * Slash dates use day/month when the first number is > 12, and month/day when
 * the second number is > 12 (28/9/2026 and 9/28/2026 are the same day).
 */
function calendarDayKey_(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const text = String(value).trim();
  if (!text || isPlaceholderDate_(text)) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const slash = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (!slash) return "";
  let day = Number(slash[1]);
  let month = Number(slash[2]);
  const year = Number(slash[3]);
  if (month > 12 && day <= 12) {
    const swap = day;
    day = month;
    month = swap;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function sheetDatesMatch_(left, right) {
  const a = sheetDateKey_(left);
  const b = sheetDateKey_(right);
  if (!a && !b) return true;
  return a === b;
}

function ensureTasksColumns_(sheet) {
  // Single header read + at most one header write for all missing columns.
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const headers = sheetInfo.headers.slice();
  let changed = false;

  const columnMap = buildColumnMap_(headers);
  if (columnMap.milestone < 0) {
    const milestoneIndex = COLUMN_FALLBACK_INDICES_.milestone;
    while (headers.length <= milestoneIndex) headers.push("");
    headers[milestoneIndex] = "Milestone";
    changed = true;
  }

  const normalized = headers.map(function(header) {
    return normalizeHeader_(header);
  });
  if (normalized.indexOf("approval email sent") < 0) {
    headers.push("Approval Email Sent");
    changed = true;
  }

  const mapAfterApproval = buildColumnMap_(headers);
  if (mapAfterApproval.parentSheetRow < 0) {
    const parentIndex = COLUMN_FALLBACK_INDICES_.parentSheetRow;
    while (headers.length <= parentIndex) headers.push("");
    if (!String(headers[parentIndex] || "").trim()) {
      headers[parentIndex] = "Parent Sheet Row";
    } else {
      headers.push("Parent Sheet Row");
    }
    changed = true;
  }

  const mapAfterParent = buildColumnMap_(headers);
  if (mapAfterParent.ticketId < 0) {
    headers.push(TICKET_ID_HEADER_);
    changed = true;
  }

  const mapAfterTicketId = buildColumnMap_(headers);
  if (mapAfterTicketId.recurrence < 0) {
    headers.push(RECURRENCE_HEADER_);
    changed = true;
  }
  const mapAfterRecurrence = buildColumnMap_(headers);
  if (mapAfterRecurrence.recurrenceNext < 0) {
    headers.push(RECURRENCE_NEXT_HEADER_);
    changed = true;
  }
  const mapAfterRecurrenceNext = buildColumnMap_(headers);
  if (mapAfterRecurrenceNext.recurrenceParentId < 0) {
    headers.push(RECURRENCE_PARENT_ID_HEADER_);
    changed = true;
  }
  const mapAfterRecurrenceParent = buildColumnMap_(headers);
  if (mapAfterRecurrenceParent.outsideHours < 0) {
    headers.push(OUTSIDE_HOURS_HEADER_);
    changed = true;
  }

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    setTasksHeaderCache_(sheet, headers);
  }

  return buildColumnMap_(headers);
}

function ensureTasksMilestoneColumn_(sheet) {
  return ensureTasksColumns_(sheet);
}

function ensureTasksParentColumn_(sheet) {
  return ensureTasksColumns_(sheet);
}

function ensureTasksApprovalEmailColumn_(sheet) {
  ensureTasksColumns_(sheet);
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const normalized = sheetInfo.headers.map(function(header) {
    return normalizeHeader_(header);
  });
  return normalized.indexOf("approval email sent");
}

function ensureTasksTicketIdColumn_(sheet) {
  return ensureTasksColumns_(sheet);
}

function shouldAppendSubtaskCompletion_(oldStatus, ticket) {
  const parentRow = Number(ticket.parentSheetRow || ticket["Parent Sheet Row"]);
  if (!parentRow || parentRow < 2) return false;
  return !isCompletedStatus(oldStatus) && isCompletedStatus(ticket.Status);
}

function identityFieldCandidates_(data, keys) {
  const values = [];
  const seen = {};
  keys.forEach(function(key) {
    const value = String(data[key] || "").trim();
    if (!value) return;
    const normalized = normalizeTicketIdentity_(value);
    if (seen[normalized]) return;
    seen[normalized] = true;
    values.push(value);
  });
  return values;
}

function assertRowIdentityMatch_(ticket, data, sheetRow) {
  const expectedTicketId = String(data.ticketId || data.TicketId || data["Ticket ID"] || "").trim();
  const actualTicketId = String(ticket.ticketId || "").trim();

  // Prefer pre-edit identity fields so renaming Task/Owner is not treated as a wrong-row write.
  // Also accept the incoming Task/Owner so a retry after a successful-but-unacked write still matches.
  const taskCandidates = identityFieldCandidates_(data, [
    "identityTask",
    "expectedTask",
    "originalTask",
    "Task"
  ]);
  const ownerCandidates = identityFieldCandidates_(data, [
    "identityOwner",
    "expectedOwner",
    "originalOwner",
    "Owner"
  ]);

  const actualTask = normalizeTicketIdentity_(ticket.Task);
  const actualOwner = normalizeTicketIdentity_(ticket.Owner);
  const taskMatched = !taskCandidates.length || taskCandidates.some(function(candidate) {
    return normalizeTicketIdentity_(candidate) === actualTask;
  });
  const ownerMatched = !ownerCandidates.length || ownerCandidates.some(function(candidate) {
    return normalizeTicketIdentity_(candidate) === actualOwner;
  });
  const rowIdentityMatched = taskMatched && ownerMatched;

  // Stable Ticket ID is authoritative when it matches. A mismatched client id (often
  // invented on edit when local storage lacked Ticket ID) must not reject a rename
  // when identityTask/Owner still point at this row — server keeps its own ticketId.
  if (expectedTicketId && actualTicketId) {
    if (expectedTicketId === actualTicketId) return;
    if (!rowIdentityMatched) {
      throw new Error("Ticket row " + sheetRow + " does not match ticketId. Refresh and try again.");
    }
    return;
  }

  if (taskCandidates.length && !taskMatched) {
    throw new Error("Ticket row " + sheetRow + " does not match the selected task. Refresh and try again.");
  }

  if (ownerCandidates.length && !ownerMatched) {
    throw new Error("Ticket row " + sheetRow + " does not match the selected owner. Refresh and try again.");
  }
}

function createTicketId_() {
  return Utilities.getUuid();
}

function nowIsoStamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function appendSubtaskCompletionToParent_(sheet, columnMap, subtask) {
  const parentRow = Number(subtask.parentSheetRow || subtask["Parent Sheet Row"]);
  if (!parentRow || parentRow < 2 || parentRow > sheet.getLastRow()) return null;

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const notesIndex = resolveColumnIndex_(columnMap, "notes");
  if (notesIndex < 0) return null;

  const parentRowValues = sheet.getRange(parentRow, 1, 1, sheetInfo.lastColumn).getValues()[0];
  const parent = rowToTicket_(parentRowValues, columnMap, parentRow);
  if (isSoftDeletedStatus_(parent.Status)) return null;

  // Prefer parent ticketId when provided; otherwise require Task match when available.
  const expectedParentTask = String(subtask.parentTask || "").trim();
  if (expectedParentTask && normalizeTicketIdentity_(parent.Task) !== normalizeTicketIdentity_(expectedParentTask)) {
    throw new Error("Parent sheet row " + parentRow + " does not match the parent task. Refresh and try again.");
  }

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const summary = stripScreenshotMetadata_(subtask.Notes || subtask.Remarks || subtask.Task || "");
  const appendLine = "[Sub-task completed " + dateStr + "] " + String(subtask.Task || "Sub-task").trim()
    + (summary ? " — " + summary : "");

  const existingNotes = String(parentRowValues[notesIndex] || parent.Notes || "").trim();
  parentRowValues[notesIndex] = mergeScreenshotNotes_(existingNotes, appendLine);
  sheet.getRange(parentRow, 1, 1, sheetInfo.lastColumn).setValues([parentRowValues]);
  return {
    appended: true,
    parentSheetRow: parentRow,
    notes: String(parentRowValues[notesIndex] || "")
  };
}

function isSoftDeletedStatus_(status) {
  return normalizeTicketIdentity_(status) === normalizeTicketIdentity_(SOFT_DELETED_STATUS_);
}

function buildTicketSyncResult_(data, enriched, fields, sheetRow, workflow) {
  const result = {
    notes: String(enriched.Notes || enriched.Remarks || "").trim(),
    milestone: formatTicketFieldDate_(data.Milestone) || formatTicketFieldDate_(fields.milestone),
    startDate: formatTicketFieldDate_(data["Start date"]) || formatTicketFieldDate_(fields.startDate),
    endDate: formatTicketFieldDate_(data["End date"]) || formatTicketFieldDate_(fields.endDate),
    uploadedCount: (data.attachments || []).length,
    status: fields.status || "",
    ticketId: fields.ticketId || data.ticketId || "",
    lastUpdated: nowIsoStamp_(),
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
  const owner = fields.owner || (oldTicket && oldTicket.Owner) || "";
  const workflow = resolveTicketWorkflow_(
    oldTicket,
    fields.status,
    fields.type,
    owner,
    resolveActorName_(data),
    resolveActorEmail_(data)
  );
  fields.status = workflow.status;

  // Recurring series head: keep RecurrenceNext filled so the time-driven job can fire.
  // Every recurring task uses the current date as Milestone.
  // RecurrenceParentId may remain set for lineage after a chain handoff.
  // This row already is the occurrence for its start day. RecurrenceNext on or
  // before that day makes the post-save kick append a second open ticket.
  if (fields.recurrence) {
    fields.milestone = toSheetDate_(todaySheetDateKey_());
    const startKey = calendarDayKey_(fields.startDate)
      || calendarDayKey_(fields.milestone)
      || todaySheetDateKey_();
    let nextKey = calendarDayKey_(fields.recurrenceNext);
    const oldNext = oldTicket ? calendarDayKey_(oldTicket.RecurrenceNext) : "";
    if (oldNext && oldNext > startKey && (!nextKey || nextKey <= startKey)) {
      nextKey = oldNext;
    }
    if (!nextKey || nextKey <= startKey) {
      nextKey = advanceRecurrenceDateKey_(startKey, fields.recurrence);
    }
    fields.recurrenceNext = toSheetDate_(nextKey);
  } else {
    fields.recurrence = "";
    fields.recurrenceNext = "";
    // Preserve parent link on generated children unless client clears it.
    if (!fields.recurrenceParentId && oldTicket && oldTicket.RecurrenceParentId) {
      fields.recurrenceParentId = String(oldTicket.RecurrenceParentId || "").trim();
    }
  }

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
    const managerEntry = { user: resolved.managerName, email: resolved.managerEmail };
    const requester = resolveActorName_(data);
    if (workflow.approvalKind === "project-type") {
      sendTaskProjectTypeApprovalEmail_(savedTicket, managerEntry, requester);
    } else {
      sendTaskCompletionApprovalEmail_(savedTicket, managerEntry, requester);
    }
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
  const columnMap = ensureTasksColumns_(sheet);
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const lastColumn = Math.max(sheetInfo.lastColumn, COLUMN_FALLBACK_INDICES_.ticketId + 1);
  const existingRow = sheet.getRange(sheetRow, 1, 1, lastColumn).getValues()[0].slice();
  const oldTicket = rowToTicket_(existingRow, columnMap, sheetRow);
  assertRowIdentityMatch_(oldTicket, data, sheetRow);
  if (isSoftDeletedStatus_(oldTicket.Status)) {
    throw new Error("Ticket row " + sheetRow + " was deleted. Refresh and try again.");
  }

  // Merge incoming Notes with existing screenshot links so updates cannot wipe Drive URLs.
  const notesIndex = resolveColumnIndex_(columnMap, "notes");
  if (notesIndex >= 0) {
    const existingNotes = String(existingRow[notesIndex] || "").trim();
    data = Object.assign({}, data, {
      Notes: mergeScreenshotNotes_(existingNotes, data.Notes || data.Remarks || ""),
      Remarks: mergeScreenshotNotes_(existingNotes, data.Remarks || data.Notes || "")
    });
  }

  // On update, the sheet's Ticket ID always wins so a client-invented UUID cannot
  // fork identity or fail a normal edit. Assign only when the row has none yet.
  if (oldTicket.ticketId) {
    data = Object.assign({}, data, { ticketId: oldTicket.ticketId });
  } else if (!data.ticketId) {
    data = Object.assign({}, data, { ticketId: createTicketId_() });
  }

  const oldStatus = oldTicket.Status;
  const prepared = prepareTicketSave_(data, oldTicket);
  const enriched = prepared.enriched;
  const fields = prepared.fields;
  const workflow = prepared.workflow;

  // Stale Pending Approval must not undo manager Completed — unless this save
  // intentionally opens project-type approval (Type newly set to SAP/Infra).
  if (isCompletedStatus(oldStatus) && isPendingApprovalStatus_(fields.status)
    && !(workflow && workflow.approvalKind === "project-type")) {
    return {
      ok: false,
      conflict: true,
      stale: true,
      error: "Ticket is already Completed. Refresh and try again.",
      notes: String(oldTicket.Notes || "").trim(),
      milestone: oldTicket.Milestone || "",
      startDate: oldTicket["Start date"] || "",
      endDate: oldTicket["End date"] || "",
      uploadedCount: 0,
      datesPersisted: true,
      parentRemarkAppended: false,
      parentSheetRow: 0,
      status: oldStatus,
      ticketId: oldTicket.ticketId || "",
      lastUpdated: oldTicket.lastUpdated || "",
      approvalPending: false,
      approvalSentTo: "",
      approvalEmailError: "",
      approvalMessage: "Stale Pending Approval overwrite blocked.",
      approved: false
    };
  }

  // Completed → Not started / reopen requires manager (or explicit expectedStatus Completed).
  if (isCompletedStatus(oldStatus) && !isCompletedStatus(fields.status) && !isPendingApprovalStatus_(fields.status)) {
    const actorName = resolveActorName_(data);
    const actorEmail = resolveActorEmail_(data);
    const maps = readUserMasterMaps_();
    if (!canUserApproveCompletion_(actorName, actorEmail, fields.owner || oldTicket.Owner, maps)) {
      const expected = String(data.expectedStatus || data.lastKnownStatus || "").trim();
      if (!isCompletedStatus(expected)) {
        return {
          ok: false,
          conflict: true,
          stale: true,
          error: "Only the owner's manager can reopen a Completed task. Refresh and try again.",
          notes: String(oldTicket.Notes || "").trim(),
          milestone: oldTicket.Milestone || "",
          startDate: oldTicket["Start date"] || "",
          endDate: oldTicket["End date"] || "",
          uploadedCount: 0,
          datesPersisted: true,
          parentRemarkAppended: false,
          parentSheetRow: 0,
          status: oldStatus,
          ticketId: oldTicket.ticketId || "",
          lastUpdated: oldTicket.lastUpdated || "",
          approvalPending: false,
          approvalSentTo: "",
          approvalEmailError: "",
          approvalMessage: "Completed reopen blocked.",
          approved: false
        };
      }
    }
  }

  // Soft lastUpdated conflict check.
  const clientLastUpdated = String(data.lastUpdated || "").trim();
  const serverLastUpdated = String(oldTicket.lastUpdated || "").trim();
  if (clientLastUpdated && serverLastUpdated && clientLastUpdated !== serverLastUpdated) {
    // Allow write but flag conflict so client can surface a message; last writer still wins
    // after identity checks. Prefer adopting server stamp on response.
  }

  const row = existingRow.slice();
  applyTicketFieldsToRow_(row, columnMap, fields);
  sheet.getRange(sheetRow, 1, 1, lastColumn).setValues([row]);

  // Trust the values we just wrote — avoid an extra getValues round-trip on the critical path.
  const savedTicket = rowToTicket_(row, columnMap, sheetRow);
  // Only one series head may keep Recurrence checked — clear older/sibling heads.
  if (fields.recurrence) {
    try {
      clearOtherSeriesRecurrenceHeads_(sheet, columnMap, savedTicket);
    } catch (clearError) {
      Logger.log("clearOtherSeriesRecurrenceHeads_ failed: " + clearError);
    }
  }
  const expectedMilestone = formatTicketFieldDate_(data.Milestone);
  const expectedStart = formatTicketFieldDate_(data["Start date"]) || expectedMilestone;
  const expectedEnd = formatTicketFieldDate_(data["End date"]);
  const datesPersisted = sheetDatesMatch_(savedTicket.Milestone, expectedMilestone)
    && sheetDatesMatch_(savedTicket["Start date"], expectedStart)
    && sheetDatesMatch_(savedTicket["End date"], expectedEnd);

  let parentRemarkAppended = false;
  let parentSheetRow = 0;
  let parentNotes = "";
  if (shouldAppendSubtaskCompletion_(oldStatus, savedTicket)) {
    const parentResult = appendSubtaskCompletionToParent_(sheet, columnMap, savedTicket);
    if (parentResult && parentResult.appended) {
      parentRemarkAppended = true;
      parentSheetRow = Number(parentResult.parentSheetRow) || Number(savedTicket.parentSheetRow) || 0;
      parentNotes = String(parentResult.notes || "");
    }
  }

  const approvalEmailResult = data.deferApprovalEmail === true
    ? { to: "", error: "" }
    : sendApprovalEmailIfNeeded_(data, savedTicket, workflow, sheet, sheetRow);
  const lastUpdated = nowIsoStamp_();

  const result = {
    ok: true,
    conflict: Boolean(clientLastUpdated && serverLastUpdated && clientLastUpdated !== serverLastUpdated),
    notes: String(savedTicket.Notes || savedTicket.Remarks || enriched.Notes || enriched.Remarks || "").trim(),
    milestone: savedTicket.Milestone || expectedMilestone,
    startDate: savedTicket["Start date"] || expectedStart,
    endDate: savedTicket["End date"] || expectedEnd,
    uploadedCount: (data.attachments || []).length,
    datesPersisted: datesPersisted,
    parentRemarkAppended: parentRemarkAppended,
    parentSheetRow: parentSheetRow,
    parentNotes: parentNotes,
    status: savedTicket.Status,
    ticketId: savedTicket.ticketId || fields.ticketId || "",
    lastUpdated: lastUpdated,
    approvalPending: isPendingApprovalStatus_(savedTicket.Status),
    approvalSentTo: approvalEmailResult.to || "",
    approvalEmailError: approvalEmailResult.error || "",
    approvalMessage: workflow.message || "",
    approved: workflow.approved === true,
    closedOn: rememberClientClosedOn_(
      savedTicket.Task || data.Task,
      savedTicket.Owner || fields.owner,
      savedTicket.Status || fields.status,
      data.closedOn
    ),
    recurrence: fields.recurrence || "",
    recurrenceNext: formatTicketFieldDate_(fields.recurrenceNext) || formatTicketFieldDate_(savedTicket.RecurrenceNext) || "",
    recurrenceParentId: fields.recurrenceParentId || ""
  };

  if (fields.recurrence) {
    // Hourly trigger + catch-up runs via deferred post-save — never block doPost.
    result.needsRecurringKick = true;
  }

  if (data.deferApprovalEmail === true && workflow && workflow.approvalSent) {
    result._pendingApprovalEmail = true;
    result._approvalEmailContext = {
      data: data,
      savedTicket: savedTicket,
      workflow: workflow,
      sheet: sheet,
      sheetRow: sheetRow
    };
  }

  return result;
}

function uploadTicketAttachmentsOnly_(data) {
  const sheetRow = Number(data.sheetRow);
  if (!sheetRow || sheetRow < 2) {
    throw new Error("A valid sheet row is required to upload attachments.");
  }

  const attachments = data.attachments || [];
  if (!attachments.length) {
    throw new Error("No screenshot attachments were provided.");
  }

  // Upload to Drive outside the sheet write lock so concurrent saves are not blocked.
  const driveLinks = saveTicketAttachments_(data);
  if (!driveLinks.length) {
    throw new Error("Could not upload screenshots to Google Drive. Redeploy Apps Script and allow Drive access.");
  }

  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
    if (!lockAcquired) {
      throw new Error("Sheet sync is temporarily locked. Retrying is safe — no data was written.");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
    if (!sheet) {
      throw new Error('Sheet "' + TASKS_SHEET + '" was not found.');
    }

    if (sheetRow > sheet.getLastRow()) {
      throw new Error("Ticket row " + sheetRow + " was not found in the sheet.");
    }

    const sheetInfo = getTasksSheetHeaders_(sheet);
    const columnMap = ensureTasksColumns_(sheet);
    const notesIndex = columnMap.notes;

    if (notesIndex < 0) {
      throw new Error('Missing "Notes" column in Tasks sheet.');
    }

    const row = sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).getValues()[0].slice();
    const existingTicket = rowToTicket_(row, columnMap, sheetRow);
    assertRowIdentityMatch_(existingTicket, data, sheetRow);
    if (isSoftDeletedStatus_(existingTicket.Status)) {
      throw new Error("Ticket row " + sheetRow + " was deleted. Refresh and try again.");
    }

    const existingNotes = String(row[notesIndex] || "").trim();
    const clientBase = stripScreenshotMetadata_(data.Notes || data.Remarks || "");
    const sheetBase = stripScreenshotMetadata_(existingNotes);
    const baseText = sheetBase && (!clientBase || sheetBase.length >= clientBase.length)
      ? sheetBase
      : (clientBase || sheetBase);
    const notes = mergeNotesWithNewDriveLinks_(baseText, existingNotes, driveLinks);
    row[notesIndex] = notes;
    sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).setValues([row]);

    return {
      notes: notes,
      uploadedCount: driveLinks.length,
      ticketId: existingTicket.ticketId || ""
    };
  } finally {
    releaseWriteLock_(lock, lockAcquired);
  }
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

function rememberRecentTicketCreate_(ticketId, sheetRow) {
  const id = String(ticketId || "").trim();
  const row = Number(sheetRow) || 0;
  if (!id || row < 2) return;
  try {
    CacheService.getScriptCache().put("ticketCreate:" + id, String(row), 21600);
  } catch (cacheError) {
    Logger.log(cacheError);
  }
}

function readRecentTicketCreateRow_(ticketId) {
  const id = String(ticketId || "").trim();
  if (!id) return 0;
  try {
    return Number(CacheService.getScriptCache().get("ticketCreate:" + id)) || 0;
  } catch (cacheError) {
    Logger.log(cacheError);
    return 0;
  }
}

function readTicketAtSheetRow_(sheet, columnMap, sheetRow) {
  const rowNumber = Number(sheetRow) || 0;
  if (!sheet || rowNumber < 2 || rowNumber > sheet.getLastRow()) return null;
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const row = sheet.getRange(rowNumber, 1, 1, sheetInfo.lastColumn).getValues()[0];
  return rowToTicket_(row, columnMap, rowNumber);
}

/**
 * Oldest non-deleted row with this Ticket ID. Create retries reuse the same id
 * and must update that row instead of appending another.
 */
function findActiveTicketByTicketId_(sheet, columnMap, ticketId) {
  const id = String(ticketId || "").trim();
  if (!id || !sheet) return null;

  const cachedRow = readRecentTicketCreateRow_(id);
  if (cachedRow >= 2) {
    const cachedTicket = readTicketAtSheetRow_(sheet, columnMap, cachedRow);
    if (cachedTicket
      && String(cachedTicket.ticketId || "").trim() === id
      && !isSoftDeletedStatus_(cachedTicket.Status)) {
      return cachedTicket;
    }
  }

  const idIndex = resolveColumnIndex_(columnMap, "ticketId");
  if (idIndex < 0) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const idValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0] || "").trim() !== id) continue;
    const ticket = readTicketAtSheetRow_(sheet, columnMap, i + 2);
    if (!ticket || isSoftDeletedStatus_(ticket.Status)) continue;
    rememberRecentTicketCreate_(id, ticket.sheetRow);
    return ticket;
  }
  return null;
}

function appendTicket_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${TASKS_SHEET}" was not found.`);
  }

  const columnMap = ensureTasksColumns_(sheet);

  // Edit payloads that arrive as create (retry, omitted action, nested createTickets)
  // must update the existing row. Never append a second row for a known ticket.
  const requestedRow = Number(data.sheetRow) || 0;
  if (requestedRow >= 2 && requestedRow <= sheet.getLastRow()) {
    return writeTicketToSheetRow_(sheet, requestedRow, data);
  }

  if (!data.ticketId) {
    data = Object.assign({}, data, { ticketId: createTicketId_() });
  }
  const existingById = findActiveTicketByTicketId_(sheet, columnMap, data.ticketId);
  if (existingById && existingById.sheetRow) {
    Logger.log(
      "appendTicket_ idempotent update ticketId=" + data.ticketId
      + " row=" + existingById.sheetRow
    );
    return writeTicketToSheetRow_(sheet, existingById.sheetRow, data);
  }

  const sheetInfo = getTasksSheetHeaders_(sheet);
  const prepared = prepareTicketSave_(data, null);
  const enriched = prepared.enriched;
  const fields = prepared.fields;
  const workflow = prepared.workflow;
  if (!fields.owner) {
    throw new Error("Owner is required for each ticket.");
  }
  if (!fields.ticketId) {
    fields.ticketId = data.ticketId || createTicketId_();
  }

  const row = new Array(Math.max(sheetInfo.lastColumn, COLUMN_FALLBACK_INDICES_.ticketId + 1)).fill("");
  applyTicketFieldsToRow_(row, columnMap, fields);
  sheet.appendRow(row);
  const sheetRow = sheet.getLastRow();
  writeOwnerCell_(sheet, sheetRow, columnMap, fields.owner);
  rememberRecentTicketCreate_(fields.ticketId || data.ticketId, sheetRow);

  // Trust the appended row — skip a post-write getValues on the create path.
  const savedTicket = rowToTicket_(row, columnMap, sheetRow);
  if (shouldAppendSubtaskCompletion_("", savedTicket)) {
    appendSubtaskCompletionToParent_(sheet, columnMap, savedTicket);
  }

  const result = buildTicketSyncResult_(data, enriched, fields, sheetRow, workflow);
  result.ticketId = savedTicket.ticketId || fields.ticketId || "";
  result.lastUpdated = nowIsoStamp_();
  result.closedOn = rememberClientClosedOn_(
    savedTicket.Task || data.Task,
    savedTicket.Owner || fields.owner,
    savedTicket.Status || fields.status,
    data.closedOn
  );
  result.recurrence = fields.recurrence || "";
  result.recurrenceNext = formatTicketFieldDate_(fields.recurrenceNext) || "";
  result.recurrenceParentId = fields.recurrenceParentId || "";
  if (fields.recurrence) {
    // Hourly trigger + catch-up runs via deferred post-save — never block doPost.
    result.needsRecurringKick = true;
  }
  if (data.deferApprovalEmail === true && workflow && workflow.approvalSent) {
    result.approvalSentTo = "";
    result.approvalEmailError = "";
    result._pendingApprovalEmail = true;
    result._approvalEmailContext = {
      data: data,
      savedTicket: savedTicket,
      workflow: workflow,
      sheet: sheet,
      sheetRow: sheetRow
    };
  } else {
    const approvalEmailResult = sendApprovalEmailIfNeeded_(data, savedTicket, workflow, sheet, sheetRow);
    result.approvalSentTo = approvalEmailResult.to || "";
    result.approvalEmailError = approvalEmailResult.error || "";
  }
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
  invalidateScriptCacheKey_(TASK_AUDIT_CACHE_KEY_);
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
  const columnMap = ensureTasksColumns_(sheet);
  const row = sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).getValues()[0].slice();
  const ticket = rowToTicket_(row, columnMap, sheetRow);
  assertRowIdentityMatch_(ticket, data, sheetRow);

  // Soft-delete: mark Status=Deleted so later rows keep stable sheetRow numbers.
  const statusIndex = resolveColumnIndex_(columnMap, "status");
  if (statusIndex < 0) {
    throw new Error('Missing "Status" column in Tasks sheet.');
  }
  row[statusIndex] = SOFT_DELETED_STATUS_;
  sheet.getRange(sheetRow, 1, 1, sheetInfo.lastColumn).setValues([row]);
  try {
    sheet.hideRows(sheetRow);
  } catch (hideError) {
    Logger.log(hideError);
  }

  const taskKey = buildTaskKey(ticket.Task, ticket.Owner);
  removeTaskAuditEntry_(taskKey);

  return { sheetRow: sheetRow, task: ticket.Task, owner: ticket.Owner, ticketId: ticket.ticketId || "" };
}

function invalidateScriptCacheKey_(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch (error) {
    Logger.log(error);
  }
}

function readTaskAuditMap_() {
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get(TASK_AUDIT_CACHE_KEY_);
    if (cached) {
      return JSON.parse(cached) || {};
    }
  } catch (cacheError) {
    Logger.log(cacheError);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TaskAudit");
  if (!sheet) return {};

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  // Read only key + date columns (A, C–E) instead of getDataRange across all columns.
  const keyValues = sheet.getRange(2, 1, lastRow, 1).getValues();
  const dateValues = sheet.getRange(2, 3, lastRow, 5).getValues();
  const map = {};

  for (let i = 0; i < keyValues.length; i++) {
    const key = String(keyValues[i][0] || "").trim();
    if (!key) continue;

    map[key] = {
      createdOn: dateValues[i][0],
      lastUpdated: dateValues[i][1],
      closedOn: dateValues[i][2]
    };
  }

  try {
    cache.put(TASK_AUDIT_CACHE_KEY_, JSON.stringify(map), TASK_AUDIT_CACHE_TTL_SEC_);
  } catch (putError) {
    // Cache has a size limit; skip when the audit map is too large.
    Logger.log(putError);
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

function readUsersCached_() {
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get(USERS_CACHE_KEY_);
    if (cached) return JSON.parse(cached) || [];
  } catch (error) {
    Logger.log(error);
  }
  const users = readUsers_();
  try {
    cache.put(USERS_CACHE_KEY_, JSON.stringify(users), META_CACHE_TTL_SEC_);
  } catch (putError) {
    Logger.log(putError);
  }
  return users;
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

function readUserMasterCached_() {
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get(HIERARCHY_CACHE_KEY_);
    if (cached) return JSON.parse(cached) || [];
  } catch (error) {
    Logger.log(error);
  }
  const hierarchy = readUserMaster_();
  try {
    cache.put(HIERARCHY_CACHE_KEY_, JSON.stringify(hierarchy), META_CACHE_TTL_SEC_);
  } catch (putError) {
    Logger.log(putError);
  }
  return hierarchy;
}

function writeUsers_(users) {
  const sheet = ensureUsersSheet_();
  const rows = users.map((user) => userToRow_(user));
  const output = [USER_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, USER_HEADERS.length).setValues(output);
  }
  // Flush before cache rewrite so concurrent GETs cannot re-cache pre-write rows.
  SpreadsheetApp.flush();
  invalidateScriptCacheKey_(USERS_CACHE_KEY_);
  try {
    const fresh = readUsers_();
    CacheService.getScriptCache().put(
      USERS_CACHE_KEY_,
      JSON.stringify(fresh),
      META_CACHE_TTL_SEC_
    );
  } catch (putError) {
    Logger.log(putError);
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
    .filter((row) => String(row[0] || "").trim())
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

function assetJsonCell_(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(Array.isArray(value) ? value : []);
  } catch (error) {
    return "[]";
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
    asset.status || "In use",
    asset.notes || "",
    asset.assetCode || "",
    asset.department || "",
    toSheetDate_(asset.purchaseDate),
    toSheetDate_(asset.warrantyExpiry),
    asset.vendor || "",
    asset.licenseSeats === 0 || asset.licenseSeats ? String(asset.licenseSeats) : "",
    asset.licenseKeyLast4 || "",
    assetJsonCell_(asset.history),
    assetJsonCell_(asset.handovers),
    asset.declarationGeneratedAt || "",
    asset.declarationSignedFileName || "",
    asset.declarationSignedDriveFileId || "",
    asset.declarationSignedDriveUrl || "",
    asset.declarationSignedUploadedAt || ""
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
    status: String(row[11] || "In use"),
    notes: String(row[12] || ""),
    assetCode: String(row[13] || ""),
    department: String(row[14] || ""),
    purchaseDate: formatTicketDate_(row[15]),
    warrantyExpiry: formatTicketDate_(row[16]),
    vendor: String(row[17] || ""),
    licenseSeats: String(row[18] || ""),
    licenseKeyLast4: String(row[19] || ""),
    history: String(row[20] || "[]"),
    handovers: String(row[21] || "[]"),
    declarationGeneratedAt: String(row[22] || ""),
    declarationSignedFileName: String(row[23] || ""),
    declarationSignedDriveFileId: String(row[24] || ""),
    declarationSignedDriveUrl: String(row[25] || ""),
    declarationSignedUploadedAt: String(row[26] || "")
  };
}

function ensureConsumablesSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONSUMABLES_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONSUMABLES_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONSUMABLE_HEADERS);
  }

  return sheet;
}

function readConsumables_() {
  const sheet = ensureConsumablesSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter((row) => String(row[0] || "").trim())
    .map((row) => rowToConsumable_(row));
}

function writeConsumables_(items) {
  const sheet = ensureConsumablesSheet_();
  const rows = items.map((item) => consumableToRow_(item));
  const output = [CONSUMABLE_HEADERS].concat(rows);

  sheet.clearContents();

  if (output.length) {
    sheet.getRange(1, 1, output.length, CONSUMABLE_HEADERS.length).setValues(output);
  }
}

function consumableToRow_(item) {
  return [
    item.id || "",
    item.itemCode || "",
    item.name || "",
    item.category || "",
    item.unit || "",
    item.reorderLevel === 0 || item.reorderLevel ? String(item.reorderLevel) : "",
    item.currentStock === 0 || item.currentStock ? String(item.currentStock) : "",
    item.vendor || "",
    item.notes || "",
    assetJsonCell_(item.movements),
    item.openingStock === 0 || item.openingStock ? String(item.openingStock) : "0"
  ];
}

function rowToConsumable_(row) {
  const item = {
    id: String(row[0] || ""),
    itemCode: String(row[1] || ""),
    name: String(row[2] || ""),
    category: String(row[3] || ""),
    unit: String(row[4] || ""),
    reorderLevel: String(row[5] || "0"),
    currentStock: String(row[6] || "0"),
    vendor: String(row[7] || ""),
    notes: String(row[8] || ""),
    movements: String(row[9] || "[]")
  };
  if (row.length > 10) {
    item.openingStock = String(row[10] || "0");
  }
  return item;
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
    rights.manageDocuments ? "Yes" : "No",
    rights.deleteDocuments ? "Yes" : "No",
    rights.viewConsumables ? "Yes" : "No",
    rights.manageConsumables ? "Yes" : "No",
    rights.editConsumableHistory ? "Yes" : "No"
  ];
}

function rowToUser_(row) {
  const manageDocuments = isTruthy_(row[15]);
  const hasDeleteColumn = row.length > 16;
  const hasConsumableColumns = row.length > 17;
  const rights = {
    dashboard: isTruthy_(row[6]),
    createTicket: isTruthy_(row[7]),
    editTicket: isTruthy_(row[8]),
    exportData: isTruthy_(row[9]),
    syncSheet: isTruthy_(row[10]),
    manageUsers: isTruthy_(row[11]),
    viewAssets: isTruthy_(row[12]),
    manageAssets: isTruthy_(row[13]),
    viewDocuments: isTruthy_(row[14]),
    manageDocuments: manageDocuments,
    // Older sheets without the column keep prior Mgr Docs delete behavior.
    deleteDocuments: hasDeleteColumn ? isTruthy_(row[16]) : manageDocuments
  };
  if (hasConsumableColumns) {
    rights.viewConsumables = isTruthy_(row[17]);
    rights.manageConsumables = isTruthy_(row[18]);
    rights.editConsumableHistory = isTruthy_(row[19]);
  }
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    username: String(row[2] || ""),
    email: String(row[3] || ""),
    password: String(row[4] || ""),
    active: isTruthy_(row[5]),
    rights: rights
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
  const ticketId = String(readCell_(row, columnMap.ticketId, 12) || "").trim();
  const recurrence = normalizeRecurrenceValue_(readCell_(row, columnMap.recurrence, -1) || "");
  const recurrenceNext = formatTicketDate_(readCell_(row, columnMap.recurrenceNext, -1) || "");
  const recurrenceParentId = String(readCell_(row, columnMap.recurrenceParentId, -1) || "").trim();

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
    ticketId: ticketId,
    Recurrence: recurrence,
    RecurrenceNext: recurrenceNext,
    RecurrenceParentId: recurrenceParentId,
    "Outside Hours": normalizeOutsideHoursFlag_(readCell_(row, columnMap.outsideHours, -1) || ""),
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

var CLIENT_CLOSED_ON_CACHE_KEY_ = "clientClosedOnStampsV1";

function parseClientWallClock_(value) {
  var text = String(value || "").trim();
  var match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (!match) return null;
  var hh = Number(match[4]);
  var mm = Number(match[5]);
  var ss = Number(match[6] || 0);
  if (hh === 0 && mm === 0 && ss === 0) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hh, mm, ss);
}

function readClientClosedOnStash_() {
  try {
    return JSON.parse(CacheService.getScriptCache().get(CLIENT_CLOSED_ON_CACHE_KEY_) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function stashClientClosedOn_(taskKey, formatted) {
  if (!taskKey || !formatted) return;
  var map = readClientClosedOnStash_();
  map[taskKey] = formatted;
  var keys = Object.keys(map);
  if (keys.length > 200) {
    keys.slice(0, keys.length - 200).forEach(function (key) {
      delete map[key];
    });
  }
  try {
    CacheService.getScriptCache().put(CLIENT_CLOSED_ON_CACHE_KEY_, JSON.stringify(map), 21600);
  } catch (error) {
    Logger.log(error);
  }
}

function stashedClientClosedOn_(taskKey) {
  if (!taskKey) return null;
  return parseClientWallClock_(readClientClosedOnStash_()[taskKey]);
}

/**
 * Persist the browser's completion wall clock onto TaskAudit.Closed On.
 * Existing Closed On values are kept. Deferred audit reads the stash when the row is new.
 */
function rememberClientClosedOn_(taskName, owner, status, clientClosedOn) {
  if (!isCompletedStatus(status)) return "";
  var stamp = parseClientWallClock_(clientClosedOn) || new Date();
  var formatted = formatTicketDateTime_(stamp);
  var taskKey = buildTaskKey(taskName, owner);
  stashClientClosedOn_(taskKey, formatted);

  var auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TaskAudit");
  if (!auditSheet) return formatted;
  var lastRow = auditSheet.getLastRow();
  if (lastRow < 2) return formatted;
  var keys = auditSheet.getRange(2, 1, lastRow, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0] || "").trim() !== taskKey) continue;
    var existing = auditSheet.getRange(i + 2, 5).getValue();
    if (existing) return formatTicketDateTime_(existing);
    auditSheet.getRange(i + 2, 5).setValue(stamp);
    invalidateScriptCacheKey_(TASK_AUDIT_CACHE_KEY_);
    return formatted;
  }
  return formatted;
}

function toSheetDate_(value) {
  if (!value) return "";
  // Noon avoids a spreadsheet-timezone shift that stores the previous calendar day.
  const key = calendarDayKey_(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!iso) return value;
  return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
}

function buildResponse_(payload, e) {
  try {
    const safePayload = payload && typeof payload === "object"
      ? payload
      : { ok: false, error: "Empty response payload." };
    const callback = e && e.parameter && e.parameter.callback;
    const body = JSON.stringify(safePayload);

    if (callback) {
      return ContentService
        .createTextOutput(String(callback) + "(" + body + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(body)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Never let response encoding throw an uncaught exception (Google HTML error page).
    const fallback = JSON.stringify({
      ok: false,
      error: "Response encoding failed: " + String(error && error.message || error)
    });
    return ContentService
      .createTextOutput(fallback)
      .setMimeType(ContentService.MimeType.JSON);
  }
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
      const stashedClosedOn = stashedClientClosedOn_(taskKey);
      const closedOn = completed ? (stashedClosedOn || now) : "";

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
        closedOnValue = stashedClientClosedOn_(taskKey) || now;
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
  invalidateScriptCacheKey_(TASK_AUDIT_CACHE_KEY_);
}


function isProjectType_(typeValue) {
  const value = String(typeValue || "").trim();
  if (!value) return false;

  const lower = value.toLowerCase();
  if (lower.indexOf("daily") !== -1) return false;

  // Projects sheet / long-term project types (presentation). Approval still uses isExactProjectType_ (SAP/Infra only).
  return lower === "sap" || lower === "infra" || lower === "mom";
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
   Only SAP, Infra, and MOM appear in Projects
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
    message = `Synced ${count} long-term project${count === 1 ? "" : "s"} (Type = SAP, Infra, or MOM). Daily tasks excluded.`;
  } else if (taskSheet) {
    const summary = formatTaskTypeSummary_(summarizeTaskTypes_(taskSheet));
    message = summary
      ? `No SAP/Infra/MOM projects found. Tasks types: ${summary}. Change long-term work to Type SAP, Infra, or MOM.`
      : "No SAP, Infra, or MOM tasks found in Tasks. Set Type to SAP, Infra, or MOM on long-term work.";
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
    .addItem("Refresh Projects (SAP, Infra & MOM)", "refreshProjectsSheet")
    .addItem("Clear Projects filter", "clearProjectsFilter")
    .addItem("Send pending approval emails", "sendPendingCompletionApprovalEmailsManual")
    .addItem("Test approval email", "testCompletionApprovalEmail")
    .addItem("Setup recurring tasks trigger", "setupRecurringTicketsTrigger")
    .addItem("Run recurring tasks now", "processRecurringTickets")
    .addItem("Setup milestone rollover trigger", "setupMilestoneRolloverTrigger")
    .addItem("Run milestone rollover now", "processOpenMilestoneRollover")
    .addItem("Restore milestones from MilestoneRestore sheet", "restoreMilestonesFromRestoreSheet")
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

