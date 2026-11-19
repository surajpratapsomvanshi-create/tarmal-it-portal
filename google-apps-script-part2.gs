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

function isExactProjectType_(type) {
  const value = String(type || "").trim().toLowerCase();
  return value === "sap" || value === "infra";
}

function typeEnteredProjectType_(nextType, previousType) {
  // Exact SAP / Infra only (not Daily - SAP / Daily - Infra).
  return isExactProjectType_(nextType) && !isExactProjectType_(previousType);
}

function resolveCompletionWorkflow_(oldStatus, requestedStatus, owner, actorName, actorEmail, ticketType) {
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
    // Completion approval ONLY for exact project SAP / Infra — never Daily-* or MOM.
    if (!isExactProjectType_(ticketType)) {
      return { status: "Completed", approvalSent: false };
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
      approvalKind: "completion",
      manager: manager,
      message: "Completion sent for manager approval."
    };
  }

  return { status: requestedStatus, approvalSent: false };
}

/**
 * Approval workflow:
 * - Completion of exact SAP / Infra → Pending Approval (manager)
 * - Daily - SAP / Daily - Infra / MOM: no approval
 * - Setting Type to SAP/Infra alone no longer requires approval
 * - Leaving Pending Approval (non-Completed) still requires the owner's manager
 */
