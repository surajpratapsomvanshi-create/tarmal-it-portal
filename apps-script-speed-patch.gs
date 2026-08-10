/* =====================================================
   SPEED / BUSY-LOCK PATCH NOTES
   =====================================================
   PREFERRED: Deploy the entire `google-apps-script-full-merged.gs`
   (New version on the existing Web app deployment). That file has:

   Busy-lock:
   - Deferred audit/email work uses a CacheService TTL lease — it does
     NOT take LockService.getScriptLock(), so background work cannot
     block ticket saves when nobody else is editing.
   - doPost write lock fails fast (~8s), always releases in finally,
     and releases before Drive uploads.
   - Busy responses no longer imply "another person is saving."

   Speed (2026-08-10):
   - Approval emails fully deferred off the save critical path.
   - Deferred trigger coalesce (do not delete+recreate on every save).
   - Tasks header cache + single-pass column ensure; skip post-write re-read.
   - TaskAudit / users / hierarchy short CacheService TTL; compact&lite=1
     skips TaskAudit join for auto-refresh.
   - parentNotes returned on subtask completion so client can skip a
     blocking full-sheet refresh.

   This patch file is a partial historical helper. If you only paste
   pieces below, still replace processDeferredPostSaveWork so it never
   calls LockService.getScriptLock(), and prefer the full merged file
   for the speed path.
===================================================== */

// --- Constants (also in full-merged) ---
const DEFERRED_POST_SAVE_PROP_ = "deferredPostSaveQueue";
const DEFERRED_POST_SAVE_HANDLER_ = "processDeferredPostSaveWork";
const DEFERRED_POST_SAVE_DELAY_MS_ = 30000;
const DEFERRED_POST_SAVE_LEASE_KEY_ = "deferredPostSaveLease";
const DEFERRED_POST_SAVE_LEASE_TTL_SEC_ = 180;
const WRITE_LOCK_WAIT_MS_ = 8000;

function tryAcquireDeferredPostSaveLease_() {
  const cache = CacheService.getScriptCache();
  if (cache.get(DEFERRED_POST_SAVE_LEASE_KEY_)) {
    return false;
  }
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

/**
 * CRITICAL: do NOT use LockService.getScriptLock() here.
 * That lock serializes user saves; deferred audit must not hold it.
 */
function processDeferredPostSaveWork() {
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

    if (!queue || (!queue.audit && !queue.projects && !queue.taskEmails && !queue.approvalEmails)) {
      return;
    }

    if (queue.audit) {
      try { updateHiddenTaskAudit(); } catch (error) { Logger.log(error); }
    }
    if (queue.projects) {
      try { syncProjectsWithTasks(); } catch (error) { Logger.log(error); }
    }
    if (queue.taskEmails) {
      try { sendPendingTaskEmails(); } catch (error) { Logger.log(error); }
    }
    if (queue.approvalEmails) {
      try { sendPendingCompletionApprovalEmails(); } catch (error) { Logger.log(error); }
    }
  } finally {
    releaseDeferredPostSaveLease_();
  }
}
