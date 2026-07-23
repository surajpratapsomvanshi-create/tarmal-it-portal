const SHEET_WEB_APP_URL = Auth.SHEET_WEB_APP_URL;

const LOCAL_KEY = "tarmal-ticket-drafts";
const DELETED_TICKETS_KEY = "tarmal-deleted-tickets";
const USERS_KEY = "tarmal-users";
const form = document.querySelector("#ticketForm");
const ticketFormOwnerPanel = document.querySelector("#ticketFormOwnerPanel");
const ticketFormOwnerTrigger = document.querySelector("#ticketFormOwnerTrigger");
const ticketFormSubmitButton = document.querySelector("#ticketFormSubmitButton");
const ticketFormSubmitLabel = document.querySelector("#ticketFormSubmitLabel");
const ticketSubmitProgress = document.querySelector("#ticketSubmitProgress");
const ticketSubmitProgressLabel = document.querySelector("#ticketSubmitProgressLabel");
const ticketSubmitProgressPercent = document.querySelector("#ticketSubmitProgressPercent");
const ticketSubmitProgressFill = document.querySelector("#ticketSubmitProgressFill");
const DEFAULT_TICKET_OWNERS = ["Suraj", "Sushil", "Dishon"];
const DEFAULT_TICKET_SORT = "milestone-open-desc";
const CLEARED_TICKET_SORT = "recent";
const PENDING_SYNC_TTL_MS = 120000;
const EXCLUDED_TICKET_OWNERS = new Set(["Bhanu", "Noorali"]);
const HIERARCHY_KEY = "tarmal-user-hierarchy";
const SUBTASK_COLLAPSE_KEY = "tarmal-subtask-collapsed";
const FALLBACK_HIERARCHY = [
  { user: "Suraj", manager: "", email: "sap@tarmalsteel.com" },
  { user: "Sushil", manager: "Suraj", email: "sushilpatil3760@gmail.com" },
  { user: "Dishon", manager: "Sushil", email: "dishonigogo07@gmail.com" }
];
const rows = document.querySelector("#ticketRows");
const syncText = document.querySelector("#syncText");
const statusDot = document.querySelector("#statusDot");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const totalCount = document.querySelector("#totalCount");
const progressCount = document.querySelector("#progressCount");
const pendingCount = document.querySelector("#pendingCount");
const priorityCount = document.querySelector("#priorityCount");
const completedCount = document.querySelector("#completedCount");
const openCount = document.querySelector("#openCount");
const blockedCount = document.querySelector("#blockedCount");
const completionRate = document.querySelector("#completionRate");
const dashboardSubtitle = document.querySelector("#dashboardSubtitle");
const dashboardWelcomeTitle = document.querySelector("#dashboardWelcomeTitle");
const dashboardCompletionRing = document.querySelector("#dashboardCompletionRing");
const statusPanelTotal = document.querySelector("#statusPanelTotal");
const ownerPanelTotal = document.querySelector("#ownerPanelTotal");
const dashboardRecentList = document.querySelector("#dashboardRecentList");
const performanceSubtitle = document.querySelector("#performanceSubtitle");
const performanceOwnerFilter = document.querySelector("#performanceOwnerFilter");
const perfAssignedCount = document.querySelector("#perfAssignedCount");
const perfCompletedCount = document.querySelector("#perfCompletedCount");
const perfProgressCount = document.querySelector("#perfProgressCount");
const perfPendingCount = document.querySelector("#perfPendingCount");
const perfCompletionRate = document.querySelector("#perfCompletionRate");
const perfBlockedCount = document.querySelector("#perfBlockedCount");
const perfOverdueCount = document.querySelector("#perfOverdueCount");
const perfHighPriorityCount = document.querySelector("#perfHighPriorityCount");
const perfAvgCloseDays = document.querySelector("#perfAvgCloseDays");
const performanceTeamPanel = document.querySelector("#performanceTeamPanel");
const performanceTeamTotal = document.querySelector("#performanceTeamTotal");
const performanceTeamRows = document.querySelector("#performanceTeamRows");
const performanceDetailLayout = document.querySelector("#performanceDetailLayout");
const perfStatusTitle = document.querySelector("#perfStatusTitle");
const perfStatusTotal = document.querySelector("#perfStatusTotal");
const perfStatusList = document.querySelector("#perfStatusList");
const perfTypeTotal = document.querySelector("#perfTypeTotal");
const perfTypeList = document.querySelector("#perfTypeList");
const perfPriorityTotal = document.querySelector("#perfPriorityTotal");
const perfPriorityList = document.querySelector("#perfPriorityList");
const perfTeamChart = document.querySelector("#perfTeamChart");
const perfRecentTitle = document.querySelector("#perfRecentTitle");
const perfRecentList = document.querySelector("#perfRecentList");
const performancePeriodFilters = document.querySelector("#performancePeriodFilters");
const performancePeriodTitle = document.querySelector("#performancePeriodTitle");
const performancePeriodTotal = document.querySelector("#performancePeriodTotal");
const performancePeriodHead = document.querySelector("#performancePeriodHead");
const performancePeriodRows = document.querySelector("#performancePeriodRows");
const sideTotalCount = document.querySelector("#sideTotalCount");
const sideOpenCount = document.querySelector("#sideOpenCount");
const sideBlockedCount = document.querySelector("#sideBlockedCount");
const statusList = document.querySelector("#statusList");
const ownerList = document.querySelector("#ownerList");
const latestTicketList = document.querySelector("#latestTicketList");
const refreshSheetButton = document.querySelector("#refreshSheetButton");
const exportButton = document.querySelector("#exportButton");
const clearLocalButton = document.querySelector("#clearLocalButton");
const ticketSearchFilter = document.querySelector("#ticketSearchFilter");
const ticketStatusFilterPanel = document.querySelector("#ticketStatusFilterPanel");
const ticketStatusFilterTrigger = document.querySelector("#ticketStatusFilterTrigger");
const ticketOwnerFilterPanel = document.querySelector("#ticketOwnerFilterPanel");
const ticketOwnerFilterTrigger = document.querySelector("#ticketOwnerFilterTrigger");
const ticketTypeFilterPanel = document.querySelector("#ticketTypeFilterPanel");
const ticketTypeFilterTrigger = document.querySelector("#ticketTypeFilterTrigger");
const ticketPriorityFilterPanel = document.querySelector("#ticketPriorityFilterPanel");
const ticketPriorityFilterTrigger = document.querySelector("#ticketPriorityFilterTrigger");
const ticketBhanuFilterPanel = document.querySelector("#ticketBhanuFilterPanel");
const ticketBhanuFilterTrigger = document.querySelector("#ticketBhanuFilterTrigger");
const ticketSortFilter = document.querySelector("#ticketSortFilter");
const clearTicketFilters = document.querySelector("#clearTicketFilters");
const ticketFilterSummary = document.querySelector("#ticketFilterSummary");
const projectSearchFilter = document.querySelector("#projectSearchFilter");
const projectStatusFilterPanel = document.querySelector("#projectStatusFilterPanel");
const projectStatusFilterTrigger = document.querySelector("#projectStatusFilterTrigger");
const projectOwnerFilterPanel = document.querySelector("#projectOwnerFilterPanel");
const projectOwnerFilterTrigger = document.querySelector("#projectOwnerFilterTrigger");
const projectRaisedByFilterPanel = document.querySelector("#projectRaisedByFilterPanel");
const projectRaisedByFilterTrigger = document.querySelector("#projectRaisedByFilterTrigger");
const projectTypeFilterPanel = document.querySelector("#projectTypeFilterPanel");
const projectTypeFilterTrigger = document.querySelector("#projectTypeFilterTrigger");
const projectPriorityFilterPanel = document.querySelector("#projectPriorityFilterPanel");
const projectPriorityFilterTrigger = document.querySelector("#projectPriorityFilterTrigger");
const projectSortFilter = document.querySelector("#projectSortFilter");
const clearProjectFilters = document.querySelector("#clearProjectFilters");
const projectFilterSummary = document.querySelector("#projectFilterSummary");
const projectTable = document.querySelector("#projectTable");
const projectRows = document.querySelector("#projectRows");
const projectActionsHeader = document.querySelector("#projectActionsHeader");
const refreshProjectsSheetButton = document.querySelector("#refreshProjectsSheetButton");
const exportProjectsButton = document.querySelector("#exportProjectsButton");
const openProjectTicketCreateButton = document.querySelector("#openProjectTicketCreateButton");
const kanbanColumns = document.querySelector("#kanbanColumns");
const kanbanSearchFilter = document.querySelector("#kanbanSearchFilter");
const kanbanOwnerFilter = document.querySelector("#kanbanOwnerFilter");
const kanbanPriorityFilter = document.querySelector("#kanbanPriorityFilter");
const kanbanShowCompleted = document.querySelector("#kanbanShowCompleted");
const kanbanFilterSummary = document.querySelector("#kanbanFilterSummary");
const toggleSidebarButton = document.querySelector("#toggleSidebarButton");
const expandSidebarButton = document.querySelector("#expandSidebarButton");
const togglePerformanceFiltersButton = document.querySelector("#togglePerformanceFiltersButton");
const expandPerformanceFiltersButton = document.querySelector("#expandPerformanceFiltersButton");
const activeTabLabel = document.querySelector("#activeTabLabel");
const ticketTable = document.querySelector("#ticketTable");
const ticketActionsHeader = document.querySelector("#ticketActionsHeader");
const ticketEditModal = document.querySelector("#ticketEditModal");
const ticketCreateModal = document.querySelector("#ticketCreateModal");
const openTicketCreateButton = document.querySelector("#openTicketCreateButton");
const closeTicketCreateButton = document.querySelector("#closeTicketCreateButton");
const cancelTicketCreateButton = document.querySelector("#cancelTicketCreateButton");
const ticketEditForm = document.querySelector("#ticketEditForm");
const ticketEditSheetRow = document.querySelector("#ticketEditSheetRow");
const closeTicketEditButton = document.querySelector("#closeTicketEditButton");
const cancelTicketEditButton = document.querySelector("#cancelTicketEditButton");
const deleteTicketEditButton = document.querySelector("#deleteTicketEditButton");
const ticketDeleteConfirm = document.querySelector("#ticketDeleteConfirm");
const ticketDeleteConfirmText = document.querySelector("#ticketDeleteConfirmText");
const confirmDeleteTicketButton = document.querySelector("#confirmDeleteTicketButton");
const cancelDeleteTicketButton = document.querySelector("#cancelDeleteTicketButton");
const ticketDeleteError = document.querySelector("#ticketDeleteError");
const ticketFormParentSheetRow = document.querySelector("#ticketFormParentSheetRow");
const ticketCreateParentContext = document.querySelector("#ticketCreateParentContext");
const ticketCreateParentLabel = document.querySelector("#ticketCreateParentLabel");
const clearTicketCreateParentButton = document.querySelector("#clearTicketCreateParentButton");
const ticketEditParentSheetRow = document.querySelector("#ticketEditParentSheetRow");
const ticketEditParentContext = document.querySelector("#ticketEditParentContext");
const ticketEditApprovalNote = document.querySelector("#ticketEditApprovalNote");
const ticketEditParentLink = document.querySelector("#ticketEditParentLink");
const addSubtaskFromEditButton = document.querySelector("#addSubtaskFromEditButton");
const ticketNotesEditor = document.querySelector("#ticketNotesEditor");
const ticketNotesInput = document.querySelector("#ticketNotesInput");
const ticketEditNotesEditor = document.querySelector("#ticketEditNotesEditor");
const ticketEditNotesInput = document.querySelector("#ticketEditNotesInput");
const screenshotPreviewModal = document.querySelector("#screenshotPreviewModal");
const screenshotPreviewImage = document.querySelector("#screenshotPreviewImage");
const screenshotPreviewFrame = document.querySelector("#screenshotPreviewFrame");
const screenshotPreviewTitle = document.querySelector("#screenshotPreviewTitle");
const screenshotPreviewCounter = document.querySelector("#screenshotPreviewCounter");
const screenshotPreviewFallback = document.querySelector("#screenshotPreviewFallback");
const screenshotPreviewOpenLink = document.querySelector("#screenshotPreviewOpenLink");
const screenshotPreviewExternal = document.querySelector("#screenshotPreviewExternal");
const screenshotPreviewDownload = document.querySelector("#screenshotPreviewDownload");
const screenshotPreviewEyebrow = document.querySelector("#screenshotPreviewEyebrow");
const screenshotPreviewPrev = document.querySelector("#screenshotPreviewPrev");
const screenshotPreviewNext = document.querySelector("#screenshotPreviewNext");
const closeScreenshotPreviewButton = document.querySelector("#closeScreenshotPreviewButton");
const screenshotPreviewNotice = document.querySelector("#screenshotPreviewNotice");
const attachmentsFolderLink = document.querySelector("#attachmentsFolderLink");

let screenshotPreviewState = { urls: [], index: 0, title: "", eyebrow: "Attachment" };
let activeEditTicket = null;

const TAB_LABELS = {
  dashboard: "Dashboard",
  performance: "Performance",
  tickets: "Tickets",
  projects: "Projects",
  kanban: "Kanban",
  "asset-register": "Register Asset",
  "asset-list": "IT Assets",
  documents: "DMS",
  users: "Users"
};

const IT_OWNER_NAMES = ["Suraj", "Sushil", "Dishon"];

const CHROME_COLLAPSED_KEY = "tarmal-chrome-collapsed";
const SIDEBAR_COLLAPSED_KEY = "tarmal-sidebar-collapsed";
const PERFORMANCE_FILTERS_COLLAPSED_KEY = "tarmal-performance-filters-collapsed";
const TOOLBAR_COLLAPSED_PREFIX = "tarmal-toolbar-";
const DEFAULT_COLLAPSED_TOOLBARS = new Set(["tickets", "projects", "kanban", "assets", "users"]);

const KANBAN_COLUMNS = [
  { id: "pending", label: "Not Started", statusClass: "status-pending" },
  { id: "progress", label: "In Progress", statusClass: "status-progress" },
  { id: "blocked", label: "Blocked", statusClass: "status-blocked" },
  { id: "approval", label: "Pending Approval", statusClass: "status-approval" },
  { id: "completed", label: "Completed", statusClass: "status-completed" },
  { id: "other", label: "Other", statusClass: "status-other" }
];

function isTicketOriginalOwnerBhanu(ticket) {
  const text = cleanText(ticket?.["Bhanu List"]);
  return /^bhanu/i.test(text);
}

function getTicketOriginalOwnerValue(ticket) {
  return isTicketOriginalOwnerBhanu(ticket) ? "Bhanu" : "";
}

const ticketMultiFilters = [
  { panel: ticketStatusFilterPanel, trigger: ticketStatusFilterTrigger, defaultLabel: "All statuses", getValues: (ticket) => ticket.Status },
  { panel: ticketOwnerFilterPanel, trigger: ticketOwnerFilterTrigger, defaultLabel: "All owners", getValues: (ticket) => ticket.Owner },
  { panel: ticketTypeFilterPanel, trigger: ticketTypeFilterTrigger, defaultLabel: "All types", getValues: (ticket) => ticket.Type },
  { panel: ticketPriorityFilterPanel, trigger: ticketPriorityFilterTrigger, defaultLabel: "All priorities", getValues: (ticket) => ticket.Priority, labelFormatter: formatPriorityLabel },
  { panel: ticketBhanuFilterPanel, trigger: ticketBhanuFilterTrigger, defaultLabel: "All original owners", getValues: (ticket) => getTicketOriginalOwnerValue(ticket), staticOptions: ["Bhanu"] }
];

const projectMultiFilters = [
  { panel: projectStatusFilterPanel, trigger: projectStatusFilterTrigger, defaultLabel: "All statuses", getValues: (ticket) => ticket.Status },
  { panel: projectOwnerFilterPanel, trigger: projectOwnerFilterTrigger, defaultLabel: "All owners", getValues: (ticket) => ticket.Owner },
  { panel: projectRaisedByFilterPanel, trigger: projectRaisedByFilterTrigger, defaultLabel: "All requesters", getValues: (ticket) => ticket["Raised By"] },
  { panel: projectTypeFilterPanel, trigger: projectTypeFilterTrigger, defaultLabel: "All project types", getValues: (ticket) => ticket.Type, staticOptions: ["SAP", "Infra"] },
  { panel: projectPriorityFilterPanel, trigger: projectPriorityFilterTrigger, defaultLabel: "All priorities", getValues: (ticket) => ticket.Priority, labelFormatter: formatPriorityLabel }
];

const allMultiFilters = () => [...ticketMultiFilters, ...projectMultiFilters].filter((filter) => filter.panel && filter.trigger);
const userForm = document.querySelector("#userForm");
const rolePreset = document.querySelector("#rolePreset");
const rightsCheckboxes = document.querySelector("#rightsCheckboxes");
const userTableHead = document.querySelector("#userTableHead");
const userRows = document.querySelector("#userRows");
const deleteSelectedUsersButton = document.querySelector("#deleteSelectedUsersButton");
const refreshUsersButton = document.querySelector("#refreshUsersButton");
const userPasswordInput = document.querySelector("#userPassword");
const generatePasswordButton = document.querySelector("#generatePasswordButton");
const copyPasswordButton = document.querySelector("#copyPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const raisedBySuggestions = document.querySelector("#raisedBySuggestions");

const USER_RIGHTS = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dashboard", description: "View ticket metrics and summaries" },
  { id: "createTicket", label: "Create Tickets", shortLabel: "Create", description: "Submit new tickets" },
  { id: "editTicket", label: "Edit Tickets", shortLabel: "Edit", description: "Update existing tickets" },
  { id: "exportData", label: "Export Data", shortLabel: "Export", description: "Download ticket CSV exports" },
  { id: "syncSheet", label: "Sync Data", shortLabel: "Sync", description: "Refresh and push ticket data" },
  { id: "manageUsers", label: "Manage Users", shortLabel: "Users", description: "Create users and change rights" },
  { id: "viewAssets", label: "View IT Assets", shortLabel: "View Assets", description: "View the IT assets list and register" },
  { id: "manageAssets", label: "Manage IT Assets", shortLabel: "Mgr Assets", description: "Register, edit, delete, and export IT assets" },
  { id: "viewDocuments", label: "View Documents", shortLabel: "View Docs", description: "Browse and preview IT documents shared with you" },
  { id: "manageDocuments", label: "Manage Documents", shortLabel: "Mgr Docs", description: "Upload documents and control user access" }
];

const ROLE_PRESETS = {
  admin: ["dashboard", "createTicket", "editTicket", "exportData", "syncSheet", "manageUsers", "viewAssets", "manageAssets", "viewDocuments", "manageDocuments"],
  agent: ["dashboard", "createTicket", "exportData", "syncSheet", "viewAssets", "viewDocuments"],
  viewer: ["dashboard"]
};

const sampleUsers = [
  {
    id: "user-admin",
    name: "Admin",
    username: "admin",
    email: "admin@tarmal.com",
    password: "1234",
    active: true,
    rights: { dashboard: true, createTicket: true, editTicket: true, exportData: true, syncSheet: true, manageUsers: true, viewAssets: true, manageAssets: true, viewDocuments: true, manageDocuments: true }
  },
  {
    id: "user-bhanu",
    name: "Bhanu",
    username: "Bhanu",
    email: "bhanu@tarmal.com",
    password: "Tarmal@Bhanu123",
    active: true,
    rights: { dashboard: true, createTicket: true, editTicket: true, exportData: true, syncSheet: true, manageUsers: true, viewAssets: true, manageAssets: true, viewDocuments: true, manageDocuments: true }
  },
  {
    id: "user-suraj",
    name: "Suraj",
    username: "Suraj",
    email: "suraj@tarmal.com",
    password: "Tarmal@Suraj123",
    active: true,
    rights: { dashboard: true, createTicket: true, editTicket: true, exportData: true, syncSheet: false, manageUsers: false, viewAssets: true, manageAssets: true, viewDocuments: true, manageDocuments: true }
  },
  {
    id: "user-sushil",
    name: "Sushil",
    username: "Sushil",
    email: "sushil@tarmal.com",
    password: "Tarmal@Sushil123",
    active: true,
    rights: { dashboard: true, createTicket: true, editTicket: false, exportData: false, syncSheet: true, manageUsers: false, viewAssets: true, manageAssets: false, viewDocuments: true, manageDocuments: false }
  },
  {
    id: "user-dishon",
    name: "Dishon",
    username: "Dishon",
    email: "",
    password: "Tarmal@Dishon123",
    active: true,
    rights: { dashboard: true, createTicket: false, editTicket: false, exportData: false, syncSheet: false, manageUsers: false, viewAssets: false, manageAssets: false, viewDocuments: false, manageDocuments: false }
  }
];

function createUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRights() {
  return Object.fromEntries(USER_RIGHTS.map((right) => [right.id, false]));
}

function normalizeRights(rights = {}) {
  const normalized = emptyRights();
  USER_RIGHTS.forEach((right) => {
    normalized[right.id] = Boolean(rights[right.id]);
  });
  return normalized;
}

function ensureUserPasswords(users) {
  return Auth.ensureAdminUser(users).map((user) => {
    if (user.id === Auth.ADMIN_USER.id || String(user.username || "").toLowerCase() === "admin") {
      return Auth.normalizeUser(user);
    }

    return Auth.normalizeUser({
      ...user,
      password: user.password || `Tarmal@${user.name}123`,
      username: user.username || user.name,
      active: user.active !== false
    });
  });
}

function readUsers() {
  return ensureUserPasswords(Auth.readUsers());
}

async function writeUsers(users) {
  const normalized = ensureUserPasswords(users.map((user) => ({
    ...user,
    rights: normalizeRights(user.rights)
  })));
  Auth.saveUsers(normalized);
  try {
    await Auth.syncUsersToSheet(normalized);
  } catch (error) {
    console.error("User sync failed", error);
    throw error;
  }
  return normalized;
}

async function refreshUsersFromSheet() {
  if (!SHEET_WEB_APP_URL) return readUsers();

  try {
    await Auth.loadUsersFromSheet({ deferSync: true });
    Auth.refreshSessionRights();
    renderUsers();
    return readUsers();
  } catch (error) {
    console.error(error);
    return readUsers();
  }
}

function renderRightsForm(selectedRights = emptyRights()) {
  rightsCheckboxes.innerHTML = USER_RIGHTS.map((right) => `
    <label class="right-option">
      <input type="checkbox" name="right-${right.id}" value="${right.id}" ${selectedRights[right.id] ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(right.label)}</strong>
        <small>${escapeHtml(right.description)}</small>
      </span>
    </label>
  `).join("");
}

function rightsFromForm(formElement) {
  const rights = emptyRights();
  USER_RIGHTS.forEach((right) => {
    rights[right.id] = Boolean(formElement.querySelector(`[name="right-${right.id}"]`)?.checked);
  });
  return rights;
}

function applyRolePreset(preset) {
  const rights = preset === "custom"
    ? emptyRights()
    : Object.fromEntries(
        USER_RIGHTS.map((right) => [right.id, ROLE_PRESETS[preset]?.includes(right.id) || false])
      );
  renderRightsForm(rights);
}

function renderUserTableHead() {
  userTableHead.innerHTML = `
    <th class="checkbox-col" scope="col">
      <input type="checkbox" id="selectAllUsers" aria-label="Select all users">
    </th>
    <th scope="col">Name</th>
    <th scope="col">Login</th>
    <th class="password-head-col" scope="col">Password</th>
    ${USER_RIGHTS.map((right) => `
      <th class="right-col" scope="col" title="${escapeHtml(right.description || right.label)}">
        ${escapeHtml(right.shortLabel || right.label)}
      </th>
    `).join("")}
    <th class="actions-col" scope="col">Actions</th>
  `;
}

function updateDeleteSelectedState() {
  const selectedCount = userRows.querySelectorAll(".user-select:checked").length;
  deleteSelectedUsersButton.disabled = selectedCount === 0;
  deleteSelectedUsersButton.textContent = selectedCount
    ? `Delete Selected (${selectedCount})`
    : "Delete Selected";
}