function resolveTicketWorkflow_(oldTicket, requestedStatus, requestedType, owner, actorName, actorEmail) {
  const oldStatus = oldTicket ? String(oldTicket.Status || "") : "";
  const maps = readUserMasterMaps_();

  const leavingPending = isPendingApprovalStatus_(oldStatus)
    && !isPendingApprovalStatus_(requestedStatus)
    && !isCompletedStatus(requestedStatus);

  if (leavingPending && ownerRequiresCompletionApproval_(owner, maps)) {
    if (!canUserApproveCompletion_(actorName, actorEmail, owner, maps)) {
      throw new Error("Only the task owner's manager can approve this ticket.");
    }
  }

  const completion = resolveCompletionWorkflow_(
    oldStatus,
    requestedStatus,
    owner,
    actorName,
    actorEmail,
    requestedType
  );

  if (isPendingApprovalStatus_(completion.status) && isCompletedStatus(requestedStatus)) {
    return completion;
  }

  if (leavingPending) {
    return {
      status: requestedStatus,
      approvalSent: false,
      approved: true,
      message: "Approved."
    };
  }

  return completion;
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

function sendTaskProjectTypeApprovalEmail_(ticket, managerEntry, requesterName) {
  const managerEmail = String(managerEntry.email || "").trim();
  if (!managerEmail) return false;

  const taskName = String(ticket.Task || "").trim() || "Task";
  const owner = String(ticket.Owner || ticket.owner || "").trim();
  const requester = String(requesterName || owner).trim();
  const managerName = String(managerEntry.user || "").trim() || "Manager";
  const typeValue = String(ticket.Type || "").trim();
  const endDate = formatDateValue(ticket["End date"] || ticket.endDate);
  const notes = String(ticket.Notes || ticket.Remarks || "").trim();

  const subject = "Project type approval required | " + taskName;
  const plainBody =
    "Hi " + managerName + ",\n\n" +
    requester + " has set Type to " + typeValue + " for a task assigned to " + owner + ".\n\n" +
    "Task: " + taskName + "\n" +
    "Owner: " + owner + "\n" +
    "Type: " + typeValue + "\n" +
    "End Date: " + endDate + "\n" +
    "Notes: " + notes + "\n\n" +
    "Open the Tarmal IT Portal, find this ticket, and set status to Not started or In progress to approve the project type (or Completed to approve closure).\n\n" +
    "This is an automated notification from the Task Management System.";

  const htmlBody = `
    <div style="margin:0; padding:24px; background:#eef2f7; font-family:Arial, sans-serif;">
      <div style="max-width:580px; margin:0 auto; background:#ffffff; border:1px solid #d9e1e7; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.10);">
        <div style="background:#1d4ed8; color:#ffffff; padding:20px 24px;">
          <div style="font-size:20px; font-weight:bold;">Project Type Approval Required</div>
          <div style="font-size:12px; margin-top:5px; opacity:0.9;">Task Management System</div>
        </div>
        <div style="padding:24px; color:#333333; font-size:14px; line-height:1.6;">
          <p style="margin:0 0 12px 0;">Hi <strong>${escapeHtml(managerName)}</strong>,</p>
          <p style="margin:0 0 18px 0;">
            <strong>${escapeHtml(requester)}</strong> has set Type to <strong>${escapeHtml(typeValue)}</strong>
            for a task assigned to <strong>${escapeHtml(owner)}</strong>.
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
            Open the Tarmal IT Portal, find this ticket, and set status to
            <strong>Not started</strong> or <strong>In progress</strong> to approve the project type
            (or <strong>Completed</strong> to approve closure).
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
      const managerEntry = { user: resolved.managerName, email: resolved.managerEmail };
      // Pending Approval is completion-gated for exact SAP/Infra only.
      sendTaskCompletionApprovalEmail_(ticket, managerEntry, ticket.Owner);
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
 * Also ensures the recurring-tasks time-driven trigger exists.
 */
function setupDriveAccess() {
  const folder = getOrCreateAttachmentsFolder_();
  const info = getAttachmentsFolderInfo_();
  Logger.log("Drive folder ready: " + info.url);
  Logger.log("Parent folder: " + info.parentName);
  Logger.log("Files in folder: " + info.fileCount);
  const trigger = ensureRecurringTicketsTrigger_();
  Logger.log("Recurring tasks trigger: " + (trigger.created ? "created" : "already present"));
  const milestoneTrigger = ensureMilestoneRolloverTrigger_();
  Logger.log("Milestone rollover trigger: " + (milestoneTrigger.created ? "created" : "already present"));
  return info;
}

/* =====================================================
   RECURRING TASKS
   Tickets with Recurrence set are the active series head. A time-driven
   trigger creates the next Not-started ticket when Recurrence Next is due,
   copies Recurrence + RecurrenceNext onto that new ticket, and clears
   recurrence on the previous head (chain handoff). Type is independent of
   recurrence. Uncheck Recurring + save (or soft-delete) to stop the series.
===================================================== */

function normalizeRecurrenceValue_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "daily" || lower === "day") return "Daily";
  if (lower === "weekly" || lower === "week") return "Weekly";
  if (lower === "monthly" || lower === "month") return "Monthly";
  const everyMatch = lower.match(/^every\s*:?\s*(\d+)\s*(d|day|days)?$/i)
    || lower.match(/^every:(\d+)$/i);
  if (everyMatch) {
    const days = Math.max(1, Math.min(365, Number(everyMatch[1]) || 0));
    return days ? ("Every:" + days) : "";
  }
  if (/^\d+$/.test(text)) {
    const days = Math.max(1, Math.min(365, Number(text)));
    return "Every:" + days;
  }
  return "";
}

function todaySheetDateKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function parseSheetDateKey_(value) {
  const key = sheetDateKey_(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parts = key.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateKeyFromDate_(date) {
  if (!date || Object.prototype.toString.call(date) !== "[object Date]" || isNaN(date.getTime())) {
    return "";
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function advanceRecurrenceDateKey_(dateKey, recurrence) {
  const normalized = normalizeRecurrenceValue_(recurrence);
  const base = parseSheetDateKey_(dateKey) || parseSheetDateKey_(todaySheetDateKey_());
  if (!base || !normalized) return todaySheetDateKey_();

  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (normalized === "Daily") {
    next.setDate(next.getDate() + 1);
  } else if (normalized === "Weekly") {
    next.setDate(next.getDate() + 7);
  } else if (normalized === "Monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (/^Every:\d+$/i.test(normalized)) {
    const days = Math.max(1, Number(String(normalized).split(":")[1]) || 1);
    next.setDate(next.getDate() + days);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return formatDateKeyFromDate_(next);
}

function addDaysToDateKey_(dateKey, days) {
  const base = parseSheetDateKey_(dateKey);
  if (!base) return "";
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + Number(days || 0));
  return formatDateKeyFromDate_(next);
}

function daySpanBetweenKeys_(startKey, endKey) {
  const start = parseSheetDateKey_(startKey);
  const end = parseSheetDateKey_(endKey);
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function isRecurringTemplateActive_(ticket) {
  if (!ticket) return false;
  if (!normalizeRecurrenceValue_(ticket.Recurrence || ticket.recurrence || "")) return false;
  if (isSoftDeletedStatus_(ticket.Status)) return false;
  // Completing a recurring ticket must not stop the series.
  return true;
}

function ensureRecurringTicketsTrigger_() {
  try {
    const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
      return trigger.getHandlerFunction() === RECURRING_TICKETS_HANDLER_;
    });
    if (existing) {
      return { ok: true, created: false };
    }
    ScriptApp.newTrigger(RECURRING_TICKETS_HANDLER_)
      .timeBased()
      .everyHours(1)
      .create();
    return { ok: true, created: true };
  } catch (error) {
    Logger.log("ensureRecurringTicketsTrigger_ failed: " + error);
    return { ok: false, created: false, error: String(error && error.message || error) };
  }
}

/**
 * Call AFTER releasing the doPost write lock.
 * Installs the hourly trigger and creates any due recurring instances immediately.
 */
function kickRecurringTicketsAfterSave_() {
  const trigger = ensureRecurringTicketsTrigger_();
  const milestoneTrigger = ensureMilestoneRolloverTrigger_();
  var processed = null;
  var milestoneProcessed = null;
  try {
    processed = processRecurringTickets();
  } catch (error) {
    Logger.log("kickRecurringTicketsAfterSave_ process failed: " + error);
    processed = { ok: false, error: String(error && error.message || error) };
  }
  try {
    milestoneProcessed = processOpenMilestoneRollover();
  } catch (error) {
    Logger.log("kickRecurringTicketsAfterSave_ milestone rollover failed: " + error);
    milestoneProcessed = { ok: false, error: String(error && error.message || error) };
  }
  return {
    triggerOk: trigger.ok !== false,
    triggerCreated: trigger.created === true,
    triggerError: trigger.error || "",
    milestoneTriggerOk: milestoneTrigger.ok !== false,
    milestoneTriggerCreated: milestoneTrigger.created === true,
    processOk: processed && processed.ok !== false,
    created: processed && processed.created ? processed.created : 0,
    advanced: processed && processed.advanced ? processed.advanced : 0,
    processError: processed && processed.error ? processed.error : "",
    milestoneRolled: milestoneProcessed && milestoneProcessed.updated ? milestoneProcessed.updated : 0,
    milestoneProcessOk: milestoneProcessed && milestoneProcessed.ok !== false,
    milestoneProcessError: milestoneProcessed && milestoneProcessed.error ? milestoneProcessed.error : ""
  };
}

/**
 * Manual / menu entry: create the hourly recurring-tasks trigger if missing.
 */
function setupRecurringTicketsTrigger() {
  const result = ensureRecurringTicketsTrigger_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    result.created ? "Recurring tasks trigger created (hourly)." : "Recurring tasks trigger already exists.",
    "Tarmal IT",
    6
  );
  return result;
}

function buildTicketIdMap_(tickets) {
  const map = {};
  for (let i = 0; i < (tickets || []).length; i++) {
    const id = String(tickets[i] && tickets[i].ticketId || "").trim();
    if (id) map[id] = tickets[i];
  }
  return map;
}

/**
 * Walk RecurrenceParentId to the series root. Missing parents treat the
 * dangling parent id as the root so legacy children still group together.
 */
function resolveRecurringSeriesRootId_(ticket, byId) {
  if (!ticket) return "";
  const ids = byId || {};
  const seen = {};
  let cur = ticket;
  let guard = 0;
  while (cur && guard++ < 50) {
    const parentId = String(cur.RecurrenceParentId || "").trim();
    if (!parentId) {
      return String(cur.ticketId || "").trim();
    }
    if (seen[parentId]) return parentId;
    seen[parentId] = true;
    const parent = ids[parentId];
    if (!parent) return parentId;
    cur = parent;
  }
  return String(ticket.ticketId || "").trim();
}

function ticketInRecurringSeries_(ticket, seriesRootId, templateTicketId, byId) {
  if (!ticket) return false;
  const rootId = String(seriesRootId || "").trim();
  const templateId = String(templateTicketId || "").trim();
  const ticketId = String(ticket.ticketId || "").trim();
  const parentId = String(ticket.RecurrenceParentId || "").trim();
  if (templateId && ticketId === templateId) return true;
  if (rootId && ticketId === rootId) return true;
  if (parentId && (parentId === rootId || parentId === templateId)) return true;
  if (rootId) {
    const ticketRoot = resolveRecurringSeriesRootId_(ticket, byId);
    if (ticketRoot && ticketRoot === rootId) return true;
  }
  return false;
}

/**
 * Find any non-deleted series member whose Start date matches the period.
 * Matches by series root (not only direct ParentId === current head), so
 * legacy children that still point at the original root are found after handoff.
 */
function findRecurringChildForPeriod_(tickets, templateTicket, periodKey) {
  const period = calendarDayKey_(periodKey);
  if (!period) return null;

  // Back-compat: older callers passed a bare ticketId string.
  let template = templateTicket;
  let templateId = "";
  if (typeof templateTicket === "string" || typeof templateTicket === "number") {
    templateId = String(templateTicket || "").trim();
    template = null;
    for (let i = 0; i < (tickets || []).length; i++) {
      if (String(tickets[i].ticketId || "").trim() === templateId) {
        template = tickets[i];
        break;
      }
    }
  } else {
    templateId = String(template && template.ticketId || "").trim();
  }

  const byId = buildTicketIdMap_(tickets);
  const seriesRootId = (template
    ? resolveRecurringSeriesRootId_(template, byId)
    : "") || templateId;
  if (!seriesRootId && !templateId) return null;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (isSoftDeletedStatus_(ticket.Status)) continue;
    if (!ticketMatchesOccurrenceDay_(ticket, periodKey)) continue;
    if (templateId && String(ticket.ticketId || "").trim() === templateId) continue;
    if (!ticketInRecurringSeries_(ticket, seriesRootId, templateId, byId)) continue;
    return ticket;
  }
  return null;
}

function hasRecurringChildForPeriod_(tickets, templateTicketId, periodKey) {
  return Boolean(findRecurringChildForPeriod_(tickets, templateTicketId, periodKey));
}

function isOpenOccurrenceCandidate_(ticket) {
  if (!ticket) return false;
  if (isSoftDeletedStatus_(ticket.Status)) return false;
  if (isCompletedStatus(ticket.Status)) return false;
  if (Number(ticket.parentSheetRow || 0) > 0) return false;
  return true;
}

function ticketHasRecurrenceValue_(ticket) {
  return Boolean(normalizeRecurrenceValue_(ticket && (ticket.Recurrence || ticket.recurrence) || ""));
}

function sameTicketIdentity_(left, right) {
  if (!left || !right) return false;
  const leftId = String(left.ticketId || "").trim();
  const rightId = String(right.ticketId || "").trim();
  if (leftId && rightId) return leftId === rightId;
  const leftRow = Number(left.sheetRow) || 0;
  const rightRow = Number(right.sheetRow) || 0;
  return Boolean(leftRow && rightRow && leftRow === rightRow);
}

function pad2_(value) {
  const text = String(value);
  return text.length >= 2 ? text : ("0" + text);
}

/**
 * Calendar-day keys for one cell. ISO and Date values contribute one key.
 * Ambiguous slash dates contribute both day/month and month/day readings so
 * "9/10/2026" and "2026-10-09" can still be the same occurrence.
 */
function occurrenceDayKeys_(value) {
  const keys = [];
  const seen = {};
  function add(key) {
    if (!key || seen[key]) return;
    seen[key] = true;
    keys.push(key);
  }
  add(calendarDayKey_(value));
  if (value === null || value === undefined || value === "") return keys;
  if (Object.prototype.toString.call(value) === "[object Date]") return keys;
  const slash = String(value).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (!slash) return keys;
  const a = Number(slash[1]);
  const b = Number(slash[2]);
  const year = Number(slash[3]);
  if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
    add(year + "-" + pad2_(a) + "-" + pad2_(b));
  }
  if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
    add(year + "-" + pad2_(b) + "-" + pad2_(a));
  }
  return keys;
}

function ticketOccurrenceDayKeys_(ticket) {
  const startKeys = occurrenceDayKeys_(ticket && ticket["Start date"]);
  if (startKeys.length) return startKeys;
  return occurrenceDayKeys_(ticket && ticket.Milestone);
}

function ticketMatchesOccurrenceDay_(ticket, periodKey) {
  const periodKeys = occurrenceDayKeys_(periodKey);
  if (!periodKeys.length || !ticket) return false;
  const ticketKeys = ticketOccurrenceDayKeys_(ticket);
  for (let i = 0; i < ticketKeys.length; i++) {
    if (periodKeys.indexOf(ticketKeys[i]) >= 0) return true;
  }
  return false;
}

/** Collapse whitespace and punctuation so "Daily backup." and "daily  backup" match. */
function normalizeLooseIdentity_(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Same occurrence for open-twin cleanup: loose Task + calendar day + loose Owner.
 * Type is ignored (Daily - Infra vs Daily Infra). Owner stays in the key so two
 * people with the same daily task are not merged. Series-root grouping catches
 * twins whose owner text changed.
 */
function occurrenceGroupKey_(ticket) {
  const task = normalizeLooseIdentity_(ticket && ticket.Task);
  const day = calendarDayKey_(ticket && ticket["Start date"]);
  const owner = normalizeLooseIdentity_(ticket && ticket.Owner);
  if (!task || !day) return "";
  return task + "\n" + day + "\n" + owner;
}

/**
 * Open ticket with the same loose Task + start day + loose Owner.
 * Type is not required. Used so processRecurringTickets does not append a twin.
 */
function findOpenOccurrenceByTaskAndStart_(tickets, template, periodKey) {
  const taskKey = normalizeLooseIdentity_(template && template.Task);
  const ownerKey = normalizeLooseIdentity_(template && template.Owner);
  const templateId = String(template && template.ticketId || "").trim();
  const templateRow = Number(template && template.sheetRow) || 0;
  if (!taskKey || !occurrenceDayKeys_(periodKey).length) return null;

  let match = null;
  for (let i = 0; i < (tickets || []).length; i++) {
    const ticket = tickets[i];
    if (!isOpenOccurrenceCandidate_(ticket)) continue;
    if (templateId && String(ticket.ticketId || "").trim() === templateId) continue;
    if (templateRow && Number(ticket.sheetRow) === templateRow) continue;
    if (normalizeLooseIdentity_(ticket.Task) !== taskKey) continue;
    if (normalizeLooseIdentity_(ticket.Owner) !== ownerKey) continue;
    if (!ticketMatchesOccurrenceDay_(ticket, periodKey)) continue;
    if (!match) {
      match = ticket;
      continue;
    }
    if (ticketHasRecurrenceValue_(ticket) && !ticketHasRecurrenceValue_(match)) {
      match = ticket;
    }
  }
  return match;
}

function lookupSeriesRecurrence_(tickets, taskKey, ownerKey) {
  for (let i = 0; i < (tickets || []).length; i++) {
    const ticket = tickets[i];
    if (!ticket || isSoftDeletedStatus_(ticket.Status)) continue;
    if (normalizeLooseIdentity_(ticket.Task) !== taskKey) continue;
    if (normalizeLooseIdentity_(ticket.Owner) !== ownerKey) continue;
    if (!ticketHasRecurrenceValue_(ticket)) continue;
    return {
      value: normalizeRecurrenceValue_(ticket.Recurrence || ticket.recurrence || ""),
      next: calendarDayKey_(ticket.RecurrenceNext)
    };
  }
  return null;
}

function periodReserveKeys_(template, periodKey, seriesRootId) {
  const day = calendarDayKey_(periodKey) || "";
  const keys = [];
  const task = normalizeLooseIdentity_(template && template.Task);
  const owner = normalizeLooseIdentity_(template && template.Owner);
  if (task && day) keys.push("task\n" + task + "\n" + owner + "\n" + day);
  const root = String(seriesRootId || "").trim();
  if (root && day) keys.push("series\n" + root + "\n" + day);
  return keys;
}

function rememberReservedPeriod_(reserved, template, periodKey, seriesRootId) {
  const keys = periodReserveKeys_(template, periodKey, seriesRootId);
  for (let i = 0; i < keys.length; i++) reserved[keys[i]] = true;
}

function periodAlreadyReserved_(reserved, template, periodKey, seriesRootId) {
  const keys = periodReserveKeys_(template, periodKey, seriesRootId);
  for (let i = 0; i < keys.length; i++) {
    if (reserved[keys[i]]) return true;
  }
  return false;
}

function softDeleteDuplicateOccurrence_(sheet, columnMap, ticket) {
  if (!ticket || !ticket.sheetRow) return false;
  if (isSoftDeletedStatus_(ticket.Status)) return false;
  const statusIndex = resolveColumnIndex_(columnMap, "status");
  if (statusIndex < 0) return false;
  sheet.getRange(ticket.sheetRow, statusIndex + 1).setValue(SOFT_DELETED_STATUS_);
  ticket.Status = SOFT_DELETED_STATUS_;
  clearTicketRecurrenceFields_(sheet, columnMap, ticket);
  try {
    sheet.hideRows(ticket.sheetRow);
  } catch (hideError) {
    Logger.log(hideError);
  }
  return true;
}

/**
 * Soft-delete extra open rows that are the same recurring occurrence.
 * Keeps the row that has Recurrence. If none do, keeps the newest sheet row
 * and copies Recurrence from the series when a sibling still has it.
 * Skips groups that are not part of a recurring series.
 */
function dedupeDuplicateOpenOccurrences_(sheet, columnMap, tickets) {
  const groups = {};
  for (let i = 0; i < (tickets || []).length; i++) {
    const ticket = tickets[i];
    if (!isOpenOccurrenceCandidate_(ticket)) continue;
    const key = occurrenceGroupKey_(ticket);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ticket);
  }

  let removed = 0;
  const keys = Object.keys(groups);
  for (let g = 0; g < keys.length; g++) {
    const members = groups[keys[g]];
    if (!members || members.length < 2) continue;

    const sample = members[0];
    const taskKey = normalizeLooseIdentity_(sample.Task);
    const ownerKey = normalizeLooseIdentity_(sample.Owner);
    let seriesLinked = false;
    for (let m = 0; m < members.length; m++) {
      if (ticketHasRecurrenceValue_(members[m]) || String(members[m].RecurrenceParentId || "").trim()) {
        seriesLinked = true;
        break;
      }
    }
    const seriesRecurrence = lookupSeriesRecurrence_(tickets, taskKey, ownerKey);
    if (!seriesLinked && !seriesRecurrence) continue;

    const withRecurrence = [];
    for (let m = 0; m < members.length; m++) {
      if (ticketHasRecurrenceValue_(members[m])) withRecurrence.push(members[m]);
    }
    const pool = (withRecurrence.length ? withRecurrence : members).slice();
    pool.sort(compareRecurringOccurrenceNewestFirst_);
    const keeper = pool[0];
    if (!keeper) continue;

    if (!ticketHasRecurrenceValue_(keeper) && seriesRecurrence && seriesRecurrence.value) {
      let nextKey = seriesRecurrence.next;
      if (!nextKey) {
        nextKey = advanceRecurrenceDateKey_(
          calendarDayKey_(keeper["Start date"]) || todaySheetDateKey_(),
          seriesRecurrence.value
        );
      }
      writeTicketRecurrenceFields_(sheet, columnMap, keeper, seriesRecurrence.value, nextKey);
    }

    if (!String(keeper.RecurrenceParentId || "").trim()) {
      let parentId = "";
      for (let m = 0; m < members.length; m++) {
        const pid = String(members[m].RecurrenceParentId || "").trim();
        if (pid && pid !== String(keeper.ticketId || "").trim()) {
          parentId = pid;
          break;
        }
      }
      if (parentId) {
        const parentIdIndex = resolveColumnIndex_(columnMap, "recurrenceParentId");
        if (parentIdIndex >= 0 && keeper.sheetRow) {
          sheet.getRange(keeper.sheetRow, parentIdIndex + 1).setValue(parentId);
          keeper.RecurrenceParentId = parentId;
        }
      }
    }

    for (let m = 0; m < members.length; m++) {
      const member = members[m];
      if (sameTicketIdentity_(member, keeper)) continue;
      if (softDeleteDuplicateOccurrence_(sheet, columnMap, member)) removed += 1;
    }
  }
  removed += dedupeSeriesSameDayOpenTwins_(sheet, columnMap, tickets);
  removed += dedupeBlankRecurrenceOpenTwins_(sheet, columnMap, tickets);
  removed += dedupeSameTicketIdOpenRows_(sheet, columnMap, tickets);
  return removed;
}

function isOpenSeriesTwinCandidate_(ticket) {
  if (!ticket) return false;
  if (isSoftDeletedStatus_(ticket.Status)) return false;
  if (isCompletedStatus(ticket.Status)) return false;
  return true;
}

function pickOpenTwinKeeper_(members) {
  const withRecurrence = [];
  for (let m = 0; m < members.length; m++) {
    if (ticketHasRecurrenceValue_(members[m])) withRecurrence.push(members[m]);
  }
  const pool = (withRecurrence.length ? withRecurrence : members).slice();
  pool.sort(compareRecurringOccurrenceNewestFirst_);
  return pool[0] || null;
}

function softDeleteOpenTwinMembers_(sheet, columnMap, members, keeper) {
  let removed = 0;
  for (let m = 0; m < members.length; m++) {
    if (sameTicketIdentity_(members[m], keeper)) continue;
    if (softDeleteDuplicateOccurrence_(sheet, columnMap, members[m])) removed += 1;
  }
  return removed;
}

/**
 * Same series + same start day, even when Task / Type / Owner text differs.
 * Keeps the Recurrence row and soft-deletes the blank-Recurrence twin.
 * Sub-tasks are included so a spawned copy is not left beside its parent row.
 */
function dedupeSeriesSameDayOpenTwins_(sheet, columnMap, tickets) {
  const byId = buildTicketIdMap_(tickets);
  const groups = {};
  for (let i = 0; i < (tickets || []).length; i++) {
    const ticket = tickets[i];
    if (!isOpenSeriesTwinCandidate_(ticket)) continue;
    const hasRecurrence = ticketHasRecurrenceValue_(ticket);
    const parentId = String(ticket.RecurrenceParentId || "").trim();
    if (!hasRecurrence && !parentId) continue;
    const rootId = resolveRecurringSeriesRootId_(ticket, byId)
      || String(ticket.ticketId || "").trim();
    const day = calendarDayKey_(ticket["Start date"]);
    if (!rootId || !day) continue;
    const key = rootId + "\n" + day;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ticket);
  }

  let removed = 0;
  const keys = Object.keys(groups);
  for (let g = 0; g < keys.length; g++) {
    const members = groups[keys[g]];
    if (!members || members.length < 2) continue;
    const keeper = pickOpenTwinKeeper_(members);
    if (!keeper) continue;
    removed += softDeleteOpenTwinMembers_(sheet, columnMap, members, keeper);
  }
  return removed;
}

/**
 * Blank-Recurrence row whose start day is the same occurrence as the series
 * head, including slash-date readings that do not share a primary day key.
 */
function dedupeBlankRecurrenceOpenTwins_(sheet, columnMap, tickets) {
  const byId = buildTicketIdMap_(tickets);
  let removed = 0;
  for (let h = 0; h < (tickets || []).length; h++) {
    const head = tickets[h];
    if (!isOpenSeriesTwinCandidate_(head) || !ticketHasRecurrenceValue_(head)) continue;
    const headRoot = resolveRecurringSeriesRootId_(head, byId)
      || String(head.ticketId || "").trim();
    const headTask = normalizeLooseIdentity_(head.Task);
    const headOwner = normalizeLooseIdentity_(head.Owner);
    for (let i = 0; i < tickets.length; i++) {
      const twin = tickets[i];
      if (!isOpenSeriesTwinCandidate_(twin) || sameTicketIdentity_(twin, head)) continue;
      if (ticketHasRecurrenceValue_(twin)) continue;
      const parentId = String(twin.RecurrenceParentId || "").trim();
      const sameSeries = Boolean(headRoot) && ticketInRecurringSeries_(twin, headRoot, head.ticketId, byId);
      const sameTaskOwner = normalizeLooseIdentity_(twin.Task) === headTask
        && normalizeLooseIdentity_(twin.Owner) === headOwner;
      if (!sameSeries && !(parentId && sameTaskOwner)) continue;
      if (!ticketMatchesOccurrenceDay_(twin, head["Start date"])) continue;
      if (softDeleteDuplicateOccurrence_(sheet, columnMap, twin)) removed += 1;
    }
  }
  return removed;
}

/**
 * Create retries that already inserted a second row with the same Ticket ID.
 * Keeps the earliest open row (the one the client stored) and soft-deletes the rest.
 */
function dedupeSameTicketIdOpenRows_(sheet, columnMap, tickets) {
  const groups = {};
  for (let i = 0; i < (tickets || []).length; i++) {
    const ticket = tickets[i];
    if (!isOpenSeriesTwinCandidate_(ticket)) continue;
    const id = String(ticket.ticketId || "").trim();
    if (!id) continue;
    if (!groups[id]) groups[id] = [];
    groups[id].push(ticket);
  }

  let removed = 0;
  const ids = Object.keys(groups);
  for (let g = 0; g < ids.length; g++) {
    const members = groups[ids[g]];
    if (!members || members.length < 2) continue;
    let keeper = members[0];
    for (let m = 1; m < members.length; m++) {
      if ((Number(members[m].sheetRow) || 0) < (Number(keeper.sheetRow) || 0)) keeper = members[m];
    }
    if (!ticketHasRecurrenceValue_(keeper)) {
      for (let m = 0; m < members.length; m++) {
        if (!ticketHasRecurrenceValue_(members[m])) continue;
        const recurrenceValue = normalizeRecurrenceValue_(members[m].Recurrence || members[m].recurrence || "");
        if (!recurrenceValue) continue;
        writeTicketRecurrenceFields_(
          sheet,
          columnMap,
          keeper,
          recurrenceValue,
          calendarDayKey_(members[m].RecurrenceNext)
            || advanceRecurrenceDateKey_(
              calendarDayKey_(keeper["Start date"]) || todaySheetDateKey_(),
              recurrenceValue
            )
        );
        break;
      }
    }
    removed += softDeleteOpenTwinMembers_(sheet, columnMap, members, keeper);
  }
  return removed;
}

function compareRecurringOccurrenceNewestFirst_(left, right) {
  const leftStart = calendarDayKey_(left && left["Start date"]) || "";
  const rightStart = calendarDayKey_(right && right["Start date"]) || "";
  if (leftStart !== rightStart) {
    return leftStart < rightStart ? 1 : -1;
  }
  return (Number(right && right.sheetRow) || 0) - (Number(left && left.sheetRow) || 0);
}

/**
 * One active Recurrence head per series: the newest open occurrence.
 * Upgrades legacy children with blank Recurrence; clears older heads.
 */
function repairRecurringSeriesHeads_(sheet, columnMap, tickets) {
  const byId = buildTicketIdMap_(tickets);
  const groups = {};
  let repaired = 0;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (isSoftDeletedStatus_(ticket.Status)) continue;
    const hasRecurrence = Boolean(normalizeRecurrenceValue_(ticket.Recurrence || ticket.recurrence || ""));
    const parentId = String(ticket.RecurrenceParentId || "").trim();
    if (!hasRecurrence && !parentId) continue;
    const rootId = resolveRecurringSeriesRootId_(ticket, byId)
      || String(ticket.ticketId || "").trim();
    if (!rootId) continue;
    if (!groups[rootId]) groups[rootId] = [];
    groups[rootId].push(ticket);
  }

  const rootIds = Object.keys(groups);
  for (let g = 0; g < rootIds.length; g++) {
    const rootId = rootIds[g];
    const members = groups[rootId];
    const withRecurrence = [];
    const openMembers = [];
    for (let m = 0; m < members.length; m++) {
      const member = members[m];
      if (normalizeRecurrenceValue_(member.Recurrence || member.recurrence || "")) {
        withRecurrence.push(member);
      }
      if (!isCompletedStatus(member.Status)) {
        openMembers.push(member);
      }
    }
    if (!withRecurrence.length) continue;

    const headPool = openMembers.length ? openMembers : withRecurrence;
    headPool.sort(compareRecurringOccurrenceNewestFirst_);
    const head = headPool[0];
    if (!head) continue;

    let recurrenceValue = normalizeRecurrenceValue_(head.Recurrence || head.recurrence || "");
    if (!recurrenceValue) {
      recurrenceValue = normalizeRecurrenceValue_(
        withRecurrence[0].Recurrence || withRecurrence[0].recurrence || ""
      );
    }
    if (!recurrenceValue) continue;

    let recurrenceNext = sheetDateKey_(head.RecurrenceNext);
    if (!recurrenceNext) {
      for (let w = 0; w < withRecurrence.length; w++) {
        recurrenceNext = sheetDateKey_(withRecurrence[w].RecurrenceNext);
        if (recurrenceNext) break;
      }
    }
    if (!recurrenceNext) {
      recurrenceNext = advanceRecurrenceDateKey_(
        sheetDateKey_(head["Start date"]) || todaySheetDateKey_(),
        recurrenceValue
      );
    }

    if (!normalizeRecurrenceValue_(head.Recurrence || head.recurrence || "")
      || sheetDateKey_(head.RecurrenceNext) !== recurrenceNext) {
      writeTicketRecurrenceFields_(sheet, columnMap, head, recurrenceValue, recurrenceNext);
      repaired += 1;
    }

    if (String(head.ticketId || "").trim() !== rootId
      && !String(head.RecurrenceParentId || "").trim()) {
      const parentIdIndex = resolveColumnIndex_(columnMap, "recurrenceParentId");
      if (parentIdIndex >= 0 && head.sheetRow) {
        sheet.getRange(head.sheetRow, parentIdIndex + 1).setValue(rootId);
        head.RecurrenceParentId = rootId;
        repaired += 1;
      }
    }

    for (let m = 0; m < members.length; m++) {
      const member = members[m];
      if (String(member.ticketId || "").trim() === String(head.ticketId || "").trim()) continue;
      if (!normalizeRecurrenceValue_(member.Recurrence || member.recurrence || "")) continue;
      clearTicketRecurrenceFields_(sheet, columnMap, member);
      repaired += 1;
    }
  }

  return repaired;
}

/**
 * After saving a ticket as the series head, clear Recurrence on every other
 * member so only one checkbox stays checked.
 */
function clearOtherSeriesRecurrenceHeads_(sheet, columnMap, headTicket, allTickets) {
  if (!sheet || !headTicket) return 0;
  const tickets = allTickets || [];
  if (!tickets.length) {
    const sheetInfo = getTasksSheetHeaders_(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    const values = sheet.getRange(2, 1, lastRow, sheetInfo.lastColumn).getValues();
    for (let i = 0; i < values.length; i++) {
      tickets.push(rowToTicket_(values[i], columnMap, i + 2));
    }
  }
  const byId = buildTicketIdMap_(tickets);
  const headId = String(headTicket.ticketId || "").trim();
  const seriesRootId = resolveRecurringSeriesRootId_(headTicket, byId) || headId;
  if (!seriesRootId && !headId) return 0;

  let cleared = 0;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (isSoftDeletedStatus_(ticket.Status)) continue;
    if (headId && String(ticket.ticketId || "").trim() === headId) continue;
    if (Number(ticket.sheetRow) && Number(headTicket.sheetRow)
      && Number(ticket.sheetRow) === Number(headTicket.sheetRow)) continue;
    if (!normalizeRecurrenceValue_(ticket.Recurrence || ticket.recurrence || "")) continue;
    if (!ticketInRecurringSeries_(ticket, seriesRootId, headId, byId)) continue;
    clearTicketRecurrenceFields_(sheet, columnMap, ticket);
    cleared += 1;
  }
  return cleared;
}

function clearTicketRecurrenceFields_(sheet, columnMap, ticket) {
  if (!ticket || !ticket.sheetRow) return;
  const recurrenceIndex = resolveColumnIndex_(columnMap, "recurrence");
  const recurrenceNextIndex = resolveColumnIndex_(columnMap, "recurrenceNext");
  if (recurrenceIndex >= 0) {
    sheet.getRange(ticket.sheetRow, recurrenceIndex + 1).setValue("");
  }
  if (recurrenceNextIndex >= 0) {
    sheet.getRange(ticket.sheetRow, recurrenceNextIndex + 1).setValue("");
  }
  ticket.Recurrence = "";
  ticket.RecurrenceNext = "";
}

function writeTicketRecurrenceFields_(sheet, columnMap, ticket, recurrence, recurrenceNext) {
  if (!ticket || !ticket.sheetRow) return;
  const normalized = normalizeRecurrenceValue_(recurrence);
  const nextKey = sheetDateKey_(recurrenceNext);
  const recurrenceIndex = resolveColumnIndex_(columnMap, "recurrence");
  const recurrenceNextIndex = resolveColumnIndex_(columnMap, "recurrenceNext");
  if (recurrenceIndex >= 0) {
    sheet.getRange(ticket.sheetRow, recurrenceIndex + 1).setValue(normalized);
  }
  if (recurrenceNextIndex >= 0) {
    sheet.getRange(ticket.sheetRow, recurrenceNextIndex + 1).setValue(nextKey ? toSheetDate_(nextKey) : "");
  }
  ticket.Recurrence = normalized;
  ticket.RecurrenceNext = nextKey || "";
}

function appendRecurringInstanceRow_(sheet, columnMap, template, periodKey, nextRecurrenceKey, seriesRootId) {
  const sheetInfo = getTasksSheetHeaders_(sheet);
  const templateStart = sheetDateKey_(template["Start date"]);
  const templateEnd = sheetDateKey_(template["End date"]);
  const spanDays = daySpanBetweenKeys_(templateStart, templateEnd);
  const childStart = sheetDateKey_(periodKey);
  const childEnd = spanDays > 0 ? addDaysToDateKey_(childStart, spanDays) : "";
  // Every generated recurring instance gets today's date as Milestone.
  const childMilestone = todaySheetDateKey_();
  const notes = stripScreenshotMetadata_(template.Notes || template.Remarks || "");
  // Inherit recurrence onto the new ticket so the edit form shows Recurring checked
  // and unchecking that ticket stops the series (chain handoff from the prior head).
  const recurrence = normalizeRecurrenceValue_(template.Recurrence || template.recurrence || "");
  const recurrenceNext = sheetDateKey_(nextRecurrenceKey);
  // Prefer stable series root for ParentId so period dedupe works after handoff.
  const parentId = String(seriesRootId || template.ticketId || "").trim();
  const fields = {
    task: template.Task || "",
    priority: template.Priority || "",
    owner: String(template.Owner || "").trim(),
    raisedBy: template["Raised By"] || "",
    status: "Not started",
    type: template.Type || "",
    startDate: toSheetDate_(childStart),
    endDate: childEnd ? toSheetDate_(childEnd) : "",
    milestone: toSheetDate_(childMilestone),
    notes: notes,
    bhanuList: template["Bhanu List"] || "",
    parentSheetRow: Number(template.parentSheetRow || template["Parent Sheet Row"]) || "",
    ticketId: createTicketId_(),
    recurrence: recurrence,
    recurrenceNext: recurrenceNext ? toSheetDate_(recurrenceNext) : "",
    recurrenceParentId: parentId
  };

  const lastCol = Math.max(
    sheetInfo.lastColumn,
    resolveColumnIndex_(columnMap, "recurrenceParentId") + 1,
    COLUMN_FALLBACK_INDICES_.ticketId + 1
  );
  const row = new Array(lastCol).fill("");
  applyTicketFieldsToRow_(row, columnMap, fields);
  sheet.appendRow(row);
  const sheetRow = sheet.getLastRow();
  writeOwnerCell_(sheet, sheetRow, columnMap, fields.owner);
  return {
    sheetRow: sheetRow,
    ticketId: fields.ticketId,
    startDate: childStart,
    recurrence: recurrence,
    recurrenceNext: recurrenceNext || "",
    Task: fields.task,
    Type: fields.type,
    Owner: fields.owner,
    Status: fields.status,
    "Start date": childStart,
    "End date": childEnd,
    Milestone: childMilestone,
    Recurrence: recurrence,
    RecurrenceNext: recurrenceNext || "",
    RecurrenceParentId: fields.recurrenceParentId
  };
}

/**
 * Time-driven handler: create due recurring tickets and hand off Recurrence
 * to the newest ticket (chain). LockService-safe; soft-deleted heads skip.
 * Does not append when a series child or a loose task+day+owner match already
 * exists for that period. Soft-deletes open twins (blank Recurrence row, same
 * Ticket ID retries) before and after spawn.
 */
function processRecurringTickets() {
  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
    if (!lockAcquired) {
      Logger.log("processRecurringTickets: could not acquire lock");
      return { ok: false, error: "locked" };
    }

    invalidateTasksHeaderCache_();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
    if (!sheet) {
      return { ok: false, error: "Tasks sheet missing" };
    }

    const columnMap = ensureTasksColumns_(sheet);
    const recurrenceIndex = resolveColumnIndex_(columnMap, "recurrence");
    const recurrenceNextIndex = resolveColumnIndex_(columnMap, "recurrenceNext");
    if (recurrenceIndex < 0 || recurrenceNextIndex < 0) {
      return { ok: false, error: "Recurrence columns missing" };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, created: 0 };
    }

    const sheetInfo = getTasksSheetHeaders_(sheet);
    const values = sheet.getRange(2, 1, lastRow, sheetInfo.lastColumn).getValues();
    const tickets = [];
    for (let i = 0; i < values.length; i++) {
      tickets.push(rowToTicket_(values[i], columnMap, i + 2));
    }

    // Remove open twins before spawning another row (series, loose task+day, same Ticket ID).
    let deduped = dedupeDuplicateOpenOccurrences_(sheet, columnMap, tickets);
    // Fix split heads (old head still Recurrence-set + child blank) before spawn.
    let repaired = repairRecurringSeriesHeads_(sheet, columnMap, tickets);

    const todayKey = todaySheetDateKey_();
    let created = 0;
    let advanced = 0;
    let handedOff = 0;
    const reservedPeriods = {};

    for (let i = 0; i < tickets.length; i++) {
      let active = tickets[i];
      if (!isRecurringTemplateActive_(active)) continue;
      if (!String(active.ticketId || "").trim()) {
        // Ensure series heads have a stable id for child linking.
        const newId = createTicketId_();
        const ticketIdIndex = resolveColumnIndex_(columnMap, "ticketId");
        if (ticketIdIndex >= 0) {
          sheet.getRange(active.sheetRow, ticketIdIndex + 1).setValue(newId);
          active.ticketId = newId;
          values[i][ticketIdIndex] = newId;
        }
      }

      let nextKey = sheetDateKey_(active.RecurrenceNext)
        || advanceRecurrenceDateKey_(
          sheetDateKey_(active["Start date"]) || todayKey,
          active.Recurrence
        );
      let catchUps = 0;

      while (nextKey && nextKey <= todayKey && catchUps < RECURRING_CATCH_UP_PER_TEMPLATE_) {
        if (!isRecurringTemplateActive_(active)) break;

        const recurrenceValue = normalizeRecurrenceValue_(active.Recurrence || active.recurrence || "");
        const followingNext = advanceRecurrenceDateKey_(nextKey, recurrenceValue);
        const byId = buildTicketIdMap_(tickets);
        const seriesRootId = resolveRecurringSeriesRootId_(active, byId)
          || String(active.ticketId || "").trim();

        // Head already represents this period — bump RecurrenceNext, do not spawn a twin.
        if (ticketMatchesOccurrenceDay_(active, nextKey)) {
          rememberReservedPeriod_(reservedPeriods, active, nextKey, seriesRootId);
          if (sheetDateKey_(active.RecurrenceNext) !== followingNext) {
            writeTicketRecurrenceFields_(
              sheet,
              columnMap,
              active,
              recurrenceValue,
              followingNext
            );
          }
          nextKey = followingNext;
          catchUps += 1;
          advanced += 1;
          continue;
        }

        const existingChild = findRecurringChildForPeriod_(tickets, active, nextKey)
          || findOpenOccurrenceByTaskAndStart_(tickets, active, nextKey);
        const parentId = seriesRootId;

        if (!existingChild && periodAlreadyReserved_(reservedPeriods, active, nextKey, seriesRootId)) {
          nextKey = followingNext;
          catchUps += 1;
          advanced += 1;
          continue;
        }
        rememberReservedPeriod_(reservedPeriods, active, nextKey, seriesRootId);

        if (!existingChild) {
          const child = appendRecurringInstanceRow_(
            sheet,
            columnMap,
            active,
            nextKey,
            followingNext,
            seriesRootId
          );
          clearTicketRecurrenceFields_(sheet, columnMap, active);
          tickets.push(child);
          active = child;
          created += 1;
          handedOff += 1;
        } else {
          // Legacy children were spawned without Recurrence — hand the series
          // onto that row so the edit form shows Recurring checked.
          if (!normalizeRecurrenceValue_(existingChild.Recurrence || existingChild.recurrence || "")) {
            writeTicketRecurrenceFields_(
              sheet,
              columnMap,
              existingChild,
              recurrenceValue,
              followingNext
            );
            handedOff += 1;
          } else if (
            String(active.ticketId || "").trim() !== String(existingChild.ticketId || "").trim()
            && sheetDateKey_(existingChild.RecurrenceNext) !== followingNext
          ) {
            // Keep the surviving head's next date current when consolidating.
            writeTicketRecurrenceFields_(
              sheet,
              columnMap,
              existingChild,
              normalizeRecurrenceValue_(existingChild.Recurrence || recurrenceValue),
              followingNext
            );
          }
          if (String(active.ticketId || "").trim() !== String(existingChild.ticketId || "").trim()) {
            clearTicketRecurrenceFields_(sheet, columnMap, active);
            handedOff += 1;
          }
          active = existingChild;
        }

        // Keep parent link populated for lineage when we upgraded a legacy child.
        if (active && parentId && !String(active.RecurrenceParentId || "").trim()
          && String(active.ticketId || "").trim() !== parentId) {
          const parentIdIndex = resolveColumnIndex_(columnMap, "recurrenceParentId");
          if (parentIdIndex >= 0 && active.sheetRow) {
            sheet.getRange(active.sheetRow, parentIdIndex + 1).setValue(parentId);
            active.RecurrenceParentId = parentId;
          }
        }

        nextKey = sheetDateKey_(active.RecurrenceNext) || followingNext;
        catchUps += 1;
        advanced += 1;
      }

      if (
        isRecurringTemplateActive_(active)
        && nextKey
        && sheetDateKey_(active.RecurrenceNext) !== nextKey
      ) {
        sheet.getRange(active.sheetRow, recurrenceNextIndex + 1).setValue(toSheetDate_(nextKey));
        active.RecurrenceNext = nextKey;
      }
    }

    deduped += dedupeDuplicateOpenOccurrences_(sheet, columnMap, tickets);
    repaired += repairRecurringSeriesHeads_(sheet, columnMap, tickets);

    Logger.log(
      "processRecurringTickets created=" + created
      + " advanced=" + advanced
      + " handedOff=" + handedOff
      + " repaired=" + repaired
      + " deduped=" + deduped
    );
    return {
      ok: true,
      created: created,
      advanced: advanced,
      handedOff: handedOff,
      repaired: repaired,
      deduped: deduped
    };
  } finally {
    releaseWriteLock_(lock, lockAcquired);
  }
}

/**
 * One-time cleanup, run from the editor. Preview first: logs which older open
 * copies of each recurring task would be removed. Changes nothing.
 */
function previewOlderOpenRecurringCopies() {
  return cleanupOlderOpenRecurringCopies_(false);
}

/**
 * One-time cleanup, run from the editor. For each recurring task (same Task +
 * Owner, part of a series), keeps the newest open copy and soft-deletes the
 * older open copies (Status = Deleted, row hidden). Completed rows are untouched.
 */
function cleanupOlderOpenRecurringCopies() {
  return cleanupOlderOpenRecurringCopies_(true);
}

function cleanupOlderOpenRecurringCopies_(apply) {
  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
    if (!lockAcquired) {
      Logger.log("Could not acquire lock. Try again in a minute.");
      return { ok: false, error: "locked" };
    }

    invalidateTasksHeaderCache_();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
    if (!sheet) return { ok: false, error: "Tasks sheet missing" };
    const columnMap = ensureTasksColumns_(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, removed: 0 };

    const sheetInfo = getTasksSheetHeaders_(sheet);
    const values = sheet.getRange(2, 1, lastRow - 1, sheetInfo.lastColumn).getValues();
    const tickets = [];
    for (let i = 0; i < values.length; i++) {
      tickets.push(rowToTicket_(values[i], columnMap, i + 2));
    }

    const groups = {};
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (!isOpenOccurrenceCandidate_(ticket)) continue;
      const taskKey = normalizeLooseIdentity_(ticket.Task);
      if (!taskKey) continue;
      const key = taskKey + "\n" + normalizeLooseIdentity_(ticket.Owner);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ticket);
    }

    let removed = 0;
    let seriesCount = 0;
    const keys = Object.keys(groups);
    for (let g = 0; g < keys.length; g++) {
      const members = groups[keys[g]];
      if (!members || members.length < 2) continue;
      const sample = members[0];
      const seriesLinked = members.some(function(member) {
        return ticketHasRecurrenceValue_(member) || String(member.RecurrenceParentId || "").trim();
      }) || lookupSeriesRecurrence_(tickets, normalizeLooseIdentity_(sample.Task), normalizeLooseIdentity_(sample.Owner));
      if (!seriesLinked) continue;

      const heads = members.filter(ticketHasRecurrenceValue_);
      const pool = (heads.length ? heads : members).slice().sort(compareRecurringOccurrenceNewestFirst_);
      const keeper = pool[0];
      seriesCount += 1;
      Logger.log("Keep row " + keeper.sheetRow + ": " + keeper.Task + " (" + keeper.Owner + ")");

      for (let m = 0; m < members.length; m++) {
        const member = members[m];
        if (member === keeper) continue;
        Logger.log((apply ? "  Removed row " : "  Would remove row ") + member.sheetRow
          + " (start " + (calendarDayKey_(member["Start date"]) || "?") + ")");
        if (apply && softDeleteDuplicateOccurrence_(sheet, columnMap, member)) removed += 1;
        if (!apply) removed += 1;
      }
    }

    if (apply) {
      repairRecurringSeriesHeads_(sheet, columnMap, tickets);
      SpreadsheetApp.flush();
    }
    const summary = (apply ? "Removed " : "Would remove ") + removed
      + " older open copies across " + seriesCount + " recurring tasks.";
    Logger.log(summary);
    return { ok: true, removed: removed, series: seriesCount, applied: Boolean(apply) };
  } finally {
    releaseWriteLock_(lock, lockAcquired);
  }
}

/* =====================================================
   OPEN MILESTONE ROLLOVER
   Yesterday-only: when the calendar day ends, bump Milestone to today ONLY for
   open tickets whose Milestone was exactly yesterday. Older historical
   milestones are never changed. Closed/deleted tickets are never changed.
   Hourly time-driven trigger. No client-side mass bump on refresh.
===================================================== */

function isOpenTicketForMilestoneRollover_(ticket) {
  if (!ticket) return false;
  if (isSoftDeletedStatus_(ticket.Status)) return false;
  if (isCompletedStatus(ticket.Status)) return false;
  return true;
}

function ensureMilestoneRolloverTrigger_() {
  try {
    const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
      return trigger.getHandlerFunction() === MILESTONE_ROLLOVER_HANDLER_;
    });
    if (existing) {
      return { ok: true, created: false };
    }
    ScriptApp.newTrigger(MILESTONE_ROLLOVER_HANDLER_)
      .timeBased()
      .everyHours(1)
      .create();
    return { ok: true, created: true };
  } catch (error) {
    Logger.log("ensureMilestoneRolloverTrigger_ failed: " + error);
    return { ok: false, created: false, error: String(error && error.message || error) };
  }
}

/**
 * Manual / menu entry: create the hourly open-milestone rollover trigger if missing.
 */
function setupMilestoneRolloverTrigger() {
  const result = ensureMilestoneRolloverTrigger_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    result.created
      ? "Milestone rollover trigger created (hourly)."
      : "Milestone rollover trigger already exists.",
    "Tarmal IT",
    6
  );
  return result;
}

/**
 * Time-driven handler: when a calendar day ends, roll Milestone to today ONLY for
 * open tickets whose Milestone was that ending day (yesterdayKey). Does not bump
 * older historical milestones.
 */
function processOpenMilestoneRollover() {
  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
    if (!lockAcquired) {
      Logger.log("processOpenMilestoneRollover: could not acquire lock");
      return { ok: false, error: "locked" };
    }

    invalidateTasksHeaderCache_();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TASKS_SHEET);
    if (!sheet) {
      return { ok: false, error: "Tasks sheet missing" };
    }

    const columnMap = ensureTasksColumns_(sheet);
    const milestoneIndex = resolveColumnIndex_(columnMap, "milestone");
    if (milestoneIndex < 0) {
      return { ok: false, error: "Milestone column missing" };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, updated: 0 };
    }

    const sheetInfo = getTasksSheetHeaders_(sheet);
    const values = sheet.getRange(2, 1, lastRow, sheetInfo.lastColumn).getValues();
    const todayKey = todaySheetDateKey_();
    const todayDate = parseSheetDateKey_(todayKey);
    if (!todayDate) {
      return { ok: false, error: "invalid today key" };
    }
    const yesterdayDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1);
    const yesterdayKey = formatDateKeyFromDate_(yesterdayDate);
    let updated = 0;

    for (let i = 0; i < values.length; i++) {
      const ticket = rowToTicket_(values[i], columnMap, i + 2);
      if (!isOpenTicketForMilestoneRollover_(ticket)) continue;

      const milestoneKey = sheetDateKey_(ticket.Milestone);
      if (!milestoneKey || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneKey)) continue;
      // Only the day that just ended — never all historical past milestones.
      if (milestoneKey !== yesterdayKey) continue;

      sheet.getRange(ticket.sheetRow, milestoneIndex + 1).setValue(toSheetDate_(todayKey));
      updated += 1;
    }

    Logger.log(
      "processOpenMilestoneRollover updated=" + updated
      + " today=" + todayKey
      + " yesterday=" + yesterdayKey
    );
    return { ok: true, updated: updated, today: todayKey, yesterday: yesterdayKey };
  } finally {
    releaseWriteLock_(lock, lockAcquired);
  }
}

/**
 * One-time restore after a bad mass Milestone overwrite.
 * Does NOT invent dates. Reads sheet "MilestoneRestore" with headers:
 *   sheetRow | Milestone
 * optional: Task | Start date (used only when sheetRow is blank — exact Task+Start match)
 * Paste rows from a Version history copy of Tasks (pre-overwrite), then run this.
 */
function restoreMilestonesFromRestoreSheet() {
  const lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(WRITE_LOCK_WAIT_MS_);
    if (!lockAcquired) {
      SpreadsheetApp.getActiveSpreadsheet().toast("Could not acquire lock. Try again.", "Milestone restore", 6);
      return { ok: false, error: "locked" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const restoreSheet = ss.getSheetByName("MilestoneRestore");
    if (!restoreSheet) {
      ss.toast(
        "Create a sheet named MilestoneRestore with columns sheetRow, Milestone (optional Task, Start date).",
        "Milestone restore",
        10
      );
      return { ok: false, error: "MilestoneRestore sheet missing" };
    }

    const tasksSheet = ss.getSheetByName(TASKS_SHEET);
    if (!tasksSheet) {
      return { ok: false, error: "Tasks sheet missing" };
    }

    const columnMap = ensureTasksColumns_(tasksSheet);
    const milestoneIndex = resolveColumnIndex_(columnMap, "milestone");
    if (milestoneIndex < 0) {
      return { ok: false, error: "Milestone column missing" };
    }

    const restoreValues = restoreSheet.getDataRange().getValues();
    if (restoreValues.length < 2) {
      ss.toast("MilestoneRestore has no data rows.", "Milestone restore", 6);
      return { ok: false, error: "empty restore sheet" };
    }

    const restoreHeaders = restoreValues[0].map(function(h) {
      return String(h || "").trim().toLowerCase();
    });
    const colSheetRow = restoreHeaders.indexOf("sheetrow");
    const colMilestone = restoreHeaders.indexOf("milestone");
    const colTask = restoreHeaders.indexOf("task");
    const colStart = restoreHeaders.indexOf("start date");
    if (colMilestone < 0) {
      ss.toast("MilestoneRestore needs a Milestone column.", "Milestone restore", 8);
      return { ok: false, error: "Milestone column missing on restore sheet" };
    }

    const tasksInfo = getTasksSheetHeaders_(tasksSheet);
    const taskValues = tasksSheet.getRange(2, 1, tasksSheet.getLastRow(), tasksInfo.lastColumn).getValues();
    const taskByRow = {};
    const taskByKey = {};
    for (let i = 0; i < taskValues.length; i++) {
      const ticket = rowToTicket_(taskValues[i], columnMap, i + 2);
      taskByRow[ticket.sheetRow] = ticket;
      const key = String(ticket.Task || "").trim().toLowerCase()
        + "|"
        + (sheetDateKey_(ticket["Start date"]) || "");
      if (key !== "|") taskByKey[key] = ticket;
    }

    let updated = 0;
    let skipped = 0;
    for (let r = 1; r < restoreValues.length; r++) {
      const row = restoreValues[r];
      const milestoneRaw = row[colMilestone];
      const milestoneKey = sheetDateKey_(milestoneRaw);
      if (!milestoneKey || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneKey)) {
        skipped += 1;
        continue;
      }

      let target = null;
      const sheetRowNum = colSheetRow >= 0 ? Number(row[colSheetRow]) : NaN;
      if (Number.isFinite(sheetRowNum) && sheetRowNum >= 2) {
        target = taskByRow[sheetRowNum] || null;
      }
      if (!target && colTask >= 0) {
        const taskName = String(row[colTask] || "").trim().toLowerCase();
        const startKey = colStart >= 0 ? (sheetDateKey_(row[colStart]) || "") : "";
        target = taskByKey[taskName + "|" + startKey] || null;
      }
      if (!target || !target.sheetRow) {
        skipped += 1;
        continue;
      }

      tasksSheet.getRange(target.sheetRow, milestoneIndex + 1).setValue(toSheetDate_(milestoneKey));
      updated += 1;
    }

    const msg = "Restored " + updated + " milestone(s); skipped " + skipped + ".";
    Logger.log("restoreMilestonesFromRestoreSheet " + msg);
    ss.toast(msg, "Milestone restore", 8);
    return { ok: true, updated: updated, skipped: skipped };
  } finally {
    releaseWriteLock_(lock, lockAcquired);
  }
}

/**
 * Read-only external sign-in. Returns a response only for verifyExternalLogin
 * so every other POST keeps the existing parser and write lock.
 */
function routeVerifyExternalLogin_(e) {
  var raw = (e && e.postData && e.postData.contents != null)
    ? String(e.postData.contents).replace(/^\uFEFF/, "")
    : "";
  if (!raw || raw.indexOf("verifyExternalLogin") === -1) return null;

  var data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return null;
  }
  if (!data || data.action !== "verifyExternalLogin") return null;

  try {
    return buildResponse_(verifyExternalLogin_(data), e);
  } catch (error) {
    Logger.log(error);
    return buildResponse_({ ok: false, error: "Sign-in could not be verified." }, e);
  }
}

/**
 * Validate a Google or Microsoft ID token, then match its email to UserMaster.
 * Reads the sheet only. Does not insert, update, or delete.
 * Returns { ok, user, email, manager } or { ok: false }.
 */
function verifyExternalLogin_(data) {
  var provider = String(data && data.provider || "").trim().toLowerCase();
  var idToken = String(data && data.idToken || "").trim();
  if (provider !== "google" && provider !== "microsoft") {
    return { ok: false, error: "Unsupported sign-in provider." };
  }
  if (!idToken || idToken.length > 8000 || idToken.split(".").length !== 3) {
    return { ok: false, error: "Sign-in token was missing or invalid." };
  }

  var clientId = provider === "google"
    ? String(EXTERNAL_LOGIN_GOOGLE_CLIENT_ID || "").trim()
    : String(EXTERNAL_LOGIN_MICROSOFT_CLIENT_ID || "").trim();
  if (!clientId) {
    return {
      ok: false,
      error: provider === "google"
        ? "Google sign-in is not configured on the server yet."
        : "Microsoft sign-in is not configured on the server yet."
    };
  }

  var email = "";
  try {
    var payload = provider === "google"
      ? verifyGoogleIdToken_(idToken, clientId)
      : verifyMicrosoftIdToken_(idToken, clientId);
    email = provider === "google"
      ? emailFromGooglePayload_(payload)
      : emailFromMicrosoftPayload_(payload);
  } catch (error) {
    Logger.log("verifyExternalLogin " + provider + " failed: " + (error && error.message ? error.message : error));
    return {
      ok: false,
      error: provider === "google"
        ? "Google sign-in could not be verified."
        : "Microsoft sign-in could not be verified."
    };
  }

  var entry = findUserMasterByEmail_(email);
  if (!entry) {
    return { ok: false, error: "This account is not in UserMaster. Ask IT to add you." };
  }

  return {
    ok: true,
    user: entry.user,
    email: entry.email,
    manager: entry.manager || ""
  };
}

/**
 * Run from the Apps Script editor to grant the external-request permission
 * and check the Microsoft sign-in setup. Read-only.
 */
function testExternalLoginSetup() {
  var tenantId = String(EXTERNAL_LOGIN_MICROSOFT_TENANT_ID || "").trim().toLowerCase();
  var clientId = String(EXTERNAL_LOGIN_MICROSOFT_CLIENT_ID || "").trim();
  Logger.log("Microsoft client ID set: " + (clientId ? "yes (" + clientId + ")" : "NO"));
  Logger.log("Microsoft tenant ID set: " + (tenantId ? "yes (" + tenantId + ")" : "NO"));
  var keysUrl = tenantId
    ? "https://login.microsoftonline.com/" + tenantId + "/discovery/v2.0/keys"
    : "https://login.microsoftonline.com/common/discovery/v2.0/keys";
  try {
    var jwks = fetchJsonCached_(keysUrl, true);
    Logger.log("Microsoft signing keys loaded: " + (jwks && jwks.keys ? jwks.keys.length : 0));
  } catch (error) {
    Logger.log("Microsoft signing keys FAILED: " + (error && error.message ? error.message : error));
  }
  var rows = readUserMaster_();
  Logger.log("UserMaster rows: " + rows.length);
  rows.forEach(function(row) {
    Logger.log("  " + row.user + " <" + (row.email || "no email") + ">");
  });
}

function findUserMasterByEmail_(email) {
  var needle = String(email || "").trim().toLowerCase();
  if (!needle) return null;
  var rows = readUserMaster_();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email || "").trim().toLowerCase() === needle) return rows[i];
  }
  return null;
}

function verifyGoogleIdToken_(idToken, clientId) {
  var payload = verifyRs256IdToken_(idToken, [
    "https://www.googleapis.com/oauth2/v3/certs"
  ]);
  var iss = String(payload.iss || "");
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw new Error("Unexpected Google issuer");
  }
  if (!audienceMatches_(payload.aud, clientId)) throw new Error("Unexpected Google audience");
  if (!tokenTimeValid_(payload)) throw new Error("Google token is expired");
  return payload;
}

function verifyMicrosoftIdToken_(idToken, clientId) {
  var tenantId = String(EXTERNAL_LOGIN_MICROSOFT_TENANT_ID || "").trim().toLowerCase();
  if (tenantId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tenantId)) {
      throw new Error("EXTERNAL_LOGIN_MICROSOFT_TENANT_ID must be the Directory (tenant) ID GUID");
    }
    var tenantPayload = verifyRs256IdToken_(idToken, [
      "https://login.microsoftonline.com/" + tenantId + "/discovery/v2.0/keys"
    ]);
    if (String(tenantPayload.tid || "").toLowerCase() !== tenantId) {
      throw new Error("Unexpected Microsoft tenant");
    }
    if (String(tenantPayload.iss || "").toLowerCase() !== "https://login.microsoftonline.com/" + tenantId + "/v2.0") {
      throw new Error("Unexpected Microsoft issuer");
    }
    if (!audienceMatches_(tenantPayload.aud, clientId)) throw new Error("Unexpected Microsoft audience");
    if (!tokenTimeValid_(tenantPayload)) throw new Error("Microsoft token is expired");
    return tenantPayload;
  }

  var payload = verifyRs256IdToken_(idToken, [
    "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    "https://login.microsoftonline.com/organizations/discovery/v2.0/keys",
    "https://login.microsoftonline.com/consumers/discovery/v2.0/keys"
  ]);
  if (!/^https:\/\/login\.microsoftonline\.com\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/v2\.0$/.test(String(payload.iss || ""))) {
    throw new Error("Unexpected Microsoft issuer");
  }
  if (!audienceMatches_(payload.aud, clientId)) throw new Error("Unexpected Microsoft audience");
  if (!tokenTimeValid_(payload)) throw new Error("Microsoft token is expired");
  return payload;
}

function emailFromGooglePayload_(payload) {
  var verified = payload && payload.email_verified;
  if (verified !== true && String(verified).toLowerCase() !== "true") {
    throw new Error("Google email is not verified");
  }
  var email = String(payload.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Google token has no email");
  return email;
}

function emailFromMicrosoftPayload_(payload) {
  // email is preferred. Microsoft omits it on some accounts and puts the
  // address in preferred_username or upn instead.
  var candidates = [
    payload && payload.email,
    payload && payload.preferred_username,
    payload && payload.upn
  ];
  for (var i = 0; i < candidates.length; i++) {
    var value = String(candidates[i] || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  }
  throw new Error("Microsoft token has no email");
}

function audienceMatches_(aud, clientId) {
  var expected = String(clientId || "");
  if (!expected) return false;
  if (Array.isArray(aud)) {
    for (var i = 0; i < aud.length; i++) {
      if (String(aud[i]) === expected) return true;
    }
    return false;
  }
  return String(aud || "") === expected;
}

function tokenTimeValid_(payload) {
  var now = Math.floor(Date.now() / 1000);
  var exp = Number(payload && payload.exp);
  if (!exp || exp < now - 120) return false;
  if (payload && payload.nbf != null && payload.nbf !== "") {
    var nbf = Number(payload.nbf);
    if (nbf && nbf > now + 120) return false;
  }
  return true;
}

function verifyRs256IdToken_(idToken, jwksUrls) {
  var parts = String(idToken || "").split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Malformed token");
  }
  var header = decodeJwtSegment_(parts[0]);
  if (!header || header.alg !== "RS256" || !header.kid) {
    throw new Error("Unexpected token algorithm");
  }
  var payload = decodeJwtSegment_(parts[1]);
  if (!payload || typeof payload !== "object") throw new Error("Malformed token payload");
  var jwk = findJwkFromUrls_(jwksUrls, String(header.kid));
  if (!jwk || !jwk.n || !jwk.e) throw new Error("Signing key was not found");
  var digest = sha256Bytes_(parts[0] + "." + parts[1]);
  var signature = base64UrlToBytes_(parts[2]);
  if (!verifyPkcs1Sha256_(signature, jwk.n, jwk.e, digest)) {
    throw new Error("Token signature was rejected");
  }
  return payload;
}

function findJwkFromUrls_(urls, kid) {
  var list = Array.isArray(urls) ? urls : [];
  var i;
  var key;
  for (i = 0; i < list.length; i++) {
    key = findJwk_(fetchJsonCached_(list[i], false), kid);
    if (key) return key;
  }
  for (i = 0; i < list.length; i++) {
    key = findJwk_(fetchJsonCached_(list[i], true), kid);
    if (key) return key;
  }
  return null;
}

function findJwk_(jwks, kid) {
  var keys = jwks && jwks.keys ? jwks.keys : [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!key || key.kid !== kid) continue;
    if (key.kty && key.kty !== "RSA") continue;
    if (key.alg && key.alg !== "RS256") continue;
    return key;
  }
  return null;
}

function fetchJsonCached_(url, bypassCache) {
  var allowed = {
    "https://www.googleapis.com/oauth2/v3/certs": true,
    "https://login.microsoftonline.com/common/discovery/v2.0/keys": true,
    "https://login.microsoftonline.com/organizations/discovery/v2.0/keys": true,
    "https://login.microsoftonline.com/consumers/discovery/v2.0/keys": true
  };
  var tenantId = String(EXTERNAL_LOGIN_MICROSOFT_TENANT_ID || "").trim().toLowerCase();
  if (tenantId) {
    allowed["https://login.microsoftonline.com/" + tenantId + "/discovery/v2.0/keys"] = true;
  }
  if (!allowed[url]) throw new Error("Unexpected signing-key URL");

  var cache = CacheService.getScriptCache();
  var cacheKey = "ext-jwks-" + url;
  if (!bypassCache) {
    try {
      var cached = cache.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      Logger.log(error);
    }
  }

  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText() || "";
  if (code !== 200 || !text) throw new Error("Signing keys request failed");
  var parsed = JSON.parse(text);
  try {
    if (text.length < 90000) cache.put(cacheKey, text, 3600);
  } catch (putError) {
    Logger.log(putError);
  }
  return parsed;
}

function decodeJwtSegment_(segment) {
  var bytes = base64UrlToBytes_(segment);
  return JSON.parse(Utilities.newBlob(bytes).getDataAsString("UTF-8"));
}

function sha256Bytes_(text) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  var out = [];
  for (var i = 0; i < digest.length; i++) out.push(digest[i] & 255);
  return out;
}

function base64UrlToBytes_(input) {
  var s = String(input || "").replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  if (!s || /[^A-Za-z0-9+/=]/.test(s)) throw new Error("Invalid token encoding");
  var pad = s.length % 4;
  if (pad === 1) throw new Error("Invalid token encoding");
  if (pad) s += "====".slice(pad);
  var decoded = Utilities.base64Decode(s);
  var out = [];
  for (var i = 0; i < decoded.length; i++) out.push(decoded[i] & 255);
  return out;
}

// Apps Script rejects BigInt literals such as 0n. RS256 math uses 24-bit limbs
// so every product stays inside a JavaScript safe integer.
var RSA_LIMB_BASE_ = 16777216;

function rsaTrim_(a) {
  var end = a.length;
  while (end > 1 && a[end - 1] === 0) end--;
  if (end === a.length) return a;
  var out = [];
  for (var i = 0; i < end; i++) out.push(a[i]);
  return out;
}

function rsaIsZero_(a) {
  var i;
  for (i = 0; i < a.length; i++) {
    if (a[i]) return false;
  }
  return true;
}

function rsaCompare_(a, b) {
  var aa = rsaTrim_(a);
  var bb = rsaTrim_(b);
  if (aa.length !== bb.length) return aa.length > bb.length ? 1 : -1;
  var i;
  for (i = aa.length - 1; i >= 0; i--) {
    if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  }
  return 0;
}

function rsaBitLength_(a) {
  a = rsaTrim_(a);
  if (rsaIsZero_(a)) return 0;
  var top = a[a.length - 1];
  var bits = (a.length - 1) * 24;
  while (top > 0) {
    bits++;
    top = Math.floor(top / 2);
  }
  return bits;
}

function bytesToRsa_(bytes) {
  var limbs = [];
  var acc = 0;
  var bits = 0;
  var i;
  for (i = bytes.length - 1; i >= 0; i--) {
    acc += (bytes[i] & 255) * (bits === 0 ? 1 : bits === 8 ? 256 : 65536);
    bits += 8;
    if (bits === 24) {
      limbs.push(acc);
      acc = 0;
      bits = 0;
    }
  }
  if (bits) limbs.push(acc);
  if (!limbs.length) limbs.push(0);
  return rsaTrim_(limbs);
}

function rsaToFixedBytes_(value, length) {
  if (!length || length < 1) return null;
  var limbs = rsaTrim_(value);
  var bytes = [];
  var i;
  for (i = 0; i < limbs.length; i++) {
    var limb = limbs[i];
    bytes.push(limb % 256);
    bytes.push(Math.floor(limb / 256) % 256);
    bytes.push(Math.floor(limb / 65536) % 256);
  }
  while (bytes.length > 1 && bytes[bytes.length - 1] === 0) bytes.pop();
  if (bytes.length > length) return null;
  while (bytes.length < length) bytes.push(0);
  bytes.reverse();
  return bytes;
}

function rsaSub_(a, b) {
  var out = [];
  var borrow = 0;
  var i;
  for (i = 0; i < a.length; i++) {
    var bv = i < b.length ? b[i] : 0;
    var v = a[i] - bv - borrow;
    if (v < 0) {
      v += RSA_LIMB_BASE_;
      borrow = 1;
    } else {
      borrow = 0;
    }
    out.push(v);
  }
  return rsaTrim_(out);
}

function rsaMul_(a, b) {
  a = rsaTrim_(a);
  b = rsaTrim_(b);
  if (rsaIsZero_(a) || rsaIsZero_(b)) return [0];
  var out = [];
  var i;
  var j;
  for (i = 0; i < a.length + b.length; i++) out.push(0);
  for (i = 0; i < a.length; i++) {
    var carry = 0;
    for (j = 0; j < b.length; j++) {
      var v = out[i + j] + a[i] * b[j] + carry;
      out[i + j] = v % RSA_LIMB_BASE_;
      carry = Math.floor(v / RSA_LIMB_BASE_);
    }
    var k = i + b.length;
    while (carry) {
      if (k >= out.length) out.push(0);
      var summed = out[k] + carry;
      out[k] = summed % RSA_LIMB_BASE_;
      carry = Math.floor(summed / RSA_LIMB_BASE_);
      k++;
    }
  }
  return rsaTrim_(out);
}

function rsaShlBits_(a, bits) {
  if (!bits) return rsaTrim_(a.slice());
  var limbShift = Math.floor(bits / 24);
  var bitShift = bits % 24;
  var out = [];
  var i;
  for (i = 0; i < limbShift; i++) out.push(0);
  var carry = 0;
  var factor = 1;
  for (i = 0; i < bitShift; i++) factor *= 2;
  for (i = 0; i < a.length; i++) {
    var v = a[i] * factor + carry;
    out.push(v % RSA_LIMB_BASE_);
    carry = Math.floor(v / RSA_LIMB_BASE_);
  }
  if (carry) out.push(carry);
  return rsaTrim_(out);
}

function rsaShr1_(a) {
  var out = [];
  var carry = 0;
  var i;
  for (i = a.length - 1; i >= 0; i--) {
    var cur = carry * RSA_LIMB_BASE_ + a[i];
    out[i] = Math.floor(cur / 2);
    carry = cur % 2;
  }
  return rsaTrim_(out);
}

function rsaMod_(a, m) {
  a = rsaTrim_(a.slice());
  m = rsaTrim_(m);
  if (rsaIsZero_(m)) throw new Error("Division by zero");
  if (rsaCompare_(a, m) < 0) return a;
  var shift = rsaBitLength_(a) - rsaBitLength_(m);
  var shifted = rsaShlBits_(m, shift);
  var s;
  for (s = 0; s <= shift; s++) {
    if (rsaCompare_(a, shifted) >= 0) a = rsaSub_(a, shifted);
    if (rsaIsZero_(a)) return [0];
    if (s !== shift) shifted = rsaShr1_(shifted);
  }
  return rsaTrim_(a);
}

function rsaModPow_(base, exponentBytes, modulus) {
  var result = [1];
  var b = rsaMod_(base, modulus);
  var started = false;
  var i;
  var bit;
  for (i = 0; i < exponentBytes.length; i++) {
    var byte = exponentBytes[i] & 255;
    for (bit = 7; bit >= 0; bit--) {
      if (!started) {
        if (((byte >> bit) & 1) === 0) continue;
        started = true;
        result = b.slice();
        continue;
      }
      result = rsaMod_(rsaMul_(result, result), modulus);
      if (((byte >> bit) & 1) === 1) result = rsaMod_(rsaMul_(result, b), modulus);
    }
  }
  return started ? result : [1];
}

function rsaModulusLength_(nBytes) {
  var i = 0;
  while (i < nBytes.length - 1 && (nBytes[i] & 255) === 0) i++;
  return nBytes.length - i;
}

function verifyPkcs1Sha256_(signatureBytes, nB64, eB64, digestBytes) {
  var nBytes = base64UrlToBytes_(nB64);
  var eBytes = base64UrlToBytes_(eB64);
  if (!nBytes.length || !eBytes.length || !signatureBytes || !signatureBytes.length) return false;
  var n = bytesToRsa_(nBytes);
  var exponent = bytesToRsa_(eBytes);
  var sig = bytesToRsa_(signatureBytes);
  if (rsaIsZero_(n) || rsaIsZero_(exponent) || rsaCompare_(sig, n) >= 0) return false;
  var k = rsaModulusLength_(nBytes);
  if (!k || signatureBytes.length > k) return false;
  var em = rsaToFixedBytes_(rsaModPow_(sig, eBytes, n), k);
  return pkcs1Sha256Matches_(em, digestBytes);
}

function pkcs1Sha256Matches_(em, digestBytes) {
  var prefix = [
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01,
    0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
  ];
  if (!em || !digestBytes) return false;
  if (em.length < prefix.length + digestBytes.length + 11) return false;
  if (em[0] !== 0x00 || em[1] !== 0x01) return false;
  var offset = 2;
  var padding = 0;
  while (offset < em.length && em[offset] === 0xff) {
    padding++;
    offset++;
  }
  if (padding < 8 || offset >= em.length || em[offset] !== 0x00) return false;
  offset++;
  if (em.length - offset !== prefix.length + digestBytes.length) return false;
  var i;
  for (i = 0; i < prefix.length; i++) {
    if (em[offset + i] !== prefix[i]) return false;
  }
  for (i = 0; i < digestBytes.length; i++) {
    if (em[offset + prefix.length + i] !== (digestBytes[i] & 255)) return false;
  }
  return true;
}

// END google-apps-script-full-merged.gs — if this line is missing in Apps Script Code.gs, the paste was truncated.
