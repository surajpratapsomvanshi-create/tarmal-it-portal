const SHEET_NAME = "Tasks";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" was not found.`);
    }

    const data = JSON.parse(e.postData.contents);
    const row = [
      data.Task || "",
      data.Priority || "",
      data.Owner || "",
      data["Raised By"] || "",
      data.Status || "",
      data.Type || "",
      toSheetDate(data["Start date"]),
      toSheetDate(data["End date"]),
      toSheetDate(data.Milestone),
      data.Notes || "",
      data["Bhanu List"] || ""
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function toSheetDate(value) {
  if (!value) return "";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