function renderUsers() {
  const users = readUsers().map((user) => ({
    ...user,
    rights: normalizeRights(user.rights)
  }));
  renderUserTableHead();

  const selectAllUsers = document.querySelector("#selectAllUsers");
  selectAllUsers?.addEventListener("change", () => {
    userRows.querySelectorAll(".user-select").forEach((checkbox) => {
      checkbox.checked = selectAllUsers.checked;
    });
    updateDeleteSelectedState();
  });

  if (!users.length) {
    userRows.innerHTML = `<tr class="empty-row"><td colspan="${USER_RIGHTS.length + 6}">No users yet.</td></tr>`;
    updateDeleteSelectedState();
    return;
  }

  userRows.innerHTML = users
    .map((user) => `
      <tr data-user-id="${escapeHtml(user.id)}">
        <td class="checkbox-col">
          <input class="user-select" type="checkbox" aria-label="Select ${escapeHtml(user.name)}">
        </td>
        <td class="name-col">${escapeHtml(user.name)}</td>
        <td class="email-col">${escapeHtml(user.username || user.email || user.name)}</td>
        <td class="password-col">
          <div class="password-col-inner">
            <code class="password-chip">${escapeHtml(user.password || "")}</code>
            <button class="text-button regenerate-password-button" type="button" data-user-id="${escapeHtml(user.id)}">New</button>
          </div>
        </td>
        ${USER_RIGHTS.map((right) => `
          <td class="right-col">
            <input
              type="checkbox"
              class="user-right"
              data-right="${right.id}"
              aria-label="${escapeHtml(user.name)} ${escapeHtml(right.label)}"
              ${user.rights[right.id] ? "checked" : ""}
            >
          </td>
        `).join("")}
        <td class="actions-col">
          <button class="text-button delete-user-button" type="button" data-user-id="${escapeHtml(user.id)}">Delete</button>
        </td>
      </tr>
    `)
    .join("");

  userRows.querySelectorAll(".user-select").forEach((checkbox) => {
    checkbox.addEventListener("change", updateDeleteSelectedState);
  });

  userRows.querySelectorAll(".user-right").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const row = checkbox.closest("tr");
      const userId = row.dataset.userId;
      const rightId = checkbox.dataset.right;
      const allUsers = readUsers();
      const user = allUsers.find((entry) => entry.id === userId);
      if (!user) return;

      const previousChecked = Boolean(user.rights[rightId]);
      user.rights = normalizeRights({
        ...user.rights,
        [rightId]: checkbox.checked
      });

      checkbox.disabled = true;
      try {
        await writeUsers(allUsers);
        Auth.refreshSessionRights();
        row.classList.add("rights-row-saved");
        setTimeout(() => row.classList.remove("rights-row-saved"), 1200);
      } catch (error) {
        checkbox.checked = previousChecked;
        user.rights[rightId] = previousChecked;
        Auth.saveUsers(allUsers);
        alert("Could not save user rights. Redeploy Apps Script if IT Assets rights were recently added.");
        console.error(error);
      } finally {
        checkbox.disabled = false;
      }
    });
  });

  userRows.querySelectorAll(".regenerate-password-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.userId;
      const allUsers = readUsers();
      const user = allUsers.find((entry) => entry.id === userId);
      if (!user) return;

      const nextPassword = Auth.generatePassword();
      user.password = nextPassword;
      await writeUsers(allUsers);
      renderUsers();
      alert(`New password for ${user.name}: ${nextPassword}`);
    });
  });

  userRows.querySelectorAll(".delete-user-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.userId;
      const allUsers = readUsers();
      const user = allUsers.find((entry) => entry.id === userId);
      if (!user) return;
      if (!confirm(`Delete user "${user.name}"?`)) return;
      await writeUsers(allUsers.filter((entry) => entry.id !== userId));
      renderUsers();
    });
  });

  updateDeleteSelectedState();
}

const sampleTickets = [
  {
    Task: "Quotation for HRMS Cloud server storage capacity addition",
    Priority: "80",
    Owner: "Suraj",
    "Raised By": "Abdulkadir",
    Status: "Not started",
    Type: "Daily - Infra",
    "Start date": "2026-06-12",
    "End date": "",
    Milestone: "",
    Notes: "",
    "Bhanu List": ""
  },
  {
    Task: "Receive and deploy replacement printers for Kokotoni as a replacement",
    Priority: "20",
    Owner: "Sushil",
    "Raised By": "Sushil",
    Status: "In progress",
    Type: "Daily - Infra",
    "Start date": "2026-06-11",
    "End date": "",
    Milestone: "",
    Notes: "Verify functionality, record asset details, and arrange installation.",
    "Bhanu List": ""
  }
];

function readTickets() {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (!saved) return sampleTickets;

  try {
    return JSON.parse(saved);
  } catch {
    return sampleTickets;
  }
}

function writeTickets(tickets) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(tickets));
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizePriority(value) {
  const text = cleanText(value).toLowerCase();
  if (text === "high" || text === "80") return "80";
  if (text === "low" || text === "20") return "20";
  const num = Number(text);
  if (!Number.isNaN(num) && num >= 80) return "80";
  return "20";
}

function formatPriorityLabel(value) {
  return normalizePriority(value) === "80" ? "High" : "Low";
}

function countNotesImages(editor) {
  return getNotesAttachmentPanel(editor)?.querySelectorAll(".ticket-notes-attachment-item").length || 0;
}

function getNotesAttachmentPanel(editor) {
  return editor?.parentElement?.querySelector("[data-notes-attachments]") || null;
}

function parseNotesHtmlParts(html) {
  if (!html) return { text: "", attachments: [] };

  const doc = new DOMParser().parseFromString(html, "text/html");
  const attachments = [];
  doc.querySelectorAll("img").forEach((image) => {
    attachments.push({
      src: image.getAttribute("src") || "",
      driveUrl: image.getAttribute("data-drive-url") || ""
    });
    const wrapper = image.closest(".ticket-notes-attachment");
    if (wrapper) {
      wrapper.remove();
    } else {
      image.remove();
    }
  });

  const text = doc.body.textContent.replace(/\u00a0/g, " ").trim();
  return { text, attachments };
}

function collectAttachmentsFromPanel(panel) {
  if (!panel) return [];
  return [...panel.querySelectorAll(".ticket-notes-attachment-item")].map((row) => ({
    src: row.dataset.src || "",
    driveUrl: row.dataset.driveUrl || ""
  }));
}

function buildNotesHtmlFromParts(text, attachments) {
  const parts = [];
  if (text) {
    parts.push(escapeHtml(text).replace(/\n/g, "<br>"));
  }
  attachments.forEach((item) => {
    const driveUrl = item.driveUrl || "";
    const src = item.src || driveUrl;
    const driveAttr = driveUrl ? ` data-drive-url="${escapeHtml(driveUrl)}"` : "";
    parts.push(`<img src="${escapeHtml(src)}" class="ticket-notes-image"${driveAttr} alt="Screenshot">`);
  });
  return parts.join("<br>");
}

function dedupeNoteAttachments(attachments) {
  const seen = new Set();
  return attachments.filter((item) => {
    const key = extractDriveFileId(item.driveUrl || item.src) || item.src;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeNotesAttachmentRow(row, panel, editor, hiddenInput) {
  if (!row || !panel) return;
  row.remove();
  panel.hidden = !panel.children.length;
  syncTicketNotesHiddenInput(editor, hiddenInput);
}

function migrateInlineEditorImagesToPanel(editor, hiddenInput) {
  const panel = getNotesAttachmentPanel(editor);
  if (!panel || !editor) return;

  const inlineImages = [...editor.querySelectorAll("img")];
  if (!inlineImages.length) return;

  const attachments = collectAttachmentsFromPanel(panel);
  inlineImages.forEach((image) => {
    attachments.push({
      src: image.getAttribute("src") || "",
      driveUrl: image.getAttribute("data-drive-url") || ""
    });
    image.closest(".ticket-notes-attachment")?.remove();
    image.remove();
  });

  renderNotesAttachmentsPanel(panel, dedupeNoteAttachments(attachments), editor, hiddenInput);
}

function renderNotesAttachmentsPanel(panel, attachments, editor, hiddenInput) {
  if (!panel) return;

  panel.replaceChildren();
  attachments.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ticket-notes-attachment-item";
    row.dataset.src = item.src || "";
    row.dataset.driveUrl = item.driveUrl || "";

    const previewTile = document.createElement("div");
    previewTile.className = "ticket-notes-attachment-preview";
    previewTile.setAttribute("role", "button");
    previewTile.tabIndex = 0;
    previewTile.setAttribute("aria-label", `Preview screenshot ${index + 1}`);

    const image = document.createElement("img");
    image.src = item.src || item.driveUrl || "";
    image.alt = `Screenshot ${index + 1}`;
    image.draggable = false;
    previewTile.appendChild(image);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ticket-notes-attachment-remove";
    removeButton.setAttribute("aria-label", "Remove attachment");
    removeButton.title = "Remove attachment";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNotesAttachmentRow(row, panel, editor, hiddenInput);
    });

    const removeLink = document.createElement("button");
    removeLink.type = "button";
    removeLink.className = "ticket-notes-attachment-remove-link";
    removeLink.textContent = "Remove";
    removeLink.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNotesAttachmentRow(row, panel, editor, hiddenInput);
    });

    const openPreview = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const urls = collectAttachmentsFromPanel(panel)
        .map((attachment) => attachment.driveUrl || attachment.src)
        .filter(Boolean);
      if (urls.length) openScreenshotPreview(urls, index);
    };

    previewTile.addEventListener("click", openPreview);
    previewTile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        openPreview(event);
      }
    });

    row.append(previewTile, removeButton, removeLink);
    panel.appendChild(row);
  });

  panel.hidden = !attachments.length;
  panel.classList.toggle("has-attachments", attachments.length > 0);
}

function addAttachmentToNotesEditor(editor, hiddenInput, attachment) {
  const panel = getNotesAttachmentPanel(editor);
  const attachments = collectAttachmentsFromPanel(panel);
  attachments.push(attachment);
  renderNotesAttachmentsPanel(panel, attachments, editor, hiddenInput);
  syncTicketNotesHiddenInput(editor, hiddenInput);
}

function attachmentsFromTicketNotes(ticket = {}) {
  if (ticket.NotesHtml) {
    return parseNotesHtmlParts(ticket.NotesHtml).attachments;
  }

  return extractDriveLinksFromNotes(ticket).map((url) => {
    const fileId = extractDriveFileId(url);
    const src = fileId
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
      : url;
    return { src, driveUrl: url };
  });
}

function notesSheetText(text) {
  return String(text || "").trim();
}

function extractDriveFileId(url) {
  const value = String(url || "");
  const filePathMatch = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch) return filePathMatch[1];
  const idParamMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && value.includes("drive.google.com")) return idParamMatch[1];
  return "";
}

function toScreenshotEmbedUrl(url) {
  const fileId = extractDriveFileId(url);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return "";
}

function toDriveDownloadUrl(url) {
  const fileId = extractDriveFileId(url);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  return "";
}

function isDataImageUrl(url) {
  return /^data:image\//i.test(String(url || ""));
}

function isDriveScreenshotUrl(url) {
  return Boolean(extractDriveFileId(url));
}

function extractDriveLinksFromNotes(ticket) {
  const urls = [];
  const text = [ticket.Notes, ticket.Remarks].filter(Boolean).join("\n");
  const linkPattern = /Screenshot\s+\d+\s*:\s*(https?:\/\/\S+)/gi;
  let match = linkPattern.exec(text);
  while (match) {
    urls.push(match[1]);
    match = linkPattern.exec(text);
  }

  const genericDrivePattern = /(https?:\/\/drive\.google\.com\/\S+)/gi;
  let driveMatch = genericDrivePattern.exec(text);
  while (driveMatch) {
    urls.push(driveMatch[1]);
    driveMatch = genericDrivePattern.exec(text);
  }

  return dedupeScreenshotUrls(urls);
}

function dedupeScreenshotUrls(urls) {
  const seen = new Set();
  const unique = [];
  urls.forEach((url) => {
    const value = String(url || "").trim();
    if (!value) return;
    const key = extractDriveFileId(value) || value;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(value);
  });
  return unique;
}

function stripScreenshotMetadata(text) {
  const lines = String(text || "").split(/\r?\n/);
  const kept = lines
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^Screenshot\s+\d+\s*:?\s*$/i.test(line)) return false;
      if (/^Screenshot\s+\d+\s*:\s*https?:\/\//i.test(line)) return false;
      if (/^https?:\/\/drive\.google\.com\/\S+$/i.test(line)) return false;
      if (/^\[\d+ screenshots? attached\]$/i.test(line)) return false;
      if (/^\[Screenshot attached\]$/i.test(line)) return false;
      return true;
    })
    .map((line) => line
      .replace(/Screenshot\s+\d+\s*:\s*https?:\/\/\S+/gi, "")
      .replace(/https?:\/\/drive\.google\.com\/\S+/gi, "")
      .trim())
    .filter(Boolean);

  return kept.join("\n").trim();
}

function buildNotesTextForSheet(ticket) {
  const text = stripScreenshotMetadata(getTicketRemarksText(ticket));
  const links = dedupeScreenshotUrls([
    ...extractDriveLinksFromNotes(ticket),
    ...collectScreenshotUrlsFromHtml(ticket.NotesHtml)
      .filter((url) => isDriveScreenshotUrl(url))
  ]);
  if (!links.length) return text;
  const linkLines = links.map((url, index) => `Screenshot ${index + 1}: ${url}`);
  return [text, ...linkLines].filter(Boolean).join("\n");
}

function collectScreenshotUrlsFromHtml(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const urls = [];
  doc.querySelectorAll("img").forEach((image) => {
    const driveUrl = cleanText(image.getAttribute("data-drive-url"));
    const src = cleanText(image.getAttribute("src"));
    if (driveUrl) {
      urls.push(driveUrl);
      return;
    }
    const fromSrc = extractDriveFileId(src)
      ? `https://drive.google.com/file/d/${extractDriveFileId(src)}/view`
      : "";
    if (fromSrc) urls.push(fromSrc);
    else if (src) urls.push(src);
  });
  return urls;
}

function collectTicketScreenshotUrls(ticket = {}) {
  const rawNotes = String(
    ticket.NotesRaw
    || [ticket.Notes, ticket.Remarks].find((value) =>
      /Screenshot\s+\d+\s*:/i.test(String(value || "")) || /drive\.google\.com/i.test(String(value || ""))
    )
    || ""
  ).trim();

  return dedupeScreenshotUrls([
    ...extractDriveLinksFromNotes({ Notes: rawNotes, Remarks: rawNotes }),
    ...extractDriveLinksFromNotes(ticket),
    ...collectScreenshotUrlsFromHtml(ticket.NotesHtml || ""),
    ...(Array.isArray(ticket.ScreenshotUrls) ? ticket.ScreenshotUrls : [])
  ]);
}

function ensureTicketNotesHtml(ticket, screenshotUrls = []) {
  const htmlUrls = collectScreenshotUrlsFromHtml(ticket.NotesHtml || "");
  if (htmlUrls.length && htmlUrls.length >= screenshotUrls.length) {
    return ticket.NotesHtml || "";
  }
  if (!screenshotUrls.length) {
    return ticket.NotesHtml || "";
  }

  const notesText = screenshotUrls
    .map((url, index) => `Screenshot ${index + 1}: ${url}`)
    .join("\n");
  return buildNotesHtmlFromDriveLinks({ Notes: notesText, Remarks: notesText });
}

function ticketAttachmentLabelCount(ticket) {
  const match = String(ticket.Remarks || ticket.Notes || "").match(/\[(\d+)\s+screenshots?\s+attached\]/i);
  return match ? Number(match[1]) : 0;
}

function buildNotesHtmlFromDriveLinks(ticket) {
  const urls = extractDriveLinksFromNotes(ticket);
  if (!urls.length) return "";

  return urls.map((url) => {
    const fileId = extractDriveFileId(url);
    const thumb = fileId
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
      : toScreenshotPreviewUrl(url);
    return `<img src="${thumb}" class="ticket-notes-image" data-drive-url="${url}" alt="Screenshot">`;
  }).join("<br>");
}

function normalizeDateKey(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parsed = parseTicketDate(text);
  if (!parsed) return text.toLowerCase();

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ticketDatesMatch(left, right) {
  const a = normalizeDateKey(left);
  const b = normalizeDateKey(right);
  if (!a && !b) return true;
  return a === b;
}

function ticketIdentityKey(ticket) {
  return `${cleanText(ticket.Task)}||${cleanText(ticket.Owner)}`;
}

function readDeletedTicketTombstones() {
  try {
    const saved = localStorage.getItem(DELETED_TICKETS_KEY);
    const parsed = JSON.parse(saved || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDeletedTicketTombstones(entries) {
  localStorage.setItem(
    DELETED_TICKETS_KEY,
    JSON.stringify(
      entries
        .filter((entry) => entry && (entry.key || entry.sheetRow))
        .slice(-200)
    )
  );
}

function markDeletedTicketTombstone({ sheetRow, task, owner }) {
  const entries = readDeletedTicketTombstones();
  entries.push({
    sheetRow: Number(sheetRow) || 0,
    key: ticketIdentityKey({ Task: task, Owner: owner }),
    at: Date.now()
  });
  writeDeletedTicketTombstones(entries);
}

function isDeletedTicketTombstone(ticket) {
  const row = Number(ticket.sheetRow);
  const key = ticketIdentityKey(ticket);
  const cutoff = Date.now() - 86400000;
  return readDeletedTicketTombstones().some((entry) => {
    if ((entry.at || 0) < cutoff) return false;
    if (row && Number(entry.sheetRow) === row) return true;
    if (key && entry.key === key) return true;
    return false;
  });
}

function reconcileDeletedTicketTombstones(remoteTickets) {
  const remoteKeys = new Set(remoteTickets.map(ticketIdentityKey));
  const remoteRows = new Set(remoteTickets.map((ticket) => Number(ticket.sheetRow)).filter(Boolean));
  const stillNeeded = readDeletedTicketTombstones().filter((entry) => {
    if (Date.now() - (entry.at || 0) > 86400000) return false;
    if (entry.key && remoteKeys.has(entry.key)) return true;
    if (entry.sheetRow && remoteRows.has(Number(entry.sheetRow))) return true;
    return false;
  });
  writeDeletedTicketTombstones(stillNeeded);
}

function yieldToUi() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function mergeRemoteTicketsWithLocal(remoteTickets) {
  const remote = Array.isArray(remoteTickets) ? remoteTickets : [];

  if (!remote.length) {
    const existing = readTickets().filter((ticket) => cleanText(ticket.Task));
    if (existing.length) {
      return existing.map((ticket) => normalizeTicket(ticket));
    }
  }

  const merged = remote
    .filter((ticket) => !isDeletedTicketTombstone(ticket))
    .map((ticket, index) => mergeTicketFromSheet({
    ...ticket,
    sheetRow: ticket.sheetRow ?? index + 2
  }, index));
  const mergedKeys = new Set(merged.map(ticketIdentityKey));
  const now = Date.now();

  readTickets().forEach((local) => {
    if (!cleanText(local.Task)) return;
    const key = ticketIdentityKey(local);
    if (mergedKeys.has(key)) return;

    const pending = Number(local.pendingSheetSync) || 0;
    const isRecentPending = pending && (now - pending < 600000);
    const isUnsynced = !Number(local.sheetRow);
    if (!isRecentPending && !isUnsynced) return;

    merged.push(normalizeTicket(local));
    mergedKeys.add(key);
  });

  return merged;
}

function mergeTicketFromSheet(remoteTicket, index) {
  const sheetRow = remoteTicket.sheetRow ?? index + 2;
  const local = readTickets().find((ticket) => Number(ticket.sheetRow) === Number(sheetRow));
  const notesRaw = [remoteTicket.Notes, remoteTicket.Remarks].filter(Boolean).join("\n");
  const screenshotUrls = dedupeScreenshotUrls([
    ...collectTicketScreenshotUrls({ ...remoteTicket, NotesRaw: notesRaw }),
    ...collectScreenshotUrlsFromHtml(local?.NotesHtml || "")
  ]);
  const notesHtml = ensureTicketNotesHtml(
    { NotesHtml: local?.NotesHtml || remoteTicket.NotesHtml },
    screenshotUrls
  );

  const remoteDatesMatchLocal = local
    && ticketDatesMatch(local.Milestone, remoteTicket.Milestone)
    && ticketDatesMatch(local["Start date"], remoteTicket["Start date"])
    && ticketDatesMatch(local["End date"], remoteTicket["End date"]);
  const pending = Number(local?.pendingSheetSync) || 0;
  const isRecentPending = pending > 0 && (Date.now() - pending < PENDING_SYNC_TTL_MS);
  const preservePendingEdits = isRecentPending && local && !remoteDatesMatchLocal;

  const preserveFields = preservePendingEdits ? {
    Task: local.Task,
    Priority: local.Priority,
    Owner: local.Owner,
    "Raised By": local["Raised By"],
    Status: local.Status,
    Type: local.Type,
    "Start date": local["Start date"],
    "End date": local["End date"],
    Milestone: local.Milestone,
    parentSheetRow: local.parentSheetRow,
    Notes: local.Notes,
    Remarks: local.Remarks
  } : {};

  return normalizeTicket({
    ...remoteTicket,
    ...preserveFields,
    sheetRow,
    NotesRaw: notesRaw,
    NotesHtml: notesHtml,
    ScreenshotUrls: screenshotUrls,
    pendingSheetSync: preservePendingEdits ? pending : 0
  });
}

function ticketNotesIncludeDriveLinks(ticket) {
  return extractDriveLinksFromNotes(ticket).length > 0;
}

function ticketHasLocalScreenshotsOnly(ticket) {
  if (!ticket) return false;
  if (ticketNotesIncludeDriveLinks(ticket)) return false;
  return getTicketScreenshots(ticket).some(isDataImageUrl);
}

async function autoUploadTicketScreenshots(ticket) {
  if (!ticket?.sheetRow || !ticketHasLocalScreenshotsOnly(ticket)) {
    return { ok: true, skipped: true };
  }

  if (!SHEET_WEB_APP_URL) {
    return { ok: false, error: "Sync is not configured." };
  }

  const attachments = extractNoteAttachments(ticket.NotesHtml || "");
  if (!attachments.length) {
    return { ok: true, skipped: true };
  }

  try {
    const notesBase = buildNotesTextForSheet({
      ...ticket,
      Notes: stripScreenshotMetadata(ticket.Notes),
      Remarks: stripScreenshotMetadata(ticket.Remarks)
    });
    const result = await postToSheetWithResponse({
      action: "uploadAttachments",
      sheetRow: ticket.sheetRow,
      Task: ticket.Task,
      Owner: ticket.Owner,
      Notes: notesBase,
      Remarks: notesBase,
      attachments
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Screenshot upload failed.");
    }

    if (result.notes) {
      applyDriveLinksToLocalTicket(ticket.sheetRow, result.notes);
    }

    const refreshed = findTicketBySheetRow(ticket.sheetRow);
    if (refreshed && ticketNotesIncludeDriveLinks(refreshed)) {
      return { ok: true };
    }

    return { ok: false };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

let screenshotSyncInProgress = false;

async function syncPendingScreenshotsToDrive(tickets = getValidTickets()) {
  if (!SHEET_WEB_APP_URL || screenshotSyncInProgress) return { uploaded: 0, failed: 0 };

  const pending = tickets.filter(ticketHasLocalScreenshotsOnly);
  if (!pending.length) return { uploaded: 0, failed: 0 };

  screenshotSyncInProgress = true;
  setStatus("", `Uploading ${pending.length} screenshot${pending.length === 1 ? "" : "s"} to Google Drive...`);

  let uploaded = 0;
  let failed = 0;

  for (const ticket of pending) {
    const result = await autoUploadTicketScreenshots(ticket);
    if (result.skipped) continue;
    if (result.ok) uploaded += 1;
    else failed += 1;
  }

  screenshotSyncInProgress = false;

  if (uploaded) {
    await refreshAttachmentsFolderLink();
    renderTickets();
    setStatus("online", `Saved ${uploaded} screenshot${uploaded === 1 ? "" : "s"} to Google Drive`);
  } else if (failed) {
    setStatus("error", "Could not upload screenshots to Drive — run setupDriveAccess in Apps Script");
  }

  return { uploaded, failed };
}

async function verifyDriveUploadAfterSave(sheetRow) {
  if (!SHEET_WEB_APP_URL || !sheetRow) return;

  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) return false;

  if (ticketHasLocalScreenshotsOnly(ticket)) {
    const result = await autoUploadTicketScreenshots(ticket);
    if (result.ok && !result.skipped) {
      await refreshAttachmentsFolderLink();
      renderTickets();
      return true;
    }

    await refreshFromSheet({ skipScreenshotSync: true });
    const refreshed = findTicketBySheetRow(sheetRow);
    if (refreshed && ticketNotesIncludeDriveLinks(refreshed)) {
      setStatus("online", "Screenshot saved to Google Drive");
      await refreshAttachmentsFolderLink();
      renderTickets();
      return true;
    }

    setStatus("error", "Screenshot saved locally but not on Drive — check Apps Script Drive setup");
    return false;
  }

  if (ticketNotesIncludeDriveLinks(ticket)) {
    setStatus("online", "Screenshot saved to Google Drive");
    await refreshAttachmentsFolderLink();
  }

  return true;
}

function toScreenshotPreviewUrl(url) {
  const value = String(url || "").trim();
  const fileId = extractDriveFileId(value);
  if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
  return value;
}

function toScreenshotThumbUrl(url) {
  const value = String(url || "").trim();
  const fileId = extractDriveFileId(value);
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w240`;
  return toScreenshotPreviewUrl(value);
}

function getTicketScreenshots(ticket) {
  const urls = collectTicketScreenshotUrls(ticket);
  if (urls.length) return urls;

  const labeledCount = ticketAttachmentLabelCount(ticket);
  if (labeledCount > 0 && ticket.NotesHtml) {
    return collectScreenshotUrlsFromHtml(ticket.NotesHtml);
  }

  return urls;
}

function getTicketRemarksText(ticket) {
  return stripScreenshotMetadata(cleanText(ticket.Remarks || ticket.Notes || ""));
}

function hasImportantRemarks(ticket) {
  return getTicketRemarksText(ticket).toLowerCase().includes("important");
}

function renderTicketRemarksCell(ticket) {
  const screenshots = getTicketScreenshots(ticket);
  const text = getTicketRemarksText(ticket);
  const localOnly = ticketHasLocalScreenshotsOnly(ticket);
  const labeledCount = ticketAttachmentLabelCount(ticket);
  const previewCount = screenshots.length || labeledCount;

  if (!text && !previewCount) {
    return '<span class="muted-text">—</span>';
  }

  const parts = [];
  if (text) {
    parts.push(`<span class="remarks-text">${escapeHtml(text)}</span>`);
  }

  if (localOnly) {
    parts.push('<span class="local-screenshot-badge">Not on Drive yet</span>');
  }

  if (previewCount) {
    const previewLabel = previewCount > 1
      ? `Preview (${previewCount})`
      : "Preview";

    parts.push(`
      <div class="remarks-screenshots">
        <button
          class="screenshot-preview-btn"
          type="button"
          data-sheet-row="${ticket.sheetRow}"
          data-screenshot-index="0"
        >${previewLabel}</button>
      </div>
    `);
  }

  return `<div class="remarks-content">${parts.join("")}</div>`;
}

function renderScreenshotPreviewButton(ticket) {
  const screenshots = getTicketScreenshots(ticket);
  if (!screenshots.length) return "";

  const localOnly = ticketHasLocalScreenshotsOnly(ticket);
  const previewLabel = screenshots.length > 1
    ? `Preview (${screenshots.length})`
    : "Preview";
  const parts = [];

  if (localOnly) {
    parts.push('<span class="local-screenshot-badge">Not on Drive yet</span>');
  }

  parts.push(`
    <button
      class="screenshot-preview-btn"
      type="button"
      data-sheet-row="${ticket.sheetRow || ""}"
      data-screenshot-index="0"
    >${previewLabel}</button>
  `);

  return `<div class="remarks-screenshots dashboard-recent-screenshots">${parts.join("")}</div>`;
}

function updateScreenshotPreviewView() {
  const { urls, index } = screenshotPreviewState;
  if (!urls.length) return;

  const url = urls[index];
  const fileId = extractDriveFileId(url);
  const embedUrl = toScreenshotEmbedUrl(url);
  const localOnly = isDataImageUrl(url);

  if (screenshotPreviewNotice) {
    if (localOnly) {
      screenshotPreviewNotice.hidden = false;
      screenshotPreviewNotice.textContent = "Uploading screenshot to Google Drive...";
    } else {
      screenshotPreviewNotice.hidden = true;
      screenshotPreviewNotice.textContent = "";
    }
  }

  if (screenshotPreviewImage) {
    screenshotPreviewImage.hidden = true;
    screenshotPreviewImage.removeAttribute("src");
  }
  if (screenshotPreviewFrame) {
    screenshotPreviewFrame.hidden = true;
    screenshotPreviewFrame.removeAttribute("src");
  }
  if (screenshotPreviewFallback) {
    screenshotPreviewFallback.hidden = true;
  }

  if (fileId && screenshotPreviewFrame) {
    screenshotPreviewFrame.hidden = false;
    screenshotPreviewFrame.src = embedUrl;
  } else if (isDataImageUrl(url) && screenshotPreviewImage) {
    screenshotPreviewImage.hidden = false;
    screenshotPreviewImage.src = url;
    screenshotPreviewImage.onerror = () => {
      screenshotPreviewImage.hidden = true;
      if (screenshotPreviewFallback) screenshotPreviewFallback.hidden = false;
      if (screenshotPreviewOpenLink) screenshotPreviewOpenLink.href = url;
    };
  } else if (screenshotPreviewImage) {
    screenshotPreviewImage.hidden = false;
    screenshotPreviewImage.src = toScreenshotPreviewUrl(url);
    screenshotPreviewImage.onerror = () => {
      screenshotPreviewImage.hidden = true;
      if (screenshotPreviewFallback) screenshotPreviewFallback.hidden = false;
      if (screenshotPreviewOpenLink) screenshotPreviewOpenLink.href = url;
    };
  } else if (screenshotPreviewFallback) {
    screenshotPreviewFallback.hidden = false;
    if (screenshotPreviewOpenLink) screenshotPreviewOpenLink.href = url;
  }

  if (screenshotPreviewTitle) {
    screenshotPreviewTitle.textContent = screenshotPreviewState.title
      || (urls.length > 1 ? `Screenshot ${index + 1} of ${urls.length}` : "Screenshot Preview");
  }
  if (screenshotPreviewEyebrow) {
    screenshotPreviewEyebrow.textContent = screenshotPreviewState.eyebrow || "Attachment";
  }
  if (screenshotPreviewCounter) {
    screenshotPreviewCounter.textContent = `${index + 1} / ${urls.length}`;
    screenshotPreviewCounter.hidden = urls.length <= 1;
  }
  if (screenshotPreviewExternal) {
    if (fileId) {
      screenshotPreviewExternal.href = `https://drive.google.com/file/d/${fileId}/view`;
      screenshotPreviewExternal.textContent = "Open in Drive";
      screenshotPreviewExternal.hidden = false;
    } else {
      screenshotPreviewExternal.hidden = true;
    }
  }
  if (screenshotPreviewDownload) {
    const downloadUrl = toDriveDownloadUrl(url);
    if (downloadUrl) {
      screenshotPreviewDownload.href = downloadUrl;
      screenshotPreviewDownload.hidden = false;
    } else if (isDataImageUrl(url)) {
      screenshotPreviewDownload.href = url;
      screenshotPreviewDownload.setAttribute("download", "screenshot.png");
      screenshotPreviewDownload.hidden = false;
    } else {
      screenshotPreviewDownload.hidden = true;
      screenshotPreviewDownload.removeAttribute("download");
    }
  }
  if (screenshotPreviewPrev) {
    screenshotPreviewPrev.disabled = index <= 0;
    screenshotPreviewPrev.hidden = urls.length <= 1;
  }
  if (screenshotPreviewNext) {
    screenshotPreviewNext.disabled = index >= urls.length - 1;
    screenshotPreviewNext.hidden = urls.length <= 1;
  }
}

function openScreenshotPreview(urls, startIndex = 0, options = {}) {
  if (!screenshotPreviewModal || !urls.length) return;

  screenshotPreviewState = {
    urls,
    index: Math.max(0, Math.min(startIndex, urls.length - 1)),
    title: String(options.title || "").trim(),
    eyebrow: String(options.eyebrow || "Attachment").trim()
  };

  updateScreenshotPreviewView();
  screenshotPreviewModal.hidden = false;
  document.body.classList.add("modal-open");
}

function openScreenshotPreviewForTicket(sheetRow, startIndex = 0) {
  let ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) return;

  let urls = getTicketScreenshots(ticket);
  if (!urls.length && ticket.NotesRaw) {
    urls = extractDriveLinksFromNotes({ Notes: ticket.NotesRaw, Remarks: ticket.NotesRaw });
  }
  if (!urls.length) return;

  openScreenshotPreview(urls, startIndex);
}

function closeScreenshotPreview() {
  if (!screenshotPreviewModal) return;
  screenshotPreviewModal.hidden = true;
  document.body.classList.remove("modal-open");
  screenshotPreviewState = { urls: [], index: 0, title: "", eyebrow: "Attachment" };
  if (screenshotPreviewImage) {
    screenshotPreviewImage.src = "";
    screenshotPreviewImage.hidden = false;
  }
  if (screenshotPreviewFrame) {
    screenshotPreviewFrame.removeAttribute("src");
    screenshotPreviewFrame.hidden = true;
  }
  if (screenshotPreviewFallback) screenshotPreviewFallback.hidden = true;
  if (screenshotPreviewNotice) {
    screenshotPreviewNotice.hidden = true;
    screenshotPreviewNotice.textContent = "";
  }
}

function bindScreenshotPreviewButtons(root = document) {
  root.querySelectorAll(".screenshot-preview-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openScreenshotPreviewForTicket(
        button.dataset.sheetRow,
        Number(button.dataset.screenshotIndex || 0)
      );
    });
  });
}

