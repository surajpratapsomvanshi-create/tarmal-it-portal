/* =====================================================
   SPEED PATCH — Ticket save no longer waits on audit/projects/emails
   =====================================================
   HOW TO APPLY (easier than pasting the full 98k merged file):

   1. Open the spreadsheet → Extensions → Apps Script
   2. Paste the THREE constant lines below near your other consts
      (or replace if they already exist from a prior patch attempt)
   3. Paste/replace the helper functions (readDeferred… through
      processDeferredPostSaveWork)
   4. REPLACE your entire existing doPost function with the doPost below
   5. Deploy → Manage deployments → Edit (pencil) → New version → Deploy

   What this does:
   - doPost returns as soon as ticket rows are written
   - updateHiddenTaskAudit / syncProjectsWithTasks / pending email scans
     run ~30s later via a one-shot time-based trigger
   - Per-ticket approval emails still send inline in appendTicket_/updateTicket_
   - Owner “new task” emails still send via the deferred trigger

   After deploy, create a ticket — the UI should finish in a few seconds
   instead of hanging near ~87% on “Syncing ticket…”.
===================================================== */

// --- 1) Add these constants (near ATTACHMENTS_FOLDER_* etc.) ---
const DEFERRED_POST_SAVE_PROP_ = "deferredPostSaveQueue";
const DEFERRED_POST_SAVE_HANDLER_ = "processDeferredPostSaveWork";
const DEFERRED_POST_SAVE_DELAY_MS_ = 30000;

// --- 2) Paste these helpers (anywhere before doPost is fine) ---

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

// --- 3) REPLACE your entire doPost with this version ---

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

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

    if (data.action === "syncDocuments") {
      writeDocuments_(data.documents || []);
      return buildResponse_({ ok: true }, e);
    }

    if (data.action === "uploadDocument") {
      const fileInfo = saveDocumentFile_(data);
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
