const SHEET_NAME = "Tasks";

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

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return buildResponse_({ ok: false, error: `Sheet "${SHEET_NAME}" was not found.` }, e);
  }

  const values = sheet.getDataRange().getValues();
  if (!values.length) {
    return buildResponse_({ ok: true, tickets: [] }, e);
  }

  const columnMap = buildColumnMap_(values[0]);
  const tickets = values.slice(1)
    .map((row, index) => rowToTicket_(row, columnMap, index + 2))
    .filter((ticket) => String(ticket.Task || "").trim());

  return buildResponse_({ ok: true, tickets }, e);
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