function extractNoteAttachments(html) {
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.querySelectorAll("img")]
    .map((image, index) => ({
      name: `screenshot-${index + 1}.jpg`,
      dataUrl: image.getAttribute("src") || ""
    }))
    .filter((attachment) => /^data:image\//i.test(attachment.dataUrl));
}

function buildScreenshotUploadPayload(ticket) {
  const attachments = extractNoteAttachments(ticket.NotesHtml || "");
  const notesText = buildNotesTextForSheet(ticket);

  return {
    action: "uploadAttachments",
    sheetRow: ticket.sheetRow,
    Task: ticket.Task,
    Owner: ticket.Owner,
    Notes: notesText,
    Remarks: notesText,
    attachments
  };
}

function buildTicketSheetPayload(ticket, options = {}) {
  const attachments = extractNoteAttachments(ticket.NotesHtml || "");
  const notesText = buildNotesTextForSheet(ticket);
  // On create, skip Drive uploads in the critical-path POST; screenshots
  // upload in the background after the ticket row exists.
  const includeAttachments = options.deferAttachments !== true;

  const payload = {
    Task: ticket.Task,
    Priority: ticket.Priority,
    Owner: cleanText(ticket.Owner),
    "Raised By": ticket["Raised By"],
    Status: ticket.Status,
    Type: ticket.Type,
    "Start date": ticket["Start date"],
    "End date": ticket["End date"],
    Milestone: ticket.Milestone,
    parentSheetRow: Number(ticket.parentSheetRow) || 0,
    Notes: notesText,
    Remarks: notesText,
    "Bhanu List": ticket["Bhanu List"]
  };

  if (ticket.sheetRow) {
    payload.sheetRow = ticket.sheetRow;
    payload.action = "updateTicket";
  }

  if (includeAttachments && attachments.length) {
    payload.attachments = attachments;
  }

  const user = Auth.currentUser();
  if (user) {
    payload.actorName = cleanText(user.name) || cleanText(user.username);
    payload.actorEmail = cleanText(user.email);
  }

  return payload;
}

function readTicketNotesEditor(editor) {
  if (!editor) {
    return { text: "", html: "", imageCount: 0, sheetText: "" };
  }

  const panel = getNotesAttachmentPanel(editor);
  const text = editor.innerText.replace(/\u00a0/g, " ").trim();
  const attachments = collectAttachmentsFromPanel(panel);
  const html = buildNotesHtmlFromParts(text, attachments);

  return {
    text,
    html,
    imageCount: attachments.length,
    sheetText: notesSheetText(text)
  };
}

function syncTicketNotesHiddenInput(editor, hiddenInput) {
  if (!hiddenInput || !editor) return;
  hiddenInput.value = readTicketNotesEditor(editor).text;
}

function setTicketNotesEditorContent(editor, hiddenInput, ticket = {}) {
  if (!editor) return;

  const panel = getNotesAttachmentPanel(editor);
  let text = "";
  let attachments = [];

  if (ticket.NotesHtml) {
    const parts = parseNotesHtmlParts(ticket.NotesHtml);
    text = parts.text || stripScreenshotMetadata(getTicketRemarksText(ticket));
    attachments = parts.attachments;
  } else {
    text = stripScreenshotMetadata(getTicketRemarksText(ticket));
  }

  attachments = dedupeNoteAttachments([
    ...attachments,
    ...attachmentsFromTicketNotes(ticket)
  ]);

  editor.innerHTML = "";
  editor.textContent = text;
  renderNotesAttachmentsPanel(panel, attachments, editor, hiddenInput);
  migrateInlineEditorImagesToPanel(editor, hiddenInput);
  syncTicketNotesHiddenInput(editor, hiddenInput);
}

function clearTicketNotesEditor(editor, hiddenInput) {
  if (editor) editor.textContent = "";
  const panel = getNotesAttachmentPanel(editor);
  if (panel) {
    panel.replaceChildren();
    panel.hidden = true;
    panel.classList.remove("has-attachments");
  }
  if (hiddenInput) hiddenInput.value = "";
}

function insertImageIntoNotesEditor(editor, hiddenInput, dataUrl) {
  addAttachmentToNotesEditor(editor, hiddenInput, { src: dataUrl, driveUrl: "" });
}

function compressImageFile(file, maxWidth = 960, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("Could not load pasted image."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Could not read pasted image."));
    reader.readAsDataURL(file);
  });
}

async function handleTicketNotesPaste(event, editor, hiddenInput) {
  const items = event.clipboardData?.items;
  if (!items || !editor) return;

  const imageItem = [...items].find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  event.preventDefault();

  const file = imageItem.getAsFile();
  if (!file) return;

  try {
    const dataUrl = await compressImageFile(file);
    insertImageIntoNotesEditor(editor, hiddenInput, dataUrl);
    syncTicketNotesHiddenInput(editor, hiddenInput);
  } catch (error) {
    console.error(error);
    alert("Could not paste that screenshot. Try a smaller image.");
  }
}

async function handleTicketNotesDrop(event, editor, hiddenInput) {
  const file = [...(event.dataTransfer?.files || [])].find((entry) => entry.type.startsWith("image/"));
  if (!file || !editor) return;

  event.preventDefault();
  editor.focus();

  try {
    const dataUrl = await compressImageFile(file);
    insertImageIntoNotesEditor(editor, hiddenInput, dataUrl);
    syncTicketNotesHiddenInput(editor, hiddenInput);
  } catch (error) {
    console.error(error);
    alert("Could not add that image. Try a smaller screenshot.");
  }
}

function initTicketNotesEditor(editor, hiddenInput) {
  if (!editor || editor.dataset.notesReady === "true") return;
  editor.dataset.notesReady = "true";

  editor.addEventListener("paste", (event) => {
    handleTicketNotesPaste(event, editor, hiddenInput);
  });

  editor.addEventListener("drop", (event) => {
    handleTicketNotesDrop(event, editor, hiddenInput);
  });

  editor.addEventListener("dragover", (event) => {
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
    }
  });

  editor.addEventListener("input", () => {
    syncTicketNotesHiddenInput(editor, hiddenInput);
  });
}

function applyTicketNotesToPayload(payload, editor) {
  const notes = readTicketNotesEditor(editor);
  const attachmentLabel = notes.imageCount
    ? `[${notes.imageCount} screenshot${notes.imageCount === 1 ? "" : "s"} attached]`
    : "";
  return {
    ...payload,
    Notes: notes.sheetText,
    NotesHtml: notes.html,
    Remarks: notes.text || attachmentLabel
  };
}

function updateRaisedBySuggestions(tickets) {
  if (!raisedBySuggestions) return;
  const names = [...new Set(tickets.map((ticket) => cleanText(ticket["Raised By"])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  raisedBySuggestions.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function extractRemarks(ticket) {
  const candidates = [
    ticket.Notes,
    ticket.Remarks,
    ticket.note,
    ticket.comments
  ].map((value) => cleanText(value)).filter(Boolean);

  const withScreenshotLinks = candidates.find((value) =>
    /Screenshot\s+\d+\s*:/i.test(value) || /drive\.google\.com/i.test(value)
  );
  if (withScreenshotLinks) {
    const text = stripScreenshotMetadata(withScreenshotLinks);
    if (text) return text;
    const linkCount = extractDriveLinksFromNotes({ Notes: withScreenshotLinks, Remarks: withScreenshotLinks }).length;
    if (linkCount) {
      return `[${linkCount} screenshot${linkCount === 1 ? "" : "s"} attached]`;
    }
  }

  const direct = candidates.find((value) => value.toLowerCase() !== "notes");
  if (direct) return direct;

  const bhanu = cleanText(ticket["Bhanu List"]);
  if (bhanu && !/^bhanu$/i.test(bhanu)) return bhanu;

  const imageCount = collectScreenshotUrlsFromHtml(ticket.NotesHtml).length;
  if (imageCount) {
    const text = stripScreenshotMetadata(cleanText(ticket.Notes));
    if (text) return text;
    return `[${imageCount} screenshot${imageCount === 1 ? "" : "s"} attached]`;
  }
  return "";
}

function isPlaceholderDate(value) {
  const text = cleanText(value).toLowerCase();
  return !text || text === "m/d/yyyy" || text === "mm/dd/yyyy" || text === "notes" || text === "task";
}

function sanitizeDateField(value) {
  return isPlaceholderDate(value) ? "" : String(value || "").trim();
}

function normalizeTicket(ticket) {
  const notesRaw = String(
    ticket.NotesRaw
    || [ticket.Notes, ticket.Remarks].find((value) =>
      /Screenshot\s+\d+\s*:/i.test(String(value || "")) || /drive\.google\.com/i.test(String(value || ""))
    )
    || ""
  ).trim();
  const screenshotUrls = collectTicketScreenshotUrls({ ...ticket, NotesRaw: notesRaw });
  const notesHtml = ensureTicketNotesHtml(ticket, screenshotUrls);
  const remarks = extractRemarks({ ...ticket, NotesHtml: notesHtml });

  return {
    Task: cleanText(ticket.Task),
    Priority: normalizePriority(ticket.Priority),
    Owner: cleanText(ticket.Owner),
    "Raised By": cleanText(ticket["Raised By"]),
    Status: cleanText(ticket.Status),
    Type: cleanText(ticket.Type),
    "Start date": sanitizeDateField(ticket["Start date"]),
    "End date": sanitizeDateField(ticket["End date"]),
    Milestone: sanitizeDateField(ticket.Milestone),
    parentSheetRow: Number(ticket.parentSheetRow || ticket["Parent Sheet Row"]) || 0,
    Notes: remarks,
    Remarks: remarks,
    NotesHtml: notesHtml,
    NotesRaw: notesRaw,
    ScreenshotUrls: screenshotUrls,
    "Bhanu List": cleanText(ticket["Bhanu List"]),
    sheetRow: Number(ticket.sheetRow) || 0,
    pendingSheetSync: Number(ticket.pendingSheetSync) || 0,
    createdOn: ticket.createdOn || "",
    lastUpdated: ticket.lastUpdated || "",
    closedOn: ticket.closedOn || ""
  };
}

function parseTicketDate(value) {
  const text = cleanText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const parts = text.split("/").map(Number);
    if (parts[0] > 12) {
      const [day, month, year] = parts;
      return new Date(year, month - 1, day);
    }
    const [month, day, year] = parts;
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function endOfTodayTimestamp() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

function dateHasTime(value, date) {
  return /T\d{2}:\d{2}/.test(String(value || ""))
    || date.getHours() !== 0
    || date.getMinutes() !== 0
    || date.getSeconds() !== 0;
}

function startOfTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const PERFORMANCE_PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "all", label: "All Time" }
];

let selectedPerformancePeriod = "today";

function getPerformancePeriodLabel(periodId = selectedPerformancePeriod) {
  return PERFORMANCE_PERIOD_OPTIONS.find((entry) => entry.id === periodId)?.label || "All Time";
}

function getPerformancePeriodRange(periodId = selectedPerformancePeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (periodId === "all") {
    return { start: null, end: null };
  }

  if (periodId === "today") {
    return { start, end };
  }

  if (periodId === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (periodId === "week") {
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (periodId === "month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (periodId === "last-month") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setMonth(end.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return { start: null, end: null };
}

function dateInPerformancePeriod(date, periodId = selectedPerformancePeriod) {
  if (!date) return false;
  const { start, end } = getPerformancePeriodRange(periodId);
  if (!start && !end) return true;
  const time = date.getTime();
  if (start && time < start.getTime()) return false;
  if (end && time > end.getTime()) return false;
  return true;
}

function ticketPeriodDates(ticket) {
  return [
    parseTicketDate(ticket["End date"]),
    parseTicketDate(ticket.Milestone),
    parseTicketDate(ticket["Start date"]),
    parseTicketDate(ticket.closedOn),
    parseTicketDate(ticket.createdOn)
  ].filter(Boolean);
}

function ticketRelevantInPeriod(ticket, periodId = selectedPerformancePeriod) {
  if (periodId === "all") return true;
  return ticketPeriodDates(ticket).some((date) => dateInPerformancePeriod(date, periodId));
}

function getTicketPeriodMatchLabel(ticket, periodId = selectedPerformancePeriod) {
  if (periodId === "all") return "";
  const checks = [
    { label: "End", date: parseTicketDate(ticket["End date"]) },
    { label: "Milestone", date: parseTicketDate(ticket.Milestone) || parseTicketDate(ticket["Start date"]) },
    { label: "Start", date: parseTicketDate(ticket["Start date"]) },
    { label: "Created", date: parseTicketDate(ticket.createdOn) }
  ];
  const match = checks.find((entry) => dateInPerformancePeriod(entry.date, periodId));
  return match?.label || "";
}

function filterTicketsByPerformancePeriod(tickets, periodId = selectedPerformancePeriod) {
  return tickets.filter((ticket) => ticketRelevantInPeriod(ticket, periodId));
}

function getPerformancePeriodStatusSortOrder(status) {
  const cls = statusClass(status);
  if (cls === "status-progress") return 0;
  if (cls === "status-blocked") return 1;
  if (cls === "status-approval") return 2;
  if (cls === "status-completed") return 3;
  if (cls === "status-pending") return 4;
  return 5;
}

function sortTicketsForPeriodDisplay(tickets) {
  return [...tickets].sort((a, b) => {
    const statusDiff = getPerformancePeriodStatusSortOrder(a.Status) - getPerformancePeriodStatusSortOrder(b.Status);
    if (statusDiff !== 0) return statusDiff;

    const priorityA = normalizePriority(a.Priority) === "80" ? 0 : 1;
    const priorityB = normalizePriority(b.Priority) === "80" ? 0 : 1;
    if (priorityA !== priorityB) return priorityA - priorityB;

    const dateA = parseTicketDate(getEffectiveMilestone(a))?.getTime() || 0;
    const dateB = parseTicketDate(getEffectiveMilestone(b))?.getTime() || 0;
    return dateA - dateB || String(a.Task || "").localeCompare(String(b.Task || ""));
  });
}

function setSelectedPerformancePeriod(periodId) {
  selectedPerformancePeriod = PERFORMANCE_PERIOD_OPTIONS.some((entry) => entry.id === periodId)
    ? periodId
    : "today";
  performancePeriodFilters?.querySelectorAll("[data-period]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.period === selectedPerformancePeriod);
  });
}

function isSameCalendarDay(value) {
  const date = value instanceof Date ? value : parseTicketDate(value);
  if (!date) return false;
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.getTime() === startOfTodayDate().getTime();
}

function ticketActivitySources(ticket) {
  return [
    { label: "Created", value: ticket.createdOn },
    { label: "Milestone", value: ticket.Milestone },
    { label: "End", value: ticket["End date"] }
  ]
    .map((entry) => ({ ...entry, date: parseTicketDate(entry.value) }))
    .filter((entry) => entry.date);
}

function ticketActivityTodayEntries(ticket) {
  return ticketActivitySources(ticket).filter((entry) => isSameCalendarDay(entry.date));
}

function ticketHasActivityToday(ticket) {
  return ticketActivityTodayEntries(ticket).length > 0;
}

function ticketTodayActivityTimestamp(ticket) {
  const entries = ticketActivityTodayEntries(ticket);
  if (!entries.length) return 0;

  const labelPriority = {
    Milestone: 50,
    Created: 40,
    End: 30
  };

  const best = entries.sort((a, b) =>
    (labelPriority[b.label] || 0) - (labelPriority[a.label] || 0)
  )[0];

  return (labelPriority[best.label] || 0) * 1000 + (ticket.sheetRow || 0);
}

function formatTodayActivityLabel(ticket) {
  const entries = ticketActivityTodayEntries(ticket);
  if (!entries.length) return "";

  const labelPriority = {
    Milestone: 50,
    Created: 40,
    End: 30
  };

  const best = entries.sort((a, b) =>
    (labelPriority[b.label] || 0) - (labelPriority[a.label] || 0)
  )[0];

  if (best.label === "Milestone") return "Milestone today";
  if (best.label === "Created") return "Created today";
  if (best.label === "End") return "End date today";
  return `${best.label} today`;
}

function getTodayActivityStatusSortOrder(status) {
  const cls = statusClass(status);
  if (cls === "status-completed") return 1;
  return 0;
}

function getTodayActivityTickets(tickets) {
  return tickets
    .filter(ticketHasActivityToday)
    .sort((a, b) => {
      const statusDiff = getTodayActivityStatusSortOrder(a.Status) - getTodayActivityStatusSortOrder(b.Status);
      if (statusDiff !== 0) return statusDiff;
      return ticketTodayActivityTimestamp(b) - ticketTodayActivityTimestamp(a);
    });
}

function ticketLatestActivity(ticket) {
  const auditCandidates = [
    { label: "Updated", value: ticket.lastUpdated },
    { label: "Closed", value: ticket.closedOn },
    { label: "Created", value: ticket.createdOn }
  ]
    .map((entry) => ({ ...entry, date: parseTicketDate(entry.value) }))
    .filter((entry) => entry.date);

  if (auditCandidates.length) {
    const best = auditCandidates.reduce((latest, entry) =>
      (entry.date.getTime() > latest.date.getTime() ? entry : latest)
    );

    return {
      timestamp: best.date.getTime() + (ticket.sheetRow || 0) * 0.001,
      label: best.label,
      raw: best.value,
      date: best.date,
      hasTime: dateHasTime(best.value, best.date)
    };
  }

  const now = endOfTodayTimestamp();
  const dateCandidates = [
    { label: "End", value: ticket["End date"] },
    { label: "Start", value: ticket["Start date"] },
    { label: "Milestone", value: ticket.Milestone }
  ]
    .map((entry) => ({ ...entry, date: parseTicketDate(entry.value) }))
    .filter((entry) => entry.date);

  if (dateCandidates.length) {
    const pastOrToday = dateCandidates.filter((entry) => entry.date.getTime() <= now);
    const pool = pastOrToday.length ? pastOrToday : dateCandidates;
    const best = pool.reduce((latest, entry) =>
      (entry.date.getTime() > latest.date.getTime() ? entry : latest)
    );

    return {
      timestamp: best.date.getTime() + (ticket.sheetRow || 0) * 0.001,
      label: best.label,
      raw: best.value,
      date: best.date,
      hasTime: dateHasTime(best.value, best.date)
    };
  }

  return {
    timestamp: (ticket.sheetRow || 0) * 1000,
    label: "Added",
    raw: "",
    date: null,
    hasTime: false
  };
}

function ticketLatestActivityTimestamp(ticket) {
  return ticketLatestActivity(ticket).timestamp;
}

function formatActivityTime(ticket) {
  const activity = ticketLatestActivity(ticket);
  if (!activity.date) {
    return activity.timestamp > 0 ? `Row ${ticket.sheetRow}` : "";
  }

  if (activity.hasTime) {
    return activity.date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const activityDay = new Date(
    activity.date.getFullYear(),
    activity.date.getMonth(),
    activity.date.getDate()
  ).getTime();
  const diffDays = Math.floor((todayStart - activityDay) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatDate(activity.raw);
}

function ticketRecentTimestamp(ticket) {
  const start = parseTicketDate(ticket["Start date"]);
  if (start) return start.getTime();
  return ticket.sheetRow || 0;
}

function ticketActivityTimestamp(ticket) {
  const start = parseTicketDate(ticket["Start date"]);
  const end = parseTicketDate(ticket["End date"]);
  const milestone = parseTicketDate(ticket.Milestone);

  if (start) return start.getTime();
  if (end) return end.getTime();
  if (milestone) return milestone.getTime();
  return ticket.sheetRow || 0;
}

function ticketActivityDate(ticket) {
  if (parseTicketDate(ticket["Start date"])) return ticket["Start date"];
  if (parseTicketDate(ticket["End date"])) return ticket["End date"];
  if (parseTicketDate(ticket.Milestone)) return ticket.Milestone;
  return "";
}

function ticketRecentDate(ticket) {
  return ticket["Start date"] || "";
}

function ticketMilestoneTimestamp(ticket) {
  const milestone = parseTicketDate(getEffectiveMilestone(ticket));
  return milestone ? milestone.getTime() : 0;
}

function isOpenTicket(ticket) {
  return !isTicketCompleted(ticket);
}

function getStatusSortOrder(status) {
  const cls = statusClass(status);
  if (cls === "status-completed") return 0;
  if (cls === "status-approval") return 1;
  if (cls === "status-progress") return 2;
  if (cls === "status-pending") return 3;
  if (cls === "status-blocked") return 4;
  return 5;
}

function isExactSapType(type) {
  return String(type || "").trim().toLowerCase() === "sap";
}

function isExactInfraType(type) {
  return String(type || "").trim().toLowerCase() === "infra";
}

function isSapTypeTicket(ticket) {
  return isExactSapType(ticket?.Type);
}

function isInfraTypeTicket(ticket) {
  return isExactInfraType(ticket?.Type);
}

function isProjectTypeTicket(ticket) {
  return isExactSapType(ticket?.Type) || isExactInfraType(ticket?.Type);
}

function getProjectTickets(tickets = getValidTickets()) {
  const byRow = new Map();
  tickets.forEach((ticket) => {
    const row = Number(ticket.sheetRow);
    if (row) byRow.set(row, ticket);
  });

  return tickets.filter((ticket) => {
    if (isProjectTypeTicket(ticket)) return true;
    if (!isSubtaskTicket(ticket)) return false;
    const parent = byRow.get(Number(ticket.parentSheetRow));
    return Boolean(parent && isProjectTypeTicket(parent));
  });
}

function sortByStatusThenTask(a, b) {
  const statusDiff = getStatusSortOrder(a.Status) - getStatusSortOrder(b.Status);
  if (statusDiff !== 0) return statusDiff;
  return String(a.Task || "").localeCompare(String(b.Task || ""));
}

function sortTickets(tickets, sortKey = "recent", { includeCompleted = false } = {}) {
  const sorted = tickets.slice();

  switch (sortKey) {
    case "activity":
      return sorted.sort((a, b) => ticketLatestActivityTimestamp(b) - ticketLatestActivityTimestamp(a));
    case "oldest":
      return sorted.sort((a, b) => ticketActivityTimestamp(a) - ticketActivityTimestamp(b));
    case "priority-desc":
      return sorted.sort((a, b) => Number(b.Priority) - Number(a.Priority) || ticketRecentTimestamp(b) - ticketRecentTimestamp(a));
    case "priority-asc":
      return sorted.sort((a, b) => Number(a.Priority) - Number(b.Priority) || ticketRecentTimestamp(b) - ticketRecentTimestamp(a));
    case "task":
      return sorted.sort((a, b) => a.Task.localeCompare(b.Task));
    case "sheet":
      return sorted.sort((a, b) => (b.sheetRow || 0) - (a.sheetRow || 0));
    case "milestone-open-desc":
      return sorted
        .filter((ticket) => includeCompleted || isOpenTicket(ticket))
        .sort((a, b) => {
          const aToday = isMilestoneToday(a) ? 1 : 0;
          const bToday = isMilestoneToday(b) ? 1 : 0;
          if (bToday !== aToday) return bToday - aToday;
          return ticketMilestoneTimestamp(b) - ticketMilestoneTimestamp(a);
        });
    case "important-remarks-first":
      return sorted
        .filter((ticket) => includeCompleted || isOpenTicket(ticket))
        .sort((a, b) => {
          const aImportant = hasImportantRemarks(a) ? 1 : 0;
          const bImportant = hasImportantRemarks(b) ? 1 : 0;
          if (bImportant !== aImportant) return bImportant - aImportant;
          const aToday = isMilestoneToday(a) ? 1 : 0;
          const bToday = isMilestoneToday(b) ? 1 : 0;
          if (bToday !== aToday) return bToday - aToday;
          return ticketMilestoneTimestamp(b) - ticketMilestoneTimestamp(a);
        });
    case "sap-status":
      return sorted.filter(isSapTypeTicket).sort(sortByStatusThenTask);
    case "infra-status":
      return sorted.filter(isInfraTypeTicket).sort(sortByStatusThenTask);
    case "recent":
    default:
      return sorted.sort((a, b) => ticketRecentTimestamp(b) - ticketRecentTimestamp(a));
  }
}

function readHierarchyRows() {
  const saved = localStorage.getItem(HIERARCHY_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((entry) => ({
          user: cleanText(entry.user),
          manager: cleanText(entry.manager),
          email: cleanText(entry.email)
        })).filter((entry) => entry.user);
      }
    } catch {
      // fall through to default hierarchy
    }
  }
  return FALLBACK_HIERARCHY.map((entry) => ({ ...entry }));
}

function writeHierarchyRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  localStorage.setItem(HIERARCHY_KEY, JSON.stringify(rows));
}

function normalizeHierarchyRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((entry) => ({
      user: cleanText(entry.user),
      manager: cleanText(entry.manager),
      email: cleanText(entry.email)
    }))
    .filter((entry) => entry.user);
}

function matchesHierarchyIdentity(sessionValue, hierarchyValue) {
  const a = cleanText(sessionValue).toLowerCase();
  const b = cleanText(hierarchyValue).toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const aFirst = a.split(/\s+/)[0];
  const bFirst = b.split(/\s+/)[0];
  return aFirst === b || bFirst === a || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

function resolveHierarchyUser(user = Auth.currentUser()) {
  if (!user) return null;

  const hierarchy = readHierarchyRows();
  const email = cleanText(user.email).toLowerCase();

  return hierarchy.find((entry) => {
    const entryEmail = entry.email.toLowerCase();
    return matchesHierarchyIdentity(user.name, entry.user)
      || matchesHierarchyIdentity(user.username, entry.user)
      || (email && entryEmail && email === entryEmail);
  }) || null;
}

function getManagerForOwner(ownerName, hierarchy = readHierarchyRows()) {
  const ownerEntry = hierarchy.find((entry) => matchesHierarchyIdentity(ownerName, entry.user));
  if (!ownerEntry?.manager) return null;
  return hierarchy.find((entry) => matchesHierarchyIdentity(ownerEntry.manager, entry.user))
    || { user: ownerEntry.manager, email: "" };
}

function isPendingApprovalStatus(status) {
  return String(status || "").trim().toLowerCase() === "pending approval";
}

function canCurrentUserApproveTicket(ticket) {
  if (!isPendingApprovalStatus(ticket?.Status)) return false;
  const user = Auth.currentUser();
  if (!user) return false;
  const manager = getManagerForOwner(ticket.Owner);
  if (!manager) return true;
  const email = cleanText(user.email).toLowerCase();
  return matchesHierarchyIdentity(user.name, manager.user)
    || matchesHierarchyIdentity(user.username, manager.user)
    || (email && manager.email && email === manager.email.toLowerCase());
}

function shouldRequireCompletionApproval(ticket, user = Auth.currentUser()) {
  const owner = cleanText(ticket?.Owner);
  if (!owner || !isTicketCompleted(ticket)) return false;
  const hierarchy = readHierarchyRows();
  const ownerEntry = hierarchy.find((entry) => matchesHierarchyIdentity(owner, entry.user));
  if (!ownerEntry?.manager) return false;
  const manager = getManagerForOwner(owner, hierarchy);
  if (!manager?.user) return false;
  const actorName = cleanText(user?.name) || cleanText(user?.username);
  const actorEmail = cleanText(user?.email).toLowerCase();
  if (matchesHierarchyIdentity(actorName, manager.user)) return false;
  if (actorEmail && manager.email && actorEmail === manager.email.toLowerCase()) return false;
  return true;
}

function applyCompletionApprovalPreview(ticket) {
  if (!shouldRequireCompletionApproval(ticket)) return ticket;
  return { ...ticket, Status: "Pending Approval" };
}

function reconcileSyncedTicketStatus(ticket, result = {}, expected = {}) {
  const serverStatus = String(result.status || "").trim();
  if (serverStatus) return serverStatus;
  if (shouldRequireCompletionApproval({ ...ticket, ...expected, Status: "Completed" })) {
    return "Pending Approval";
  }
  return String(ticket.Status || expected.Status || "").trim();
}

function populateTicketEditStatusSelect(ticket) {
  const statusSelect = ticketEditForm?.elements?.Status;
  if (!statusSelect) return;

  const currentStatus = String(ticket?.Status || "Not started").trim();
  const options = ["Not started", "In progress", "Completed", "Blocked"];
  if (isPendingApprovalStatus(currentStatus) && !options.includes(currentStatus)) {
    options.splice(2, 0, "Pending Approval");
  }

  statusSelect.innerHTML = options
    .map((status) => `<option>${escapeHtml(status)}</option>`)
    .join("");
  statusSelect.value = options.includes(currentStatus) ? currentStatus : "Not started";
}

function populateTicketEditApprovalNote(ticket) {
  if (!ticketEditApprovalNote) return;
  if (!isPendingApprovalStatus(ticket.Status)) {
    ticketEditApprovalNote.hidden = true;
    ticketEditApprovalNote.textContent = "";
    return;
  }

  const manager = getManagerForOwner(ticket.Owner);
  const managerName = manager?.user || "the manager";
  if (canCurrentUserApproveTicket(ticket)) {
    ticketEditApprovalNote.textContent = `Awaiting your approval. Set status to Completed to approve closure for ${ticket.Owner}.`;
  } else {
    ticketEditApprovalNote.textContent = `Awaiting manager approval from ${managerName}.`;
  }
  ticketEditApprovalNote.hidden = false;
}

function getDirectReports(managerName, hierarchy = readHierarchyRows()) {
  const manager = cleanText(managerName);
  return hierarchy
    .filter((entry) => cleanText(entry.manager) === manager)
    .map((entry) => entry.user);
}

function getTeamMembers(rootName, hierarchy = readHierarchyRows()) {
  const root = cleanText(rootName);
  if (!root) return [];

  const team = new Set([root]);
  const queue = [root];

  while (queue.length) {
    const manager = queue.shift();
    getDirectReports(manager, hierarchy).forEach((report) => {
      if (!team.has(report)) {
        team.add(report);
        queue.push(report);
      }
    });
  }

  return [...team];
}

function getAllHierarchyUsers(hierarchy = readHierarchyRows()) {
  return hierarchy.map((entry) => entry.user).filter(isSelectableTicketOwner);
}

function hasFullHierarchyAccess() {
  return Auth.isAdminLevelUser();
}

function collectTicketOwnerNames(tickets = readTickets().map(normalizeTicket)) {
  const owners = new Set();
  tickets.forEach((ticket) => {
    const owner = cleanText(ticket.Owner);
    if (!owner || owner.toLowerCase() === "owner" || /^\*.*\*$/.test(owner)) return;
    owners.add(owner);
  });
  return owners;
}

function getVisibleOwnerNames() {
  if (hasFullHierarchyAccess()) {
    const owners = new Set([
      ...getAllHierarchyUsers(),
      ...DEFAULT_TICKET_OWNERS.filter(isSelectableTicketOwner),
      ...collectTicketOwnerNames()
    ]);
    return [...owners].sort((a, b) => String(a).localeCompare(String(b)));
  }

  const hierarchyUser = resolveHierarchyUser();
  if (!hierarchyUser) {
    const sessionName = cleanText(Auth.currentUser()?.name);
    return sessionName && isSelectableTicketOwner(sessionName) ? [sessionName] : [];
  }

  return getTeamMembers(hierarchyUser.user)
    .filter(isSelectableTicketOwner)
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function isOwnerVisibleToCurrentUser(owner) {
  const name = cleanText(owner);
  if (!name || name.toLowerCase() === "owner" || /^\*.*\*$/.test(name)) return false;
  if (hasFullHierarchyAccess()) return true;
  if (!isSelectableTicketOwner(name)) return false;

  const allowed = new Set(getVisibleOwnerNames().map((entry) => entry.toLowerCase()));
  return allowed.has(name.toLowerCase());
}

function applyTicketVisibilityFilter(tickets) {
  if (hasFullHierarchyAccess()) return tickets;
  return tickets.filter((ticket) => isOwnerVisibleToCurrentUser(ticket.Owner));
}

function getValidTickets() {
  return applyTicketVisibilityFilter(
    readTickets()
      .map(normalizeTicket)
      .filter((ticket) => ticket.Task)
  );
}

function getMultiFilterValues(panel) {
  return [...panel.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function updateMultiFilterLabel(trigger, panel, defaultLabel, labelFormatter = null) {
  const selected = getMultiFilterValues(panel);
  if (!selected.length) {
    trigger.textContent = defaultLabel;
    return;
  }
  trigger.textContent = selected.length === 1
    ? (labelFormatter ? labelFormatter(selected[0]) : selected[0])
    : `${selected.length} selected`;
}

function getNewTicketOwners() {
  return ticketFormOwnerPanel ? getMultiFilterValues(ticketFormOwnerPanel).filter(Boolean) : [];
}

function isSelectableTicketOwner(owner) {
  const name = String(owner || "").trim();
  return name && !EXCLUDED_TICKET_OWNERS.has(name);
}

function updateTicketFormOwnerLabel() {
  if (!ticketFormOwnerTrigger || !ticketFormOwnerPanel) return;
  updateMultiFilterLabel(ticketFormOwnerTrigger, ticketFormOwnerPanel, "Select owners");
  if (ticketFormSubmitLabel && !ticketFormSubmitButton?.disabled) {
    const count = getNewTicketOwners().length;
    ticketFormSubmitLabel.textContent = count > 1 ? `Submit ${count} Tickets` : "Submit Ticket";
  }
}

let ticketSubmitProgressValue = 0;
let ticketSubmitProgressCreepTimer = null;

function stopTicketSubmitProgressCreep() {
  if (ticketSubmitProgressCreepTimer) {
    window.clearInterval(ticketSubmitProgressCreepTimer);
    ticketSubmitProgressCreepTimer = null;
  }
}

// Keeps the bar creeping toward `cap` while we wait on the network, so a slow
// Apps Script response doesn't look like a hang.
function startTicketSubmitProgressCreep(cap = 95, label = "") {
  stopTicketSubmitProgressCreep();
  ticketSubmitProgressCreepTimer = window.setInterval(() => {
    if (ticketSubmitProgressValue >= cap) {
      stopTicketSubmitProgressCreep();
      return;
    }
    setTicketSubmitProgress(ticketSubmitProgressValue + 1, label || undefined);
  }, 650);
}

function hideTicketSubmitProgress() {
  if (!ticketSubmitProgress) return;
  stopTicketSubmitProgressCreep();
  ticketSubmitProgressValue = 0;
  ticketSubmitProgress.hidden = true;
  ticketSubmitProgress.setAttribute("hidden", "");
  if (ticketSubmitProgressFill) ticketSubmitProgressFill.style.width = "0%";
  if (ticketSubmitProgressPercent) ticketSubmitProgressPercent.textContent = "0%";
  if (ticketSubmitProgressLabel) ticketSubmitProgressLabel.textContent = "Submitting...";
}

function showTicketSubmitProgress() {
  if (!ticketSubmitProgress) return;
  ticketSubmitProgress.hidden = false;
  ticketSubmitProgress.removeAttribute("hidden");
}

function setTicketSubmitProgress(percent, label = "") {
  if (!ticketSubmitProgress) return;
  // Never move backwards while the creep animation is running, so explicit
  // milestone updates (e.g. 85%) can't undo the creeping progress.
  const requested = Math.max(0, Math.min(100, Math.round(percent)));
  const value = ticketSubmitProgressCreepTimer
    ? Math.max(requested, ticketSubmitProgressValue)
    : requested;
  ticketSubmitProgressValue = value;
  showTicketSubmitProgress();
  if (ticketSubmitProgressFill) ticketSubmitProgressFill.style.width = `${value}%`;
  if (ticketSubmitProgressPercent) ticketSubmitProgressPercent.textContent = `${value}%`;
  if (label && ticketSubmitProgressLabel) ticketSubmitProgressLabel.textContent = label;
}

function startTicketSubmitProgress(label = "Preparing tickets...") {
  stopTicketSubmitProgressCreep();
  ticketSubmitProgressValue = 0;
  if (ticketFormSubmitButton) {
    ticketFormSubmitButton.disabled = true;
    ticketFormSubmitButton.classList.add("is-loading");
  }
  form?.classList.add("ticket-form-submitting");
  showTicketSubmitProgress();
  setTicketSubmitProgress(8, label);
}

function finishTicketSubmitProgress(success = true) {
  stopTicketSubmitProgressCreep();
  if (success) {
    setTicketSubmitProgress(100, "Done");
  }

  const delay = success ? 450 : 0;
  window.setTimeout(() => {
    hideTicketSubmitProgress();
    if (ticketFormSubmitButton) {
      ticketFormSubmitButton.disabled = false;
      ticketFormSubmitButton.classList.remove("is-loading");
    }
    form?.classList.remove("ticket-form-submitting");
    updateTicketFormOwnerLabel();
  }, delay);
}

function resetTicketSubmitProgress(message = "Submission failed") {
  if (ticketSubmitProgressLabel) ticketSubmitProgressLabel.textContent = message;
  if (ticketSubmitProgressFill) ticketSubmitProgressFill.style.width = "0%";
  finishTicketSubmitProgress(false);
}

function populateTicketFormOwners(tickets = getValidTickets()) {
  if (!ticketFormOwnerPanel || !ticketFormOwnerTrigger) return;

  const owners = [...new Set([
    ...getVisibleOwnerNames(),
    ...tickets.map((ticket) => ticket.Owner).filter(isOwnerVisibleToCurrentUser)
  ])].filter(isOwnerVisibleToCurrentUser).sort((a, b) => String(a).localeCompare(String(b)));
  const selected = new Set(getNewTicketOwners());

  ticketFormOwnerPanel.innerHTML = owners.map((owner) => `
    <label class="multi-select-option">
      <input type="checkbox" value="${escapeHtml(owner)}" ${selected.has(owner) ? "checked" : ""}>
      <span>${escapeHtml(owner)}</span>
    </label>
  `).join("");

  ticketFormOwnerPanel.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", updateTicketFormOwnerLabel);
  });

  updateTicketFormOwnerLabel();
}

let lastTicketFormOwnerSignature = "";

function populateTicketFormOwnersIfNeeded(tickets = getValidTickets()) {
  const signature = [...new Set([
    ...getVisibleOwnerNames(),
    ...tickets.map((ticket) => ticket.Owner).filter(isOwnerVisibleToCurrentUser)
  ])].sort().join("|");
  if (signature === lastTicketFormOwnerSignature) return;
  lastTicketFormOwnerSignature = signature;
  populateTicketFormOwners(tickets);
}

function clearTicketFormOwners() {
  if (!ticketFormOwnerPanel) return;
  ticketFormOwnerPanel.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = false;
  });
  updateTicketFormOwnerLabel();
}

function applyDefaultTicketFormOwner() {
  if (!ticketFormOwnerPanel) return;
  populateTicketFormOwnersIfNeeded();
  if (getNewTicketOwners().length) return;
  const user = Auth.currentUser();
  const candidates = [cleanText(user?.name), cleanText(user?.username)]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  if (!candidates.length) return;
  const inputs = [...ticketFormOwnerPanel.querySelectorAll("input[type='checkbox']")];
  const match = inputs.find((input) => candidates.includes(String(input.value).trim().toLowerCase()));
  if (!match) return;
  match.checked = true;
  updateTicketFormOwnerLabel();
}

function initTicketFormOwnerSelect() {
  if (!ticketFormOwnerPanel || !ticketFormOwnerTrigger) return;

  populateTicketFormOwners();

  ticketFormOwnerTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = ticketFormOwnerPanel.hidden;
    closeMultiFilterPanels(willOpen ? ticketFormOwnerPanel : null);
    ticketFormOwnerPanel.hidden = !willOpen;
    ticketFormOwnerTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  ticketFormOwnerPanel.addEventListener("click", (event) => event.stopPropagation());
}

function closeMultiFilterPanels(exceptPanel = null) {
  allMultiFilters().forEach(({ panel, trigger }) => {
    if (panel === exceptPanel) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });
  if (ticketFormOwnerPanel && ticketFormOwnerPanel !== exceptPanel) {
    ticketFormOwnerPanel.hidden = true;
    ticketFormOwnerTrigger?.setAttribute("aria-expanded", "false");
  }
}

function populateMultiFilter(panel, trigger, values, defaultLabel, labelFormatter = null, staticOptions = null) {
  const selected = new Set(getMultiFilterValues(panel));
  const sortedOptions = staticOptions?.length
    ? staticOptions
    : labelFormatter === formatPriorityLabel
    ? ["80", "20"].filter((value) => values.some((entry) => normalizePriority(entry) === value))
    : [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

  panel.innerHTML = sortedOptions.map((value) => `
    <label class="multi-select-option">
      <input type="checkbox" value="${escapeHtml(value)}" ${selected.has(value) ? "checked" : ""}>
      <span>${escapeHtml(labelFormatter ? labelFormatter(value) : value)}</span>
    </label>
  `).join("");

  panel.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      updateMultiFilterLabel(trigger, panel, defaultLabel, labelFormatter);
      renderTickets();
    });
  });

  updateMultiFilterLabel(trigger, panel, defaultLabel, labelFormatter);
  panel.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
}

function populateFilterOptions(tickets) {
  ticketMultiFilters.forEach((filter) => {
    if (!filter.panel || !filter.trigger) return;
    populateMultiFilter(
      filter.panel,
      filter.trigger,
      tickets.map(filter.getValues),
      filter.defaultLabel,
      filter.labelFormatter || null,
      filter.staticOptions || null
    );
  });
}

function populateProjectFilterOptions(tickets) {
  const projectTickets = getProjectTickets(tickets);
  projectMultiFilters.forEach((filter) => {
    if (!filter.panel || !filter.trigger) return;
    populateMultiFilter(
      filter.panel,
      filter.trigger,
      projectTickets.map(filter.getValues),
      filter.defaultLabel,
      filter.labelFormatter || null,
      filter.staticOptions || null
    );
  });
}

let lastFilterTicketSignature = "";
let lastProjectFilterTicketSignature = "";

function populateFilterOptionsIfNeeded(tickets) {
  const signature = tickets.map((ticket) =>
    `${ticket.Task}|${ticket.Status}|${ticket.Owner}|${ticket.Type}|${ticket.Priority}|${getTicketOriginalOwnerValue(ticket)}`
  ).join("||");
  if (signature !== lastFilterTicketSignature) {
    lastFilterTicketSignature = signature;
    populateFilterOptions(tickets);
  }

  const projectSignature = getProjectTickets(tickets).map((ticket) =>
    `${ticket.Task}|${ticket.Status}|${ticket.Owner}|${ticket["Raised By"]}|${ticket.Type}|${ticket.Priority}`
  ).join("||");
  if (projectSignature !== lastProjectFilterTicketSignature) {
    lastProjectFilterTicketSignature = projectSignature;
    populateProjectFilterOptions(tickets);
  }
}

function applyTicketFilters(tickets) {
  const search = cleanText(ticketSearchFilter.value).toLowerCase();
  const statusValues = getMultiFilterValues(ticketStatusFilterPanel);
  const ownerValues = getMultiFilterValues(ticketOwnerFilterPanel);
  const typeValues = getMultiFilterValues(ticketTypeFilterPanel);
  const priorityValues = getMultiFilterValues(ticketPriorityFilterPanel);
  const bhanuValues = getMultiFilterValues(ticketBhanuFilterPanel);

  return tickets.filter((ticket) => {
    if (statusValues.length && !statusValues.includes(ticket.Status)) return false;
    if (ownerValues.length && !ownerValues.includes(ticket.Owner)) return false;
    if (typeValues.length && !typeValues.includes(ticket.Type)) return false;
    if (priorityValues.length && !priorityValues.includes(ticket.Priority)) return false;
    if (bhanuValues.length && !bhanuValues.includes(getTicketOriginalOwnerValue(ticket))) return false;
    if (!search) return true;

    const haystack = [
      ticket.Task,
      ticket.Remarks,
      ticket["Raised By"],
      ticket.Owner,
      ticket.Type,
      ticket.Status
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

function applyProjectFilters(tickets) {
  const search = cleanText(projectSearchFilter?.value).toLowerCase();
  const statusValues = getMultiFilterValues(projectStatusFilterPanel);
  const ownerValues = getMultiFilterValues(projectOwnerFilterPanel);
  const raisedByValues = getMultiFilterValues(projectRaisedByFilterPanel);
  const typeValues = getMultiFilterValues(projectTypeFilterPanel);
  const priorityValues = getMultiFilterValues(projectPriorityFilterPanel);

  return tickets.filter((ticket) => {
    if (statusValues.length && !statusValues.includes(ticket.Status)) return false;
    if (ownerValues.length && !ownerValues.includes(ticket.Owner)) return false;
    if (raisedByValues.length && !raisedByValues.includes(ticket["Raised By"])) return false;
    if (typeValues.length) {
      const selectedTypes = typeValues.map((value) => String(value).trim().toLowerCase());
      if (!selectedTypes.includes(String(ticket.Type || "").trim().toLowerCase())) return false;
    }
    if (priorityValues.length && !priorityValues.includes(ticket.Priority)) return false;
    if (!search) return true;

    const haystack = [
      ticket.Task,
      ticket.Remarks,
      ticket["Raised By"],
      ticket.Owner,
      ticket.Type,
      ticket.Status
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

function setProjectSortFilter(sortKey = DEFAULT_TICKET_SORT) {
  if (!projectSortFilter) return;
  const option = projectSortFilter.querySelector(`option[value="${CSS.escape(sortKey)}"]`);
  if (!option) return;
  projectSortFilter.value = sortKey;
  projectSortFilter.querySelectorAll("option").forEach((entry) => {
    entry.toggleAttribute("selected", entry.value === sortKey);
  });
  projectSortFilter.selectedIndex = option.index;
}

function resetProjectFilters() {
  if (projectSearchFilter) projectSearchFilter.value = "";
  projectMultiFilters.forEach(({ panel, trigger, defaultLabel, labelFormatter }) => {
    if (!panel || !trigger) return;
    panel.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = false;
    });
    updateMultiFilterLabel(trigger, panel, defaultLabel, labelFormatter || null);
  });
  setProjectSortFilter(CLEARED_TICKET_SORT);
  closeMultiFilterPanels();
}

function setTicketSortFilter(sortKey = DEFAULT_TICKET_SORT) {
  if (!ticketSortFilter) return;
  const option = ticketSortFilter.querySelector(`option[value="${CSS.escape(sortKey)}"]`);
  if (!option) return;
  ticketSortFilter.value = sortKey;
  ticketSortFilter.querySelectorAll("option").forEach((entry) => {
    entry.toggleAttribute("selected", entry.value === sortKey);
  });
  ticketSortFilter.selectedIndex = option.index;
}

function resetTicketFilters() {
  if (ticketSearchFilter) ticketSearchFilter.value = "";
  ticketMultiFilters.forEach(({ panel, trigger, defaultLabel, labelFormatter }) => {
    panel.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = false;
    });
    updateMultiFilterLabel(trigger, panel, defaultLabel, labelFormatter || null);
  });
  setTicketSortFilter(CLEARED_TICKET_SORT);
  closeMultiFilterPanels();
}

function initMultiFilterControls() {
  allMultiFilters().forEach(({ panel, trigger }) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = panel.hidden;
      closeMultiFilterPanels(willOpen ? panel : null);
      panel.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });

    panel.addEventListener("click", (event) => event.stopPropagation());
  });

  document.addEventListener("click", () => closeMultiFilterPanels());
  closeMultiFilterPanels();
}

function formatDate(value) {
  if (isPlaceholderDate(value)) return "";
  if (!value) return "";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function statusClass(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "completed" || value === "complete" || value === "done") return "status-completed";
  if (value === "in progress" || value === "progress" || value === "ongoing") return "status-progress";
  if (value === "pending approval") return "status-approval";
  if (value === "not started" || value === "not started " || value === "pending") return "status-pending";
  if (value === "blocked" || value === "on hold" || value === "hold") return "status-blocked";
  return "status-other";
}

function kanbanColumnId(status) {
  return statusClass(status).replace("status-", "");
}

function applyKanbanFilters(tickets) {
  const search = cleanText(kanbanSearchFilter?.value).toLowerCase();
  const owner = cleanText(kanbanOwnerFilter?.value);
  const priority = normalizePriority(kanbanPriorityFilter?.value);
  const showCompleted = Boolean(kanbanShowCompleted?.checked);

  return tickets.filter((ticket) => {
    if (!showCompleted && kanbanColumnId(ticket.Status) === "completed") return false;
    if (owner && ticket.Owner !== owner) return false;
    if (priority && normalizePriority(ticket.Priority) !== priority) return false;
    if (!search) return true;

    const haystack = [
      ticket.Task,
      ticket.Remarks,
      ticket["Raised By"],
      ticket.Owner,
      ticket.Type,
      ticket.Status
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

let lastKanbanOwnerSignature = "";

function populateKanbanOwnerFilter(tickets) {
  if (!kanbanOwnerFilter) return;

  const owners = [...new Set(tickets.map((ticket) => ticket.Owner).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
  const signature = owners.join("|");
  if (signature === lastKanbanOwnerSignature) return;

  lastKanbanOwnerSignature = signature;
  const selected = kanbanOwnerFilter.value;
  kanbanOwnerFilter.innerHTML = [
    '<option value="">All owners</option>',
    ...owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`)
  ].join("");
  kanbanOwnerFilter.value = owners.includes(selected) ? selected : "";
}

function sortKanbanTickets(tickets) {
  return tickets.slice().sort((a, b) => {
    const priorityDiff = Number(normalizePriority(b.Priority)) - Number(normalizePriority(a.Priority));
    if (priorityDiff) return priorityDiff;
    return ticketRecentTimestamp(b) - ticketRecentTimestamp(a);
  });
}

function renderKanbanCard(ticket) {
  const priorityClass = normalizePriority(ticket.Priority) === "80" ? "high" : "low";
  const screenshots = getTicketScreenshots(ticket);
  const remarksText = getTicketRemarksText(ticket);
  const localOnly = ticketHasLocalScreenshotsOnly(ticket);
  const previewCount = screenshots.length || ticketAttachmentLabelCount(ticket);

  return `
    <article class="kanban-card ${statusClass(ticket.Status)}">
      <div class="kanban-card-head">
        <span class="priority-pill priority-${priorityClass}">${escapeHtml(formatPriorityLabel(ticket.Priority))}</span>
        ${ticket.Type ? `<span class="kanban-card-type">${escapeHtml(ticket.Type)}</span>` : ""}
      </div>
      <h3 class="kanban-card-title">${escapeHtml(ticket.Task)}</h3>
      <div class="kanban-card-meta">
        <span class="owner-chip">
          <span class="owner-avatar">${escapeHtml(ownerInitials(ticket.Owner))}</span>
          ${escapeHtml(ticket.Owner || "No owner")}
        </span>
        ${ticket["Start date"] ? `<span class="kanban-card-date">${escapeHtml(formatDate(ticket["Start date"]))}</span>` : ""}
      </div>
      ${ticket["Raised By"] ? `<p class="kanban-card-requester">Raised by ${escapeHtml(ticket["Raised By"])}</p>` : ""}
      ${previewCount ? `
        <button
          class="kanban-screenshot-btn screenshot-preview-btn"
          type="button"
          data-sheet-row="${ticket.sheetRow}"
          data-screenshot-index="0"
        >Preview${previewCount > 1 ? ` (${previewCount})` : ""}</button>
      ` : ""}
      ${remarksText ? `<p class="kanban-card-remarks">${escapeHtml(remarksText)}</p>` : ""}
    </article>
  `;
}

function renderKanbanBoard(tickets) {
  if (!kanbanColumns) return;

  populateKanbanOwnerFilter(tickets);
  const filteredTickets = applyKanbanFilters(tickets);
  const grouped = Object.fromEntries(KANBAN_COLUMNS.map((column) => [column.id, []]));

  filteredTickets.forEach((ticket) => {
    const columnId = kanbanColumnId(ticket.Status);
    if (grouped[columnId]) {
      grouped[columnId].push(ticket);
    } else {
      grouped.other.push(ticket);
    }
  });

  const visibleColumns = KANBAN_COLUMNS.filter((column) =>
    kanbanShowCompleted?.checked || column.id !== "completed"
  );

  kanbanColumns.innerHTML = visibleColumns
    .map((column) => {
      const columnTickets = sortKanbanTickets(grouped[column.id]);
      const cards = columnTickets.length
        ? columnTickets.map((ticket) => renderKanbanCard(ticket)).join("")
        : '<div class="kanban-empty">No tasks</div>';

      return `
        <section class="kanban-column ${column.statusClass}" aria-label="${escapeHtml(column.label)}">
          <header class="kanban-column-head">
            <h3>${escapeHtml(column.label)}</h3>
            <span class="kanban-column-count">${columnTickets.length}</span>
          </header>
          <div class="kanban-column-body">
            ${cards}
          </div>
        </section>
      `;
    })
    .join("");

  if (kanbanFilterSummary) {
    kanbanFilterSummary.textContent = filteredTickets.length === tickets.length
      ? `${filteredTickets.length} task${filteredTickets.length === 1 ? "" : "s"} on board`
      : `${filteredTickets.length} of ${tickets.length} tasks shown`;
  }

  bindScreenshotPreviewButtons(kanbanColumns);
}

function setStatus(kind, message) {
  statusDot.className = `status-dot ${kind || ""}`.trim();
  syncText.textContent = message;
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });

  if (activeTabLabel) {
    activeTabLabel.textContent = TAB_LABELS[tabName] || tabName;
  }
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  document.body.classList.toggle("chrome-collapsed", collapsed);
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  localStorage.setItem(CHROME_COLLAPSED_KEY, collapsed ? "1" : "0");
  toggleSidebarButton?.setAttribute("aria-expanded", collapsed ? "false" : "true");
  syncMobileNavBackdrop(collapsed);
}

function setPerformanceFiltersCollapsed(collapsed) {
  document.body.classList.toggle("performance-filters-collapsed", collapsed);
  localStorage.setItem(PERFORMANCE_FILTERS_COLLAPSED_KEY, collapsed ? "1" : "0");
  togglePerformanceFiltersButton?.setAttribute("aria-expanded", collapsed ? "false" : "true");
  if (expandPerformanceFiltersButton) {
    expandPerformanceFiltersButton.hidden = !collapsed;
  }
}

function setChromeCollapsed(collapsed) {
  setSidebarCollapsed(collapsed);
}

function setToolbarCollapsed(panel, collapsed) {
  if (!panel) return;
  panel.classList.toggle("is-collapsed", collapsed);
  const key = panel.dataset.toolbarKey || panel.id;
  localStorage.setItem(`${TOOLBAR_COLLAPSED_PREFIX}${key}`, collapsed ? "1" : "0");
}

const MOBILE_NAV_MQ = window.matchMedia("(max-width: 900px)");
const mobileNavBackdrop = document.querySelector("#mobileNavBackdrop");

function isMobileNavLayout() {
  return MOBILE_NAV_MQ.matches;
}

function syncMobileNavBackdrop(collapsed) {
  if (!mobileNavBackdrop) return;
  const show = isMobileNavLayout() && !collapsed;
  mobileNavBackdrop.hidden = !show;
  mobileNavBackdrop.setAttribute("aria-hidden", show ? "false" : "true");
}

function initChromeCollapse() {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
    || localStorage.getItem(CHROME_COLLAPSED_KEY) === "1";

  // Phones/tablets: start with the drawer closed so content isn't squeezed.
  setSidebarCollapsed(isMobileNavLayout() ? true : collapsed);

  toggleSidebarButton?.addEventListener("click", () => {
    setSidebarCollapsed(true);
  });

  expandSidebarButton?.addEventListener("click", () => {
    setSidebarCollapsed(false);
  });

  mobileNavBackdrop?.addEventListener("click", () => {
    setSidebarCollapsed(true);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isMobileNavLayout()) setSidebarCollapsed(true);
    });
  });

  const onViewportChange = () => {
    if (isMobileNavLayout()) {
      setSidebarCollapsed(true);
    } else {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
        || localStorage.getItem(CHROME_COLLAPSED_KEY) === "1";
      setSidebarCollapsed(stored);
    }
  };

  if (typeof MOBILE_NAV_MQ.addEventListener === "function") {
    MOBILE_NAV_MQ.addEventListener("change", onViewportChange);
  } else if (typeof MOBILE_NAV_MQ.addListener === "function") {
    MOBILE_NAV_MQ.addListener(onViewportChange);
  }
}

function initPerformanceFilterSidebar() {
  const collapsed = localStorage.getItem(PERFORMANCE_FILTERS_COLLAPSED_KEY) === "1";
  setPerformanceFiltersCollapsed(collapsed);

  togglePerformanceFiltersButton?.addEventListener("click", () => {
    setPerformanceFiltersCollapsed(true);
  });

  expandPerformanceFiltersButton?.addEventListener("click", () => {
    setPerformanceFiltersCollapsed(false);
  });
}

function initToolbarCollapse() {
  document.querySelectorAll(".board-toolbar-panel").forEach((panel) => {
    const key = panel.dataset.toolbarKey || panel.id;
    const stored = localStorage.getItem(`${TOOLBAR_COLLAPSED_PREFIX}${key}`);
    const collapsed = stored === null
      ? DEFAULT_COLLAPSED_TOOLBARS.has(key)
      : stored === "1";
    setToolbarCollapsed(panel, collapsed);

    panel.querySelector(".toolbar-collapse-btn")?.addEventListener("click", () => {
      setToolbarCollapsed(panel, true);
    });

    panel.querySelector(".toolbar-expand-btn")?.addEventListener("click", () => {
      setToolbarCollapsed(panel, false);
    });
  });
}

function countBy(tickets, key) {
  return tickets.reduce((summary, ticket) => {
    const label = cleanText(ticket[key]) || "Blank";
    summary[label] = (summary[label] || 0) + 1;
    return summary;
  }, {});
}

function ownerInitials(name) {
  return String(name || "?")
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function statusChartColor(status) {
  const cls = statusClass(status);
  if (cls === "status-completed") return "#22c55e";
  if (cls === "status-approval") return "#ea580c";
  if (cls === "status-progress") return "#eab308";
  if (cls === "status-pending") return "#ef4444";
  if (cls === "status-blocked") return "#a855f7";
  return "#94a3b8";
}

const PERF_TYPE_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#d97706", "#059669", "#db2777", "#64748b"];

function priorityChartColor(priority) {
  const value = normalizePriority(priority);
  if (value === "80") return "#dc2626";
  if (value === "50") return "#d97706";
  if (value === "20") return "#16a34a";
  return "#64748b";
}

function buildPerfDonutSvg(segments, centerLabel = "") {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return "";

  const size = 168;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const rings = segments.map((segment) => {
    const length = (segment.value / total) * circumference;
    const circle = `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="${segment.color}"
        stroke-width="${stroke}"
        stroke-linecap="butt"
        stroke-dasharray="${length} ${Math.max(circumference - length, 0)}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${center} ${center})"
      ></circle>`;
    offset += length;
    return circle;
  }).join("");

  return `
    <svg class="perf-donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-hidden="true">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}"></circle>
      ${rings}
      <text x="${center}" y="${center - 4}" text-anchor="middle" class="perf-donut-total">${total}</text>
      <text x="${center}" y="${center + 14}" text-anchor="middle" class="perf-donut-label">${escapeHtml(centerLabel || "Total")}</text>
    </svg>
  `;
}

function renderPerfDonutChart(target, summary, options = {}) {
  if (!target) return;

  const entries = Object.entries(summary || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!entries.length) {
    target.innerHTML = `<div class="breakdown-empty">${escapeHtml(options.emptyMessage || "No data available")}</div>`;
    return;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const colorFn = options.colorFn || ((label) => statusChartColor(label));
  const segments = entries.map(([label, value]) => ({
    label,
    value,
    color: colorFn(label)
  }));

  const legend = segments.map((segment) => {
    const pct = total ? Math.round((segment.value / total) * 100) : 0;
    return `
      <div class="perf-chart-legend-item">
        <span class="perf-chart-swatch" style="background:${segment.color}"></span>
        <span class="perf-chart-legend-label">${escapeHtml(segment.label || "Blank")}</span>
        <span class="perf-chart-legend-meta"><strong>${segment.value}</strong><span>${pct}%</span></span>
      </div>
    `;
  }).join("");

  target.innerHTML = `
    <div class="perf-donut-layout">
      ${buildPerfDonutSvg(segments, options.centerLabel || "Tasks")}
      <div class="perf-chart-legend">${legend}</div>
    </div>
  `;
}

function renderPerfBarChart(target, summary, options = {}) {
  if (!target) return;

  const entries = Object.entries(summary || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.maxBars || 8);

  if (!entries.length) {
    target.innerHTML = `<div class="breakdown-empty">${escapeHtml(options.emptyMessage || "No data available")}</div>`;
    return;
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);
  const colorFn = options.colorFn || ((label, index) => PERF_TYPE_COLORS[index % PERF_TYPE_COLORS.length]);

  target.innerHTML = `
    <div class="perf-bar-chart">
      ${entries.map(([label, count], index) => {
        const pct = Math.round((count / max) * 100);
        const width = Math.max(pct, count ? 4 : 0);
        const color = colorFn(label, index);
        return `
          <div class="perf-bar-row">
            <div class="perf-bar-head">
              <span class="perf-bar-label">${escapeHtml(label || "Blank")}</span>
              <span class="perf-bar-value">${count}</span>
            </div>
            <div class="perf-bar-track" aria-hidden="true">
              <div class="perf-bar-fill" style="width:${width}%;background:${color}"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPerfTeamWorkloadChart(target, owners, tickets, emptyMessage = "No employee ticket data available") {
  if (!target) return;

  const rows = owners
    .map((owner) => computeOwnerPerformance(tickets, owner))
    .sort((a, b) => b.assigned - a.assigned || b.completionRate - a.completionRate);

  if (!rows.length) {
    target.innerHTML = `<div class="breakdown-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  const max = Math.max(...rows.map((row) => row.assigned), 1);
  const legend = `
    <div class="perf-team-legend">
      <span><i style="background:#22c55e"></i>Completed</span>
      <span><i style="background:#eab308"></i>In Progress</span>
      <span><i style="background:#ef4444"></i>Not Started</span>
      <span><i style="background:#a855f7"></i>Blocked</span>
    </div>
  `;

  const bars = rows.map((row) => {
    const open = Math.max(row.assigned - row.completed, 0);
    const segments = [
      { value: row.completed, color: "#22c55e", label: "Completed" },
      { value: row.inProgress, color: "#eab308", label: "In Progress" },
      { value: row.pending, color: "#ef4444", label: "Not Started" },
      { value: row.blocked, color: "#a855f7", label: "Blocked" }
    ].filter((segment) => segment.value > 0);

    const widthPct = Math.max(Math.round((row.assigned / max) * 100), row.assigned ? 6 : 0);
    const segmentHtml = segments.map((segment) => {
      const segmentWidth = row.assigned ? (segment.value / row.assigned) * 100 : 0;
      return `<span class="perf-team-segment" style="width:${segmentWidth}%;background:${segment.color}" title="${segment.label}: ${segment.value}"></span>`;
    }).join("");

    return `
      <button class="perf-team-row" type="button" data-owner="${escapeHtml(row.owner)}" title="Filter by ${escapeHtml(row.owner)}">
        <div class="perf-team-row-head">
          <span class="owner-chip"><span class="owner-avatar">${escapeHtml(ownerInitials(row.owner))}</span>${escapeHtml(row.owner)}</span>
          <span class="perf-team-metrics">
            <strong>${row.assigned}</strong> tasks
            <span class="perf-rate-pill ${row.completionRate >= 80 ? "perf-rate-good" : "perf-rate-low"}">${row.completionRate}%</span>
          </span>
        </div>
        <div class="perf-team-track" style="width:${widthPct}%">${segmentHtml}</div>
        <div class="perf-team-foot">
          <span>${row.completed} done</span>
          <span>${open} open</span>
          <span>${row.overdue} overdue</span>
          <span>${row.highPriority} high</span>
        </div>
      </button>
    `;
  }).join("");

  target.innerHTML = `${legend}<div class="perf-team-chart">${bars}</div>`;

  target.querySelectorAll(".perf-team-row").forEach((button) => {
    button.addEventListener("click", () => {
      if (!performanceOwnerFilter) return;
      performanceOwnerFilter.value = button.dataset.owner || "";
      renderTickets();
    });
  });
}

function countByPriorityLabel(tickets) {
  const summary = {};
  tickets.forEach((ticket) => {
    const label = formatPriorityLabel(ticket.Priority) || "Unset";
    summary[label] = (summary[label] || 0) + 1;
  });
  return summary;
}

function renderBreakdownList(target, summary, total, variant = "status", emptyMessage = "No data available") {
  if (!target) return;

  const items = Object.entries(summary || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!items.length) {
    target.innerHTML = `<div class="breakdown-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  target.innerHTML = items
    .map(([label, count]) => {
      const pct = total ? Math.round((count / total) * 100) : 0;
      const labelHtml = variant === "owner"
        ? `<span class="owner-chip"><span class="owner-avatar">${escapeHtml(ownerInitials(label))}</span>${escapeHtml(label)}</span>`
        : `<span class="status-pill ${statusClass(label)}">${escapeHtml(label)}</span>`;

      return `
        <div class="breakdown-item">
          <div class="breakdown-head">
            ${labelHtml}
            <div class="breakdown-counts">
        <strong>${count}</strong>
              <span>${pct}%</span>
      </div>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill ${variant === "owner" ? "progress-owner" : statusClass(label)}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function getEffectiveMilestone(ticket) {
  return sanitizeDateField(ticket?.Milestone);
}

function isMilestoneToday(ticket) {
  return isSameCalendarDay(getEffectiveMilestone(ticket));
}

function isTicketCompleted(ticket) {
  return statusClass(ticket.Status) === "status-completed";
}

function ticketHasEndDate(ticket) {
  return Boolean(parseTicketDate(ticket?.["End date"]));
}

function getTicketCompletionError(ticket) {
  if (!isTicketCompleted(ticket)) return "";
  if (ticketHasEndDate(ticket)) return "";
  return "End date is required before marking a ticket as Completed.";
}

function isTicketOverdue(ticket) {
  if (isTicketCompleted(ticket)) return false;
  const endDate = parseTicketDate(ticket["End date"]);
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(endDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function ticketResolutionDays(ticket) {
  if (!isTicketCompleted(ticket)) return null;
  const created = parseTicketDate(ticket.createdOn) || parseTicketDate(ticket["Start date"]);
  const closed = parseTicketDate(ticket.closedOn) || parseTicketDate(ticket["End date"]);
  if (!created || !closed) return null;
  const days = (closed.getTime() - created.getTime()) / 86400000;
  return days >= 0 ? days : null;
}

function averageResolutionDays(tickets) {
  const days = tickets.map(ticketResolutionDays).filter((value) => value !== null);
  if (!days.length) return null;
  return Math.round(days.reduce((sum, value) => sum + value, 0) / days.length);
}

function formatResolutionDays(days) {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "<1d";
  return `${days}d`;
}

function computeOwnerPerformance(tickets, owner) {
  const assigned = tickets.filter((ticket) => cleanText(ticket.Owner) === owner);
  const completed = assigned.filter(isTicketCompleted);

  return {
    owner,
    assigned: assigned.length,
    completed: completed.length,
    completionRate: assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0,
    inProgress: assigned.filter((ticket) => ticket.Status === "In progress").length,
    pending: assigned.filter((ticket) => ticket.Status === "Not started").length,
    blocked: assigned.filter((ticket) => statusClass(ticket.Status) === "status-blocked").length,
    overdue: assigned.filter(isTicketOverdue).length,
    highPriority: assigned.filter((ticket) => normalizePriority(ticket.Priority) === "80").length,
    avgCloseDays: averageResolutionDays(assigned)
  };
}

function isValidOwnerName(owner) {
  const name = cleanText(owner);
  if (!name) return false;
  if (EXCLUDED_TICKET_OWNERS.has(name)) return false;
  if (/^\*.*\*$/.test(name)) return false;
  return name.toLowerCase() !== "owner";
}

function getPerformanceOwners(tickets) {
  if (hasFullHierarchyAccess()) {
    const owners = new Set(collectTicketOwnerNames(tickets));
    getAllHierarchyUsers().forEach((name) => owners.add(name));
    tickets.forEach((ticket) => {
      const owner = cleanText(ticket.Owner);
      if (owner) owners.add(owner);
    });
    return [...owners]
      .filter((owner) => cleanText(owner) && owner.toLowerCase() !== "owner" && !/^\*.*\*$/.test(owner))
      .sort((a, b) => a.localeCompare(b));
  }

  const visible = new Set(getVisibleOwnerNames().map((name) => name.toLowerCase()));
  const owners = new Set(getVisibleOwnerNames());
  tickets.forEach((ticket) => {
    const owner = cleanText(ticket.Owner);
    if (isValidOwnerName(owner) && visible.has(owner.toLowerCase())) owners.add(owner);
  });
  EXCLUDED_TICKET_OWNERS.forEach((name) => owners.delete(name));
  return [...owners].sort((a, b) => a.localeCompare(b));
}

function populatePerformanceOwnerFilter(tickets) {
  if (!performanceOwnerFilter) return;
  const selected = performanceOwnerFilter.value;
  const owners = getPerformanceOwners(tickets);
  performanceOwnerFilter.innerHTML = [
    '<option value="">All employees</option>',
    ...owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`)
  ].join("");
  if (owners.includes(selected) || selected === "") {
    performanceOwnerFilter.value = selected;
  }
}

function renderPerformanceTeamTable(tickets, owners) {
  if (!performanceTeamRows) return;
  const rows = owners
    .map((owner) => computeOwnerPerformance(tickets, owner))
    .sort((a, b) => b.assigned - a.assigned || b.completionRate - a.completionRate);

  if (!rows.length) {
    performanceTeamRows.innerHTML = '<tr class="empty-row"><td colspan="9">No employee ticket data available.</td></tr>';
    return;
  }

  const teamAvgCompletion = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length)
    : 0;

  performanceTeamRows.innerHTML = rows.map((row) => {
    const rateClass = row.completionRate >= teamAvgCompletion ? "perf-rate-good" : "perf-rate-low";
    return `
      <tr class="performance-row" data-owner="${escapeHtml(row.owner)}">
        <td class="perf-name-col">
          <span class="owner-chip"><span class="owner-avatar">${escapeHtml(ownerInitials(row.owner))}</span>${escapeHtml(row.owner)}</span>
        </td>
        <td>${row.assigned}</td>
        <td>${row.completed}</td>
        <td><span class="perf-rate-pill ${rateClass}">${row.completionRate}%</span></td>
        <td>${row.inProgress}</td>
        <td>${row.blocked}</td>
        <td>${row.overdue}</td>
        <td>${row.highPriority}</td>
        <td>${escapeHtml(formatResolutionDays(row.avgCloseDays))}</td>
      </tr>
    `;
  }).join("");

  performanceTeamRows.querySelectorAll(".performance-row").forEach((row) => {
    row.addEventListener("click", () => {
      if (!performanceOwnerFilter) return;
      performanceOwnerFilter.value = row.dataset.owner || "";
      renderTickets();
    });
  });
}

function renderPerformancePeriodMatrixCell(ticket, periodId) {
  if (!ticket) {
    return '<span class="perf-matrix-empty">—</span>';
  }

  const matchLabel = getTicketPeriodMatchLabel(ticket, periodId);
  const status = ticket.Status || "Blank";
  const priority = formatPriorityLabel(ticket.Priority);
  const meta = [priority, matchLabel].filter(Boolean).join(" · ");
  const canEdit = canEditTickets() && ticket.sheetRow;
  const editButton = canEdit
    ? `
      <button
        class="perf-matrix-edit-button ticket-edit-button"
        type="button"
        data-sheet-row="${ticket.sheetRow}"
        aria-label="Edit ticket"
        title="Edit ticket"
      >
        <span class="edit-icon" aria-hidden="true"></span>
      </button>
    `
    : "";

  return `
    <div class="perf-matrix-task ${statusClass(ticket.Status)}${isTicketOverdue(ticket) ? " perf-matrix-overdue" : ""}">
      <div class="perf-matrix-task-head">
        <div class="perf-matrix-task-title" title="${escapeHtml(ticket.Task || "Untitled")}">${escapeHtml(ticket.Task || "Untitled")}</div>
        ${editButton}
      </div>
      <div class="perf-matrix-task-meta">
        <span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>
        ${meta ? `<span class="perf-matrix-task-detail">${escapeHtml(meta)}</span>` : ""}
      </div>
    </div>
  `;
}

function bindPerformanceMatrixEditButtons() {
  if (!performancePeriodRows || !canEditTickets()) return;

  performancePeriodRows.querySelectorAll(".perf-matrix-edit-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTicketEditor(button.dataset.sheetRow);
    });
  });
}

function renderPerformancePeriodTable(tickets, owners, selectedOwner = "", periodId = selectedPerformancePeriod) {
  if (!performancePeriodRows || !performancePeriodHead) return;

  const periodLabel = getPerformancePeriodLabel(periodId);
  if (performancePeriodTitle) {
    performancePeriodTitle.textContent = selectedOwner
      ? `${selectedOwner} — ${periodLabel}`
      : `Employee Work — ${periodLabel}`;
  }

  const visibleOwners = selectedOwner ? [selectedOwner] : owners;
  const columns = visibleOwners
    .map((owner) => {
      const ownerTickets = sortTicketsForPeriodDisplay(
        tickets.filter((ticket) => cleanText(ticket.Owner) === owner)
      );
      return { owner, tickets: ownerTickets };
    })
    .sort((a, b) => b.tickets.length - a.tickets.length || a.owner.localeCompare(b.owner));

  const totalTasks = columns.reduce((sum, column) => sum + column.tickets.length, 0);
  if (performancePeriodTotal) {
    performancePeriodTotal.textContent = `${totalTasks} task${totalTasks === 1 ? "" : "s"}`;
  }

  if (!columns.length) {
    performancePeriodHead.innerHTML = "";
    performancePeriodRows.innerHTML = '<tr class="empty-row"><td>No employee data available.</td></tr>';
    return;
  }

  performancePeriodHead.innerHTML = `
    <tr>
      <th class="perf-matrix-row-num" scope="col">#</th>
      ${columns.map((column) => {
        const completed = column.tickets.filter(isTicketCompleted).length;
        return `
          <th class="perf-matrix-col" scope="col" data-owner="${escapeHtml(column.owner)}">
            <button class="perf-matrix-col-btn" type="button" title="Filter by ${escapeHtml(column.owner)}">
              <span class="perf-matrix-col-top">
                <span class="owner-avatar">${escapeHtml(ownerInitials(column.owner))}</span>
                <span class="perf-matrix-col-name">${escapeHtml(column.owner)}</span>
              </span>
              <span class="perf-matrix-col-stats">${column.tickets.length} tasks · ${completed} done</span>
            </button>
          </th>
        `;
      }).join("")}
    </tr>
  `;

  const maxRows = Math.max(...columns.map((column) => column.tickets.length), 0);
  if (!maxRows) {
    performancePeriodRows.innerHTML = `
      <tr class="empty-row">
        <td colspan="${columns.length + 1}">No tasks in ${escapeHtml(periodLabel.toLowerCase())}</td>
      </tr>
    `;
  } else {
    performancePeriodRows.innerHTML = Array.from({ length: maxRows }, (_, index) => `
      <tr>
        <th class="perf-matrix-row-num" scope="row">${index + 1}</th>
        ${columns.map((column) => `
          <td class="perf-matrix-cell">${renderPerformancePeriodMatrixCell(column.tickets[index], periodId)}</td>
        `).join("")}
      </tr>
    `).join("");
  }

  performancePeriodHead.querySelectorAll(".perf-matrix-col-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const owner = button.closest("[data-owner]")?.dataset.owner || "";
      if (!performanceOwnerFilter || !owner) return;
      performanceOwnerFilter.value = owner;
      renderTickets();
    });
  });

  bindPerformanceMatrixEditButtons();
}

function renderPerformanceRecent(tickets, selectedOwner = "") {
  if (!perfRecentList) return;
  const openTickets = tickets
    .filter((ticket) => !isTicketCompleted(ticket))
    .sort((a, b) => ticketLatestActivityTimestamp(b) - ticketLatestActivityTimestamp(a))
    .slice(0, 6);

  if (!openTickets.length) {
    const message = selectedOwner
      ? `No open tasks for ${selectedOwner}`
      : "No open tasks";
    perfRecentList.innerHTML = `<div class="breakdown-empty">${escapeHtml(message)}</div>`;
    return;
  }

  perfRecentList.innerHTML = openTickets.map((ticket) => {
    const overdue = isTicketOverdue(ticket);
    return `
      <article class="dashboard-recent-item ${statusClass(ticket.Status)}${overdue ? " perf-overdue-item" : ""}">
        <div class="dashboard-recent-head">
          <strong>${escapeHtml(ticket.Task)}</strong>
          <span class="status-pill ${statusClass(ticket.Status)}">${escapeHtml(ticket.Status || "Blank")}</span>
        </div>
        <div class="dashboard-recent-meta">
          <span class="owner-chip">
            <span class="owner-avatar">${escapeHtml(ownerInitials(ticket.Owner))}</span>
            ${escapeHtml(ticket.Owner || "No owner")}
          </span>
          <span>${escapeHtml(formatPriorityLabel(ticket.Priority))}</span>
          <span>${overdue ? "Overdue" : escapeHtml(formatActivityTime(ticket))}</span>
        </div>
        ${ticket.Remarks ? `<p class="dashboard-recent-remarks">${escapeHtml(ticket.Remarks)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderPerformance(tickets) {
  if (!performanceSubtitle) return;

  const periodId = selectedPerformancePeriod;
  const periodLabel = getPerformancePeriodLabel(periodId);
  const periodTickets = filterTicketsByPerformancePeriod(tickets, periodId);

  populatePerformanceOwnerFilter(tickets);
  const owners = getPerformanceOwners(tickets);
  const selectedOwner = cleanText(performanceOwnerFilter?.value);
  const scopedTickets = selectedOwner
    ? periodTickets.filter((ticket) => cleanText(ticket.Owner) === selectedOwner)
    : periodTickets.filter((ticket) => isValidOwnerName(ticket.Owner));

  const completed = scopedTickets.filter(isTicketCompleted).length;
  const stats = {
    assigned: scopedTickets.length,
    completed,
    completionRate: scopedTickets.length ? Math.round((completed / scopedTickets.length) * 100) : 0,
    inProgress: scopedTickets.filter((ticket) => ticket.Status === "In progress").length,
    pending: scopedTickets.filter((ticket) => ticket.Status === "Not started").length,
    blocked: scopedTickets.filter((ticket) => statusClass(ticket.Status) === "status-blocked").length,
    overdue: scopedTickets.filter(isTicketOverdue).length,
    highPriority: scopedTickets.filter((ticket) => normalizePriority(ticket.Priority) === "80").length,
    avgCloseDays: averageResolutionDays(scopedTickets)
  };

  if (perfAssignedCount) perfAssignedCount.textContent = stats.assigned;
  if (perfCompletedCount) perfCompletedCount.textContent = stats.completed;
  if (perfProgressCount) perfProgressCount.textContent = stats.inProgress;
  if (perfPendingCount) perfPendingCount.textContent = stats.pending;
  if (perfCompletionRate) perfCompletionRate.textContent = `${stats.completionRate}%`;
  if (perfBlockedCount) perfBlockedCount.textContent = stats.blocked;
  if (perfOverdueCount) perfOverdueCount.textContent = stats.overdue;
  if (perfHighPriorityCount) perfHighPriorityCount.textContent = stats.highPriority;
  if (perfAvgCloseDays) perfAvgCloseDays.textContent = formatResolutionDays(stats.avgCloseDays);

  performanceSubtitle.textContent = selectedOwner
    ? `${stats.assigned} tasks for ${selectedOwner} in ${periodLabel} · ${stats.completionRate}% completed`
    : `${scopedTickets.length} tasks across ${owners.length} employees in ${periodLabel} · ${stats.completionRate}% completed`;

  if (performanceTeamTotal) {
    performanceTeamTotal.textContent = `${owners.length} employee${owners.length === 1 ? "" : "s"}`;
  }

  if (performanceTeamPanel) {
    performanceTeamPanel.hidden = Boolean(selectedOwner);
  }
  if (performanceDetailLayout) {
    performanceDetailLayout.hidden = false;
  }

  renderPerformanceTeamTable(periodTickets, owners);
  renderPerfTeamWorkloadChart(perfTeamChart, owners, periodTickets);
  renderPerformancePeriodTable(periodTickets, owners, selectedOwner, periodId);

  const statusEmptyMessage = selectedOwner && !scopedTickets.length
    ? `No tickets assigned to ${selectedOwner}`
    : "No ticket data available";
  const typeEmptyMessage = selectedOwner && !scopedTickets.length
    ? `No ticket types for ${selectedOwner}`
    : "No ticket data available";
  const priorityEmptyMessage = selectedOwner && !scopedTickets.length
    ? `No priority data for ${selectedOwner}`
    : "No ticket data available";

  if (perfStatusTitle) perfStatusTitle.textContent = selectedOwner ? `${selectedOwner} — Status` : "Status Mix";
  if (perfRecentTitle) perfRecentTitle.textContent = selectedOwner ? `${selectedOwner} — Open Tasks` : "Active Workload";
  if (perfStatusTotal) perfStatusTotal.textContent = `${scopedTickets.length} tickets`;
  if (perfTypeTotal) perfTypeTotal.textContent = `${scopedTickets.length} tickets`;
  if (perfPriorityTotal) perfPriorityTotal.textContent = `${scopedTickets.length} tickets`;

  renderPerfDonutChart(
    perfStatusList,
    countBy(scopedTickets, "Status"),
    { centerLabel: "Tasks", emptyMessage: statusEmptyMessage, colorFn: statusChartColor }
  );
  renderPerfBarChart(
    perfTypeList,
    countBy(scopedTickets, "Type"),
    { emptyMessage: typeEmptyMessage }
  );
  renderPerfDonutChart(
    perfPriorityList,
    countByPriorityLabel(scopedTickets),
    {
      centerLabel: "Tasks",
      emptyMessage: priorityEmptyMessage,
      colorFn: (label) => {
        if (label === "High") return "#dc2626";
        if (label === "Medium") return "#d97706";
        if (label === "Low") return "#16a34a";
        return "#64748b";
      }
    }
  );
  renderPerformanceRecent(scopedTickets, selectedOwner);
}

function renderDashboardRecent(tickets) {
  const todayTickets = getTodayActivityTickets(tickets);

  if (!todayTickets.length) {
    dashboardRecentList.innerHTML = '<div class="breakdown-empty">No activity today</div>';
    return;
  }

  dashboardRecentList.innerHTML = todayTickets
    .map((ticket) => {
      const activityLabel = formatTodayActivityLabel(ticket);
      return `
      <article class="dashboard-recent-item ${statusClass(ticket.Status)}${isMilestoneToday(ticket) && isOpenTicket(ticket) ? " milestone-today-item" : ""}">
        <div class="dashboard-recent-head">
          <strong>${escapeHtml(ticket.Task)}</strong>
          <span class="status-pill ${statusClass(ticket.Status)}">${escapeHtml(ticket.Status || "Blank")}</span>
        </div>
        <div class="dashboard-recent-meta">
          <span>${escapeHtml(ticket.Owner || "No owner")}</span>
          <span>${escapeHtml(activityLabel)}</span>
        </div>
        ${renderScreenshotPreviewButton(ticket)}
        ${ticket.Remarks ? `<p class="dashboard-recent-remarks">${escapeHtml(ticket.Remarks)}</p>` : ""}
      </article>
    `;
    })
    .join("");

  bindScreenshotPreviewButtons(dashboardRecentList);
}

function renderLatestTickets(tickets) {
  if (!latestTicketList) return;
  const todayTickets = getTodayActivityTickets(tickets);

  if (!todayTickets.length) {
    latestTicketList.innerHTML = '<div class="latest-item status-other"><strong>No activity today</strong></div>';
    return;
  }

  latestTicketList.innerHTML = todayTickets
    .map((ticket) => `
      <div class="latest-item ${statusClass(ticket.Status)}${isMilestoneToday(ticket) && isOpenTicket(ticket) ? " milestone-today-item" : ""}">
        <strong>${escapeHtml(ticket.Task)}</strong>
        <div class="latest-meta">
          <span>${escapeHtml(ticket.Status || "Blank")}</span>
          <span>${escapeHtml(ticket.Owner || "No owner")}</span>
          <span>${escapeHtml(formatTodayActivityLabel(ticket))}</span>
        </div>
        ${renderScreenshotPreviewButton(ticket)}
        ${ticket.Remarks ? `<p class="latest-remarks">${escapeHtml(ticket.Remarks)}</p>` : ""}
      </div>
    `)
    .join("");

  bindScreenshotPreviewButtons(latestTicketList);
}

function canEditTickets() {
  return Auth.canEditTickets();
}

function toInputDateValue(value) {
  if (isPlaceholderDate(value)) return "";
  const text = cleanText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = parseTicketDate(text);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDateFieldValue(formElement, fieldName, value) {
  const field = formElement.elements[fieldName];
  if (!field) return;
  const inputValue = toInputDateValue(value);
  field.value = inputValue;
}

function findTicketBySheetRow(sheetRow) {
  const row = Number(sheetRow);
  if (!row) return null;
  return getValidTickets().find((ticket) => Number(ticket.sheetRow) === row) || null;
}

function findTicketByIdentity(task, owner) {
  const key = ticketIdentityKey({ Task: task, Owner: owner });
  return getValidTickets().find((ticket) => ticketIdentityKey(ticket) === key) || null;
}

function resolveEditingSheetRow(data, ticket = {}) {
  const fromForm = Number(data.get("sheetRow"));
  if (fromForm) return fromForm;

  const fromActive = Number(activeEditTicket?.sheetRow);
  if (fromActive) return fromActive;

  const fromTicket = Number(ticket.sheetRow);
  if (fromTicket) return fromTicket;

  const task = String(data.get("Task") || ticket.Task || "").trim();
  const owner = cleanText(data.get("Owner") || ticket.Owner || "");
  return Number(findTicketByIdentity(task, owner)?.sheetRow) || 0;
}

async function ensureTicketSheetRow(ticket) {
  if (Number(ticket.sheetRow)) return Number(ticket.sheetRow);

  const match = findTicketByIdentity(ticket.Task, ticket.Owner);
  if (match?.sheetRow) return Number(match.sheetRow);

  if (!SHEET_WEB_APP_URL) return 0;

  await refreshFromSheet({ skipScreenshotSync: true });
  const refreshed = findTicketByIdentity(ticket.Task, ticket.Owner);
  return Number(refreshed?.sheetRow) || 0;
}

function populateTicketEditOwnerSelect(selectedOwner = "") {
  const select = ticketEditForm?.elements?.Owner;
  if (!select) return;

  const owners = [...getVisibleOwnerNames()];
  const current = cleanText(selectedOwner);
  if (current && isSelectableTicketOwner(current) && !owners.includes(current)) {
    owners.push(current);
  }

  select.innerHTML = owners.map((owner) =>
    `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`
  ).join("");
  select.value = owners.includes(current) ? current : (owners[0] || "");
}

function isSubtaskTicket(ticket) {
  return Number(ticket?.parentSheetRow) > 0;
}

function getParentTicket(ticket) {
  const parentRow = Number(ticket?.parentSheetRow);
  return parentRow ? findTicketBySheetRow(parentRow) : null;
}

function readCollapsedSubtaskParents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUBTASK_COLLAPSE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isSubtaskParentCollapsed(sheetRow) {
  return Boolean(readCollapsedSubtaskParents()[String(sheetRow)]);
}

function setSubtaskParentCollapsed(sheetRow, collapsed) {
  const state = readCollapsedSubtaskParents();
  const key = String(sheetRow);
  if (collapsed) state[key] = true;
  else delete state[key];
  localStorage.setItem(SUBTASK_COLLAPSE_KEY, JSON.stringify(state));
}

function getChildSubtasks(parentSheetRow, tickets) {
  const parentRow = Number(parentSheetRow);
  if (!parentRow) return [];
  return tickets.filter((ticket) => Number(ticket.parentSheetRow) === parentRow);
}

function groupTicketsWithSubtasks(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const byRow = new Map();
  list.forEach((ticket) => {
    const row = Number(ticket.sheetRow);
    if (row) byRow.set(row, ticket);
  });

  const childrenByParent = new Map();
  list.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    const parent = byRow.get(parentRow);
    if (!parent || isSubtaskTicket(parent)) return;
    if (!childrenByParent.has(parentRow)) childrenByParent.set(parentRow, []);
    childrenByParent.get(parentRow).push(ticket);
  });

  const placed = new Set();
  const grouped = [];

  list.forEach((ticket) => {
    const row = Number(ticket.sheetRow) || ticketIdentityKey(ticket);
    if (placed.has(row)) return;

    if (isSubtaskTicket(ticket)) {
      const parentRow = Number(ticket.parentSheetRow);
      const parent = byRow.get(parentRow);
      if (parent && !isSubtaskTicket(parent)) return;
      grouped.push(ticket);
      placed.add(row);
      return;
    }

    grouped.push(ticket);
    placed.add(row);
    (childrenByParent.get(Number(ticket.sheetRow)) || []).forEach((child) => {
      const childKey = Number(child.sheetRow) || ticketIdentityKey(child);
      if (placed.has(childKey)) return;
      grouped.push(child);
      placed.add(childKey);
    });
  });

  return grouped;
}

function resetTicketCreateParent() {
  if (ticketFormParentSheetRow) ticketFormParentSheetRow.value = "";
  if (ticketCreateParentContext) ticketCreateParentContext.hidden = true;
  if (ticketCreateParentLabel) ticketCreateParentLabel.textContent = "";
  if (ticketFormSubmitLabel) ticketFormSubmitLabel.textContent = "Submit Ticket";
}

function openSubtaskCreateModal(parentSheetRow) {
  const parent = findTicketBySheetRow(parentSheetRow);
  if (!parent) {
    alert("Could not find the parent task.");
    return;
  }
  if (!Auth.hasPermission("createTicket")) {
    alert("You do not have permission to create tickets.");
    return;
  }
  resetTicketCreateParent();
  setActiveTab("tickets");
  if (ticketCreateModal) ticketCreateModal.hidden = false;
  document.body.classList.add("modal-open");
  if (ticketFormParentSheetRow) ticketFormParentSheetRow.value = String(parent.sheetRow);
  if (ticketCreateParentContext) ticketCreateParentContext.hidden = false;
  if (ticketCreateParentLabel) ticketCreateParentLabel.textContent = parent.Task || "Parent task";
  if (ticketFormSubmitLabel) ticketFormSubmitLabel.textContent = "Create Sub-task";
  if (form?.elements.Type && parent.Type) form.elements.Type.value = parent.Type;
  if (form?.elements["Raised By"] && parent["Raised By"]) {
    form.elements["Raised By"].value = parent["Raised By"];
  }
  applyDefaultTicketFormOwner();
  form?.elements.Task?.focus();
}

function populateTicketEditParentContext(ticket) {
  const parent = getParentTicket(ticket);
  if (ticketEditParentSheetRow) {
    ticketEditParentSheetRow.value = isSubtaskTicket(ticket) ? String(ticket.parentSheetRow) : "";
  }
  if (ticketEditParentContext && ticketEditParentLink) {
    if (parent) {
      ticketEditParentContext.hidden = false;
      ticketEditParentLink.textContent = parent.Task || `Row ${ticket.parentSheetRow}`;
      ticketEditParentLink.dataset.sheetRow = String(parent.sheetRow);
    } else if (isSubtaskTicket(ticket)) {
      ticketEditParentContext.hidden = false;
      ticketEditParentLink.textContent = `Parent row ${ticket.parentSheetRow}`;
      ticketEditParentLink.dataset.sheetRow = String(ticket.parentSheetRow);
    } else {
      ticketEditParentContext.hidden = true;
      ticketEditParentLink.textContent = "";
      ticketEditParentLink.dataset.sheetRow = "";
    }
  }
  if (addSubtaskFromEditButton) {
    addSubtaskFromEditButton.hidden = !ticket.sheetRow || isSubtaskTicket(ticket);
  }
}

function openTicketCreateModal() {
  if (!Auth.hasPermission("createTicket")) {
    alert("You do not have permission to create tickets.");
    return;
  }
  if (!ticketCreateModal) return;
  if (!ticketFormParentSheetRow?.value) resetTicketCreateParent();
  setActiveTab("tickets");
  ticketCreateModal.hidden = false;
  document.body.classList.add("modal-open");
  applyDefaultTicketFormOwner();
  form?.elements.Task?.focus();
}

function closeTicketCreateModal() {
  if (!ticketCreateModal) return;
  ticketCreateModal.hidden = true;
  resetTicketCreateParent();
  if (ticketEditModal?.hidden && screenshotPreviewModal?.hidden) {
    document.body.classList.remove("modal-open");
  }
}

function openTicketEditor(sheetRow) {
  if (!canEditTickets()) {
    alert("You do not have permission to edit tickets.");
    return;
  }

  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket || !ticketEditForm || !ticketEditModal) {
    alert("Could not find the selected ticket.");
    return;
  }

  activeEditTicket = { ...ticket };
  resetTicketDeleteUi();
  if (ticketEditSheetRow) {
    ticketEditSheetRow.value = String(ticket.sheetRow || "");
  }
  ticketEditForm.elements.Task.value = ticket.Task || "";
  ticketEditForm.elements.Priority.value = normalizePriority(ticket.Priority);
  populateTicketEditOwnerSelect(ticket.Owner || "");
  ticketEditForm.elements["Raised By"].value = ticket["Raised By"] || "";
  populateTicketEditStatusSelect(ticket);
  ticketEditForm.elements.Type.value = ticket.Type || "Daily - Infra";
  const originalOwnerCheckbox = ticketEditForm.querySelector("[name='originalOwnerBhanu']");
  if (originalOwnerCheckbox) {
    originalOwnerCheckbox.checked = isTicketOriginalOwnerBhanu(ticket);
  }
  setTicketNotesEditorContent(ticketEditNotesEditor, ticketEditNotesInput, ticket);
  setDateFieldValue(ticketEditForm, "Start date", ticket["Start date"]);
  setDateFieldValue(ticketEditForm, "End date", ticket["End date"]);
  setDateFieldValue(ticketEditForm, "Milestone", ticket.Milestone);
  populateTicketEditParentContext(ticket);
  populateTicketEditApprovalNote(ticket);

  ticketEditModal.hidden = false;
  document.body.classList.add("modal-open");
  ticketEditForm.elements.Task.focus();
}

function closeTicketEditor() {
  if (!ticketEditModal) return;
  ticketEditModal.hidden = true;
  document.body.classList.remove("modal-open");
  ticketEditForm?.reset();
  clearTicketNotesEditor(ticketEditNotesEditor, ticketEditNotesInput);
  if (ticketEditSheetRow) ticketEditSheetRow.value = "";
  if (ticketEditParentSheetRow) ticketEditParentSheetRow.value = "";
  if (ticketEditParentContext) ticketEditParentContext.hidden = true;
  if (ticketEditApprovalNote) {
    ticketEditApprovalNote.hidden = true;
    ticketEditApprovalNote.textContent = "";
  }
  if (addSubtaskFromEditButton) addSubtaskFromEditButton.hidden = true;
  activeEditTicket = null;
  resetTicketDeleteUi();
}

function ticketFromEditForm() {
  const data = new FormData(ticketEditForm);
  const sheetRow = resolveEditingSheetRow(data, activeEditTicket || {});
  const ticket = normalizeTicket(applyTicketNotesToPayload({
    ...ticketFromFormData(data),
    sheetRow
  }, ticketEditNotesEditor));

  return ticket;
}

function ticketFromFormData(data, owner = "") {
  return {
    Task: String(data.get("Task") || "").trim(),
    Priority: normalizePriority(data.get("Priority")),
    Owner: cleanText(owner || data.get("Owner") || ""),
    "Raised By": String(data.get("Raised By") || "").trim(),
    Status: data.get("Status"),
    Type: data.get("Type"),
    "Start date": data.get("Start date"),
    "End date": data.get("End date"),
    Milestone: data.get("Milestone"),
    parentSheetRow: Number(data.get("parentSheetRow")) || 0,
    Notes: String(data.get("Notes") || "").trim(),
    "Bhanu List": data.has("originalOwnerBhanu") ? "Bhanu" : ""
  };
}

function coalesceSyncValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function applyTicketSyncResult(sheetRow, result = {}, expected = {}) {
  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) return;

  const notes = result.notes !== undefined ? String(result.notes).trim() : ticket.Notes;
  const sheetLinks = extractDriveLinksFromNotes({ Notes: notes, Remarks: notes });
  const localScreenshots = getTicketScreenshots(ticket);
  const localDataUrls = localScreenshots.filter(isDataImageUrl);
  let notesHtml = ticket.NotesHtml;

  if (sheetLinks.length) {
    notesHtml = buildNotesHtmlFromDriveLinks({ Notes: notes, Remarks: notes });
    if (localDataUrls.length && sheetLinks.length < localScreenshots.length) {
      const extraImages = localDataUrls
        .map((url) => `<img src="${url}" class="ticket-notes-image" alt="Screenshot"><br>`)
        .join("");
      notesHtml = `${notesHtml}${extraImages}`;
    }
  }

  const hasExpectedUpdate = Boolean(expected.sheetRow);
  const milestone = hasExpectedUpdate
    ? String(expected.Milestone ?? "").trim()
    : coalesceSyncValue(result.milestone, ticket.Milestone);
  const startDate = hasExpectedUpdate
    ? String(expected["Start date"] ?? "").trim()
    : coalesceSyncValue(result.startDate, ticket["Start date"]);
  const endDate = hasExpectedUpdate
    ? String(expected["End date"] ?? "").trim()
    : coalesceSyncValue(result.endDate, ticket["End date"]);

  const sheetConfirmed = Boolean(result.datesPersisted) || (
    hasExpectedUpdate
    && ticketDatesMatch(result.milestone, expected.Milestone)
    && ticketDatesMatch(result.startDate, expected["Start date"])
    && ticketDatesMatch(result.endDate, expected["End date"])
  );
  const syncedStatus = reconcileSyncedTicketStatus(ticket, result, expected);

  updateLocalTicket(normalizeTicket({
    ...ticket,
    Status: syncedStatus,
    Milestone: milestone,
    "Start date": startDate,
    "End date": endDate,
    Notes: notes || ticket.Notes,
    Remarks: notes || ticket.Remarks,
    NotesHtml: notesHtml
  }), { clearPendingSync: sheetConfirmed });
}

function applyDriveLinksToLocalTicket(sheetRow, notesText) {
  const notes = String(notesText || "").trim();
  if (!notes || !extractDriveLinksFromNotes({ Notes: notes, Remarks: notes }).length) {
    return;
  }

  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) return;

  updateLocalTicket(normalizeTicket({
    ...ticket,
    Notes: notes,
    Remarks: notes,
    NotesHtml: buildNotesHtmlFromDriveLinks({ Notes: notes, Remarks: notes })
  }), { keepPendingSync: true });
}

async function postToSheetWithResponse(payload) {
  const response = await fetch(SHEET_WEB_APP_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not read a response from Apps Script. Redeploy the web app.");
  }
}

function updateLocalTicket(updatedTicket, options = {}) {
  const tickets = readTickets().map((ticket) => {
    const sameRow = Number(updatedTicket.sheetRow)
      && Number(ticket.sheetRow) === Number(updatedTicket.sheetRow);
    const sameIdentity = ticketIdentityKey(ticket) === ticketIdentityKey(updatedTicket);
    if (!sameRow && !sameIdentity) return ticket;

    let pendingSheetSync = Date.now();
    if (options.clearPendingSync) pendingSheetSync = 0;
    else if (options.keepPendingSync) pendingSheetSync = ticket.pendingSheetSync || 0;

    return normalizeTicket({
      ...ticket,
      ...updatedTicket,
      pendingSheetSync
    });
  });
  writeTickets(tickets);
}

function removeLocalTicket(sheetRow) {
  const tickets = readTickets().filter((ticket) => Number(ticket.sheetRow) !== Number(sheetRow));
  writeTickets(tickets);
}

function removeLocalTicketByIdentity(task, owner) {
  const tickets = readTickets().filter((ticket) => ticketIdentityKey(ticket) !== `${cleanText(task)}||${cleanText(owner)}`);
  writeTickets(tickets);
}

async function deleteTicketFromSheet(sheetRow, task = "", owner = "") {
  if (!SHEET_WEB_APP_URL) {
    return { synced: false };
  }

  const result = await postToSheetWithResponse({
    action: "deleteTicket",
    sheetRow: Number(sheetRow),
    Task: task,
    Owner: owner
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Ticket delete failed.");
  }

  return { synced: true, ...result };
}

function resetTicketDeleteUi() {
  if (deleteTicketEditButton) {
    deleteTicketEditButton.hidden = false;
    deleteTicketEditButton.disabled = false;
    deleteTicketEditButton.textContent = "Delete Task";
  }
  if (ticketDeleteConfirm) ticketDeleteConfirm.hidden = true;
  if (confirmDeleteTicketButton) {
    confirmDeleteTicketButton.disabled = false;
    confirmDeleteTicketButton.textContent = "Yes, delete";
  }
  if (ticketDeleteError) {
    ticketDeleteError.hidden = true;
    ticketDeleteError.textContent = "";
  }
}

function showTicketDeleteError(message) {
  if (!ticketDeleteError) {
    alert(message);
    return;
  }
  ticketDeleteError.textContent = message;
  ticketDeleteError.hidden = false;
}

function requestTicketDelete() {
  if (!canEditTickets()) {
    showTicketDeleteError("You do not have permission to delete tickets.");
    return;
  }
  if (!ticketEditForm) return;

  const sourceTicket = activeEditTicket || {};
  const label = String(sourceTicket.Task || ticketEditForm.elements.Task?.value || "this task").trim() || "this task";

  if (ticketDeleteConfirm && ticketDeleteConfirmText && deleteTicketEditButton) {
    ticketDeleteConfirmText.textContent = `Delete "${label}" permanently? This cannot be undone.`;
    deleteTicketEditButton.hidden = true;
    ticketDeleteConfirm.hidden = false;
    if (ticketDeleteError) ticketDeleteError.hidden = true;
    confirmDeleteTicketButton?.focus();
    return;
  }

  executeTicketDelete();
}

async function executeTicketDelete() {
  if (!canEditTickets()) {
    showTicketDeleteError("You do not have permission to delete tickets.");
    return;
  }
  if (!ticketEditForm) return;

  const sourceTicket = activeEditTicket || {};
  const data = new FormData(ticketEditForm);
  const task = String(sourceTicket.Task || data.get("Task") || "").trim();
  const owner = cleanText(sourceTicket.Owner || data.get("Owner") || "");
  let sheetRow = Number(sourceTicket.sheetRow) || resolveEditingSheetRow(data, sourceTicket);

  if (confirmDeleteTicketButton) {
    confirmDeleteTicketButton.disabled = true;
    confirmDeleteTicketButton.textContent = "Deleting...";
  }
  if (deleteTicketEditButton) deleteTicketEditButton.disabled = true;

  try {
    if (!sheetRow && task) {
      setStatus("", "Locating task row...");
      sheetRow = await ensureTicketSheetRow({ Task: task, Owner: owner, sheetRow: 0 });
    }

    if (!sheetRow) {
      removeLocalTicketByIdentity(task, owner);
      resetTicketDeleteUi();
      closeTicketEditor();
      renderTickets();
      setStatus("ok", "Task removed locally");
      return;
    }

    setStatus("", "Deleting task...");
    await deleteTicketFromSheet(sheetRow, task, owner);
    markDeletedTicketTombstone({ sheetRow, task, owner });
    removeLocalTicket(sheetRow);
    removeLocalTicketByIdentity(task, owner);
    resetTicketDeleteUi();
    closeTicketEditor();
    await refreshFromSheet({ skipScreenshotSync: true });
    setStatus("online", "Task deleted");
    renderTickets();
  } catch (error) {
    const message = error?.message || "Could not delete this task.";
    showTicketDeleteError(`${message} Click Refresh on the Tickets tab, then try again.`);
    setStatus("error", "Delete failed — task kept");
    if (confirmDeleteTicketButton) {
      confirmDeleteTicketButton.disabled = false;
      confirmDeleteTicketButton.textContent = "Yes, delete";
    }
    if (deleteTicketEditButton) deleteTicketEditButton.disabled = false;
    console.error(error);
  }
}

async function deleteCurrentTicket() {
  requestTicketDelete();
}

async function sendTicketUpdateToSheet(ticket) {
  if (!SHEET_WEB_APP_URL) {
    setStatus("", "Saved locally. Sync update is unavailable.");
    return { synced: false };
  }

  const result = await postToSheetWithResponse(buildTicketSheetPayload(ticket));
  if (!result?.ok) {
    throw new Error(result?.error || "Ticket update failed.");
  }

  if (result?.ok && ticket.sheetRow) {
    applyTicketSyncResult(ticket.sheetRow, result, ticket);
  } else if (result.notes && ticket.sheetRow) {
    applyDriveLinksToLocalTicket(ticket.sheetRow, result.notes);
  }

  if (result.approvalPending) {
    if (result.approvalSentTo) {
      setStatus("online", `Approval email sent to ${result.approvalSentTo}`);
    } else if (result.approvalEmailError) {
      setStatus("error", `Pending approval saved — email failed: ${result.approvalEmailError}`);
    } else {
      setStatus("online", "Sent for manager approval (check Tasks sheet Approval Email Sent column)");
    }
  } else if (result.approved) {
    setStatus("online", "Completion approved");
  } else {
    setStatus("online", result.uploadedCount
      ? "Screenshot saved to Google Drive"
      : (result.parentRemarkAppended ? "Sub-task completed — parent task updated" : "Ticket updated"));
  }

  if (result.parentRemarkAppended) {
    await refreshFromSheet({ skipScreenshotSync: true });
  }

  return { synced: true, ...result };
}

function formatLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDateValue() {
  return formatLocalDateValue(startOfTodayDate());
}

function getTomorrowDateValue() {
  const tomorrow = startOfTodayDate();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDateValue(tomorrow);
}

function isMilestoneTomorrow(ticket) {
  const date = parseTicketDate(getEffectiveMilestone(ticket));
  if (!date) return false;
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const tomorrow = startOfTodayDate();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return day.getTime() === tomorrow.getTime();
}

const milestoneActionInFlight = new Set();

function milestoneActionKey(ticketOrRow) {
  if (ticketOrRow && typeof ticketOrRow === "object") {
    const row = Number(ticketOrRow.sheetRow);
    if (row) return `row:${row}`;
    return `id:${ticketIdentityKey(ticketOrRow)}`;
  }
  const row = Number(ticketOrRow);
  return row ? `row:${row}` : `row:${ticketOrRow}`;
}

async function setTicketMilestoneFromAction(sheetRow) {
  if (!canEditTickets()) {
    alert("You do not have permission to edit tickets.");
    return;
  }

  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) {
    alert("Could not find the selected ticket.");
    return;
  }

  const actionKey = milestoneActionKey(ticket);
  if (milestoneActionInFlight.has(actionKey)) return;
  milestoneActionInFlight.add(actionKey);

  const nextMilestone = isMilestoneToday(ticket) ? getTomorrowDateValue() : getTodayDateValue();
  const label = nextMilestone === getTomorrowDateValue() ? "tomorrow" : "today";

  try {
    let updatedTicket = normalizeTicket({
      ...ticket,
      Milestone: nextMilestone,
      pendingSheetSync: Date.now()
    });

    // Save locally first so the Milestone column updates immediately.
    updateLocalTicket(updatedTicket);
    renderTickets();
    setStatus("", `Setting milestone to ${label}...`);

    if (!updatedTicket.sheetRow) {
      const ensured = await ensureTicketSheetRow(updatedTicket);
      if (!ensured) {
        setStatus("error", "Could not sync milestone — click Refresh, then try again.");
        return;
      }
      updatedTicket = normalizeTicket({
        ...updatedTicket,
        sheetRow: ensured,
        Milestone: nextMilestone,
        pendingSheetSync: Date.now()
      });
      updateLocalTicket(updatedTicket);
      renderTickets();
    }

    const result = await sendTicketUpdateToSheet({
      ...updatedTicket,
      Milestone: nextMilestone
    });

    const saved = findTicketBySheetRow(updatedTicket.sheetRow)
      || findTicketByIdentity(updatedTicket.Task, updatedTicket.Owner);
    const savedMilestone = toInputDateValue(saved?.Milestone);
    if (savedMilestone !== nextMilestone) {
      updateLocalTicket(normalizeTicket({
        ...(saved || updatedTicket),
        sheetRow: updatedTicket.sheetRow,
        Milestone: nextMilestone,
        pendingSheetSync: result?.datesPersisted ? 0 : Date.now()
      }), { clearPendingSync: Boolean(result?.datesPersisted) });
    }

    setStatus("online", `Milestone set to ${label} (${formatDate(nextMilestone)})`);
    renderTickets();
  } catch (error) {
    setStatus("error", error?.message || "Saved locally, but milestone sync failed");
    console.error(error);
    renderTickets();
  } finally {
    milestoneActionInFlight.delete(actionKey);
    renderTickets();
  }
}

function bindTicketEditButtons(root = rows) {
  if (!root) return;
  root.querySelectorAll(".ticket-edit-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTicketEditor(button.dataset.sheetRow);
    });
  });
  root.querySelectorAll(".ticket-subtask-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openSubtaskCreateModal(button.dataset.sheetRow);
    });
  });
  root.querySelectorAll(".ticket-milestone-today-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (button.classList.contains("is-syncing")) return;
      setTicketMilestoneFromAction(button.dataset.sheetRow);
    });
  });
  root.querySelectorAll(".ticket-subtask-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const parentRow = Number(button.dataset.sheetRow);
      if (!parentRow) return;
      const nextCollapsed = !isSubtaskParentCollapsed(parentRow);
      setSubtaskParentCollapsed(parentRow, nextCollapsed);
      renderTickets();
    });
  });
}

function renderTicketTable(tickets, options = {}) {
  const bodyEl = options.bodyEl || rows;
  const tableEl = options.tableEl || ticketTable;
  const actionsHeaderEl = options.actionsHeaderEl || ticketActionsHeader;
  const emptyMessage = options.emptyMessage || "No tickets match the current filters.";
  if (!bodyEl) return;

  const canEdit = canEditTickets();
  if (tableEl) {
    tableEl.classList.toggle("ticket-table-can-edit", canEdit);
  }
  if (actionsHeaderEl) {
    actionsHeaderEl.hidden = !canEdit;
  }

  const columnCount = canEdit ? 10 : 9;

  if (!tickets.length) {
    bodyEl.innerHTML = `<tr class="empty-row"><td colspan="${columnCount}">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  const childCounts = new Map();
  tickets.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    if (!parentRow) return;
    childCounts.set(parentRow, (childCounts.get(parentRow) || 0) + 1);
  });

  bodyEl.innerHTML = tickets
    .map((ticket) => {
      const parent = getParentTicket(ticket);
      const subtask = isSubtaskTicket(ticket);
      const parentRow = Number(ticket.sheetRow);
      const childCount = childCounts.get(parentRow) || 0;
      const hasChildren = !subtask && childCount > 0;
      const collapsed = hasChildren && isSubtaskParentCollapsed(parentRow);
      const parentCollapsed = subtask && isSubtaskParentCollapsed(Number(ticket.parentSheetRow));

      let taskCell = "";
      if (subtask) {
        taskCell = `<div class="ticket-task-head ticket-task-head-sub"><span class="subtask-indicator" title="Sub-task${parent ? ` of ${escapeHtml(parent.Task || "")}` : ""}">↳</span><span class="ticket-parent-task">${escapeHtml(ticket.Task)}</span></div>`;
      } else if (hasChildren) {
        taskCell = `
          <div class="ticket-task-head">
            <button
              class="ticket-subtask-toggle"
              type="button"
              data-sheet-row="${parentRow}"
              aria-expanded="${collapsed ? "false" : "true"}"
              aria-label="${collapsed ? "Expand" : "Collapse"} ${childCount} sub-task${childCount === 1 ? "" : "s"}"
              title="${collapsed ? "Show" : "Hide"} sub-tasks"
            >${collapsed ? "▸" : "▾"}</button>
            <span class="ticket-parent-task">${escapeHtml(ticket.Task)}</span>
            <span class="ticket-subtask-count">${childCount}</span>
          </div>
        `;
      } else {
        taskCell = escapeHtml(ticket.Task);
      }

      const rowClasses = [
        statusClass(ticket.Status),
        isMilestoneToday(ticket) && isOpenTicket(ticket) ? "milestone-today" : "",
        options.highlightImportantRemarks && hasImportantRemarks(ticket) ? "remarks-important" : "",
        subtask ? "subtask-row" : "",
        hasChildren ? "has-subtasks" : "",
        collapsed ? "subtasks-collapsed" : "",
        parentCollapsed ? "subtask-hidden" : ""
      ].filter(Boolean).join(" ");

      return `
      <tr class="${rowClasses}" ${parentCollapsed ? "hidden" : ""}>
        <td class="task-col">${taskCell}</td>
        <td class="ticket-col-compact ticket-col-priority"><span class="priority-pill priority-${normalizePriority(ticket.Priority) === "80" ? "high" : "low"}">${escapeHtml(formatPriorityLabel(ticket.Priority))}</span></td>
        <td class="ticket-col-compact ticket-col-owner">${escapeHtml(ticket.Owner)}</td>
        <td class="ticket-col-compact ticket-col-raised">${escapeHtml(ticket["Raised By"])}</td>
        <td class="ticket-col-compact ticket-col-status"><span class="status-pill ${statusClass(ticket.Status)}">${escapeHtml(ticket.Status || "Blank")}</span></td>
        <td class="ticket-col-compact ticket-col-date">${formatDate(ticket.Milestone) ? escapeHtml(formatDate(ticket.Milestone)) : "—"}</td>
        <td class="ticket-col-compact ticket-col-date">${escapeHtml(formatDate(ticket["End date"]))}</td>
        <td class="ticket-col-compact ticket-col-type">${escapeHtml(ticket.Type)}</td>
        <td class="remarks-col">${renderTicketRemarksCell(ticket)}</td>
        ${canEdit ? `
        <td class="actions-col">
          <div class="ticket-row-actions">
            ${!subtask ? `
            <button
              class="ticket-subtask-button"
              type="button"
              data-sheet-row="${ticket.sheetRow}"
              aria-label="Add sub-task"
              title="Add sub-task"
            >+</button>` : ""}
            <button
              class="ticket-milestone-today-button${isMilestoneToday(ticket) ? " is-today" : ""}${isMilestoneTomorrow(ticket) ? " is-tomorrow" : ""}${milestoneActionInFlight.has(milestoneActionKey(ticket)) ? " is-syncing" : ""}"
              type="button"
              data-sheet-row="${ticket.sheetRow}"
              aria-label="${isMilestoneToday(ticket) ? "Set milestone to tomorrow" : "Set milestone to today"}"
              title="${isMilestoneToday(ticket) ? "Set milestone to tomorrow" : "Set milestone to today"}"
            >M</button>
            <button
              class="ticket-edit-button"
              type="button"
              data-sheet-row="${ticket.sheetRow}"
              aria-label="Edit ticket"
              title="Edit ticket"
            >
              <span class="edit-icon" aria-hidden="true"></span>
            </button>
          </div>
        </td>` : ""}
      </tr>
    `;
    })
    .join("");

  bindTicketEditButtons(bodyEl);
  bindScreenshotPreviewButtons(bodyEl);
}

function buildTicketsFromForm(selectedOwners = null) {
  const owners = (selectedOwners || getNewTicketOwners()).filter(isSelectableTicketOwner);
  const data = new FormData(form);
  const basePayload = applyTicketNotesToPayload(ticketFromFormData(data), ticketNotesEditor);
  return owners.map((owner) => normalizeTicket({ ...basePayload, Owner: cleanText(owner) }));
}

function ticketsFromForm() {
  return buildTicketsFromForm();
}

function ticketFromForm() {
  const tickets = ticketsFromForm();
  return tickets[0] || normalizeTicket(applyTicketNotesToPayload(ticketFromFormData(form ? new FormData(form) : new FormData()), ticketNotesEditor));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTickets() {
  const tickets = getValidTickets();
  const sortKey = ticketSortFilter?.value || DEFAULT_TICKET_SORT;
  const filteredTickets = getFilteredDisplayedTickets();

  populateFilterOptionsIfNeeded(tickets);
  populateTicketFormOwnersIfNeeded(tickets);
  updateRaisedBySuggestions(tickets);

  const completed = tickets.filter((ticket) => statusClass(ticket.Status) === "status-completed").length;
  const blocked = tickets.filter((ticket) => statusClass(ticket.Status) === "status-blocked").length;
  const open = tickets.length - completed;
  const completion = tickets.length ? Math.round((completed / tickets.length) * 100) : 0;

  if (totalCount) totalCount.textContent = tickets.length;
  if (progressCount) progressCount.textContent = tickets.filter((ticket) => ticket.Status === "In progress").length;
  if (pendingCount) pendingCount.textContent = tickets.filter((ticket) => ticket.Status === "Not started").length;
  if (completedCount) completedCount.textContent = completed;
  if (openCount) openCount.textContent = open;
  if (blockedCount) blockedCount.textContent = blocked;
  if (completionRate) completionRate.textContent = `${completion}%`;
  if (priorityCount) priorityCount.textContent = tickets.filter((ticket) => normalizePriority(ticket.Priority) === "80").length;
  if (sideTotalCount) sideTotalCount.textContent = tickets.length;
  if (sideOpenCount) sideOpenCount.textContent = open;
  if (sideBlockedCount) sideBlockedCount.textContent = blocked;
  if (dashboardSubtitle) {
    dashboardSubtitle.textContent = `${tickets.length} tickets · ${completion}% completed · updated ${new Date().toLocaleString()}`;
  }
  if (dashboardWelcomeTitle) {
    const userName = cleanText(Auth.currentUser()?.name);
    dashboardWelcomeTitle.textContent = userName ? `Welcome back, ${userName}` : "Welcome back";
  }
  if (dashboardCompletionRing) {
    dashboardCompletionRing.style.setProperty("--completion", completion);
  }
  if (statusPanelTotal) statusPanelTotal.textContent = `${tickets.length} tickets`;
  if (ownerPanelTotal) ownerPanelTotal.textContent = `${tickets.length} tickets`;

  renderBreakdownList(statusList, countBy(tickets, "Status"), tickets.length, "status");
  renderBreakdownList(ownerList, countBy(tickets, "Owner"), tickets.length, "owner");
  renderDashboardRecent(tickets);
  renderPerformance(tickets);
  renderLatestTickets(tickets);

  if (ticketFilterSummary) {
    const ticketOpenWord = statusFilterIncludesCompleted(ticketStatusFilterPanel) ? "" : "open ";
    const sortLabels = {
      "milestone-open-desc": `Showing ${filteredTickets.length} ${ticketOpenWord}ticket${filteredTickets.length === 1 ? "" : "s"} — today's milestone first, then newest`,
      "sap-status": `Showing ${filteredTickets.length} SAP ticket${filteredTickets.length === 1 ? "" : "s"} — completed, then in progress, then not started`,
      "infra-status": `Showing ${filteredTickets.length} Infra ticket${filteredTickets.length === 1 ? "" : "s"} — completed, then in progress, then not started`
    };
    const defaultLabel = filteredTickets.length === tickets.length
      ? `Showing ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} sorted by date`
      : `Showing ${filteredTickets.length} of ${tickets.length} tickets`;

    ticketFilterSummary.textContent = sortLabels[sortKey] || defaultLabel;
  }

  renderTicketTable(filteredTickets);

  const projectTickets = getProjectTickets(tickets);
  const filteredProjects = getFilteredDisplayedProjectTickets();
  const projectSortKey = projectSortFilter?.value || DEFAULT_TICKET_SORT;
  if (projectFilterSummary) {
    const projectOpenWord = statusFilterIncludesCompleted(projectStatusFilterPanel) ? "" : "open ";
    const projectSortLabels = {
      "milestone-open-desc": `Showing ${filteredProjects.length} ${projectOpenWord}project${filteredProjects.length === 1 ? "" : "s"} — today's milestone first`,
      "important-remarks-first": `Showing ${filteredProjects.length} ${projectOpenWord}project${filteredProjects.length === 1 ? "" : "s"} — important remarks first`,
      "sap-status": `Showing ${filteredProjects.length} SAP project${filteredProjects.length === 1 ? "" : "s"}`,
      "infra-status": `Showing ${filteredProjects.length} Infra project${filteredProjects.length === 1 ? "" : "s"}`
    };
    projectFilterSummary.textContent = projectSortLabels[projectSortKey]
      || (filteredProjects.length === projectTickets.length
        ? `Showing ${projectTickets.length} SAP & Infra project${projectTickets.length === 1 ? "" : "s"}`
        : `Showing ${filteredProjects.length} of ${projectTickets.length} projects`);
  }
  renderTicketTable(filteredProjects, {
    bodyEl: projectRows,
    tableEl: projectTable,
    actionsHeaderEl: projectActionsHeader,
    emptyMessage: "No SAP or Infra project works match the current filters.",
    highlightImportantRemarks: true
  });

  renderKanbanBoard(tickets);
}

function applyCreatedTicketSyncResult(localTicket, result = {}) {
  const identity = ticketIdentityKey(localTicket);
  const notes = String(result.notes || "").trim();
  const sheetRow = Number(result.sheetRow) || 0;
  const hasDriveLinks = notes && extractDriveLinksFromNotes({ Notes: notes, Remarks: notes }).length > 0;

  const tickets = readTickets().map((ticket) => {
    if (ticketIdentityKey(ticket) !== identity) return ticket;

    const notesHtml = hasDriveLinks
      ? buildNotesHtmlFromDriveLinks({ Notes: notes, Remarks: notes })
      : ticket.NotesHtml;

    return normalizeTicket({
      ...ticket,
      sheetRow: sheetRow || ticket.sheetRow,
      Status: reconcileSyncedTicketStatus(ticket, result),
      Notes: notes || ticket.Notes,
      Remarks: notes || ticket.Remarks,
      NotesHtml: notesHtml,
      Milestone: result.milestone || ticket.Milestone,
      "Start date": result.startDate || ticket["Start date"],
      "End date": result.endDate || ticket["End date"],
      pendingSheetSync: sheetRow ? 0 : ticket.pendingSheetSync
    });
  });

  writeTickets(tickets);
}

async function queueBackgroundScreenshotSync(tickets) {
  const pending = tickets
    .map((ticket) => getValidTickets().find((entry) => ticketIdentityKey(entry) === ticketIdentityKey(ticket)) || ticket)
    .filter((ticket) => ticket.sheetRow && ticketHasLocalScreenshotsOnly(ticket));

  if (!pending.length) return;

  for (const ticket of pending) {
    await autoUploadTicketScreenshots(ticket);
  }

  renderTickets();
  await refreshAttachmentsFolderLink();
}

async function sendToSheet(ticket, options = {}) {
  if (!SHEET_WEB_APP_URL) {
    setStatus("", "Saved locally. Sync is not configured.");
    return { synced: false };
  }

  if (!cleanText(ticket.Owner)) {
    throw new Error("Owner is required before syncing.");
  }

  const result = await postToSheetWithResponse(buildTicketSheetPayload(ticket, options));
  if (!result?.ok) {
    throw new Error(result?.error || "Ticket submit failed.");
  }

  if (ticket.sheetRow) {
    applyTicketSyncResult(ticket.sheetRow, result, ticket);
  } else {
    applyCreatedTicketSyncResult(ticket, result);
  }

  return { synced: true, ...result };
}

async function sendNewTicketsToSheet(tickets, onProgress) {
  if (!SHEET_WEB_APP_URL) {
    setStatus("", "Saved locally. Sync is not configured.");
    return { synced: false };
  }

  let uploadedTotal = 0;
  const outcomes = [];
  // Defer Drive uploads on create so Apps Script can return after writing rows.
  const createOptions = { deferAttachments: true };

  if (tickets.length > 1) {
    onProgress?.(0, tickets.length);
    const result = await postToSheetWithResponse({
      action: "createTickets",
      tickets: tickets.map((ticket) => buildTicketSheetPayload(ticket, createOptions))
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Ticket submit failed.");
    }

    (result.results || []).forEach((item, index) => {
      applyCreatedTicketSyncResult(tickets[index], item);
      uploadedTotal += Number(item?.uploadedCount) || 0;
      outcomes.push(item);
    });
    onProgress?.(tickets.length - 1, tickets.length);
  } else {
    const ticket = tickets[0];
    if (!cleanText(ticket.Owner)) {
      throw new Error("Each ticket must have an owner before syncing.");
    }
    onProgress?.(0, 1);
    const result = await sendToSheet(ticket, createOptions);
    uploadedTotal += Number(result?.uploadedCount) || 0;
    outcomes.push(result);
    onProgress?.(0, 1);
  }

  return { synced: true, uploadedCount: uploadedTotal, count: tickets.length, outcomes };
}

function loadSheetTickets() {
  return new Promise((resolve, reject) => {
    if (!SHEET_WEB_APP_URL) {
      reject(new Error("Sync is not configured."));
      return;
    }

    const callbackName = `handleSheetTickets_${Date.now()}`;
    const script = document.createElement("script");
    const separator = SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || payload.ok === false) {
        reject(new Error(payload?.error || "Refresh failed."));
        return;
      }

      if (payload.users?.length) {
        const localUsers = Auth.readUsers();
        const merged = Auth.mergeUsers(localUsers, payload.users.map((user) => Auth.normalizeUser(user)));
        Auth.saveUsers(merged);
        if (merged.length > payload.users.length) {
          Auth.syncUsersToSheet(merged);
        }
        renderUsers();
      }

      if (payload.hierarchy?.length) {
        writeHierarchyRows(normalizeHierarchyRows(payload.hierarchy));
      }

      resolve((payload.tickets || []).map((ticket, index) => mergeTicketFromSheet({
        ...ticket,
        sheetRow: ticket.sheetRow ?? index + 2
      }, index)));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not load ticket data."));
    };

    script.src = `${SHEET_WEB_APP_URL}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function refreshFromSheet(options = {}) {
  if (!SHEET_WEB_APP_URL) {
    if (!options.silent) setStatus("", "Sync not configured");
    return;
  }

  if (!options.silent) setStatus("", "Refreshing tickets...");

  try {
    const remoteTickets = await loadSheetTickets();
    reconcileDeletedTicketTombstones(remoteTickets);
    const tickets = mergeRemoteTicketsWithLocal(remoteTickets);
    writeTickets(tickets);
    lastFilterTicketSignature = "";
    renderTickets();
    await refreshAttachmentsFolderLink();
    if (!options.silent) setStatus("online", `Loaded ${tickets.length} tickets`);

    if (!options.skipScreenshotSync) {
      await syncPendingScreenshotsToDrive(getValidTickets());
    }
  } catch (error) {
    if (!options.silent) setStatus("error", "Could not refresh tickets");
    console.error(error);
  }
}

const AUTO_REFRESH_INTERVAL_MS = 120000;
let autoRefreshInProgress = false;

function isAnyModalOpen() {
  return Boolean(
    (ticketCreateModal && !ticketCreateModal.hidden)
    || (ticketEditModal && !ticketEditModal.hidden)
    || (screenshotPreviewModal && !screenshotPreviewModal.hidden)
  );
}

async function autoRefreshTickets() {
  if (!SHEET_WEB_APP_URL) return;
  if (document.hidden) return;
  if (autoRefreshInProgress) return;
  if (isAnyModalOpen()) return;

  autoRefreshInProgress = true;
  try {
    await refreshFromSheet({ skipScreenshotSync: true, silent: true });
    setStatus("online", `Auto-refreshed at ${new Date().toLocaleTimeString()}`);
  } finally {
    autoRefreshInProgress = false;
  }
}

function initAutoRefresh() {
  if (!SHEET_WEB_APP_URL) return;
  setInterval(autoRefreshTickets, AUTO_REFRESH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      autoRefreshTickets();
    }
  });
}

function loadAttachmentsFolderInfo() {
  return new Promise((resolve, reject) => {
    if (!SHEET_WEB_APP_URL) {
      reject(new Error("Sync is not configured."));
      return;
    }

    const callbackName = `handleAttachmentsFolder_${Date.now()}`;
    const script = document.createElement("script");
    const separator = SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || payload.ok === false) {
        if (payload?.needsDriveAuth) {
          setStatus("error", "Drive permission needed — run setupDriveAccess in Apps Script");
        }
        reject(new Error(payload?.error || "Could not load screenshots folder."));
        return;
      }
      resolve(payload.folder || null);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not load screenshots folder."));
    };

    script.src = `${SHEET_WEB_APP_URL}${separator}resource=attachmentsFolder&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function refreshAttachmentsFolderLink() {
  if (!attachmentsFolderLink || !SHEET_WEB_APP_URL) return;

  try {
    const folder = await loadAttachmentsFolderInfo();
    if (!folder?.url) {
      attachmentsFolderLink.hidden = true;
      return;
    }

    attachmentsFolderLink.href = folder.url;
    attachmentsFolderLink.textContent = folder.fileCount
      ? `Screenshots Folder (${folder.fileCount})`
      : "Screenshots Folder";
    attachmentsFolderLink.title = `Open "${folder.name}" in Google Drive — same location as spreadsheet "${folder.spreadsheetName}" (inside: ${folder.parentName})`;
    attachmentsFolderLink.hidden = false;
  } catch (error) {
    attachmentsFolderLink.hidden = true;
    console.error(error);
  }
}

function statusFilterIncludesCompleted(panel) {
  if (!panel) return false;
  return getMultiFilterValues(panel).some((status) => statusClass(status) === "status-completed");
}

function getFilteredDisplayedTickets() {
  return groupTicketsWithSubtasks(
    sortTickets(
      applyTicketFilters(getValidTickets()),
      ticketSortFilter?.value || DEFAULT_TICKET_SORT,
      { includeCompleted: statusFilterIncludesCompleted(ticketStatusFilterPanel) }
    )
  );
}

function getFilteredDisplayedProjectTickets() {
  return groupTicketsWithSubtasks(
    sortTickets(
      applyProjectFilters(getProjectTickets()),
      projectSortFilter?.value || DEFAULT_TICKET_SORT,
      { includeCompleted: statusFilterIncludesCompleted(projectStatusFilterPanel) }
    )
  );
}

function downloadCsv(tickets = getFilteredDisplayedTickets(), filenameBase = "tarmal-tickets") {
  const headers = [
    "Task",
    "Priority",
    "Owner",
    "Raised By",
    "Status",
    "Type",
    "Start date",
    "End date",
    "Milestone",
    "Parent Sheet Row",
    "Remarks",
    "Original Owner"
  ];
  const csvRows = tickets.map((ticket) =>
    headers
      .map((header) => {
        let value = header === "Remarks" ? ticket.Remarks : ticket[header];
        if (header === "Priority") value = formatPriorityLabel(ticket.Priority);
        if (header === "Original Owner") value = isTicketOriginalOwnerBhanu(ticket) ? "Bhanu" : "";
        if (header === "Parent Sheet Row") value = ticket.parentSheetRow || "";
        return `"${String(value ?? "").replaceAll('"', '""')}"`;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filenameBase}-${tickets.length}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadProjectsCsv() {
  downloadCsv(getFilteredDisplayedProjectTickets(), "tarmal-projects");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const allowedOwners = new Set(getVisibleOwnerNames().map((name) => name.toLowerCase()));
  const selectedOwners = getNewTicketOwners()
    .filter(isSelectableTicketOwner)
    .filter((owner) => allowedOwners.has(cleanText(owner).toLowerCase()));
  if (!selectedOwners.length) {
    alert(getNewTicketOwners().length
      ? "You can only assign tickets to yourself and team members who report to you."
      : "Select at least one owner.");
    return;
  }

  const ticketsToCreate = buildTicketsFromForm(selectedOwners).map((ticket) =>
    normalizeTicket(applyCompletionApprovalPreview({ ...ticket, pendingSheetSync: Date.now() }))
  );

  const completionError = ticketsToCreate.map(getTicketCompletionError).find(Boolean);
  if (completionError) {
    alert(completionError);
    return;
  }

  startTicketSubmitProgress("Saving tickets locally...");
  await yieldToUi();

  const tickets = readTickets();
  ticketsToCreate.forEach((ticket) => tickets.push(ticket));
  writeTickets(tickets);
  renderTickets();
  setTicketSubmitProgress(22, "Tickets saved locally");
  await yieldToUi();

  try {
    if (SHEET_WEB_APP_URL) {
      const waitLabel = ticketsToCreate.length > 1
        ? `Saving ${ticketsToCreate.length} tickets to Google Sheets...`
        : "Saving ticket to Google Sheets...";
      setTicketSubmitProgress(30, waitLabel);
      // Creep past the old ~85% freeze point while Apps Script writes rows.
      startTicketSubmitProgressCreep(92, "Almost done — finishing save...");
      await sendNewTicketsToSheet(
        ticketsToCreate.map((ticket) => (
          isPendingApprovalStatus(ticket.Status)
            ? { ...ticket, Status: "Completed" }
            : ticket
        )),
        (index, total) => {
        const step = 30 + Math.round(((index + 1) / Math.max(total, 1)) * 50);
        const label = total > 1
          ? `Saving ticket ${index + 1} of ${total} to Google Sheets...`
          : "Saving ticket to Google Sheets...";
        setTicketSubmitProgress(step, label);
      });
      setTicketSubmitProgress(96, "Ticket saved");
      renderTickets();

      form.reset();
      clearTicketFormOwners();
      clearTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
      form.elements["Start date"].valueAsDate = new Date();
      finishTicketSubmitProgress(true);
      closeTicketCreateModal();

      const needsBackgroundScreenshots = ticketsToCreate.some((ticket) => {
        const saved = getValidTickets().find((entry) => ticketIdentityKey(entry) === ticketIdentityKey(ticket));
        return saved && ticketHasLocalScreenshotsOnly(saved);
      });

      if (needsBackgroundScreenshots) {
        setStatus("online", "Ticket submitted — screenshots uploading in background");
        queueBackgroundScreenshotSync(ticketsToCreate).catch((error) => {
          console.error(error);
          setStatus("error", "Ticket saved — screenshot upload may still be running");
        });
      } else if (ticketsToCreate.length > 1) {
        setStatus("ok", `Created ${ticketsToCreate.length} tickets`);
      } else if (ticketsToCreate.some((ticket) => {
        const saved = getValidTickets().find((entry) => ticketIdentityKey(entry) === ticketIdentityKey(ticket));
        return saved && isPendingApprovalStatus(saved.Status);
      })) {
        setStatus("online", "Ticket created — sent for manager approval");
      } else {
        setStatus("ok", "Ticket created successfully");
      }
    } else {
      setTicketSubmitProgress(70, "Saved locally (sync not configured)");
      await yieldToUi();
      form.reset();
      clearTicketFormOwners();
      clearTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
      form.elements["Start date"].valueAsDate = new Date();
      finishTicketSubmitProgress(true);
      closeTicketCreateModal();
    }
  } catch (error) {
    resetTicketSubmitProgress("Sync failed — saved locally");
    const message = error?.message || "Saved locally, but sync failed";
    setStatus("error", message);
    alert(message);
    console.error(error);
  }
});

ticketEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canEditTickets()) {
    alert("You do not have permission to edit tickets.");
    return;
  }

  const updatedTicket = ticketFromEditForm();
  if (!isOwnerVisibleToCurrentUser(updatedTicket.Owner)) {
    alert("You can only assign tickets to yourself and team members who report to you.");
    return;
  }

  const completionError = getTicketCompletionError(updatedTicket);
  if (completionError) {
    alert(completionError);
    return;
  }

  if (!updatedTicket.sheetRow) {
    updatedTicket.sheetRow = await ensureTicketSheetRow(updatedTicket);
  }
  if (!updatedTicket.sheetRow) {
    alert("Could not determine which ticket to update. Click Refresh on the Tickets tab, then try again.");
    return;
  }

  if (ticketEditSheetRow) {
    ticketEditSheetRow.value = String(updatedTicket.sheetRow);
  }

  const sheetTicket = { ...updatedTicket };
  const localTicket = applyCompletionApprovalPreview(updatedTicket);
  updateLocalTicket(localTicket);
  closeTicketEditor();
  renderTickets();

  try {
    await sendTicketUpdateToSheet(sheetTicket);
    if (extractNoteAttachments(updatedTicket.NotesHtml || "").length) {
      await verifyDriveUploadAfterSave(updatedTicket.sheetRow);
    }
    renderTickets();
  } catch (error) {
    setStatus("error", "Saved locally, but update failed");
    console.error(error);
  }
});

closeTicketEditButton?.addEventListener("click", closeTicketEditor);
cancelTicketEditButton?.addEventListener("click", closeTicketEditor);
deleteTicketEditButton?.addEventListener("click", requestTicketDelete);
confirmDeleteTicketButton?.addEventListener("click", executeTicketDelete);
cancelDeleteTicketButton?.addEventListener("click", resetTicketDeleteUi);

ticketEditModal?.addEventListener("click", (event) => {
  if (event.target === ticketEditModal) {
    closeTicketEditor();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && screenshotPreviewModal && !screenshotPreviewModal.hidden) {
    closeScreenshotPreview();
    return;
  }
  if (event.key === "Escape" && ticketCreateModal && !ticketCreateModal.hidden) {
    closeTicketCreateModal();
    return;
  }
  if (event.key === "Escape" && ticketEditModal && !ticketEditModal.hidden) {
    closeTicketEditor();
    return;
  }
  if (!screenshotPreviewModal?.hidden) {
    if (event.key === "ArrowLeft") {
      screenshotPreviewPrev?.click();
    }
    if (event.key === "ArrowRight") {
      screenshotPreviewNext?.click();
    }
  }
});

closeScreenshotPreviewButton?.addEventListener("click", closeScreenshotPreview);
screenshotPreviewPrev?.addEventListener("click", () => {
  if (screenshotPreviewState.index > 0) {
    screenshotPreviewState.index -= 1;
    updateScreenshotPreviewView();
  }
});
screenshotPreviewNext?.addEventListener("click", () => {
  if (screenshotPreviewState.index < screenshotPreviewState.urls.length - 1) {
    screenshotPreviewState.index += 1;
    updateScreenshotPreviewView();
  }
});
screenshotPreviewModal?.addEventListener("click", (event) => {
  if (event.target === screenshotPreviewModal) {
    closeScreenshotPreview();
  }
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
    if (button.dataset.tab === "users") refreshUsersFromSheet();
    if (button.dataset.tab === "asset-list") {
      Auth.refreshSessionRights();
      if (typeof refreshAssetsFromSheet === "function") {
        refreshAssetsFromSheet();
      }
    }
    if (button.dataset.tab === "asset-register") {
      Auth.refreshSessionRights();
    }
    if (button.dataset.tab === "documents") {
      Auth.refreshSessionRights();
      if (typeof refreshDocumentsFromSheet === "function") {
        refreshDocumentsFromSheet();
      }
    }
  });
});

document.querySelectorAll("[data-goto-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.gotoTab;
    if (tab) setActiveTab(tab);
  });
});

document.querySelectorAll("[data-open-ticket-create]").forEach((button) => {
  button.addEventListener("click", () => openTicketCreateModal());
});

openTicketCreateButton?.addEventListener("click", openTicketCreateModal);
closeTicketCreateButton?.addEventListener("click", closeTicketCreateModal);
cancelTicketCreateButton?.addEventListener("click", closeTicketCreateModal);
clearTicketCreateParentButton?.addEventListener("click", resetTicketCreateParent);
addSubtaskFromEditButton?.addEventListener("click", () => {
  const sheetRow = Number(activeEditTicket?.sheetRow || ticketEditSheetRow?.value);
  if (!sheetRow) return;
  closeTicketEditor();
  openSubtaskCreateModal(sheetRow);
});
ticketEditParentLink?.addEventListener("click", () => {
  const sheetRow = Number(ticketEditParentLink.dataset.sheetRow);
  if (!sheetRow) return;
  openTicketEditor(sheetRow);
});

ticketCreateModal?.addEventListener("click", (event) => {
  if (event.target === ticketCreateModal) {
    closeTicketCreateModal();
  }
});

refreshUsersButton?.addEventListener("click", refreshUsersFromSheet);

refreshSheetButton?.addEventListener("click", refreshFromSheet);
refreshProjectsSheetButton?.addEventListener("click", refreshFromSheet);
kanbanRefreshButton?.addEventListener("click", refreshFromSheet);
exportButton?.addEventListener("click", () => downloadCsv());
exportProjectsButton?.addEventListener("click", downloadProjectsCsv);
openProjectTicketCreateButton?.addEventListener("click", () => openTicketCreateModal());

[kanbanSearchFilter, kanbanOwnerFilter, kanbanPriorityFilter, kanbanShowCompleted]
  .filter(Boolean)
  .forEach((control) => control.addEventListener("input", renderTickets));

performanceOwnerFilter?.addEventListener("change", renderTickets);

performancePeriodFilters?.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedPerformancePeriod(button.dataset.period || "today");
    renderTickets();
  });
});
setSelectedPerformancePeriod(selectedPerformancePeriod);

ticketSearchFilter?.addEventListener("input", renderTickets);
ticketSortFilter?.addEventListener("change", renderTickets);
projectSearchFilter?.addEventListener("input", renderTickets);
projectSortFilter?.addEventListener("change", renderTickets);

initMultiFilterControls();
setTicketSortFilter(DEFAULT_TICKET_SORT);
setProjectSortFilter(DEFAULT_TICKET_SORT);
bindClearTicketFiltersButtons();

function bindClearTicketFiltersButtons() {
  clearTicketFilters?.addEventListener("click", () => {
    resetTicketFilters();
    renderTickets();
  });
  clearProjectFilters?.addEventListener("click", () => {
    resetProjectFilters();
    renderTickets();
  });
}

clearLocalButton?.addEventListener("click", () => {
  if (!confirm("Clear locally saved ticket previews? This does not delete synced tickets.")) return;
  writeTickets([]);
  renderTickets();
  setStatus("", SHEET_WEB_APP_URL ? "Local preview cleared" : "Sync not configured");
});

userForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(userForm);
  const name = cleanText(data.get("name"));
  const username = cleanText(data.get("username")) || name;
  const email = cleanText(data.get("email"));
  const password = cleanText(data.get("password"));
  const rights = rightsFromForm(userForm);

  if (!Object.values(rights).some(Boolean)) {
    alert("Select at least one right for the user.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  const users = readUsers();
  if (users.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
    alert("A user with this name already exists.");
    return;
  }

  users.push({
    id: createUserId(),
    name,
    username,
    email,
    password,
    active: true,
    rights
  });
  await writeUsers(users);
  renderUsers();
  userForm.reset();
  rolePreset.value = "custom";
  renderRightsForm(emptyRights());
  alert(`User "${name}" created and synced.\nLogin: ${username}\nPassword: ${password}`);
});

generatePasswordButton?.addEventListener("click", () => {
  userPasswordInput.value = Auth.generatePassword();
});

copyPasswordButton?.addEventListener("click", async () => {
  if (!userPasswordInput.value) {
    userPasswordInput.value = Auth.generatePassword();
  }
  try {
    await navigator.clipboard.writeText(userPasswordInput.value);
    copyPasswordButton.textContent = "Copied";
    setTimeout(() => {
      copyPasswordButton.textContent = "Copy Password";
    }, 1200);
  } catch {
    alert("Could not copy password.");
  }
});

logoutButton?.addEventListener("click", () => Auth.logout());

userForm?.addEventListener("reset", () => {
  rolePreset.value = "custom";
  renderRightsForm(emptyRights());
});

rolePreset?.addEventListener("change", () => applyRolePreset(rolePreset.value));

deleteSelectedUsersButton?.addEventListener("click", async () => {
  const selectedIds = [...userRows.querySelectorAll("tr")]
    .filter((row) => row.querySelector(".user-select")?.checked)
    .map((row) => row.dataset.userId);

  if (!selectedIds.length) return;
  if (!confirm(`Delete ${selectedIds.length} selected user(s)?`)) return;

  const remaining = readUsers().filter((user) => !selectedIds.includes(user.id));
  await writeUsers(remaining);
  renderUsers();
});

form?.addEventListener("reset", () => {
  clearTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
  clearTicketFormOwners();
});

if (form?.elements["Start date"]) {
form.elements["Start date"].valueAsDate = new Date();
}
initTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
initTicketNotesEditor(ticketEditNotesEditor, ticketEditNotesInput);
initTicketFormOwnerSelect();
hideTicketSubmitProgress();
initChromeCollapse();
initPerformanceFilterSidebar();
initToolbarCollapse();
const initialTab = document.querySelector(".tab-button.active")?.dataset.tab;
if (initialTab) {
  setActiveTab(initialTab);
}
Auth.refreshSessionRights();
Auth.applyAccessControl();
setStatus(SHEET_WEB_APP_URL ? "online" : "", SHEET_WEB_APP_URL ? "Ready to sync" : "Sync not configured");
renderRightsForm(emptyRights());
renderUsers();
renderTickets();
if (SHEET_WEB_APP_URL) {
  refreshFromSheet();
  refreshUsersFromSheet();
  refreshAttachmentsFolderLink();
}
initAutoRefresh();
