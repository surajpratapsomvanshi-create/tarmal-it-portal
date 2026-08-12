const SHEET_WEB_APP_URL = Auth.SHEET_WEB_APP_URL;

const LOCAL_KEY = "tarmal-ticket-drafts";
const LOCAL_BACKUP_KEY = "tarmal-ticket-drafts-backup";
const DELETED_TICKETS_KEY = "tarmal-deleted-tickets";
const USERS_KEY = "tarmal-users";
const TICKETS_BROADCAST_CHANNEL = "tarmal-ticket-drafts-bc";
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
const PENDING_SYNC_TTL_MS = 180000;
const UNSYNCED_LOCAL_RETENTION_MS = 600000;
const SOFT_DELETED_STATUS = "Deleted";
const BUSY_RETRY_ATTEMPTS = 8;
const BUSY_RETRY_DELAY_MS = 1500;
/** Initial DOM rows for ticket/project tables — keeps first paint fast with 700+ tickets. */
const TABLE_PAGE_SIZE = 80;
const TABLE_PAGE_STEP = 80;
const EXCLUDED_TICKET_OWNERS = new Set(["Bhanu", "Noorali"]);
const HIERARCHY_KEY = "tarmal-user-hierarchy";
/** v3: parents stay expanded by default; completed children hide until show-completed. */
const SUBTASK_COLLAPSE_KEY = "tarmal-subtask-collapsed-v3";
const SUBTASK_COLLAPSE_KEY_LEGACY = "tarmal-subtask-collapsed";
const SUBTASK_COLLAPSE_KEY_V2 = "tarmal-subtask-collapsed-v2";
let lastTicketSearchQueryForExpand = null;
let lastProjectSearchQueryForExpand = null;
/** Parents where the user chose to show completed children this session (survives re-renders). */
const sessionExpandedCompletedParents = { tickets: new Set(), projects: new Set() };
const FALLBACK_HIERARCHY = [
  { user: "Suraj", manager: "", email: "sap@tarmalsteel.com" },
  { user: "Sushil", manager: "Suraj", email: "sushilpatil3760@gmail.com" },
  { user: "Dishon", manager: "Sushil", email: "dishonigogo07@gmail.com" }
];
const rows = document.querySelector("#ticketRows");
const syncText = document.querySelector("#syncText");
const statusDot = document.querySelector("#statusDot");
const syncCard = document.querySelector("#syncCard");
const topbarExpandStatus = document.querySelector("#topbarExpandStatus");
const topbarExpandStatusDot = document.querySelector("#topbarExpandStatusDot");
const topbarExpandSyncText = document.querySelector("#topbarExpandSyncText");
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
const performanceTypeFilter = document.querySelector("#performanceTypeFilter");
const exportPerformanceButton = document.querySelector("#exportPerformanceButton");
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
const presentationDeck = document.querySelector("#presentationDeck");
const presentationSummary = document.querySelector("#presentationSummary");
const enterPresentModeButton = document.querySelector("#enterPresentModeButton");
const exitPresentModeButton = document.querySelector("#exitPresentModeButton");
const presentationHero = document.querySelector("#presentationHero");
const presentationBoard = document.querySelector(".presentation-board");
const togglePresentationHeroButton = document.querySelector("#togglePresentationHeroButton");
const presentationTypeFilter = document.querySelector("#presentationTypeFilter");
const presentationOwnerFilter = document.querySelector("#presentationOwnerFilter");
const presentationPeriodFilters = document.querySelector("#presentationPeriodFilters");
const presentationCustomRange = document.querySelector("#presentationCustomRange");
const presentationDateFrom = document.querySelector("#presentationDateFrom");
const presentationDateTo = document.querySelector("#presentationDateTo");
const kanbanColumns = document.querySelector("#kanbanColumns");
const kanbanSearchFilter = document.querySelector("#kanbanSearchFilter");
const kanbanOwnerFilter = document.querySelector("#kanbanOwnerFilter");
const kanbanPriorityFilter = document.querySelector("#kanbanPriorityFilter");
const kanbanShowCompleted = document.querySelector("#kanbanShowCompleted");
const kanbanFilterSummary = document.querySelector("#kanbanFilterSummary");
const toggleSidebarButton = document.querySelector("#toggleSidebarButton");
const expandSidebarButton = document.querySelector("#expandSidebarButton");
const expandSidebarButtonCompact = document.querySelector("#expandSidebarButtonCompact");
const collapseTopbarButton = document.querySelector("#collapseTopbarButton");
const expandTopbarButton = document.querySelector("#expandTopbarButton");
const topbarExpandBar = document.querySelector("#topbarExpandBar");
const togglePerformanceFiltersButton = document.querySelector("#togglePerformanceFiltersButton");
const expandPerformanceFiltersButton = document.querySelector("#expandPerformanceFiltersButton");
const activeTabLabel = document.querySelector("#activeTabLabel");
const topbarPageTitle = document.querySelector("#topbarPageTitle");
const topbarExpandPageTitle = document.querySelector("#topbarExpandPageTitle");
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
const ticketDeleteConfirmModal = document.querySelector("#ticketDeleteConfirmModal");
const ticketDeleteConfirmText = document.querySelector("#ticketDeleteConfirmText");
const ticketDeleteConfirmTitle = document.querySelector("#ticketDeleteConfirmTitle");
const confirmDeleteTicketButton = document.querySelector("#confirmDeleteTicketButton");
const cancelDeleteTicketButton = document.querySelector("#cancelDeleteTicketButton");
const closeTicketDeleteConfirmButton = document.querySelector("#closeTicketDeleteConfirmButton");
const ticketDeleteError = document.querySelector("#ticketDeleteError");
const ticketEditSaveButton = document.querySelector("#ticketEditSaveButton");
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

let screenshotPreviewState = { urls: [], index: 0, title: "", eyebrow: "Attachment" };
let activeEditTicket = null;

const TAB_LABELS = {
  dashboard: "Dashboard",
  performance: "Performance",
  tickets: "Tickets",
  projects: "Projects",
  presentation: "Presentation",
  procurement: "Procurement",
  kanban: "Kanban",
  "asset-register": "Register Asset",
  "asset-list": "IT Assets",
  documents: "DMS",
  users: "Users"
};

const IT_OWNER_NAMES = ["Suraj", "Sushil", "Dishon"];

const CHROME_COLLAPSED_KEY = "tarmal-chrome-collapsed";
const SIDEBAR_COLLAPSED_KEY = "tarmal-sidebar-collapsed";
const TOPBAR_COLLAPSED_KEY = "tarmal-topbar-collapsed";
const PERFORMANCE_FILTERS_COLLAPSED_KEY = "tarmal-performance-filters-collapsed";
const TOOLBAR_COLLAPSED_PREFIX = "tarmal-toolbar-";
const PRESENTATION_HERO_COLLAPSED_KEY = "tarmal-presentation-hero-collapsed";
let selectedPresentationType = "all";
let selectedPresentationOwner = "all";
let selectedPresentationPeriod = "all";
let presentModeFullscreenSync = false;
const DEFAULT_COLLAPSED_TOOLBARS = new Set(["tickets", "projects", "procurement", "kanban", "assets", "users"]);

const KANBAN_COLUMNS = [
  { id: "pending", label: "Not Started", statusClass: "status-pending" },
  { id: "progress", label: "In Progress", statusClass: "status-progress" },
  { id: "blocked", label: "Blocked", statusClass: "status-blocked" },
  { id: "approval", label: "Pending Approval", statusClass: "status-approval" },
  { id: "completed", label: "Completed", statusClass: "status-completed" },
  { id: "other", label: "Other", statusClass: "status-other" }
];

/* Presentation board: Completed → In progress → Not started (user order).
   Blocked / Pending Approval sit after In progress when present. */
const PRESENTATION_KANBAN_COLUMNS = [
  { id: "completed", label: "Completed", statusClass: "status-completed", alwaysShow: true },
  { id: "progress", label: "In progress", statusClass: "status-progress", alwaysShow: true },
  { id: "blocked", label: "Blocked", statusClass: "status-blocked", alwaysShow: false },
  { id: "approval", label: "Pending Approval", statusClass: "status-approval", alwaysShow: false },
  { id: "pending", label: "Not started", statusClass: "status-pending", alwaysShow: true },
  { id: "other", label: "Other", statusClass: "status-other", alwaysShow: false }
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

let ticketsMemoryCache = null;
let ticketEditSubmitInFlight = false;
let ticketEditDeleteInFlight = false;
let ticketsBroadcastChannel = null;

function createTicketId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSubmissionId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyTicketsFallback() {
  // Never inject demo samples when a live sheet URL is configured.
  return SHEET_WEB_APP_URL ? [] : sampleTickets.map((ticket) => ({ ...ticket }));
}

function parseTicketsJson(raw) {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : null;
}

function readTickets() {
  if (ticketsMemoryCache) return ticketsMemoryCache;

  const saved = localStorage.getItem(LOCAL_KEY);
  if (!saved) {
    ticketsMemoryCache = emptyTicketsFallback();
    return ticketsMemoryCache;
  }

  try {
    const parsed = parseTicketsJson(saved);
    if (!parsed) {
      throw new Error("Ticket drafts were not an array.");
    }
    ticketsMemoryCache = parsed;
    return ticketsMemoryCache;
  } catch (primaryError) {
    console.warn("Corrupt ticket drafts; trying backup.", primaryError);
    try {
      const backup = localStorage.getItem(LOCAL_BACKUP_KEY);
      if (backup) {
        const parsedBackup = parseTicketsJson(backup);
        if (parsedBackup) {
          ticketsMemoryCache = parsedBackup;
          return ticketsMemoryCache;
        }
      }
    } catch (backupError) {
      console.warn("Ticket drafts backup unreadable.", backupError);
    }
    ticketsMemoryCache = emptyTicketsFallback();
    return ticketsMemoryCache;
  }
}

let ticketsWriteEpoch = 0;

function writeTickets(tickets, options = {}) {
  ticketsMemoryCache = tickets;
  const json = JSON.stringify(tickets);
  try {
    const previous = localStorage.getItem(LOCAL_KEY);
    if (previous && previous !== json) {
      localStorage.setItem(LOCAL_BACKUP_KEY, previous);
    }
  } catch (error) {
    console.warn("Could not write ticket drafts backup.", error);
  }
  localStorage.setItem(LOCAL_KEY, json);
  const epoch = ++ticketsWriteEpoch;
  if (!options.skipBroadcast) {
    try {
      ticketsBroadcastChannel?.postMessage({ type: "tickets-updated", at: Date.now(), epoch });
    } catch {
      /* ignore */
    }
  }
}

function invalidateTicketsMemoryCache() {
  ticketsMemoryCache = null;
}

function initTicketsCrossTabSync() {
  window.addEventListener("storage", (event) => {
    if (event.key !== LOCAL_KEY && event.key !== LOCAL_BACKUP_KEY) return;
    invalidateTicketsMemoryCache();
    scheduleRenderTickets({ immediate: true });
  });

  if (typeof BroadcastChannel === "function") {
    try {
      ticketsBroadcastChannel = new BroadcastChannel(TICKETS_BROADCAST_CHANNEL);
      ticketsBroadcastChannel.addEventListener("message", (event) => {
        if (event?.data?.type !== "tickets-updated") return;
        // Ignore our own write — invalidating here races in-flight saves and can
        // re-render from a stale merge that landed in localStorage microseconds later.
        if (Number(event?.data?.epoch) === ticketsWriteEpoch) return;
        invalidateTicketsMemoryCache();
        scheduleRenderTickets({ immediate: true });
      });
    } catch (error) {
      console.warn("BroadcastChannel unavailable for ticket sync.", error);
    }
  }
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
  panel.classList.toggle("has-attachments", panel.children.length > 0);
  syncTicketNotesHiddenInput(editor, hiddenInput);
}

function clearNotesAttachmentDropIndicators(panel) {
  panel?.querySelectorAll(".ticket-notes-attachment-item.is-drop-before, .ticket-notes-attachment-item.is-drop-after")
    .forEach((row) => row.classList.remove("is-drop-before", "is-drop-after"));
}

function initNotesAttachmentDragDrop(panel, editor, hiddenInput) {
  if (!panel || panel.dataset.attachmentDragReady === "true") return;
  panel.dataset.attachmentDragReady = "true";

  let dragRow = null;
  let dragPointerId = null;
  let dragActive = false;
  let startX = 0;
  let startY = 0;

  const cleanupDrag = () => {
    dragRow?.classList.remove("is-dragging");
    clearNotesAttachmentDropIndicators(panel);
    panel.classList.remove("is-reordering-attachments");
    dragRow = null;
    dragPointerId = null;
    dragActive = false;
  };

  const rowAtPoint = (x, y) => {
    panel.querySelectorAll(".ticket-notes-attachment-item.is-dragging").forEach((row) => {
      row.style.pointerEvents = "none";
    });
    const target = document.elementFromPoint(x, y)?.closest(".ticket-notes-attachment-item") || null;
    panel.querySelectorAll(".ticket-notes-attachment-item.is-dragging").forEach((row) => {
      row.style.pointerEvents = "";
    });
    return target;
  };

  const showDropIndicator = (target, clientX) => {
    clearNotesAttachmentDropIndicators(panel);
    if (!target || target === dragRow) return;
    const rect = target.getBoundingClientRect();
    target.classList.add(clientX < rect.left + rect.width / 2 ? "is-drop-before" : "is-drop-after");
  };

  panel.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".ticket-notes-attachment-drag-handle");
    if (!handle || event.button !== 0) return;

    const row = handle.closest(".ticket-notes-attachment-item");
    if (!row) return;

    event.preventDefault();
    dragRow = row;
    dragPointerId = event.pointerId;
    dragActive = false;
    startX = event.clientX;
    startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
  });

  panel.addEventListener("pointermove", (event) => {
    if (dragPointerId !== event.pointerId || !dragRow) return;

    if (!dragActive) {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (moved < 6) return;
      dragActive = true;
      dragRow.classList.add("is-dragging");
      panel.classList.add("is-reordering-attachments");
    }

    event.preventDefault();
    showDropIndicator(rowAtPoint(event.clientX, event.clientY), event.clientX);
  });

  const finishDrag = (event) => {
    if (dragPointerId !== event.pointerId || !dragRow) return;

    if (dragActive) {
      const target = rowAtPoint(event.clientX, event.clientY);
      if (target && target !== dragRow) {
        const rect = target.getBoundingClientRect();
        if (event.clientX < rect.left + rect.width / 2) {
          target.before(dragRow);
        } else {
          target.after(dragRow);
        }
        syncTicketNotesHiddenInput(editor, hiddenInput);
      }
    }

    try {
      event.target.closest(".ticket-notes-attachment-drag-handle")?.releasePointerCapture?.(event.pointerId);
    } catch (_error) {
      /* ignore */
    }
    cleanupDrag();
  };

  panel.addEventListener("pointerup", finishDrag);
  panel.addEventListener("pointercancel", finishDrag);
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

  initNotesAttachmentDragDrop(panel, editor, hiddenInput);
  panel.replaceChildren();
  attachments.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ticket-notes-attachment-item";
    row.dataset.src = item.src || "";
    row.dataset.driveUrl = item.driveUrl || "";

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "ticket-notes-attachment-drag-handle";
    dragHandle.setAttribute("aria-label", `Drag screenshot ${index + 1} to reorder`);
    dragHandle.title = "Drag to reorder";
    dragHandle.innerHTML = "<span aria-hidden=\"true\"></span><span aria-hidden=\"true\"></span>";

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

    row.append(dragHandle, previewTile, removeButton, removeLink);
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

function stripPresentationTag(text) {
  // Legacy cleanup: older builds stored [PRESENTATION] in Notes for starring.
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[PRESENTATION\]$/i.test(line))
    .join("\n")
    .replace(/\[PRESENTATION\]/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildNotesTextForSheet(ticket) {
  let text = stripPresentationTag(stripScreenshotMetadata(cleanText(ticket.Remarks || ticket.Notes || "")));
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

function canonicalizeTicketDate(value) {
  const sanitized = sanitizeDateField(value);
  if (!sanitized) return "";
  const key = normalizeDateKey(sanitized);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : sanitized;
}

function ticketIdentityKey(ticket) {
  return `${cleanText(ticket.Task)}||${cleanText(ticket.Owner)}`;
}

function ticketStableId(ticket) {
  return cleanText(ticket?.ticketId || ticket?.TicketId || "");
}

function ticketsMatchIdentity(left, right) {
  if (!left || !right) return false;
  const leftId = ticketStableId(left);
  const rightId = ticketStableId(right);
  if (leftId && rightId) return leftId === rightId;
  return ticketIdentityKey(left) === ticketIdentityKey(right);
}

function normalizeNotesForCompare(ticket) {
  const raw = String(ticket?.Notes || ticket?.Remarks || "");
  return cleanText(stripPresentationTag(stripScreenshotMetadata(raw)));
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
        .filter((entry) => entry && (entry.key || entry.ticketId))
        .slice(-200)
    )
  );
}

function markDeletedTicketTombstone({ sheetRow, task, owner, ticketId = "" }) {
  const entries = readDeletedTicketTombstones();
  entries.push({
    // Keep sheetRow only for diagnostics — never match tombstones by row alone
    // (deleteRow / soft-delete successors can occupy the same number).
    sheetRow: Number(sheetRow) || 0,
    ticketId: cleanText(ticketId),
    key: ticketIdentityKey({ Task: task, Owner: owner }),
    at: Date.now()
  });
  writeDeletedTicketTombstones(entries);
}

function isDeletedTicketTombstone(ticket) {
  const key = ticketIdentityKey(ticket);
  const ticketId = ticketStableId(ticket);
  const cutoff = Date.now() - 86400000;
  return readDeletedTicketTombstones().some((entry) => {
    if ((entry.at || 0) < cutoff) return false;
    if (ticketId && entry.ticketId && entry.ticketId === ticketId) return true;
    if (key && entry.key === key) return true;
    return false;
  });
}

function reconcileDeletedTicketTombstones(remoteTickets) {
  const remoteKeys = new Set(remoteTickets.map(ticketIdentityKey));
  const remoteIds = new Set(remoteTickets.map(ticketStableId).filter(Boolean));
  const stillNeeded = readDeletedTicketTombstones().filter((entry) => {
    if (Date.now() - (entry.at || 0) > 86400000) return false;
    if (entry.ticketId && remoteIds.has(entry.ticketId)) return true;
    if (entry.key && remoteKeys.has(entry.key)) return true;
    return false;
  });
  writeDeletedTicketTombstones(stillNeeded);
}

function yieldToUi() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function scheduleIdleWork(fn, timeoutMs = 1200) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      try { fn(); } catch (error) { console.error(error); }
    }, { timeout: timeoutMs });
    return;
  }
  window.setTimeout(() => {
    try { fn(); } catch (error) { console.error(error); }
  }, Math.min(timeoutMs, 200));
}

function getActiveTabName() {
  return document.querySelector(".tab-button.active")?.dataset.tab || "dashboard";
}

let secondaryPanelsRenderToken = 0;
let lastSheetRefreshAt = 0;
let bootRefreshInProgress = false;
let ticketTableLimit = TABLE_PAGE_SIZE;
let projectTableLimit = TABLE_PAGE_SIZE;
let lastRenderedTicketsSignature = "";
let lastFilterUiSignature = "";
let lastDashboardRecentToken = 0;
let renderTicketsDebounceTimer = 0;
let pendingRenderTicketsOptions = null;

function computeTicketsDataSignature(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  let out = String(list.length);
  for (let i = 0; i < list.length; i += 1) {
    const ticket = list[i];
    out += `|${ticket.sheetRow || ""}:${ticket.Status || ""}:${ticket.Priority || ""}:${ticket.Owner || ""}:${ticket.Task || ""}:${ticket.Milestone || ""}:${ticket["End date"] || ""}:${ticket.parentSheetRow || ""}:${String(ticket.Notes || ticket.Remarks || "").length}`;
  }
  return out;
}

function getFilterUiSignature() {
  return [
    ticketSearchFilter?.value || "",
    ticketSortFilter?.value || "",
    ticketStatusFilterPanel ? getMultiFilterValues(ticketStatusFilterPanel).join(",") : "",
    ticketOwnerFilterPanel ? getMultiFilterValues(ticketOwnerFilterPanel).join(",") : "",
    ticketTypeFilterPanel ? getMultiFilterValues(ticketTypeFilterPanel).join(",") : "",
    ticketPriorityFilterPanel ? getMultiFilterValues(ticketPriorityFilterPanel).join(",") : "",
    ticketBhanuFilterPanel ? getMultiFilterValues(ticketBhanuFilterPanel).join(",") : "",
    projectSearchFilter?.value || "",
    projectSortFilter?.value || "",
    projectStatusFilterPanel ? getMultiFilterValues(projectStatusFilterPanel).join(",") : "",
    projectOwnerFilterPanel ? getMultiFilterValues(projectOwnerFilterPanel).join(",") : "",
    projectRaisedByFilterPanel ? getMultiFilterValues(projectRaisedByFilterPanel).join(",") : "",
    projectTypeFilterPanel ? getMultiFilterValues(projectTypeFilterPanel).join(",") : "",
    projectPriorityFilterPanel ? getMultiFilterValues(projectPriorityFilterPanel).join(",") : ""
  ].join("|");
}

function resetTablePageLimits() {
  ticketTableLimit = TABLE_PAGE_SIZE;
  projectTableLimit = TABLE_PAGE_SIZE;
}

function scheduleRenderTickets(options = {}) {
  pendingRenderTicketsOptions = {
    ...(pendingRenderTicketsOptions || {}),
    ...options
  };
  if (options.immediate) {
    if (renderTicketsDebounceTimer) {
      window.clearTimeout(renderTicketsDebounceTimer);
      renderTicketsDebounceTimer = 0;
    }
    const opts = pendingRenderTicketsOptions || {};
    pendingRenderTicketsOptions = null;
    renderTickets(opts);
    return;
  }
  if (renderTicketsDebounceTimer) return;
  renderTicketsDebounceTimer = window.setTimeout(() => {
    renderTicketsDebounceTimer = 0;
    const opts = pendingRenderTicketsOptions || {};
    pendingRenderTicketsOptions = null;
    renderTickets(opts);
  }, 48);
}

function mergeRemoteTicketsWithLocal(remoteTickets) {
  const remote = Array.isArray(remoteTickets) ? remoteTickets : [];
  const localTickets = readTickets();
  const localBySheetRow = new Map();
  const localByTicketId = new Map();
  localTickets.forEach((ticket) => {
    const row = Number(ticket.sheetRow);
    if (row) localBySheetRow.set(row, ticket);
    const id = ticketStableId(ticket);
    if (id) localByTicketId.set(id, ticket);
  });

  if (!remote.length) {
    const existing = localTickets.filter((ticket) => cleanText(ticket.Task));
    if (existing.length) {
      return existing.map((ticket) => normalizeTicket(ticket));
    }
  }

  const merged = remote
    .filter((ticket) => !isDeletedTicketTombstone(ticket))
    .filter((ticket) => cleanText(ticket.Status) !== SOFT_DELETED_STATUS)
    .map((ticket, index) => mergeTicketFromSheet({
    ...ticket,
    sheetRow: ticket.sheetRow ?? index + 2
  }, index, localBySheetRow, localByTicketId));
  const mergedKeys = new Set(merged.map(ticketIdentityKey));
  const mergedIds = new Set(merged.map(ticketStableId).filter(Boolean));
  const now = Date.now();

  localTickets.forEach((local) => {
    if (!cleanText(local.Task)) return;
    if (cleanText(local.Status) === SOFT_DELETED_STATUS) return;
    const id = ticketStableId(local);
    if (id && mergedIds.has(id)) return;
    const key = ticketIdentityKey(local);
    if (!id && mergedKeys.has(key)) return;

    const pending = Number(local.pendingSheetSync) || 0;
    const isRecentPending = pending && (now - pending < UNSYNCED_LOCAL_RETENTION_MS);
    const isUnsynced = !Number(local.sheetRow);
    if (!isRecentPending && !isUnsynced) return;

    merged.push(normalizeTicket(local));
    mergedKeys.add(key);
    if (id) mergedIds.add(id);
  });

  return merged;
}

const PENDING_SYNC_FIELD_KEYS = [
  "Task",
  "Priority",
  "Owner",
  "Raised By",
  "Status",
  "Type",
  "Start date",
  "End date",
  "Milestone",
  "Notes",
  "Remarks",
  "Bhanu List",
  "parentSheetRow"
];

function ticketFieldMatches(field, local, remote) {
  if (!local || !remote) return false;
  switch (field) {
    case "Task":
      return cleanText(local.Task) === cleanText(remote.Task);
    case "Priority":
      return normalizePriority(local.Priority) === normalizePriority(remote.Priority);
    case "Owner":
      return cleanText(local.Owner) === cleanText(remote.Owner);
    case "Raised By":
      return cleanText(local["Raised By"]) === cleanText(remote["Raised By"]);
    case "Status":
      return cleanText(local.Status) === cleanText(remote.Status);
    case "Type":
      return cleanText(local.Type) === cleanText(remote.Type);
    case "Start date":
      return ticketDatesMatch(local["Start date"], remote["Start date"]);
    case "End date":
      return ticketDatesMatch(local["End date"], remote["End date"]);
    case "Milestone":
      return ticketDatesMatch(local.Milestone, remote.Milestone);
    case "Notes":
    case "Remarks":
      return normalizeNotesForCompare(local) === normalizeNotesForCompare(remote);
    case "Bhanu List":
      return cleanText(local["Bhanu List"]) === cleanText(remote["Bhanu List"]);
    case "parentSheetRow":
      return Number(local.parentSheetRow || 0) === Number(remote.parentSheetRow || 0);
    default:
      return cleanText(local[field]) === cleanText(remote[field]);
  }
}

function ticketCoreFieldsMatch(local, remote) {
  if (!local || !remote) return false;
  return PENDING_SYNC_FIELD_KEYS.every((field) => {
    if (field === "Remarks") return true; // covered by Notes compare
    return ticketFieldMatches(field, local, remote);
  });
}

function normalizePendingFieldsList(fields) {
  if (!Array.isArray(fields)) return [];
  const allowed = new Set(PENDING_SYNC_FIELD_KEYS);
  const seen = new Set();
  const out = [];
  fields.forEach((field) => {
    const key = String(field || "").trim();
    if (!key || !allowed.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(key);
    if (key === "Notes" && !seen.has("Remarks")) {
      seen.add("Remarks");
      out.push("Remarks");
    }
    if (key === "Remarks" && !seen.has("Notes")) {
      seen.add("Notes");
      out.push("Notes");
    }
  });
  return out;
}

function diffPendingTicketFields(before, after) {
  if (!after) return [];
  if (!before) return PENDING_SYNC_FIELD_KEYS.slice();
  return PENDING_SYNC_FIELD_KEYS.filter((field) => {
    if (field === "Remarks") return false;
    return !ticketFieldMatches(field, before, after);
  });
}

function stillPendingTicketFields(local, remote, pendingFields) {
  // null/undefined = legacy pending without a field list → protect every differing field.
  // Explicit [] = nothing left to protect.
  if (Array.isArray(pendingFields) && pendingFields.length === 0) return [];
  const tracked = pendingFields == null
    ? PENDING_SYNC_FIELD_KEYS.filter((field) => field !== "Remarks")
    : normalizePendingFieldsList(pendingFields);
  return tracked.filter((field) => {
    if (field === "Remarks") return false;
    return !ticketFieldMatches(field, local, remote);
  });
}

function mergeTicketFromSheet(remoteTicket, index, localBySheetRow = null, localByTicketId = null) {
  const sheetRow = remoteTicket.sheetRow ?? index + 2;
  const rowKey = Number(sheetRow);
  const remoteId = ticketStableId(remoteTicket);
  let local = null;
  if (remoteId && localByTicketId?.has(remoteId)) {
    local = localByTicketId.get(remoteId);
  } else if (localBySheetRow) {
    local = localBySheetRow.get(rowKey);
  } else {
    local = readTickets().find((ticket) => {
      if (remoteId && ticketStableId(ticket) === remoteId) return true;
      return Number(ticket.sheetRow) === rowKey;
    });
  }
  const notesRaw = [remoteTicket.Notes, remoteTicket.Remarks].filter(Boolean).join("\n");
  const screenshotUrls = dedupeScreenshotUrls([
    ...collectTicketScreenshotUrls({ ...remoteTicket, NotesRaw: notesRaw }),
    ...collectScreenshotUrlsFromHtml(local?.NotesHtml || "")
  ]);
  const notesHtml = ensureTicketNotesHtml(
    { NotesHtml: local?.NotesHtml || remoteTicket.NotesHtml },
    screenshotUrls
  );

  const pending = Number(local?.pendingSheetSync) || 0;
  const isRecentPending = pending > 0 && (Date.now() - pending < PENDING_SYNC_TTL_MS);
  // Per-field pending: only keep local values that still differ from remote for fields
  // this client actually edited. Matching fields take remote so a Notes/Bhanu mismatch
  // cannot resurrect a stale Milestone/Status/Owner forever.
  const rawPendingFields = local?.pendingFields;
  const remainingPendingFields = (Boolean(local) && isRecentPending)
    ? stillPendingTicketFields(
      local,
      remoteTicket,
      Array.isArray(rawPendingFields) ? normalizePendingFieldsList(rawPendingFields) : null
    )
    : [];
  const preservePendingEdits = remainingPendingFields.length > 0;

  const preserveFields = {};
  if (preservePendingEdits) {
    const preserveKeys = new Set(remainingPendingFields);
    if (preserveKeys.has("Notes")) preserveKeys.add("Remarks");
    PENDING_SYNC_FIELD_KEYS.forEach((field) => {
      if (!preserveKeys.has(field)) return;
      if (field === "Priority") {
        preserveFields.Priority = normalizePriority(local.Priority);
        return;
      }
      if (field === "parentSheetRow") {
        preserveFields.parentSheetRow = local.parentSheetRow;
        return;
      }
      preserveFields[field] = local[field];
    });
    preserveFields.ticketId = local.ticketId || remoteTicket.ticketId;
    preserveFields.submissionId = local.submissionId;
    preserveFields.lastUpdated = local.lastUpdated;
    preserveFields.pendingFields = remainingPendingFields;
  }

  return normalizeTicket({
    ...remoteTicket,
    ...preserveFields,
    ticketId: preserveFields.ticketId || remoteTicket.ticketId || local?.ticketId || "",
    sheetRow,
    NotesRaw: preservePendingEdits && remainingPendingFields.includes("Notes")
      ? String(local.Notes || local.Remarks || notesRaw || "")
      : notesRaw,
    NotesHtml: notesHtml,
    ScreenshotUrls: screenshotUrls,
    pendingSheetSync: preservePendingEdits ? pending : 0,
    pendingFields: preservePendingEdits ? remainingPendingFields : []
  });
}

function ticketNotesIncludeDriveLinks(ticket) {
  return extractDriveLinksFromNotes(ticket).length > 0;
}

function ticketHasPendingScreenshotUploads(ticket) {
  if (!ticket) return false;
  return extractNoteAttachments(ticket.NotesHtml || "")
    .some((attachment) => /^data:image\//i.test(attachment.dataUrl || ""));
}

function ticketHasLocalScreenshotsOnly(ticket) {
  return ticketHasPendingScreenshotUploads(ticket);
}

async function autoUploadTicketScreenshots(ticket, identitySource = null) {
  if (!ticket?.sheetRow || !ticketHasPendingScreenshotUploads(ticket)) {
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
    const identity = rowIdentityFields(ticket, identitySource || ticket);
    const result = await postToSheetWithResponse({
      action: "uploadAttachments",
      sheetRow: ticket.sheetRow,
      Task: ticket.Task,
      Owner: ticket.Owner,
      ticketId: ticketStableId(ticket) || undefined,
      identityTask: identity.identityTask,
      identityOwner: identity.identityOwner,
      Notes: notesBase,
      Remarks: notesBase,
      attachments
    }, {
      expectedTicket: ticket
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Screenshot upload failed.");
    }

    const uploadedCount = Number(result.uploadedCount) || 0;
    if (uploadedCount <= 0) {
      throw new Error(result?.error || "Screenshot upload did not save any files to Drive.");
    }

    if (result.notes) {
      applyDriveLinksToLocalTicket(ticket.sheetRow, result.notes);
    }

    const refreshed = findTicketBySheetRow(ticket.sheetRow);
    if (refreshed && !ticketHasPendingScreenshotUploads(refreshed)) {
      return { ok: true, uploadedCount };
    }

    return { ok: false, error: "Screenshot upload finished but local copies are still pending." };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

let screenshotSyncInProgress = false;

async function syncPendingScreenshotsToDrive(tickets = getValidTickets()) {
  if (!SHEET_WEB_APP_URL || screenshotSyncInProgress) return { uploaded: 0, failed: 0 };

  const pending = tickets.filter(ticketHasPendingScreenshotUploads);
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

  if (ticketHasPendingScreenshotUploads(ticket)) {
    const result = await autoUploadTicketScreenshots(ticket, activeEditTicket || ticket);
    if (result.ok && !result.skipped) {
      renderTickets();
      setStatus("online", "Screenshot saved to Google Drive");
      return true;
    }

    await refreshFromSheet({ skipScreenshotSync: true });
    const refreshed = findTicketBySheetRow(sheetRow);
    if (refreshed && !ticketHasPendingScreenshotUploads(refreshed)) {
      setStatus("online", "Screenshot saved to Google Drive");
      renderTickets();
      return true;
    }

    const detail = cleanText(result?.error?.message || result?.error || "");
    setStatus(
      "error",
      detail
        ? `Screenshot not saved to Drive — ${detail}`
        : "Screenshot saved locally but not on Drive — check Apps Script Drive setup"
    );
    return false;
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
  return stripPresentationTag(stripScreenshotMetadata(cleanText(ticket.Remarks || ticket.Notes || "")));
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
  const identity = rowIdentityFields(ticket);

  return {
    action: "uploadAttachments",
    sheetRow: ticket.sheetRow,
    Task: ticket.Task,
    Owner: ticket.Owner,
    ticketId: ticketStableId(ticket) || undefined,
    identityTask: identity.identityTask,
    identityOwner: identity.identityOwner,
    Notes: notesText,
    Remarks: notesText,
    attachments
  };
}

function rowIdentityFields(ticket, original = null) {
  const source = original || ticket || {};
  return {
    identityTask: cleanText(ticket?.identityTask || source.Task) || undefined,
    identityOwner: cleanText(ticket?.identityOwner || source.Owner) || undefined
  };
}

function buildTicketSheetPayload(ticket, options = {}) {
  const attachments = extractNoteAttachments(ticket.NotesHtml || "");
  const notesText = buildNotesTextForSheet(ticket);
  // Skip Drive uploads in the critical-path POST; screenshots upload after the row write.
  const includeAttachments = options.deferAttachments !== true;
  const identity = rowIdentityFields(ticket);

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
    "Bhanu List": ticket["Bhanu List"],
    ticketId: ticketStableId(ticket) || undefined,
    identityTask: identity.identityTask,
    identityOwner: identity.identityOwner,
    submissionId: cleanText(ticket.submissionId) || undefined,
    lastUpdated: cleanText(ticket.lastUpdated) || undefined,
    expectedStatus: cleanText(ticket.expectedStatus || ticket.lastKnownStatus) || undefined
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
    "Start date": canonicalizeTicketDate(ticket["Start date"]),
    "End date": canonicalizeTicketDate(ticket["End date"]),
    Milestone: canonicalizeTicketDate(ticket.Milestone),
    parentSheetRow: Number(ticket.parentSheetRow || ticket["Parent Sheet Row"]) || 0,
    Notes: remarks,
    Remarks: remarks,
    NotesHtml: notesHtml,
    NotesRaw: notesRaw,
    ScreenshotUrls: screenshotUrls,
    "Bhanu List": cleanText(ticket["Bhanu List"]),
    ticketId: cleanText(ticket.ticketId || ticket.TicketId || ticket["Ticket ID"] || ""),
    submissionId: cleanText(ticket.submissionId || ""),
    sheetRow: Number(ticket.sheetRow) || 0,
    pendingSheetSync: Number(ticket.pendingSheetSync) || 0,
    pendingFields: normalizePendingFieldsList(ticket.pendingFields),
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

// Employee Work period relevance: Origin (Start date) OR End date OR Milestone.
// Type ("Daily - *"), closedOn, and createdOn alone do not qualify a ticket.
function ticketPeriodDateChecks(ticket) {
  return [
    { label: "Origin", date: parseTicketDate(ticket["Start date"]) },
    { label: "End", date: parseTicketDate(ticket["End date"]) },
    { label: "Milestone", date: parseTicketDate(ticket.Milestone) }
  ];
}

function ticketPeriodDates(ticket) {
  return ticketPeriodDateChecks(ticket)
    .map((entry) => entry.date)
    .filter(Boolean);
}

function ticketRelevantInPeriod(ticket, periodId = selectedPerformancePeriod) {
  if (periodId === "all") return true;
  return ticketPeriodDates(ticket).some((date) => dateInPerformancePeriod(date, periodId));
}

function getTicketPeriodMatchLabel(ticket, periodId = selectedPerformancePeriod) {
  if (periodId === "all") return "";
  const match = ticketPeriodDateChecks(ticket).find((entry) =>
    dateInPerformancePeriod(entry.date, periodId)
  );
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

/** Normalize Presentation type dropdown → "all" | "SAP" | "Infra". */
function normalizePresentationTypeFilter(value) {
  const raw = cleanText(value).toLowerCase();
  if (raw === "sap") return "SAP";
  if (raw === "infra") return "Infra";
  return "all";
}

function getActivePresentationTypeFilter() {
  // Prefer live DOM so browser form restore / programmatic value changes stay in sync.
  return normalizePresentationTypeFilter(
    presentationTypeFilter?.value ?? selectedPresentationType ?? "all"
  );
}

function ticketMatchesPresentationType(ticket, typeFilter = getActivePresentationTypeFilter()) {
  const selected = normalizePresentationTypeFilter(typeFilter);
  if (selected === "SAP") return isExactSapType(ticket?.Type);
  if (selected === "Infra") return isExactInfraType(ticket?.Type);
  return true;
}

function syncPresentationFiltersFromDom() {
  selectedPresentationType = getActivePresentationTypeFilter();
  if (presentationOwnerFilter) {
    selectedPresentationOwner = cleanText(presentationOwnerFilter.value) || "all";
  }
}

function isPresentationEligible(ticket) {
  // Exact Type SAP or Infra only (not Daily - SAP / Daily - Infra).
  return isProjectTypeTicket(ticket);
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

function actorIsOwnerManager(ownerName, user = Auth.currentUser()) {
  const owner = cleanText(ownerName);
  if (!owner || !user) return false;
  const hierarchy = readHierarchyRows();
  const ownerEntry = hierarchy.find((entry) => matchesHierarchyIdentity(owner, entry.user));
  if (!ownerEntry?.manager) return false;
  const manager = getManagerForOwner(owner, hierarchy);
  if (!manager?.user) return false;
  const actorName = cleanText(user?.name) || cleanText(user?.username);
  const actorEmail = cleanText(user?.email).toLowerCase();
  if (matchesHierarchyIdentity(actorName, manager.user)) return true;
  if (actorEmail && manager.email && actorEmail === manager.email.toLowerCase()) return true;
  return false;
}

function ownerRequiresManagerApproval(ownerName) {
  const owner = cleanText(ownerName);
  if (!owner) return false;
  const hierarchy = readHierarchyRows();
  const ownerEntry = hierarchy.find((entry) => matchesHierarchyIdentity(owner, entry.user));
  if (!ownerEntry?.manager) return false;
  const manager = getManagerForOwner(owner, hierarchy);
  return Boolean(manager?.user);
}

function shouldRequireCompletionApproval(ticket, user = Auth.currentUser()) {
  const owner = cleanText(ticket?.Owner);
  if (!owner || !isTicketCompleted(ticket)) return false;
  if (!ownerRequiresManagerApproval(owner)) return false;
  return !actorIsOwnerManager(owner, user);
}

function isExactProjectType(type) {
  return isExactSapType(type) || isExactInfraType(type);
}

function typeEnteredProjectType(nextType, previousType) {
  // Exact SAP / Infra only — not Daily - SAP / Daily - Infra.
  return isExactProjectType(nextType) && !isExactProjectType(previousType);
}

function shouldRequireProjectTypeApproval(ticket, previousTicket = null, user = Auth.currentUser()) {
  if (!typeEnteredProjectType(ticket?.Type, previousTicket?.Type)) return false;
  const owner = cleanText(ticket?.Owner);
  if (!owner) return false;
  if (!ownerRequiresManagerApproval(owner)) return false;
  return !actorIsOwnerManager(owner, user);
}

/** "completion" | "project-type" | "" — completion wins when both apply. */
function getRequiredApprovalKind(ticket, previousTicket = null, user = Auth.currentUser()) {
  if (shouldRequireCompletionApproval(ticket, user)) return "completion";
  if (shouldRequireProjectTypeApproval(ticket, previousTicket, user)) return "project-type";
  return "";
}

function applyTicketApprovalPreview(ticket, previousTicket = null) {
  if (!getRequiredApprovalKind(ticket, previousTicket)) return ticket;
  return { ...ticket, Status: "Pending Approval" };
}

function applyCompletionApprovalPreview(ticket, previousTicket = null) {
  return applyTicketApprovalPreview(ticket, previousTicket);
}

function reconcileSyncedTicketStatus(ticket, result = {}, expected = {}) {
  const serverStatus = cleanText(result.status);
  const expectedStatus = cleanText(expected.Status);
  // Approval workflow may rewrite Completed / working status → Pending Approval; honor that.
  if (serverStatus && expectedStatus && serverStatus !== expectedStatus) {
    if (/^pending approval$/i.test(serverStatus) && !/^pending approval$/i.test(expectedStatus)) {
      return serverStatus;
    }
    // Prefer the value we just saved — ack/status echo can lag and snap the UI back.
    if (expected.sheetRow || ticketStableId(expected)) {
      return expectedStatus;
    }
  }
  if (serverStatus) return serverStatus;
  if (shouldRequireCompletionApproval({ ...ticket, ...expected, Status: "Completed" })
    && /^completed$/i.test(expectedStatus)) {
    return "Pending Approval";
  }
  if (isPendingApprovalStatus(ticket.Status) || isPendingApprovalStatus(expectedStatus)) {
    return "Pending Approval";
  }
  return cleanText(expected.Status || ticket.Status);
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
    ticketEditApprovalNote.textContent = isProjectTypeTicket(ticket)
      ? `Awaiting your approval for ${ticket.Owner}. Set status to Not started or In progress to approve project type ${ticket.Type}, or Completed to approve closure.`
      : `Awaiting your approval. Set status to Completed to approve closure for ${ticket.Owner}.`;
  } else {
    ticketEditApprovalNote.textContent = isProjectTypeTicket(ticket)
      ? `Awaiting manager approval from ${managerName} for project type ${ticket.Type}.`
      : `Awaiting manager approval from ${managerName}.`;
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
      .filter((ticket) => ticket.Task && cleanText(ticket.Status) !== SOFT_DELETED_STATUS)
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
    input.addEventListener("change", onTicketFormOwnerChange);
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

const DAILY_SAP_TYPE = "Daily - SAP";
let surajCreateDefaultsActive = false;
let ticketCreateTypeTouched = false;
let ticketCreateMilestoneTouched = false;

function ownersIncludeSuraj(owners = getNewTicketOwners()) {
  return owners.some((owner) => String(owner || "").trim().toLowerCase() === "suraj");
}

function resetSurajTicketCreateTracking() {
  surajCreateDefaultsActive = false;
  ticketCreateTypeTouched = false;
  ticketCreateMilestoneTouched = false;
}

function applySurajTicketCreateDefaults({ force = false } = {}) {
  if (!form) return;
  const hasSuraj = ownersIncludeSuraj();
  if (!hasSuraj) {
    surajCreateDefaultsActive = false;
    return;
  }

  // Apply when Suraj is newly selected, or when the create modal opens fresh with Suraj.
  const shouldApply = force || !surajCreateDefaultsActive;
  if (!shouldApply) return;

  if (force || !ticketCreateTypeTouched) {
    const typeField = form.elements.Type;
    if (typeField) {
      const option = [...typeField.options].find((entry) => entry.value === DAILY_SAP_TYPE || entry.textContent === DAILY_SAP_TYPE);
      typeField.value = option ? option.value : DAILY_SAP_TYPE;
    }
  }
  if (force || !ticketCreateMilestoneTouched) {
    const milestoneField = form.elements.Milestone;
    if (milestoneField) milestoneField.value = getTodayDateValue();
  }
  surajCreateDefaultsActive = true;
}

function onTicketFormOwnerChange() {
  updateTicketFormOwnerLabel();
  applySurajTicketCreateDefaults();
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
  const signature = computeTicketsDataSignature(tickets);
  if (signature !== lastFilterTicketSignature) {
    lastFilterTicketSignature = signature;
    populateFilterOptions(tickets);
  }

  const projectTickets = getProjectTickets(tickets);
  const projectSignature = computeTicketsDataSignature(projectTickets);
  if (projectSignature !== lastProjectFilterTicketSignature) {
    lastProjectFilterTicketSignature = projectSignature;
    populateProjectFilterOptions(tickets);
  }
}

function ticketSearchHaystack(ticket) {
  return [
    ticket.Task,
    ticket.Remarks,
    ticket["Raised By"],
    ticket.Owner,
    ticket.Type,
    ticket.Status
  ].join(" ").toLowerCase();
}

function expandFilteredTicketsWithSubtaskFamily(filteredTickets, sourceTickets) {
  const filtered = Array.isArray(filteredTickets) ? filteredTickets : [];
  const source = Array.isArray(sourceTickets) ? sourceTickets : [];
  if (!filtered.length || !source.length) return filtered;

  const keyOf = (ticket) => Number(ticket.sheetRow) || ticketIdentityKey(ticket);
  const included = new Map();
  filtered.forEach((ticket) => included.set(keyOf(ticket), ticket));

  const byRow = new Map();
  source.forEach((ticket) => {
    const row = Number(ticket.sheetRow);
    if (row) byRow.set(row, ticket);
  });

  // Parents that matched filters themselves — keep their children visible.
  const matchedParentRows = new Set();
  filtered.forEach((ticket) => {
    if (isSubtaskTicket(ticket)) return;
    const row = Number(ticket.sheetRow);
    if (row) matchedParentRows.add(row);
  });

  source.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    if (!matchedParentRows.has(parentRow)) return;
    included.set(keyOf(ticket), ticket);
  });

  // Subtasks that matched — keep their parent visible for context.
  filtered.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    const parent = byRow.get(parentRow);
    if (!parent || isSubtaskTicket(parent)) return;
    included.set(keyOf(parent), parent);
  });

  // Preserve filteredTickets order (e.g. after sort). Do not fall back to source
  // order — that would pull Daily SAP/Infra subtasks into type clusters away from parents.
  const childrenByParent = new Map();
  included.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    if (!parentRow || !included.has(parentRow)) return;
    if (!childrenByParent.has(parentRow)) childrenByParent.set(parentRow, []);
    childrenByParent.get(parentRow).push(ticket);
  });

  const result = [];
  const placed = new Set();

  const pushTicket = (ticket) => {
    if (!ticket) return;
    const key = keyOf(ticket);
    if (placed.has(key) || !included.has(key)) return;
    result.push(included.get(key));
    placed.add(key);
  };

  const pushFamily = (parentTicket) => {
    pushTicket(parentTicket);
    const parentRow = Number(parentTicket?.sheetRow);
    if (!parentRow) return;
    (childrenByParent.get(parentRow) || []).forEach((child) => pushTicket(child));
  };

  filtered.forEach((ticket) => {
    const key = keyOf(ticket);
    if (placed.has(key)) return;

    if (isSubtaskTicket(ticket)) {
      const parentRow = Number(ticket.parentSheetRow);
      const parent = included.get(parentRow) || byRow.get(parentRow);
      if (parent && included.has(keyOf(parent)) && !isSubtaskTicket(parent)) {
        pushFamily(parent);
        return;
      }
      pushTicket(ticket);
      return;
    }

    pushFamily(included.get(key) || ticket);
  });

  included.forEach((ticket) => {
    if (placed.has(keyOf(ticket))) return;
    if (isSubtaskTicket(ticket)) {
      const parent = included.get(Number(ticket.parentSheetRow));
      if (parent && !isSubtaskTicket(parent) && !placed.has(keyOf(parent))) {
        pushFamily(parent);
        return;
      }
    }
    pushTicket(ticket);
  });

  return result;
}

/** When the search query changes, expand parents that have children in the result once. Later toggles are honored. */
function autoExpandParentsForNewSearch(searchQuery, tickets, scope = "tickets") {
  const query = cleanText(searchQuery).toLowerCase();
  const previous = scope === "projects" ? lastProjectSearchQueryForExpand : lastTicketSearchQueryForExpand;
  if (!query) {
    if (scope === "projects") lastProjectSearchQueryForExpand = "";
    else lastTicketSearchQueryForExpand = "";
    return;
  }
  if (query === previous) return;
  if (scope === "projects") lastProjectSearchQueryForExpand = query;
  else lastTicketSearchQueryForExpand = query;

  const parentRowsWithChildren = new Set();
  const parentsWithMatchedCompletedChild = new Set();
  tickets.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    if (!parentRow) return;
    parentRowsWithChildren.add(parentRow);
    if (isTicketCompleted(ticket) && ticketSearchHaystack(ticket).includes(query)) {
      parentsWithMatchedCompletedChild.add(parentRow);
    }
  });
  parentRowsWithChildren.forEach((parentRow) => {
    setSubtaskParentCollapsed(parentRow, false, scope);
    if (parentsWithMatchedCompletedChild.has(parentRow)) {
      setSessionShowCompletedSubtasks(parentRow, true, scope);
    }
  });
}

function applyTicketFilters(tickets) {
  const search = cleanText(ticketSearchFilter.value).toLowerCase();
  const statusValues = getMultiFilterValues(ticketStatusFilterPanel);
  const ownerValues = getMultiFilterValues(ticketOwnerFilterPanel);
  const typeValues = getMultiFilterValues(ticketTypeFilterPanel);
  const priorityValues = getMultiFilterValues(ticketPriorityFilterPanel);
  const bhanuValues = getMultiFilterValues(ticketBhanuFilterPanel);

  const filtered = tickets.filter((ticket) => {
    if (statusValues.length && !statusValues.includes(ticket.Status)) return false;
    if (ownerValues.length && !ownerValues.includes(ticket.Owner)) return false;
    if (typeValues.length && !typeValues.includes(ticket.Type)) return false;
    if (priorityValues.length && !priorityValues.includes(ticket.Priority)) return false;
    if (bhanuValues.length && !bhanuValues.includes(getTicketOriginalOwnerValue(ticket))) return false;
    if (!search) return true;
    return ticketSearchHaystack(ticket).includes(search);
  });

  // Always keep parent↔subtask families together across type/status/owner filters.
  return expandFilteredTicketsWithSubtaskFamily(filtered, tickets);
}

function applyProjectFilters(tickets) {
  const search = cleanText(projectSearchFilter?.value).toLowerCase();
  const statusValues = getMultiFilterValues(projectStatusFilterPanel);
  const ownerValues = getMultiFilterValues(projectOwnerFilterPanel);
  const raisedByValues = getMultiFilterValues(projectRaisedByFilterPanel);
  const typeValues = getMultiFilterValues(projectTypeFilterPanel);
  const priorityValues = getMultiFilterValues(projectPriorityFilterPanel);

  const filtered = tickets.filter((ticket) => {
    if (statusValues.length && !statusValues.includes(ticket.Status)) return false;
    if (ownerValues.length && !ownerValues.includes(ticket.Owner)) return false;
    if (raisedByValues.length && !raisedByValues.includes(ticket["Raised By"])) return false;
    if (typeValues.length) {
      const selectedTypes = typeValues.map((value) => String(value).trim().toLowerCase());
      if (!selectedTypes.includes(String(ticket.Type || "").trim().toLowerCase())) return false;
    }
    if (priorityValues.length && !priorityValues.includes(ticket.Priority)) return false;
    if (!search) return true;
    return ticketSearchHaystack(ticket).includes(search);
  });

  // Always keep parent↔subtask families together (e.g. Daily SAP under a project parent).
  return expandFilteredTicketsWithSubtaskFamily(filtered, tickets);
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
  const canonical = canonicalizeTicketDate(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(canonical)) {
    const [year, month, day] = canonical.split("-");
    return `${Number(day)}/${Number(month)}/${year}`;
  }
  const text = String(value);
  if (text.includes("/")) return text;
  return text;
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

  const filtered = tickets.filter((ticket) => {
    if (!showCompleted && kanbanColumnId(ticket.Status) === "completed") return false;
    if (owner && ticket.Owner !== owner) return false;
    if (priority && normalizePriority(ticket.Priority) !== priority) return false;
    if (!search) return true;
    return ticketSearchHaystack(ticket).includes(search);
  });

  return search ? expandFilteredTicketsWithSubtaskFamily(filtered, tickets) : filtered;
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

function shortenStatusMessageForMobile(message) {
  const text = String(message || "");
  if (/^Could not refresh tickets$/i.test(text)) return "Refresh failed";
  if (/^Could not refresh procurement$/i.test(text)) return "Procure sync failed";
  if (/^Refreshing procurement\.\.\.$/i.test(text)) return "Refreshing…";
  if (/^Procurement refreshed$/i.test(text)) return "Procure updated";
  if (/^Using cached tickets$/i.test(text)) return "Cached tickets";
  if (/^Refreshing tickets\.\.\.$/i.test(text)) return "Refreshing…";
  if (/^Ready to sync$/i.test(text)) return "Ready";
  if (/^Loaded (\d+) tickets$/i.test(text)) return text.replace(/^Loaded (\d+) tickets$/i, "$1 tickets");
  if (/^Auto-refreshed at /i.test(text)) return "Updated";
  if (/^Synced$/i.test(text)) return "Synced";
  return text;
}

function setStatus(kind, message) {
  const display = isMobileNavLayout() ? shortenStatusMessageForMobile(message) : message;
  const dotClass = `status-dot ${kind || ""}`.trim();
  if (statusDot) statusDot.className = dotClass;
  if (syncText) syncText.textContent = display;
  if (syncCard) syncCard.title = message || "";
  if (topbarExpandStatusDot) topbarExpandStatusDot.className = dotClass;
  if (topbarExpandSyncText) topbarExpandSyncText.textContent = display;
  if (topbarExpandStatus) topbarExpandStatus.title = message || "";
}

function setActiveTab(tabName, options = {}) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });

  if (activeTabLabel) {
    activeTabLabel.textContent = TAB_LABELS[tabName] || tabName;
  }
  const pageTitle = TAB_LABELS[tabName] || tabName;
  if (topbarPageTitle) topbarPageTitle.textContent = pageTitle;
  if (topbarExpandPageTitle) topbarExpandPageTitle.textContent = pageTitle;

  if (options.skipRender) return;

  // Paint only the newly visible panel from cache — avoid rebuilding every table.
  if (tabName === "dashboard" || tabName === "tickets" || tabName === "projects") {
    renderTickets({ activeOnly: true, forcePanel: tabName });
  } else if (tabName === "presentation") {
    renderPresentationView();
  } else if (tabName === "performance" || tabName === "kanban") {
    secondaryPanelsRenderToken += 1;
    renderSecondaryTicketPanels(getValidTickets());
  }

  if (tabName !== "presentation") {
    setPresentMode(false);
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

function setTopbarCollapsed(collapsed, { persist = true } = {}) {
  const apply = Boolean(collapsed) && isMobileNavLayout();
  document.body.classList.toggle("topbar-collapsed", apply);
  if (topbarExpandBar) {
    topbarExpandBar.hidden = !apply;
  }
  collapseTopbarButton?.setAttribute("aria-expanded", apply ? "false" : "true");
  expandTopbarButton?.setAttribute("aria-expanded", apply ? "false" : "true");
  if (persist) {
    localStorage.setItem(TOPBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }
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

  const openMobileSidebar = () => {
    setSidebarCollapsed(false);
  };
  expandSidebarButton?.addEventListener("click", openMobileSidebar);
  expandSidebarButtonCompact?.addEventListener("click", openMobileSidebar);

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
    syncTopbarCollapseForViewport();
  };

  if (typeof MOBILE_NAV_MQ.addEventListener === "function") {
    MOBILE_NAV_MQ.addEventListener("change", onViewportChange);
  } else if (typeof MOBILE_NAV_MQ.addListener === "function") {
    MOBILE_NAV_MQ.addListener(onViewportChange);
  }
}

function getStoredTopbarCollapsedPreference() {
  const stored = localStorage.getItem(TOPBAR_COLLAPSED_KEY);
  // First mobile visit (and legacy unset): default collapsed to free content space.
  if (stored === null || stored === "") return true;
  return stored === "1";
}

function syncTopbarCollapseForViewport() {
  if (!isMobileNavLayout()) {
    setTopbarCollapsed(false, { persist: false });
    return;
  }
  setTopbarCollapsed(getStoredTopbarCollapsedPreference(), { persist: false });
}

function initTopbarCollapse() {
  syncTopbarCollapseForViewport();

  collapseTopbarButton?.addEventListener("click", () => {
    setTopbarCollapsed(true);
  });

  expandTopbarButton?.addEventListener("click", () => {
    setTopbarCollapsed(false);
  });
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

function setPresentationHeroCollapsed(collapsed, { persist = true } = {}) {
  const on = Boolean(collapsed);
  presentationHero?.classList.toggle("is-collapsed", on);
  presentationBoard?.classList.toggle("presentation-hero-collapsed", on);
  if (togglePresentationHeroButton) {
    togglePresentationHeroButton.setAttribute("aria-expanded", on ? "false" : "true");
    const mobile = isPresentationMobileLayout();
    togglePresentationHeroButton.textContent = on
      ? "Show filters"
      : (mobile ? "Hide" : "Hide filters");
  }
  if (persist) {
    localStorage.setItem(PRESENTATION_HERO_COLLAPSED_KEY, on ? "1" : "0");
  }
}

const PRESENTATION_HERO_MQ = window.matchMedia("(max-width: 768px)");

function isPresentationMobileLayout() {
  return PRESENTATION_HERO_MQ.matches;
}

function getStoredPresentationHeroCollapsedPreference() {
  const stored = localStorage.getItem(PRESENTATION_HERO_COLLAPSED_KEY);
  // Phones: default collapsed so the Kanban fills the screen immediately.
  if (isPresentationMobileLayout()) {
    if (stored === null) return true;
    return stored === "1";
  }
  if (stored === null) return false;
  return stored === "1";
}

function syncPresentationHeroForViewport() {
  if (document.body.classList.contains("present-mode")) {
    // Keep Type/Time filters on the present top row unless the user hid them.
    return;
  }
  setPresentationHeroCollapsed(getStoredPresentationHeroCollapsedPreference(), { persist: false });
}

function initPresentationHeroCollapse() {
  if (!presentationHero || !togglePresentationHeroButton) return;
  syncPresentationHeroForViewport();
  togglePresentationHeroButton.addEventListener("click", () => {
    setPresentationHeroCollapsed(!presentationHero.classList.contains("is-collapsed"));
  });
  const onViewportChange = () => syncPresentationHeroForViewport();
  if (typeof PRESENTATION_HERO_MQ.addEventListener === "function") {
    PRESENTATION_HERO_MQ.addEventListener("change", onViewportChange);
  } else if (typeof PRESENTATION_HERO_MQ.addListener === "function") {
    PRESENTATION_HERO_MQ.addListener(onViewportChange);
  }
}

function getFullscreenElement() {
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
    || null;
}

function requestAppFullscreen(target = document.documentElement) {
  const request = target.requestFullscreen
    || target.webkitRequestFullscreen
    || target.webkitRequestFullScreen
    || target.msRequestFullscreen;
  if (!request) return Promise.resolve(false);
  try {
    return Promise.resolve(request.call(target)).then(() => true).catch(() => false);
  } catch (_error) {
    return Promise.resolve(false);
  }
}

function exitAppFullscreen() {
  if (!getFullscreenElement()) return Promise.resolve();
  const exit = document.exitFullscreen
    || document.webkitExitFullscreen
    || document.webkitCancelFullScreen
    || document.msExitFullscreen;
  if (!exit) return Promise.resolve();
  try {
    return Promise.resolve(exit.call(document)).catch(() => {});
  } catch (_error) {
    return Promise.resolve();
  }
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

/** When the user selects Status = Completed, default End date to today (overwrite). */
function onTicketStatusChangeForEndDate(event) {
  const statusField = event?.target;
  if (!statusField || statusClass(statusField.value) !== "status-completed") return;
  const formElement = statusField.form;
  const endDateField = formElement?.elements?.["End date"];
  if (!endDateField) return;
  endDateField.value = getTodayDateValue();
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

const PERFORMANCE_TYPE_FALLBACKS = ["Daily - Infra", "Daily - SAP", "SAP", "Infra"];

function getPerformanceTypes(tickets) {
  const types = new Set(PERFORMANCE_TYPE_FALLBACKS);
  tickets.forEach((ticket) => {
    const type = cleanText(ticket.Type);
    if (type) types.add(type);
  });
  return [...types].sort((a, b) => a.localeCompare(b));
}

function populatePerformanceTypeFilter(tickets) {
  if (!performanceTypeFilter) return;
  const selected = performanceTypeFilter.value;
  const types = getPerformanceTypes(tickets);
  performanceTypeFilter.innerHTML = [
    '<option value="">All types</option>',
    ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
  ].join("");
  if (types.includes(selected) || selected === "") {
    performanceTypeFilter.value = selected;
  }
}

function filterTicketsByPerformanceType(tickets, typeValue = cleanText(performanceTypeFilter?.value)) {
  if (!typeValue) return tickets;
  return tickets.filter((ticket) => cleanText(ticket.Type) === typeValue);
}

function getPerformanceFilteredTickets(tickets = getValidTickets()) {
  let result = filterTicketsByPerformancePeriod(tickets, selectedPerformancePeriod);
  result = filterTicketsByPerformanceType(result);
  const selectedOwner = cleanText(performanceOwnerFilter?.value);
  if (selectedOwner) {
    result = result.filter((ticket) => cleanText(ticket.Owner) === selectedOwner);
  } else {
    result = result.filter((ticket) => isValidOwnerName(ticket.Owner));
  }
  return sortTicketsForPeriodDisplay(result);
}

function downloadPerformanceCsv() {
  downloadCsv(getPerformanceFilteredTickets(), "tarmal-employee-work");
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

  let parentLine = "";
  if (isSubtaskTicket(ticket)) {
    const parent = getParentTicket(ticket);
    const parentTitle = cleanText(parent?.Task) || (ticket.parentSheetRow ? `Row ${ticket.parentSheetRow}` : "");
    if (parentTitle) {
      parentLine = `
        <div class="perf-matrix-parent" title="Sub-task of: ${escapeHtml(parentTitle)}">
          <span class="perf-matrix-parent-label">Sub-task of:</span>
          <span class="perf-matrix-parent-task">${escapeHtml(parentTitle)}</span>
        </div>
      `;
    }
  }

  return `
    <div class="perf-matrix-task ${statusClass(ticket.Status)}${isTicketOverdue(ticket) ? " perf-matrix-overdue" : ""}">
      <div class="perf-matrix-task-head">
        <div class="perf-matrix-task-title" title="${escapeHtml(ticket.Task || "Untitled")}">${escapeHtml(ticket.Task || "Untitled")}</div>
        ${editButton}
      </div>
      ${parentLine}
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
  populatePerformanceOwnerFilter(tickets);
  populatePerformanceTypeFilter(tickets);

  const selectedType = cleanText(performanceTypeFilter?.value);
  const periodTickets = filterTicketsByPerformanceType(
    filterTicketsByPerformancePeriod(tickets, periodId),
    selectedType
  );

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

  const typeSuffix = selectedType ? ` · ${selectedType}` : "";
  performanceSubtitle.textContent = selectedOwner
    ? `${stats.assigned} tasks for ${selectedOwner} in ${periodLabel}${typeSuffix} · ${stats.completionRate}% completed`
    : `${scopedTickets.length} tasks across ${owners.length} employees in ${periodLabel}${typeSuffix} · ${stats.completionRate}% completed`;

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

/** Drop legacy collapse maps so v2 force-collapse prefs cannot hide open children. */
function purgeLegacySubtaskCollapsePrefs() {
  try {
    if (localStorage.getItem(SUBTASK_COLLAPSE_KEY_LEGACY) != null) {
      localStorage.removeItem(SUBTASK_COLLAPSE_KEY_LEGACY);
    }
    if (localStorage.getItem(SUBTASK_COLLAPSE_KEY_V2) != null) {
      localStorage.removeItem(SUBTASK_COLLAPSE_KEY_V2);
    }
  } catch {
    /* ignore */
  }
}

/** Panel-specific collapse prefs: { tickets: { row: bool }, projects: { row: bool } }. Legacy flat { row: true } migrates to tickets. */
function readCollapsedSubtaskParents() {
  purgeLegacySubtaskCollapsePrefs();
  try {
    const parsed = JSON.parse(localStorage.getItem(SUBTASK_COLLAPSE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { tickets: {}, projects: {} };
    }
    const hasPanelKeys = Object.prototype.hasOwnProperty.call(parsed, "tickets")
      || Object.prototype.hasOwnProperty.call(parsed, "projects");
    if (!hasPanelKeys) {
      // Legacy flat map of collapsed parents — keep under tickets only.
      return { tickets: parsed, projects: {} };
    }
    return {
      tickets: parsed.tickets && typeof parsed.tickets === "object" && !Array.isArray(parsed.tickets)
        ? parsed.tickets
        : {},
      projects: parsed.projects && typeof parsed.projects === "object" && !Array.isArray(parsed.projects)
        ? parsed.projects
        : {}
    };
  } catch {
    return { tickets: {}, projects: {} };
  }
}

function normalizeSubtaskCollapsePanel(panel) {
  return panel === "projects" ? "projects" : "tickets";
}

/** Default when no saved preference: tickets expanded, projects collapsed. */
function defaultSubtaskParentCollapsed(panel) {
  return normalizeSubtaskCollapsePanel(panel) === "projects";
}

/** Whether this session is showing completed children for a parent. */
function isSessionShowingCompletedSubtasks(sheetRow, panel = "tickets") {
  const scope = normalizeSubtaskCollapsePanel(panel);
  const row = Number(sheetRow);
  return Boolean(row && sessionExpandedCompletedParents[scope]?.has(row));
}

function setSessionShowCompletedSubtasks(sheetRow, show, panel = "tickets") {
  const scope = normalizeSubtaskCollapsePanel(panel);
  const row = Number(sheetRow);
  if (!row) return;
  if (!sessionExpandedCompletedParents[scope]) {
    sessionExpandedCompletedParents[scope] = new Set();
  }
  if (show) sessionExpandedCompletedParents[scope].add(row);
  else sessionExpandedCompletedParents[scope].delete(row);
}

/**
 * Collapse state for a parent row.
 * Tickets default expanded (open children visible); completed children are filtered
 * separately via session show-completed until the user reveals them.
 */
function isSubtaskParentCollapsed(sheetRow, panel = "tickets") {
  const scope = normalizeSubtaskCollapsePanel(panel);
  const key = String(sheetRow);
  const state = readCollapsedSubtaskParents()[scope] || {};
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    return Boolean(state[key]);
  }
  return defaultSubtaskParentCollapsed(scope);
}

function setSubtaskParentCollapsed(sheetRow, collapsed, panel = "tickets") {
  const scope = normalizeSubtaskCollapsePanel(panel);
  const all = readCollapsedSubtaskParents();
  const state = { ...(all[scope] || {}) };
  const key = String(sheetRow);
  const row = Number(sheetRow);
  const nextCollapsed = Boolean(collapsed);
  // Always persist explicit preference so panel defaults only apply when unset.
  state[key] = nextCollapsed;
  all[scope] = state;
  localStorage.setItem(SUBTASK_COLLAPSE_KEY, JSON.stringify(all));

  // Collapsing clears show-completed; expanding does not auto-reveal completed kids.
  if (nextCollapsed) {
    setSessionShowCompletedSubtasks(row, false, scope);
  }
}

/** Hide completed subtasks while parent is expanded but show-completed is off. */
function isCompletedSubtaskHidden(ticket, panel) {
  if (!isSubtaskTicket(ticket) || !isTicketCompleted(ticket)) return false;
  const parentRow = Number(ticket.parentSheetRow);
  if (!parentRow) return false;
  return !isSessionShowingCompletedSubtasks(parentRow, panel);
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
  resetSurajTicketCreateTracking();
  applyDefaultTicketFormOwner();
  applySurajTicketCreateDefaults({ force: true });
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
  resetSurajTicketCreateTracking();
  applyDefaultTicketFormOwner();
  applySurajTicketCreateDefaults({ force: true });
  if (form?.elements?.Status) {
    form.elements.Status.value = "Not started";
  }
  form?.elements.Task?.focus();
}

const duplicateTicketInFlight = new Set();

function clearDuplicateTicketInFlight({ rerender = true } = {}) {
  if (!duplicateTicketInFlight.size) return;
  duplicateTicketInFlight.clear();
  if (rerender) renderTickets({ force: true, activeOnly: true });
}

function closeTicketCreateModal() {
  if (!ticketCreateModal) return;
  ticketCreateModal.hidden = true;
  resetTicketCreateParent();
  clearDuplicateTicketInFlight();
  if (ticketEditModal?.hidden && screenshotPreviewModal?.hidden) {
    document.body.classList.remove("modal-open");
  }
}

function openTicketEditor(sheetRow, options = {}) {
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
  let typeValue = ticket.Type || "Daily - Infra";
  if (options.preferSapType && !isProjectTypeTicket(ticket)) {
    typeValue = "SAP";
  }
  ticketEditForm.elements.Type.value = typeValue;
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
  if (options.preferSapType && !isProjectTypeTicket(ticket)) {
    ticketEditForm.elements.Type?.focus();
  } else {
    ticketEditForm.elements.Task.focus();
  }
}

function closeTicketEditor() {
  if (!ticketEditModal) return;
  if (ticketEditSubmitInFlight || ticketEditDeleteInFlight) return;
  closeTicketDeleteConfirm();
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
  resetTicketEditSaveUi();
}

function ticketFromEditForm() {
  const data = new FormData(ticketEditForm);
  const sheetRow = resolveEditingSheetRow(data, activeEditTicket || {});
  return normalizeTicket(applyTicketNotesToPayload({
    ...ticketFromFormData(data),
    sheetRow,
    ticketId: ticketStableId(activeEditTicket) || createTicketId(),
    lastUpdated: cleanText(activeEditTicket?.lastUpdated) || ""
  }, ticketEditNotesEditor));
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
  const ticket = findTicketBySheetRow(sheetRow) || (ticketStableId(expected)
    ? getValidTickets().find((entry) => ticketStableId(entry) === ticketStableId(expected))
    : null);
  if (!ticket) return;

  if (result.conflict || result.stale) {
    setStatus("error", result.error || "Ticket was updated elsewhere — refresh and try again.");
  }

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

  const hasExpectedUpdate = Boolean(expected.sheetRow) || Boolean(ticketStableId(expected));
  const milestone = hasExpectedUpdate
    ? String(expected.Milestone ?? "").trim()
    : coalesceSyncValue(result.milestone, ticket.Milestone);
  const startDate = hasExpectedUpdate
    ? String(expected["Start date"] ?? "").trim()
    : coalesceSyncValue(result.startDate, ticket["Start date"]);
  const endDate = hasExpectedUpdate
    ? String(expected["End date"] ?? "").trim()
    : coalesceSyncValue(result.endDate, ticket["End date"]);

  const syncedStatus = reconcileSyncedTicketStatus(ticket, result, expected);
  const serverLastUpdated = cleanText(result.lastUpdated) || cleanText(ticket.lastUpdated);

  // Prefer the values we just saved for every core field. Ack payloads can omit or
  // echo stale columns; refresh merge clears pending once the GET catches up.
  const nextTicket = normalizeTicket({
    ...ticket,
    ...expected,
    Priority: expected.Priority ?? ticket.Priority,
    Owner: expected.Owner ?? ticket.Owner,
    "Raised By": expected["Raised By"] ?? ticket["Raised By"],
    Type: expected.Type ?? ticket.Type,
    "Bhanu List": expected["Bhanu List"] ?? ticket["Bhanu List"],
    parentSheetRow: expected.parentSheetRow ?? ticket.parentSheetRow,
    Status: syncedStatus,
    Milestone: milestone,
    "Start date": startDate,
    "End date": endDate,
    Notes: hasExpectedUpdate
      ? String(expected.Notes ?? expected.Remarks ?? ticket.Notes ?? "")
      : (notes || ticket.Notes),
    Remarks: hasExpectedUpdate
      ? String(expected.Remarks ?? expected.Notes ?? ticket.Remarks ?? "")
      : (notes || ticket.Remarks),
    NotesHtml: notesHtml,
    ticketId: cleanText(result.ticketId) || ticketStableId(ticket) || ticketStableId(expected),
    sheetRow: Number(result.sheetRow) || Number(sheetRow) || ticket.sheetRow,
    lastUpdated: serverLastUpdated
  });

  // If Drive returned links, fold them into local notes without dropping pending edits.
  if (sheetLinks.length && hasExpectedUpdate) {
    const merged = mergeDriveLinksIntoLocalNotes(nextTicket, notes);
    if (merged) {
      nextTicket.Notes = merged.notes;
      nextTicket.Remarks = merged.notes;
      nextTicket.NotesHtml = merged.notesHtml || nextTicket.NotesHtml;
    }
  } else if (sheetLinks.length && !hasExpectedUpdate) {
    nextTicket.Notes = notes || nextTicket.Notes;
    nextTicket.Remarks = notes || nextTicket.Remarks;
  }

  const trackedPending = normalizePendingFieldsList(
    expected.pendingFields?.length
      ? expected.pendingFields
      : (ticket.pendingFields?.length
        ? ticket.pendingFields
        : diffPendingTicketFields(ticket, { ...ticket, ...expected, Status: syncedStatus }))
  );

  // Never clear pending from the ack alone — the ack echoes our write and a concurrent
  // stale GET would otherwise snap every field back. mergeTicketFromSheet clears
  // per-field pending once the sheet GET matches.
  updateLocalTicket({
    ...nextTicket,
    pendingFields: trackedPending
  }, {
    clearPendingSync: trackedPending.length === 0,
    keepPendingSync: trackedPending.length > 0,
    pendingFields: trackedPending
  });
}

function mergeDriveLinksIntoLocalNotes(ticket, notesText) {
  const links = extractDriveLinksFromNotes({ Notes: notesText, Remarks: notesText });
  if (!links.length) return null;
  const localRemarks = stripScreenshotMetadata(ticket.Notes || ticket.Remarks || "");
  const linkBlock = links
    .map((url, index) => `Screenshot ${index + 1}: ${url}`)
    .join("\n");
  const mergedText = localRemarks ? `${localRemarks}\n${linkBlock}` : linkBlock;
  const notesHtml = buildNotesHtmlFromParts(
    localRemarks,
    links.map((url) => ({ src: url, driveUrl: url }))
  );
  return { notes: mergedText, notesHtml };
}

function applyDriveLinksToLocalTicket(sheetRow, notesText) {
  const notes = String(notesText || "").trim();
  if (!notes || !extractDriveLinksFromNotes({ Notes: notes, Remarks: notes }).length) {
    return;
  }

  const ticket = findTicketBySheetRow(sheetRow);
  if (!ticket) return;

  const localRemarks = normalizeNotesForCompare(ticket);
  const remoteRemarks = normalizeNotesForCompare({ Notes: notes, Remarks: notes });
  const remarksDiverge = Boolean(localRemarks) && Boolean(remoteRemarks) && localRemarks !== remoteRemarks;
  const pending = Number(ticket.pendingSheetSync) || 0;

  if (remarksDiverge || pending > 0) {
    const merged = mergeDriveLinksIntoLocalNotes(ticket, notes);
    if (!merged) return;
    updateLocalTicket(normalizeTicket({
      ...ticket,
      Notes: merged.notes,
      Remarks: merged.notes,
      NotesHtml: merged.notesHtml || ticket.NotesHtml
    }), {
      keepPendingSync: true,
      pendingFields: normalizePendingFieldsList([
        ...(ticket.pendingFields || []),
        ...(pending > 0 ? [] : ["Notes"])
      ])
    });
    return;
  }

  // No in-flight edits — adopt Drive links from sheet without touching other fields.
  updateLocalTicket(normalizeTicket({
    ...ticket,
    Notes: notes,
    Remarks: notes,
    NotesHtml: buildNotesHtmlFromDriveLinks({ Notes: notes, Remarks: notes })
  }), { keepPendingSync: true, pendingFields: ticket.pendingFields || [] });
}

function truncateForLog(text, max = 240) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function looksLikeHtmlResponse(text) {
  const head = String(text || "").trim().slice(0, 80).toLowerCase();
  return head.startsWith("<!doctype")
    || head.startsWith("<html")
    || head.startsWith("<head")
    || head.startsWith("<body")
    || head.startsWith("<pre")
    || head.startsWith("<div");
}

function tryParseJsonText(candidate) {
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false };
  }
}

function isAppsScriptResponseShape(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  if (typeof parsed.ok === "boolean") return true;
  if (Number(parsed.sheetRow) > 0) return true;
  if (Array.isArray(parsed.results)) return true;
  if (Array.isArray(parsed.tickets)) return true;
  if (typeof parsed.notes === "string" && parsed.notes.length) return true;
  if (Number(parsed.uploadedCount) > 0) return true;
  if (Number(parsed.count) > 0) return true;
  return false;
}

function sheetSyncStatusesEquivalent(expectedStatus, remoteStatus) {
  const expected = cleanText(expectedStatus);
  const remote = cleanText(remoteStatus);
  if (!expected || expected === remote) return true;
  if (/^completed$/i.test(expected) && /^pending approval$/i.test(remote)) return true;
  if (/^pending approval$/i.test(expected) && /^completed$/i.test(remote)) return false;
  return false;
}

function ticketSaveAppearsOnSheet(expected, remote) {
  if (!expected || !remote) return false;

  const expectedTask = cleanText(expected.Task || expected.identityTask);
  const remoteTask = cleanText(remote.Task);
  if (expectedTask && remoteTask && expectedTask !== remoteTask) return false;

  const expectedOwner = cleanText(expected.Owner || expected.identityOwner);
  const remoteOwner = cleanText(remote.Owner);
  if (expectedOwner && remoteOwner && expectedOwner !== remoteOwner) return false;

  const expectedStatus = cleanText(expected.Status || expected.expectedStatus);
  if (expectedStatus && !sheetSyncStatusesEquivalent(expectedStatus, remote.Status)) return false;

  const comparableFields = ["Priority", "Type", "Milestone", "Start date", "End date", "Bhanu List"];
  let compared = 0;
  let matched = 0;
  comparableFields.forEach((field) => {
    const expectedValue = cleanText(expected[field]);
    if (!expectedValue) return;
    compared += 1;
    if (cleanText(remote[field]) === expectedValue) matched += 1;
  });

  const expectedNotes = normalizeNotesForCompare(expected);
  if (expectedNotes) {
    compared += 1;
    const remoteNotes = normalizeNotesForCompare(remote);
    if (remoteNotes === expectedNotes
      || remoteNotes.includes(expectedNotes)
      || expectedNotes.includes(remoteNotes)) {
      matched += 1;
    }
  }

  if (!compared) {
    return Boolean(cleanText(remote.Task) && cleanText(remote.Owner));
  }
  return matched >= Math.max(1, compared - 1);
}

function remoteTicketFromPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload.tickets) && payload.tickets.length === 1) {
    return payload.tickets[0];
  }
  if (cleanText(payload.Task) || Number(payload.sheetRow) > 0) {
    return payload;
  }
  return null;
}

function buildReconciledSyncResult(remote, payload, expectedTicket = null) {
  const source = expectedTicket || remoteTicketFromPayload(payload) || {};
  return {
    ok: true,
    reconciled: true,
    sheetRow: Number(remote.sheetRow) || Number(payload?.sheetRow) || 0,
    notes: String(remote.Notes || remote.Remarks || "").trim(),
    milestone: remote.Milestone || source.Milestone || "",
    startDate: remote["Start date"] || source["Start date"] || "",
    endDate: remote["End date"] || source["End date"] || "",
    status: remote.Status || source.Status || "",
    ticketId: ticketStableId(remote) || ticketStableId(source) || "",
    lastUpdated: cleanText(remote.lastUpdated) || cleanText(source.lastUpdated) || "",
    uploadedCount: Number(payload?.attachments?.length) || 0
  };
}

async function reconcileAmbiguousSheetSave(payload, expectedTicket = null) {
  if (!SHEET_WEB_APP_URL || !payload) return null;

  const action = String(payload.action || "").trim();
  const isTicketWrite = action === "updateTicket"
    || action === "uploadAttachments"
    || action === "createTickets"
    || (!action && (cleanText(payload.Task) || Number(payload.sheetRow) > 0));
  if (!isTicketWrite) return null;

  try {
    const remotePayload = await fetchTicketsViaHttp(22000, { lite: true });
    const remoteTickets = Array.isArray(remotePayload?.tickets) ? remotePayload.tickets : [];
    if (!remoteTickets.length) return null;

    if (action === "createTickets" && Array.isArray(payload.tickets)) {
      const results = payload.tickets.map((ticket) => {
        const remote = remoteTickets.find((entry) => {
          const submissionId = cleanText(ticket.submissionId);
          if (submissionId && cleanText(entry.submissionId) === submissionId) return true;
          const ticketId = ticketStableId(ticket);
          if (ticketId && ticketStableId(entry) === ticketId) return true;
          return ticketIdentityKey(entry) === ticketIdentityKey(ticket);
        });
        if (!remote || !ticketSaveAppearsOnSheet(ticket, remote)) {
          return { ok: false };
        }
        return buildReconciledSyncResult(remote, { tickets: [ticket] }, ticket);
      });
      const successCount = results.filter((item) => item.ok !== false).length;
      if (!successCount) return null;
      return {
        ok: true,
        reconciled: true,
        count: successCount,
        results
      };
    }

    const expected = expectedTicket || remoteTicketFromPayload(payload);
    if (!expected) return null;

    const sheetRow = Number(expected.sheetRow || payload.sheetRow) || 0;
    let remote = sheetRow
      ? remoteTickets.find((entry) => Number(entry.sheetRow) === sheetRow)
      : null;

    if (!remote) {
      const ticketId = ticketStableId(expected);
      if (ticketId) {
        remote = remoteTickets.find((entry) => ticketStableId(entry) === ticketId) || null;
      }
    }
    if (!remote) {
      remote = remoteTickets.find((entry) => ticketIdentityKey(entry) === ticketIdentityKey(expected)) || null;
    }
    if (!remote || !ticketSaveAppearsOnSheet(expected, remote)) return null;

    return buildReconciledSyncResult(remote, payload, expected);
  } catch (error) {
    console.warn("Ambiguous sheet save reconciliation failed:", error);
    return null;
  }
}

/**
 * Apps Script should return JSON via ContentService, but Google sometimes
 * answers with HTML/JS error pages. Never let a raw SyntaxError bubble to alert().
 */
function parseAppsScriptResponseText(text, options = {}) {
  const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();

  if (!raw) {
    const error = new Error("Empty response from Apps Script. Ticket may still be saved — click Refresh.");
    error.sheetSyncParseError = true;
    throw error;
  }

  // Rare gateway / legacy tokens
  if (/^(ok|success|true)$/i.test(raw)) {
    return { ok: true, assumedOk: true };
  }

  let parsed = tryParseJsonText(raw);
  if (parsed.ok && isAppsScriptResponseShape(parsed.value)) return parsed.value;

  // Tolerate callback(...) JSONP envelopes (same soft-parse path as auth users sync).
  const jsonpMatch = raw.match(/^[a-zA-Z_$][\w$]*\s*\(\s*([\s\S]*)\s\)\s*;?\s*$/);
  if (jsonpMatch) {
    parsed = tryParseJsonText(jsonpMatch[1]);
    if (parsed.ok && isAppsScriptResponseShape(parsed.value)) return parsed.value;
  }

  // Prefer a real JSON object that includes the "ok" key.
  const okObjectMatch = raw.match(/\{\s*"ok"\s*:[\s\S]*\}/);
  if (okObjectMatch) {
    parsed = tryParseJsonText(okObjectMatch[0]);
    if (parsed.ok && isAppsScriptResponseShape(parsed.value)) return parsed.value;
  }

  // Last resort: first {...} blob — still fully try/caught (never throw SyntaxError).
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    parsed = tryParseJsonText(braceMatch[0]);
    if (parsed.ok && isAppsScriptResponseShape(parsed.value)) return parsed.value;
  }

  console.error("Apps Script non-JSON response:", truncateForLog(raw));
  let message;
  if (looksLikeHtmlResponse(raw)) {
    message = "Sheet sync returned an HTML error page. The save may still have gone through — click Refresh to confirm.";
  } else if (options.httpStatus && Number(options.httpStatus) >= 500) {
    message = `Sheet sync server error (HTTP ${options.httpStatus}). Your changes may still be saved — click Refresh.`;
  } else {
    message = "Could not read a response from Apps Script. Your changes may still be saved — click Refresh.";
  }
  const error = new Error(message);
  error.sheetSyncParseError = true;
  throw error;
}

function isSheetSyncResponseParseError(error) {
  if (!error) return false;
  if (error.sheetSyncParseError === true) return true;
  if (error.name === "SyntaxError") return true;
  const raw = String(error.message || error || "");
  return /Unexpected token|Unterminated string|Expected property name|is not valid JSON/i.test(raw);
}

function friendlySheetSyncError(error) {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return "Saved locally, but sync failed";
  if (isSheetSyncResponseParseError(error)) {
    return "Saved locally, but sheet sync response was unclear. Click Refresh to confirm.";
  }
  if (/busy|lock|temporarily locked|try again shortly/i.test(raw)) {
    return "Sheet sync was temporarily locked after several retries. Your edits are saved locally — click Save again.";
  }
  return raw;
}

function isSheetBusyError(error) {
  return /busy|lock|temporarily locked|try again shortly/i.test(String(error?.message || error || ""));
}

function sleepMs(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function postToSheetWithResponse(payload, options = {}) {
  let body;
  try {
    body = JSON.stringify(payload);
  } catch (error) {
    console.error("Ticket payload stringify failed:", error);
    throw new Error("Could not prepare ticket data for sync (invalid notes or attachments).");
  }

  const maxAttempts = Number(options.retries) > 0 ? Number(options.retries) : BUSY_RETRY_ATTEMPTS;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let parsed = null;
    try {
      const response = await fetch(SHEET_WEB_APP_URL, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body
      });

      const text = await response.text();
      if (!response.ok && !String(text || "").trim()) {
        const httpError = new Error(`Sheet sync HTTP ${response.status}. Your changes may still be saved — click Refresh.`);
        httpError.sheetSyncParseError = true;
        throw httpError;
      }

      parsed = parseAppsScriptResponseText(text, { httpStatus: response.status });
    } catch (error) {
      if (isSheetSyncResponseParseError(error)) {
        const reconciled = await reconcileAmbiguousSheetSave(payload, options.expectedTicket);
        if (reconciled?.ok) {
          if (reconciled.reconciled) {
            setStatus("online", "Ticket saved — confirmed on sheet after an unclear response");
          }
          return reconciled;
        }
      }
      throw error;
    }

    if (parsed?.busy || /busy|lock timed out|could not obtain lock|temporarily locked/i.test(String(parsed?.error || ""))) {
      lastError = new Error(parsed?.error || "Sheet sync is temporarily locked.");
      if (attempt < maxAttempts) {
        const retryAfter = Number(parsed?.retryAfterMs) > 0
          ? Number(parsed.retryAfterMs)
          : BUSY_RETRY_DELAY_MS * attempt;
        if (typeof options.onBusy === "function") {
          options.onBusy(attempt, maxAttempts, retryAfter);
        } else {
          setStatus("", `Sheet sync busy — retrying (${attempt}/${maxAttempts - 1})…`);
        }
        await sleepMs(retryAfter);
        continue;
      }
      throw lastError;
    }

    if (parsed?.assumedOk && options.expectedTicket) {
      const reconciled = await reconcileAmbiguousSheetSave(payload, options.expectedTicket);
      if (reconciled?.ok) return reconciled;
    }

    return parsed;
  }

  throw lastError || new Error("Sheet sync failed.");
}

function updateLocalTicket(updatedTicket, options = {}) {
  const targetRow = Number(updatedTicket.sheetRow) || 0;
  const targetId = ticketStableId(updatedTicket);
  let matched = false;

  const tickets = readTickets().map((ticket) => {
    const sameRow = targetRow && Number(ticket.sheetRow) === targetRow;
    const sameTicketId = targetId && ticketStableId(ticket) === targetId;
    // Prefer stable sheetRow / ticketId. Never fan out by Task||Owner alone (rename hazard).
    const shouldUpdate = sameRow || sameTicketId
      || (!targetRow && !targetId && ticketsMatchIdentity(ticket, updatedTicket) && !Number(ticket.sheetRow));
    if (!shouldUpdate) return ticket;
    matched = true;

    let pendingSheetSync = Date.now();
    if (options.clearPendingSync) pendingSheetSync = 0;
    else if (options.keepPendingSync) pendingSheetSync = ticket.pendingSheetSync || Date.now();

    let pendingFields = [];
    if (options.clearPendingSync) {
      pendingFields = [];
    } else if (options.pendingFields) {
      pendingFields = normalizePendingFieldsList(options.pendingFields);
    } else if (options.keepPendingSync) {
      pendingFields = normalizePendingFieldsList(
        updatedTicket.pendingFields?.length ? updatedTicket.pendingFields : ticket.pendingFields
      );
    } else {
      const changed = diffPendingTicketFields(ticket, updatedTicket);
      pendingFields = normalizePendingFieldsList([
        ...(ticket.pendingFields || []),
        ...changed,
        ...(updatedTicket.pendingFields || [])
      ]);
    }

    if (!options.clearPendingSync && pendingFields.length && !pendingSheetSync) {
      pendingSheetSync = Date.now();
    }

    return normalizeTicket({
      ...ticket,
      ...updatedTicket,
      ticketId: targetId || ticketStableId(ticket) || createTicketId(),
      pendingSheetSync,
      pendingFields: pendingSheetSync ? pendingFields : []
    });
  });

  if (!matched && cleanText(updatedTicket.Task)) {
    tickets.push(normalizeTicket({
      ...updatedTicket,
      ticketId: targetId || createTicketId(),
      pendingSheetSync: options.clearPendingSync ? 0 : Date.now(),
      pendingFields: options.clearPendingSync
        ? []
        : normalizePendingFieldsList(
          options.pendingFields?.length
            ? options.pendingFields
            : (updatedTicket.pendingFields?.length ? updatedTicket.pendingFields : PENDING_SYNC_FIELD_KEYS)
        )
    }));
  }

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

  const identity = rowIdentityFields(
    { Task: task, Owner: owner, identityTask: task, identityOwner: owner },
    activeEditTicket
  );
  const result = await postToSheetWithResponse({
    action: "deleteTicket",
    sheetRow: Number(sheetRow),
    Task: task,
    Owner: owner,
    ticketId: ticketStableId(activeEditTicket || {}) || undefined,
    identityTask: identity.identityTask,
    identityOwner: identity.identityOwner
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Ticket delete failed.");
  }

  return { synced: true, ...result };
}

function resetTicketEditSaveUi() {
  const saveButton = ticketEditSaveButton || ticketEditForm?.querySelector('button[type="submit"]');
  if (!saveButton) return;
  saveButton.disabled = false;
  saveButton.classList.remove("is-saving", "is-loading");
  saveButton.textContent = "Save Changes";
}

function setTicketEditBusyState({ saving = false, deleting = false } = {}) {
  const busy = saving || deleting;
  const saveButton = ticketEditSaveButton || ticketEditForm?.querySelector('button[type="submit"]');

  if (saveButton) {
    saveButton.disabled = busy;
    saveButton.classList.toggle("is-saving", saving);
    if (saving) {
      saveButton.textContent = "Saving…";
    } else if (!deleting) {
      saveButton.textContent = "Save Changes";
      saveButton.classList.remove("is-saving", "is-loading");
    }
  }

  if (deleteTicketEditButton) {
    deleteTicketEditButton.disabled = busy;
    deleteTicketEditButton.classList.toggle("is-deleting", deleting);
    deleteTicketEditButton.textContent = deleting ? "Deleting…" : "Delete Task";
  }

  if (cancelTicketEditButton) cancelTicketEditButton.disabled = busy;
  if (closeTicketEditButton) closeTicketEditButton.disabled = busy;
  if (addSubtaskFromEditButton) addSubtaskFromEditButton.disabled = busy;
  if (confirmDeleteTicketButton) {
    confirmDeleteTicketButton.disabled = busy;
    confirmDeleteTicketButton.classList.toggle("is-deleting", deleting);
    confirmDeleteTicketButton.textContent = deleting ? "Deleting…" : "Yes, delete";
  }
  if (cancelDeleteTicketButton) cancelDeleteTicketButton.disabled = busy;
  if (closeTicketDeleteConfirmButton) closeTicketDeleteConfirmButton.disabled = busy;
}

function resetTicketDeleteUi() {
  closeTicketDeleteConfirm();
  if (deleteTicketEditButton) {
    deleteTicketEditButton.hidden = false;
    deleteTicketEditButton.disabled = false;
    deleteTicketEditButton.classList.remove("is-deleting");
    deleteTicketEditButton.textContent = "Delete Task";
  }
  if (confirmDeleteTicketButton) {
    confirmDeleteTicketButton.disabled = false;
    confirmDeleteTicketButton.classList.remove("is-deleting");
    confirmDeleteTicketButton.textContent = "Yes, delete";
  }
  if (cancelDeleteTicketButton) cancelDeleteTicketButton.disabled = false;
  if (closeTicketDeleteConfirmButton) closeTicketDeleteConfirmButton.disabled = false;
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

function openTicketDeleteConfirm(label) {
  if (!ticketDeleteConfirmModal) return false;
  const taskLabel = String(label || "this task").trim() || "this task";
  if (ticketDeleteConfirmTitle) {
    ticketDeleteConfirmTitle.textContent = "Delete this task permanently?";
  }
  if (ticketDeleteConfirmText) {
    ticketDeleteConfirmText.textContent = `Delete "${taskLabel}" permanently? This cannot be undone.`;
  }
  if (ticketDeleteError) ticketDeleteError.hidden = true;
  ticketDeleteConfirmModal.hidden = false;
  document.body.classList.add("modal-open");
  confirmDeleteTicketButton?.focus();
  return true;
}

function closeTicketDeleteConfirm() {
  if (!ticketDeleteConfirmModal || ticketDeleteConfirmModal.hidden) return;
  if (ticketEditDeleteInFlight) return;
  ticketDeleteConfirmModal.hidden = true;
  if (confirmDeleteTicketButton) {
    confirmDeleteTicketButton.disabled = false;
    confirmDeleteTicketButton.classList.remove("is-deleting");
    confirmDeleteTicketButton.textContent = "Yes, delete";
  }
  if (cancelDeleteTicketButton) cancelDeleteTicketButton.disabled = false;
  if (closeTicketDeleteConfirmButton) closeTicketDeleteConfirmButton.disabled = false;
}

function requestTicketDelete() {
  if (!canEditTickets()) {
    showTicketDeleteError("You do not have permission to delete tickets.");
    return;
  }
  if (!ticketEditForm || ticketEditDeleteInFlight || ticketEditSubmitInFlight) return;

  const sourceTicket = activeEditTicket || {};
  const label = String(sourceTicket.Task || ticketEditForm.elements.Task?.value || "this task").trim() || "this task";

  if (openTicketDeleteConfirm(label)) return;
  executeTicketDelete();
}

async function executeTicketDelete() {
  if (!canEditTickets()) {
    showTicketDeleteError("You do not have permission to delete tickets.");
    return;
  }
  if (!ticketEditForm || ticketEditDeleteInFlight || ticketEditSubmitInFlight) return;

  const sourceTicket = activeEditTicket || {};
  const data = new FormData(ticketEditForm);
  const task = String(sourceTicket.Task || data.get("Task") || "").trim();
  const owner = cleanText(sourceTicket.Owner || data.get("Owner") || "");
  let sheetRow = Number(sourceTicket.sheetRow) || resolveEditingSheetRow(data, sourceTicket);

  ticketEditDeleteInFlight = true;
  setTicketEditBusyState({ deleting: true });
  if (ticketDeleteError) ticketDeleteError.hidden = true;

  try {
    if (!sheetRow && task) {
      setStatus("", "Locating task row...");
      sheetRow = await ensureTicketSheetRow({ Task: task, Owner: owner, sheetRow: 0 });
    }

    if (!sheetRow) {
      removeLocalTicketByIdentity(task, owner);
      ticketEditDeleteInFlight = false;
      setTicketEditBusyState();
      resetTicketDeleteUi();
      closeTicketEditor();
      renderTickets();
      setStatus("ok", "Task removed locally");
      return;
    }

    setStatus("", "Deleting task...");
    await deleteTicketFromSheet(sheetRow, task, owner);
    markDeletedTicketTombstone({
      sheetRow,
      task,
      owner,
      ticketId: ticketStableId(activeEditTicket || {})
    });
    removeLocalTicket(sheetRow);
    removeLocalTicketByIdentity(task, owner);
    ticketEditDeleteInFlight = false;
    setTicketEditBusyState();
    resetTicketDeleteUi();
    closeTicketEditor();
    await refreshFromSheet({ skipScreenshotSync: true, force: true });
    setStatus("online", "Task deleted");
    renderTickets();
  } catch (error) {
    const message = error?.message || "Could not delete this task.";
    showTicketDeleteError(`${message} Click Refresh on the Tickets tab, then try again.`);
    setStatus("error", "Delete failed — task kept");
    ticketEditDeleteInFlight = false;
    setTicketEditBusyState();
    closeTicketDeleteConfirm();
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

  const result = await postToSheetWithResponse(
    buildTicketSheetPayload(ticket, { deferAttachments: true }),
    {
      expectedTicket: ticket,
      onBusy(attempt, maxAttempts) {
        setStatus("", `Sheet sync busy — retrying (${attempt}/${maxAttempts - 1})…`);
      }
    }
  );
  if (!result?.ok) {
    if (result?.conflict || result?.stale) {
      throw new Error(result?.error || "Ticket was updated elsewhere. Refresh and try again.");
    }
    throw new Error(result?.error || "Ticket update failed.");
  }

  if (result?.ok && (ticket.sheetRow || ticketStableId(ticket))) {
    applyTicketSyncResult(ticket.sheetRow, result, ticket);
  } else if (result.notes && ticket.sheetRow) {
    applyDriveLinksToLocalTicket(ticket.sheetRow, result.notes);
  }

  if (result.approvalPending) {
    if (result.approvalSentTo) {
      setStatus("online", `Approval email sent to ${result.approvalSentTo}`);
    } else if (result.approvalEmailError) {
      setStatus("error", `Pending approval saved — email failed: ${result.approvalEmailError}`);
    } else if (result.deferredApprovalEmail || result.deferredPostSave) {
      setStatus("online", "Pending approval saved — email will send shortly");
    } else {
      setStatus("online", "Sent for manager approval (check Tasks sheet Approval Email Sent column)");
    }
  } else if (result.approved) {
    setStatus("online", result.approvalMessage || "Approved");
  } else {
    setStatus("online", result.uploadedCount
      ? "Screenshot saved to Google Drive"
      : (result.parentRemarkAppended ? "Sub-task completed — parent task updated" : "Ticket updated"));
  }

  // Prefer local parent-notes ack over a blocking full-sheet refresh after save.
  if (result.parentRemarkAppended) {
    const parentRow = Number(result.parentSheetRow) || 0;
    if (parentRow && result.parentNotes) {
      applyDriveLinksToLocalTicket(parentRow, result.parentNotes);
    } else {
      window.setTimeout(() => {
        refreshFromSheet({ skipScreenshotSync: true, silent: true, lite: true }).catch(() => {});
      }, 1200);
    }
  }

  lastSheetRefreshAt = Date.now();
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

/** Next day for M-button advance; Sunday is off so skip to Monday. */
function getNextMilestoneAdvanceDateValue() {
  const next = startOfTodayDate();
  next.setDate(next.getDate() + 1);
  if (next.getDay() === 0) {
    next.setDate(next.getDate() + 1);
  }
  return formatLocalDateValue(next);
}

function milestoneAdvanceTargetLabel(dateValue) {
  if (dateValue === getTodayDateValue()) return "today";
  if (dateValue === getTomorrowDateValue()) return "tomorrow";
  const parts = String(dateValue || "").split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return String(dateValue || "");
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

  const nextMilestone = isMilestoneToday(ticket) ? getNextMilestoneAdvanceDateValue() : getTodayDateValue();
  const label = milestoneAdvanceTargetLabel(nextMilestone);

  try {
    let updatedTicket = normalizeTicket({
      ...ticket,
      Milestone: nextMilestone,
      pendingSheetSync: Date.now(),
      pendingFields: ["Milestone"]
    });

    // Save locally first so the Milestone column updates immediately.
    updateLocalTicket(updatedTicket, { pendingFields: ["Milestone"] });
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
        pendingSheetSync: Date.now(),
        pendingFields: ["Milestone"]
      });
      updateLocalTicket(updatedTicket, { pendingFields: ["Milestone"] });
      renderTickets();
    }

    const result = await sendTicketUpdateToSheet({
      ...updatedTicket,
      ...rowIdentityFields(updatedTicket, ticket),
      Milestone: nextMilestone,
      pendingFields: ["Milestone"]
    });

    const saved = findTicketBySheetRow(updatedTicket.sheetRow)
      || findTicketByIdentity(updatedTicket.Task, updatedTicket.Owner);
    const savedMilestone = toInputDateValue(saved?.Milestone);
    if (savedMilestone !== nextMilestone) {
      // Keep Milestone pending until a sheet GET confirms — datesPersisted alone is not enough
      // (a concurrent stale refresh can still race).
      updateLocalTicket(normalizeTicket({
        ...(saved || updatedTicket),
        sheetRow: updatedTicket.sheetRow,
        Milestone: nextMilestone,
        pendingSheetSync: Date.now(),
        pendingFields: ["Milestone"]
      }), { pendingFields: ["Milestone"] });
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
  root.querySelectorAll(".ticket-duplicate-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (button.classList.contains("is-syncing") || button.disabled) return;
      duplicateTicket(button.dataset.sheetRow);
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
      const panel = normalizeSubtaskCollapsePanel(button.dataset.collapsePanel || "tickets");
      const currentlyCollapsed = button.getAttribute("aria-expanded") === "false";
      const hasCompletedChild = button.dataset.hasCompletedChild === "1";
      const showingCompleted = button.dataset.showCompleted === "1";

      if (currentlyCollapsed) {
        // Expand → open children only (completed stay hidden until next click).
        setSubtaskParentCollapsed(parentRow, false, panel);
        setSessionShowCompletedSubtasks(parentRow, false, panel);
      } else if (hasCompletedChild && !showingCompleted) {
        // Partial expand → reveal completed children.
        setSessionShowCompletedSubtasks(parentRow, true, panel);
      } else {
        // Full expand (or no completed kids) → collapse all children.
        setSubtaskParentCollapsed(parentRow, true, panel);
      }
      renderTickets({ activeOnly: true, forcePanel: panel });
    });
  });
}

function duplicateStatusForCreateForm(source) {
  const status = cleanText(source?.Status);
  if (!status || isTicketCompleted(source) || isPendingApprovalStatus(status)) {
    return "Not started";
  }
  return status;
}

function setTicketCreateSelectValue(fieldName, value) {
  const field = form?.elements?.[fieldName];
  if (!field) return;
  const text = String(value ?? "").trim();
  if (!text) return;
  const option = [...field.options].find((entry) =>
    entry.value === text || entry.textContent === text
  );
  if (option) {
    field.value = option.value;
    return;
  }
  // Fall back for statuses that exist on the sheet but not on the create form.
  if (fieldName === "Status") field.value = "Not started";
}

function selectTicketFormOwners(owners = []) {
  if (!ticketFormOwnerPanel) return;
  populateTicketFormOwners();
  clearTicketFormOwners();
  const wanted = new Set(
    owners
      .map((owner) => cleanText(owner))
      .filter(isSelectableTicketOwner)
      .map((owner) => owner.toLowerCase())
  );
  if (!wanted.size) {
    updateTicketFormOwnerLabel();
    return;
  }
  ticketFormOwnerPanel.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = wanted.has(String(input.value || "").trim().toLowerCase());
  });
  updateTicketFormOwnerLabel();
}

function applyTicketCreateParentFromSource(source) {
  const parentRow = Number(source?.parentSheetRow) || 0;
  if (!parentRow) {
    resetTicketCreateParent();
    updateTicketFormOwnerLabel();
    return;
  }
  const parent = getParentTicket(source) || findTicketBySheetRow(parentRow);
  if (ticketFormParentSheetRow) ticketFormParentSheetRow.value = String(parentRow);
  if (ticketCreateParentContext) ticketCreateParentContext.hidden = false;
  if (ticketCreateParentLabel) {
    ticketCreateParentLabel.textContent = parent?.Task || `Row ${parentRow}`;
  }
  if (ticketFormSubmitLabel) ticketFormSubmitLabel.textContent = "Create Sub-task";
}

function populateTicketCreateFormFromSource(source) {
  if (!form || !source) return;

  form.reset();
  clearTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
  clearTicketFormOwners();
  resetSurajTicketCreateTracking();

  form.elements.Task.value = source.Task || "";
  setTicketCreateSelectValue("Priority", normalizePriority(source.Priority));
  setTicketCreateSelectValue("Status", duplicateStatusForCreateForm(source));
  if (form.elements["Raised By"]) {
    form.elements["Raised By"].value = source["Raised By"] || "";
  }
  setTicketCreateSelectValue("Type", source.Type || "Daily - Infra");
  setDateFieldValue(form, "Start date", source["Start date"]);
  if (form.elements["Start date"] && !form.elements["Start date"].value) {
    form.elements["Start date"].valueAsDate = new Date();
  }
  setDateFieldValue(form, "End date", source["End date"]);
  setDateFieldValue(form, "Milestone", source.Milestone);

  const notesText = stripPresentationTag(source.Notes || source.Remarks || "");
  const notesHtml = stripPresentationTag(String(source.NotesHtml || ""));
  setTicketNotesEditorContent(ticketNotesEditor, ticketNotesInput, {
    Notes: notesText,
    Remarks: notesText,
    NotesHtml: notesHtml
  });

  selectTicketFormOwners([source.Owner].filter(Boolean));
  applyTicketCreateParentFromSource(source);

  // Keep Suraj auto-defaults from overwriting the copied Type/Milestone.
  ticketCreateTypeTouched = true;
  ticketCreateMilestoneTouched = true;
  if (ownersIncludeSuraj()) {
    surajCreateDefaultsActive = true;
  }
}

/** Opens New Ticket create form prefilled from source — does not save until Submit. */
function duplicateTicket(sheetRow) {
  if (!Auth.hasPermission("createTicket")) {
    alert("You do not have permission to create tickets.");
    return;
  }
  if (!ticketCreateModal || !form) {
    alert("Could not open the new ticket form.");
    return;
  }

  const source = findTicketBySheetRow(sheetRow);
  if (!source) {
    alert("Could not find the selected ticket.");
    return;
  }

  const actionKey = milestoneActionKey(source);
  if (duplicateTicketInFlight.has(actionKey)) return;
  clearDuplicateTicketInFlight({ rerender: false });
  duplicateTicketInFlight.add(actionKey);
  renderTickets({ force: true, activeOnly: true });

  setActiveTab("tickets");
  populateTicketCreateFormFromSource(source);
  ticketCreateModal.hidden = false;
  document.body.classList.add("modal-open");
  form.elements.Task?.focus();
  setStatus("", "Review the duplicated ticket, then Submit to create it.");
}

function bindTicketTypePromoteButtons(root) {
  if (!root) return;
  root.querySelectorAll(".ticket-presentation-pin-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTicketEditor(button.dataset.sheetRow, { preferSapType: true });
    });
  });
}

function syncPresentationCustomRangeVisibility() {
  if (!presentationCustomRange) return;
  const showCustom = selectedPresentationPeriod === "custom";
  presentationCustomRange.hidden = !showCustom;
  presentationCustomRange.setAttribute("aria-hidden", showCustom ? "false" : "true");
}

function ticketMatchesPresentationCustomRange(ticket) {
  const fromRaw = presentationDateFrom?.value || "";
  const toRaw = presentationDateTo?.value || "";
  if (!fromRaw && !toRaw) return true;
  const from = fromRaw ? parseTicketDate(fromRaw) : null;
  const to = toRaw ? parseTicketDate(toRaw) : null;
  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);
  return ticketPeriodDates(ticket).some((date) => {
    const time = date.getTime();
    if (from && time < from.getTime()) return false;
    if (to && time > to.getTime()) return false;
    return true;
  });
}

function ticketMatchesPresentationPeriod(ticket) {
  if (selectedPresentationPeriod === "all") return true;
  if (selectedPresentationPeriod === "custom") return ticketMatchesPresentationCustomRange(ticket);
  return ticketRelevantInPeriod(ticket, selectedPresentationPeriod);
}

function ticketMatchesPresentationOwner(ticket) {
  if (selectedPresentationOwner === "all") return true;
  if (selectedPresentationOwner === "Bhanu") {
    return getTicketOriginalOwnerValue(ticket) === "Bhanu";
  }
  if (selectedPresentationOwner === "Suraj") {
    return cleanText(ticket?.Owner).toLowerCase() === "suraj";
  }
  return true;
}

function presentationOwnerLabel() {
  if (selectedPresentationOwner === "Bhanu") return "Bhanu";
  if (selectedPresentationOwner === "Suraj") return "Suraj";
  return "";
}

function presentationTicketEndTimestamp(ticket) {
  const date = parseTicketDate(ticket?.["End date"]);
  return date ? date.getTime() : null;
}

function presentationTicketStartTimestamp(ticket) {
  const date = parseTicketDate(ticket?.["Start date"]);
  return date ? date.getTime() : null;
}

/** Presentation Kanban: End date desc when present; otherwise Start date asc. */
function comparePresentationTickets(a, b) {
  const aEnd = presentationTicketEndTimestamp(a);
  const bEnd = presentationTicketEndTimestamp(b);
  const aHasEnd = aEnd != null;
  const bHasEnd = bEnd != null;

  if (aHasEnd && bHasEnd) return bEnd - aEnd;
  if (aHasEnd !== bHasEnd) return aHasEnd ? -1 : 1;

  const aStart = presentationTicketStartTimestamp(a);
  const bStart = presentationTicketStartTimestamp(b);
  const aHasStart = aStart != null;
  const bHasStart = bStart != null;
  if (aHasStart && bHasStart) return aStart - bStart;
  if (aHasStart !== bHasStart) return aHasStart ? -1 : 1;
  return ticketRecentTimestamp(b) - ticketRecentTimestamp(a);
}

function getPresentationTickets(tickets = getValidTickets()) {
  // Exact Type SAP / Infra only (never Daily variants); top-level projects.
  // Type filter is applied here once; every Kanban column renders from this list.
  syncPresentationFiltersFromDom();
  const typeFilter = selectedPresentationType;
  return tickets
    .filter((ticket) => isProjectTypeTicket(ticket) && !isSubtaskTicket(ticket))
    .filter((ticket) => ticketMatchesPresentationType(ticket, typeFilter))
    .filter((ticket) => ticketMatchesPresentationOwner(ticket))
    .filter((ticket) => ticketMatchesPresentationPeriod(ticket))
    .sort(comparePresentationTickets);
}

function renderPresentationAttachmentThumbs(ticket) {
  const screenshots = getTicketScreenshots(ticket);
  const labeledCount = ticketAttachmentLabelCount(ticket);
  const count = screenshots.length || labeledCount;
  if (!count) return "";

  // Compact control only — never inline <img> thumbs on the card (click opens lightbox).
  const previewLabel = count > 1 ? `Preview (${count})` : "Preview";
  return `
    <button
      class="screenshot-preview-btn presentation-files-chip"
      type="button"
      data-sheet-row="${ticket.sheetRow}"
      data-screenshot-index="0"
      aria-label="${escapeHtml(previewLabel)}"
      title="Preview attachments"
    ><span class="presentation-files-icon" aria-hidden="true"></span><span>${escapeHtml(previewLabel)}</span></button>
  `;
}

const PRESENTATION_LONG_PRESS_MS = 4000;
let presentationDragMoveInFlight = false;

function statusLabelForKanbanColumnId(columnId) {
  switch (String(columnId || "").trim()) {
    case "completed":
      return "Completed";
    case "progress":
      return "In progress";
    case "blocked":
      return "Blocked";
    case "approval":
      return "Pending Approval";
    case "pending":
      return "Not started";
    default:
      return "";
  }
}

function findPresentationColumnFromPoint(clientX, clientY) {
  const stack = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(clientX, clientY)
    : [document.elementFromPoint(clientX, clientY)].filter(Boolean);
  for (const el of stack) {
    const column = el?.closest?.(".presentation-kanban-column[data-column-id]");
    if (column) return column;
  }
  return null;
}

async function movePresentationTicketToColumn(sheetRow, columnId) {
  if (!canEditTickets() || presentationDragMoveInFlight) return;
  const nextStatus = statusLabelForKanbanColumnId(columnId);
  if (!nextStatus) return;

  const ticket = getValidTickets().find((entry) => Number(entry.sheetRow) === Number(sheetRow));
  if (!ticket) return;
  const priorStatus = cleanText(ticket.Status);
  if (priorStatus.toLowerCase() === nextStatus.toLowerCase()) return;
  if (kanbanColumnId(ticket.Status) === columnId) return;

  const updated = {
    ...ticket,
    Status: nextStatus,
    expectedStatus: priorStatus || nextStatus,
    lastKnownStatus: priorStatus || nextStatus,
    lastUpdated: new Date().toISOString(),
    ticketId: ticketStableId(ticket) || createTicketId()
  };
  if (/^completed$/i.test(nextStatus) && !cleanText(updated["End date"])) {
    updated["End date"] = getTodayDateValue();
  }

  const sheetTicket = {
    ...updated,
    ...rowIdentityFields(updated, ticket)
  };
  const localTicket = applyTicketApprovalPreview(normalizeTicket(updated), ticket);
  const pendingFields = ["Status"];
  if (cleanText(localTicket["End date"]) !== cleanText(ticket["End date"])) {
    pendingFields.push("End date");
  }

  presentationDragMoveInFlight = true;
  updateLocalTicket(localTicket, { pendingFields });
  renderPresentationView();
  if (typeof renderTickets === "function") {
    try {
      renderTickets({ activeOnly: true });
    } catch (_error) {
      /* ignore non-ticket panels */
    }
  }

  try {
    await sendTicketUpdateToSheet(sheetTicket);
    const shown = cleanText(localTicket.Status) || nextStatus;
    setStatus("online", shown === nextStatus ? `Moved to ${nextStatus}` : `Moved — ${shown}`);
  } catch (error) {
    console.error(error);
    setStatus("error", "Status saved locally, but sync failed");
  } finally {
    presentationDragMoveInFlight = false;
  }
}

function bindPresentationCardDragDrop(root) {
  if (!root || !canEditTickets()) return;

  const clearColumnTargets = () => {
    root.querySelectorAll(".presentation-kanban-column.is-drop-target").forEach((column) => {
      column.classList.remove("is-drop-target");
    });
  };

  root.querySelectorAll(".presentation-card[data-sheet-row]").forEach((card) => {
    let pressTimer = null;
    let armed = false;
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let ghost = null;
    let originColumnId = "";

    const clearPress = () => {
      if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
      card.classList.remove("is-long-pressing");
    };

    const cleanupDrag = () => {
      const capturedId = pointerId;
      clearPress();
      armed = false;
      dragging = false;
      pointerId = null;
      originColumnId = "";
      clearColumnTargets();
      card.classList.remove("is-dragging");
      card.style.touchAction = "";
      document.body.classList.remove("presentation-card-dragging");
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      try {
        if (capturedId != null && card.hasPointerCapture?.(capturedId)) {
          card.releasePointerCapture(capturedId);
        }
      } catch (_error) {
        /* ignore */
      }
    };

    const armDrag = () => {
      if (armed || dragging) return;
      armed = true;
      dragging = true;
      card.classList.remove("is-long-pressing");
      card.classList.add("is-dragging");
      card.style.touchAction = "none";
      document.body.classList.add("presentation-card-dragging");
      if (pointerId != null) {
        try {
          card.setPointerCapture(pointerId);
        } catch (_error) {
          /* ignore */
        }
      }
      if (navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch (_error) {
          /* ignore */
        }
      }

      ghost = card.cloneNode(true);
      ghost.classList.add("presentation-card-ghost");
      ghost.style.width = `${card.getBoundingClientRect().width}px`;
      ghost.style.left = `${lastX - 24}px`;
      ghost.style.top = `${lastY - 24}px`;
      document.body.appendChild(ghost);

      const sourceColumn = card.closest(".presentation-kanban-column[data-column-id]");
      originColumnId = sourceColumn?.dataset.columnId || "";
      setStatus("online", "Drag to a column, then release");
    };

    card.addEventListener("pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      if (event.target.closest("button, a, input, select, textarea, label")) return;
      if (!card.dataset.sheetRow) return;

      cleanupDrag();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      card.classList.add("is-long-pressing");
      /* Do not capture yet — native vertical/horizontal scroll must keep working */

      pressTimer = window.setTimeout(() => {
        pressTimer = null;
        armDrag();
      }, PRESENTATION_LONG_PRESS_MS);
    });

    card.addEventListener("pointermove", (event) => {
      if (pointerId != null && event.pointerId !== pointerId) return;
      lastX = event.clientX;
      lastY = event.clientY;

      if (!dragging) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.hypot(dx, dy) > 10) {
          clearPress();
          pointerId = null;
        }
        return;
      }

      event.preventDefault();
      if (ghost) {
        ghost.style.left = `${event.clientX - 24}px`;
        ghost.style.top = `${event.clientY - 24}px`;
      }

      clearColumnTargets();
      const column = findPresentationColumnFromPoint(event.clientX, event.clientY);
      if (column && column.dataset.columnId !== originColumnId) {
        column.classList.add("is-drop-target");
      }
    });

    const endDrag = async (event) => {
      if (pointerId != null && event.pointerId !== pointerId) return;
      const wasDragging = dragging;
      const row = Number(card.dataset.sheetRow);
      const dropX = event.clientX ?? lastX;
      const dropY = event.clientY ?? lastY;
      const dropColumn = wasDragging
        ? findPresentationColumnFromPoint(dropX, dropY)
        : null;
      const targetId = dropColumn?.dataset.columnId || "";
      cleanupDrag();

      if (!wasDragging || !row || !targetId || targetId === originColumnId) return;
      await movePresentationTicketToColumn(row, targetId);
    };

    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", () => cleanupDrag());
  });
}

function bindPresentationCardEditButtons(root) {
  if (!root || !canEditTickets()) return;
  root.querySelectorAll(".presentation-edit-chip").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTicketEditor(button.dataset.sheetRow);
    });
  });
}

function renderPresentationCard(ticket, index) {
  const remarks = getTicketRemarksText(ticket);
  const milestone = formatDate(ticket.Milestone) || "—";
  const priorityClass = normalizePriority(ticket.Priority) === "80" ? "high" : "low";
  const attachHtml = renderPresentationAttachmentThumbs(ticket);
  const idLabel = String(index + 1).padStart(2, "0");
  const editHtml = canEditTickets() && ticket.sheetRow
    ? `<button
      class="presentation-edit-chip"
      type="button"
      data-sheet-row="${ticket.sheetRow}"
      aria-label="Edit project"
      title="Edit project"
    >Edit</button>`
    : "";

  return `
    <article
      class="presentation-card ${statusClass(ticket.Status)}"
      data-sheet-row="${ticket.sheetRow}"
      data-ticket-type="${escapeHtml(cleanText(ticket.Type))}"
      title="${canEditTickets() ? "Hold 4 seconds, then drag to another column" : ""}"
    >
      <h3 class="presentation-card-title">${escapeHtml(ticket.Task || "Untitled project")}</h3>
      <div class="presentation-card-meta">
        <span class="presentation-id-chip">${idLabel}</span>
        ${ticket.Type ? `<span class="presentation-type">${escapeHtml(ticket.Type)}</span>` : ""}
        <span class="priority-pill priority-${priorityClass}">${escapeHtml(formatPriorityLabel(ticket.Priority))}</span>
        <span class="status-pill ${statusClass(ticket.Status)}">${escapeHtml(ticket.Status || "Blank")}</span>
        <span class="owner-chip">
          <span class="owner-avatar">${escapeHtml(ownerInitials(ticket.Owner))}</span>
          <span class="owner-chip-name">${escapeHtml(ticket.Owner || "No owner")}</span>
        </span>
        ${editHtml}
        ${attachHtml}
      </div>
      <p class="presentation-milestone">
        <span class="presentation-milestone-line">Milestone · ${escapeHtml(milestone)}</span>
      </p>
      ${remarks
        ? `<p class="presentation-card-remarks">${escapeHtml(remarks)}</p>`
        : ""}
    </article>
  `;
}

function sortPresentationColumnTickets(tickets) {
  return [...tickets].sort(comparePresentationTickets);
}

function renderPresentationView(tickets = getValidTickets()) {
  if (!presentationDeck) return;

  syncPresentationFiltersFromDom();
  if (presentationTypeFilter && presentationTypeFilter.value !== selectedPresentationType) {
    // Keep the visible select aligned with the normalized filter ("SAP" / "Infra" / "all").
    presentationTypeFilter.value = selectedPresentationType;
  }

  const shown = getPresentationTickets(tickets);
  const typeLabel = selectedPresentationType === "all" ? "SAP & Infra" : selectedPresentationType;
  const ownerLabel = presentationOwnerLabel();
  const periodLabel = selectedPresentationPeriod === "custom"
    ? "custom range"
    : (PERFORMANCE_PERIOD_OPTIONS.find((entry) => entry.id === selectedPresentationPeriod)?.label
      || selectedPresentationPeriod);
  const filterBits = [typeLabel, ownerLabel, periodLabel].filter(Boolean);

  if (presentationSummary) {
    presentationSummary.textContent = shown.length
      ? `${shown.length} project${shown.length === 1 ? "" : "s"} · ${filterBits.join(" · ")}`
      : `No projects match the current filters (${filterBits.join(" · ")})`;
  }

  if (!shown.length) {
    presentationDeck.classList.remove("presentation-kanban");
    presentationDeck.innerHTML = `
      <div class="presentation-empty">
        <p class="eyebrow">Presentation</p>
        <h3>No matching SAP or Infra projects</h3>
        <p>Set a ticket’s <strong>Type</strong> to SAP or Infra (use ★ on Tickets/Projects to open Edit), or widen the filters above.</p>
        <div class="presentation-empty-actions">
          <button class="primary-button" type="button" data-goto-tab="tickets">Go to Tickets</button>
          <button class="secondary-button" type="button" data-goto-tab="projects">Go to Projects</button>
        </div>
      </div>
    `;
    presentationDeck.querySelectorAll("[data-goto-tab]").forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.gotoTab));
    });
    return;
  }

  const grouped = Object.fromEntries(PRESENTATION_KANBAN_COLUMNS.map((column) => [column.id, []]));
  shown.forEach((ticket) => {
    // Defensive: never let a mismatched type into any column.
    if (!ticketMatchesPresentationType(ticket, selectedPresentationType)) return;
    const columnId = kanbanColumnId(ticket.Status);
    if (grouped[columnId]) {
      grouped[columnId].push(ticket);
    } else {
      grouped.other.push(ticket);
    }
  });

  let slideIndex = 0;
  const visibleColumns = PRESENTATION_KANBAN_COLUMNS.filter((column) =>
    column.alwaysShow || (grouped[column.id] && grouped[column.id].length)
  );

  presentationDeck.classList.add("presentation-kanban");
  presentationDeck.innerHTML = `
    <div class="presentation-kanban-columns" role="list">
      ${visibleColumns.map((column) => {
        const columnTickets = sortPresentationColumnTickets(grouped[column.id] || []);
        const cards = columnTickets.length
          ? columnTickets.map((ticket) => {
              const card = renderPresentationCard(ticket, slideIndex);
              slideIndex += 1;
              return card;
            }).join("")
          : '<div class="presentation-kanban-empty">No projects</div>';

        return `
          <section
            class="presentation-kanban-column ${column.statusClass}"
            role="listitem"
            aria-label="${escapeHtml(column.label)}"
            data-column-id="${escapeHtml(column.id)}"
          >
            <header class="presentation-kanban-column-head">
              <h3>${escapeHtml(column.label)}</h3>
              <span class="presentation-kanban-column-count">${columnTickets.length}</span>
            </header>
            <div class="presentation-kanban-column-body">
              ${cards}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
  bindScreenshotPreviewButtons(presentationDeck);
  bindPresentationCardEditButtons(presentationDeck);
  bindPresentationCardDragDrop(presentationDeck);
}

function setPresentMode(enabled, { syncFullscreen = true } = {}) {
  const on = Boolean(enabled);
  const wasOn = document.body.classList.contains("present-mode");
  document.body.classList.toggle("present-mode", on);
  if (enterPresentModeButton) enterPresentModeButton.hidden = on;
  if (exitPresentModeButton) exitPresentModeButton.hidden = !on;
  // Present mode: keep Type/Time filters on the thin top row by default.
  if (on) {
    setPresentationHeroCollapsed(false, { persist: false });
  } else if (wasOn) {
    syncPresentationHeroForViewport();
  }
  if (on && getActiveTabName() !== "presentation") {
    setActiveTab("presentation", { skipRender: true });
    renderPresentationView();
  }
  if (!syncFullscreen || on === wasOn) return;
  presentModeFullscreenSync = true;
  const finish = () => {
    presentModeFullscreenSync = false;
  };
  if (on) {
    requestAppFullscreen(document.documentElement).finally(finish);
  } else {
    exitAppFullscreen().finally(finish);
  }
}

function onPresentModeFullscreenChange() {
  if (presentModeFullscreenSync) return;
  if (!getFullscreenElement() && document.body.classList.contains("present-mode")) {
    setPresentMode(false, { syncFullscreen: false });
  }
}

function renderTicketTable(tickets, options = {}) {
  const bodyEl = options.bodyEl || rows;
  const tableEl = options.tableEl || ticketTable;
  const actionsHeaderEl = options.actionsHeaderEl || ticketActionsHeader;
  const emptyMessage = options.emptyMessage || "No tickets match the current filters.";
  const collapsePanel = normalizeSubtaskCollapsePanel(options.collapsePanel || options.loadMoreKind || "tickets");
  if (!bodyEl) return;

  const canEdit = canEditTickets();
  const showActions = canEdit;
  if (tableEl) {
    tableEl.classList.toggle("ticket-table-can-edit", showActions);
  }
  if (actionsHeaderEl) {
    actionsHeaderEl.hidden = !showActions;
  }

  const columnCount = showActions ? 10 : 9;
  const pageLimit = Number(options.pageLimit) > 0 ? Number(options.pageLimit) : 0;
  const loadMoreKind = options.loadMoreKind || "";

  if (!tickets.length) {
    bodyEl.innerHTML = `<tr class="empty-row"><td colspan="${columnCount}">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  const childCounts = new Map();
  const parentsWithCompletedChildren = new Set();
  // Prefer the rows in this table; also scan the full sheet so completed-child
  // badges stay accurate even if filters momentarily omit a child.
  const markCompletedParents = (list) => {
    (Array.isArray(list) ? list : []).forEach((ticket) => {
      if (!isSubtaskTicket(ticket) || !isTicketCompleted(ticket)) return;
      const parentRow = Number(ticket.parentSheetRow);
      if (parentRow) parentsWithCompletedChildren.add(parentRow);
    });
  };
  tickets.forEach((ticket) => {
    if (!isSubtaskTicket(ticket)) return;
    const parentRow = Number(ticket.parentSheetRow);
    if (!parentRow) return;
    childCounts.set(parentRow, (childCounts.get(parentRow) || 0) + 1);
    if (isTicketCompleted(ticket)) parentsWithCompletedChildren.add(parentRow);
  });
  markCompletedParents(typeof getValidTickets === "function" ? getValidTickets() : null);

  const isChildHiddenByCollapse = (ticket) => {
    if (!isSubtaskTicket(ticket)) return false;
    const parentRow = Number(ticket.parentSheetRow);
    if (isSubtaskParentCollapsed(parentRow, collapsePanel)) return true;
    if (isCompletedSubtaskHidden(ticket, collapsePanel)) return true;
    return false;
  };

  // Open children stay visible while expanded; completed kids need show-completed.
  const displayTickets = tickets.filter((ticket) => !isChildHiddenByCollapse(ticket));
  const visibleTickets = pageLimit && displayTickets.length > pageLimit
    ? displayTickets.slice(0, pageLimit)
    : displayTickets;
  const remaining = Math.max(0, displayTickets.length - visibleTickets.length);

  const rowsHtml = visibleTickets
    .map((ticket) => {
      const parent = getParentTicket(ticket);
      const subtask = isSubtaskTicket(ticket);
      const parentRow = Number(ticket.sheetRow);
      const childCount = childCounts.get(parentRow) || 0;
      const hasChildren = !subtask && childCount > 0;
      const hasCompletedChild = hasChildren && parentsWithCompletedChildren.has(parentRow);
      const collapsed = hasChildren && isSubtaskParentCollapsed(parentRow, collapsePanel);
      const showingCompleted = hasChildren && isSessionShowingCompletedSubtasks(parentRow, collapsePanel);
      const parentCollapsed = subtask && isSubtaskParentCollapsed(
        Number(ticket.parentSheetRow),
        collapsePanel
      );

      let toggleTitle = "Hide sub-tasks";
      let toggleAria = `Collapse ${childCount} sub-task${childCount === 1 ? "" : "s"}`;
      if (collapsed) {
        toggleTitle = "Show sub-tasks";
        toggleAria = `Expand ${childCount} sub-task${childCount === 1 ? "" : "s"}`;
      } else if (hasCompletedChild && !showingCompleted) {
        toggleTitle = "Show completed sub-tasks";
        toggleAria = `Show completed sub-tasks (${childCount} total)`;
      }

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
              data-collapse-panel="${collapsePanel}"
              data-has-completed-child="${hasCompletedChild ? "1" : "0"}"
              data-show-completed="${showingCompleted ? "1" : "0"}"
              aria-expanded="${collapsed ? "false" : "true"}"
              aria-label="${toggleAria}"
              title="${toggleTitle}"
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

      const typePromoteButton = canEdit ? `
            <button
              class="ticket-presentation-pin-button"
              type="button"
              data-sheet-row="${ticket.sheetRow}"
              aria-label="Edit ticket type"
              title="Edit ticket (defaults Type to SAP)"
            >★</button>` : "";

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
            ${typePromoteButton}
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
              aria-label="${isMilestoneToday(ticket) ? `Set milestone to ${milestoneAdvanceTargetLabel(getNextMilestoneAdvanceDateValue())}` : "Set milestone to today"}"
              title="${isMilestoneToday(ticket) ? `Set milestone to ${milestoneAdvanceTargetLabel(getNextMilestoneAdvanceDateValue())}` : "Set milestone to today"}"
            >M</button>
            <button
              class="ticket-duplicate-button${duplicateTicketInFlight.has(milestoneActionKey(ticket)) ? " is-syncing" : ""}"
              type="button"
              data-sheet-row="${ticket.sheetRow}"
              aria-label="Duplicate"
              title="Duplicate"
              ${duplicateTicketInFlight.has(milestoneActionKey(ticket)) ? "disabled" : ""}
            >
              <span class="duplicate-icon" aria-hidden="true"></span>
            </button>
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

  const loadMoreHtml = remaining > 0 && loadMoreKind
    ? `<tr class="load-more-row"><td colspan="${columnCount}">
        <button class="secondary-button load-more-tickets-button" type="button" data-load-more="${escapeHtml(loadMoreKind)}">
          Show more (${remaining} remaining)
        </button>
      </td></tr>`
    : "";

  bodyEl.innerHTML = rowsHtml + loadMoreHtml;

  bindTicketEditButtons(bodyEl);
  bindTicketTypePromoteButtons(bodyEl);
  bindScreenshotPreviewButtons(bodyEl);
  bodyEl.querySelectorAll("[data-load-more]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.loadMore;
      if (kind === "tickets") {
        ticketTableLimit += TABLE_PAGE_STEP;
        renderTickets({ activeOnly: true, forcePanel: "tickets" });
      } else if (kind === "projects") {
        projectTableLimit += TABLE_PAGE_STEP;
        renderTickets({ activeOnly: true, forcePanel: "projects" });
      }
    });
  });
}

function buildTicketsFromForm(selectedOwners = null, options = {}) {
  const owners = (selectedOwners || getNewTicketOwners()).filter(isSelectableTicketOwner);
  const data = new FormData(form);
  const basePayload = applyTicketNotesToPayload(ticketFromFormData(data), ticketNotesEditor);
  const submissionId = cleanText(options.submissionId) || createSubmissionId();
  return owners.map((owner) => normalizeTicket({
    ...basePayload,
    Owner: cleanText(owner),
    ticketId: createTicketId(),
    submissionId,
    lastUpdated: new Date().toISOString()
  }));
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

function renderSecondaryTicketPanels(tickets) {
  renderPerformance(tickets);
  renderKanbanBoard(tickets);
}

function scheduleSecondaryTicketPanels(tickets) {
  const token = ++secondaryPanelsRenderToken;
  scheduleIdleWork(() => {
    if (token !== secondaryPanelsRenderToken) return;
    renderSecondaryTicketPanels(getValidTickets());
  }, 1800);
}

function renderTickets(options = {}) {
  const tickets = getValidTickets();
  const dataSignature = computeTicketsDataSignature(tickets);
  if (options.skipIfUnchanged && dataSignature === lastRenderedTicketsSignature && !options.force) {
    return;
  }

  const sortKey = ticketSortFilter?.value || DEFAULT_TICKET_SORT;
  const activeTab = options.forcePanel || getActiveTabName();
  const activeOnly = options.activeOnly !== false;
  const deferSecondary = Boolean(options.deferSecondary)
    && activeTab !== "performance"
    && activeTab !== "kanban";
  const deferRecent = options.deferRecent !== false;

  const filterSig = getFilterUiSignature();
  if (filterSig !== lastFilterUiSignature) {
    lastFilterUiSignature = filterSig;
    resetTablePageLimits();
  }

  populateFilterOptionsIfNeeded(tickets);
  populateTicketFormOwnersIfNeeded(tickets);
  updateRaisedBySuggestions(tickets);

  const completed = tickets.filter((ticket) => statusClass(ticket.Status) === "status-completed").length;
  const blocked = tickets.filter((ticket) => statusClass(ticket.Status) === "status-blocked").length;
  const open = tickets.length - completed;
  const completion = tickets.length ? Math.round((completed / tickets.length) * 100) : 0;

  // Lightweight KPI counters — cheap even when dashboard panel is hidden.
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

  const paintDashboard = !activeOnly || activeTab === "dashboard";
  const paintTickets = !activeOnly || activeTab === "tickets";
  const paintProjects = !activeOnly || activeTab === "projects";
  const paintPresentation = !activeOnly || activeTab === "presentation";
  const paintSecondaryNow = activeTab === "performance" || activeTab === "kanban";

  if (paintDashboard) {
    renderBreakdownList(statusList, countBy(tickets, "Status"), tickets.length, "status");
    renderBreakdownList(ownerList, countBy(tickets, "Owner"), tickets.length, "owner");
    if (deferRecent) {
      const token = ++lastDashboardRecentToken;
      if (dashboardRecentList) {
        dashboardRecentList.innerHTML = '<div class="breakdown-empty">Loading activity…</div>';
      }
      scheduleIdleWork(() => {
        if (token !== lastDashboardRecentToken) return;
        renderDashboardRecent(tickets);
        renderLatestTickets(tickets);
      }, 900);
    } else {
      lastDashboardRecentToken += 1;
      renderDashboardRecent(tickets);
      renderLatestTickets(tickets);
    }
  }

  if (paintTickets) {
    const filteredTickets = getFilteredDisplayedTickets();
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
    renderTicketTable(filteredTickets, {
      pageLimit: ticketTableLimit,
      loadMoreKind: "tickets",
      collapsePanel: "tickets"
    });
  }

  if (paintProjects) {
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
      highlightImportantRemarks: true,
      pageLimit: projectTableLimit,
      loadMoreKind: "projects",
      collapsePanel: "projects"
    });
  }

  if (paintPresentation) {
    renderPresentationView(tickets);
  }

  if (paintSecondaryNow) {
    secondaryPanelsRenderToken += 1;
    renderSecondaryTicketPanels(tickets);
  } else if (deferSecondary) {
    scheduleSecondaryTicketPanels(tickets);
  } else if (!activeOnly) {
    secondaryPanelsRenderToken += 1;
    renderSecondaryTicketPanels(tickets);
  }

  lastRenderedTicketsSignature = dataSignature;
}

function applyCreatedTicketSyncResult(localTicket, result = {}) {
  const identity = ticketIdentityKey(localTicket);
  const localId = ticketStableId(localTicket);
  const submissionId = cleanText(localTicket.submissionId);
  const notes = String(result.notes || "").trim();
  const sheetRow = Number(result.sheetRow) || 0;
  const hasDriveLinks = notes && extractDriveLinksFromNotes({ Notes: notes, Remarks: notes }).length > 0;
  let matchedUnsynced = false;

  const tickets = readTickets().map((ticket) => {
    const sameSubmission = submissionId && cleanText(ticket.submissionId) === submissionId;
    const sameId = localId && ticketStableId(ticket) === localId;
    const sameIdentity = !localId && !submissionId && ticketIdentityKey(ticket) === identity;
    if (!sameSubmission && !sameId && !sameIdentity) return ticket;
    // Only apply create results to unsynced local clones — never overwrite an
    // existing sheet row that shares Task||Owner (e.g. after Duplicate).
    if (Number(ticket.sheetRow) > 0) return ticket;
    if (matchedUnsynced) return ticket;
    matchedUnsynced = true;

    const notesHtml = hasDriveLinks
      ? buildNotesHtmlFromDriveLinks({ Notes: notes, Remarks: notes })
      : ticket.NotesHtml;

    const next = normalizeTicket({
      ...ticket,
      sheetRow: sheetRow || ticket.sheetRow,
      ticketId: cleanText(result.ticketId) || ticketStableId(ticket) || localId,
      Status: reconcileSyncedTicketStatus(ticket, result, ticket),
      Notes: notes || ticket.Notes,
      Remarks: notes || ticket.Remarks,
      NotesHtml: notesHtml,
      Milestone: coalesceSyncValue(ticket.Milestone, result.milestone),
      "Start date": coalesceSyncValue(ticket["Start date"], result.startDate),
      "End date": coalesceSyncValue(ticket["End date"], result.endDate),
      lastUpdated: cleanText(result.lastUpdated) || ticket.lastUpdated
    });

    // Keep pending until mergeTicketFromSheet sees the new row on GET.
    const trackedPending = normalizePendingFieldsList(
      ticket.pendingFields?.length ? ticket.pendingFields : PENDING_SYNC_FIELD_KEYS
    );
    return normalizeTicket({
      ...next,
      pendingSheetSync: ticket.pendingSheetSync || Date.now(),
      pendingFields: trackedPending
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
}

async function sendToSheet(ticket, options = {}) {
  if (!SHEET_WEB_APP_URL) {
    setStatus("", "Saved locally. Sync is not configured.");
    return { synced: false };
  }

  if (!cleanText(ticket.Owner)) {
    throw new Error("Owner is required before syncing.");
  }

  const result = await postToSheetWithResponse(buildTicketSheetPayload(ticket, options), {
    expectedTicket: ticket
  });
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
    }, {
      expectedTicket: tickets.length === 1 ? tickets[0] : null
    });

    if (!result?.ok && !Array.isArray(result?.results)) {
      throw new Error(result?.error || "Ticket submit failed.");
    }

    const items = Array.isArray(result.results) ? result.results : [];
    let successCount = 0;
    let failCount = 0;
    items.forEach((item, index) => {
      if (item?.ok === false) {
        failCount += 1;
        outcomes.push(item);
        return;
      }
      applyCreatedTicketSyncResult(tickets[index], item);
      uploadedTotal += Number(item?.uploadedCount) || 0;
      outcomes.push(item);
      successCount += 1;
    });
    onProgress?.(tickets.length - 1, tickets.length);
    if (!successCount && failCount) {
      throw new Error(result?.error || items.find((item) => item?.error)?.error || "Ticket submit failed.");
    }
    if (failCount) {
      setStatus("error", `Saved ${successCount} of ${tickets.length} tickets — retry failed ones`);
    }
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

function applyRemoteTicketsPayload(payload) {
  if (!payload || payload.ok === false) {
    throw new Error(payload?.error || "Refresh failed.");
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

  // Raw sheet rows — merge happens once in mergeRemoteTicketsWithLocal (Map lookup).
  return (payload.tickets || []).map((ticket, index) => ({
    ...ticket,
    sheetRow: ticket.sheetRow ?? index + 2
  }));
}

function firstSuccessfulPromise(promises, fallbackMessage) {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    let lastError = null;
    if (!pending) {
      reject(new Error(fallbackMessage || "Request failed."));
      return;
    }
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve, (error) => {
        lastError = error;
        pending -= 1;
        if (pending === 0) {
          reject(lastError || new Error(fallbackMessage || "Request failed."));
        }
      });
    });
  });
}

function fetchTicketsViaHttp(timeoutMs, options = {}) {
  if (!SHEET_WEB_APP_URL) {
    return Promise.reject(new Error("Sync is not configured."));
  }

  const separator = SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timer = null;
  const lite = options.lite ? "&lite=1" : "";

  const request = fetch(`${SHEET_WEB_APP_URL}${separator}compact=1${lite}`, {
    method: "GET",
    redirect: "follow",
    credentials: "omit",
    cache: "no-store",
    signal: controller ? controller.signal : undefined
  }).then(async (response) => {
    const text = await response.text();
    return parseAppsScriptResponseText(text);
  });

  if (!(timeoutMs > 0)) {
    return request;
  }

  const timeoutPromise = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore
      }
      reject(new Error("Ticket refresh timed out."));
    }, timeoutMs);
  });

  return Promise.race([request, timeoutPromise]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}

function fetchTicketsViaJsonp(timeoutMs, options = {}) {
  return new Promise((resolve, reject) => {
    if (!SHEET_WEB_APP_URL) {
      reject(new Error("Sync is not configured."));
      return;
    }

    const callbackName = `handleSheetTickets_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement("script");
    const separator = SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
    const lite = options.lite ? "&lite=1" : "";
    let settled = false;
    let timer = null;
    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Could not load ticket data."));
    };

    // compact=1 omits assets/documents/procurement and trims heavy note payloads.
    // lite=1 skips TaskAudit join (requires redeployed full-merged script).
    // Requires Apps Script redeploy of google-apps-script-full-merged.gs; older
    // deployments ignore the flag and still return a full payload.
    script.src = `${SHEET_WEB_APP_URL}${separator}callback=${callbackName}&compact=1${lite}`;
    document.body.appendChild(script);

    if (timeoutMs > 0) {
      timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Ticket refresh timed out."));
      }, timeoutMs);
    }
  });
}

function hasLocalTicketsCache() {
  try {
    const tickets = readTickets();
    return Array.isArray(tickets) && tickets.some((ticket) => cleanText(ticket?.Task));
  } catch {
    return false;
  }
}

function setTicketRefreshFailureStatus(options = {}) {
  const silent = Boolean(options.silent);
  const hasCache = hasLocalTicketsCache();
  if (silent && !options.forceStatus) return hasCache;
  if (hasCache) {
    setStatus("warning", "Using cached tickets");
    return true;
  }
  setStatus("error", "Could not refresh tickets");
  return false;
}

function loadSheetTickets(options = {}) {
  if (!SHEET_WEB_APP_URL) {
    return Promise.reject(new Error("Sync is not configured."));
  }

  // Apps Script cold starts + redirects are routinely >20s on phones.
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 35000;
  const retries = Math.max(0, Number.isFinite(Number(options.retries)) ? Number(options.retries) : 2);
  const backoffMs = [400, 1000, 1800];
  const fetchOptions = { lite: Boolean(options.lite) };

  const fetchOnce = async () => {
    // Prefer a single HTTP GET. Racing HTTP+JSONP doubled Apps Script load and
    // made refreshes slower under contention. Fall back to JSONP only on failure.
    let payload;
    try {
      payload = await fetchTicketsViaHttp(timeoutMs, fetchOptions);
    } catch (httpError) {
      payload = await fetchTicketsViaJsonp(Math.min(timeoutMs, 25000), fetchOptions);
    }
    return applyRemoteTicketsPayload(payload);
  };

  const runWithRetries = async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchOnce();
      } catch (error) {
        lastError = error;
        // Failed refresh must never clear cached tickets — writeTickets is only
        // called after a successful remote merge in refreshFromSheet.
        if (attempt < retries) {
          await sleepMs(backoffMs[Math.min(attempt, backoffMs.length - 1)]);
        }
      }
    }
    throw lastError || new Error("Could not load ticket data.");
  };

  return runWithRetries();
}

async function refreshFromSheet(options = {}) {
  if (!SHEET_WEB_APP_URL) {
    if (!options.silent) setStatus("", "Sync not configured");
    return false;
  }

  if (!options.silent) setStatus("", "Refreshing tickets...");

  try {
    const remoteTickets = await loadSheetTickets(options);
    reconcileDeletedTicketTombstones(remoteTickets);
    const tickets = mergeRemoteTicketsWithLocal(remoteTickets);
    const nextSignature = computeTicketsDataSignature(tickets);
    const dataChanged = nextSignature !== lastRenderedTicketsSignature;
    writeTickets(tickets);
    if (dataChanged) {
      lastFilterTicketSignature = "";
      lastProjectFilterTicketSignature = "";
    }
    lastSheetRefreshAt = Date.now();
    if (dataChanged || options.forceRender) {
      scheduleRenderTickets({
        deferSecondary: Boolean(options.deferSecondary),
        activeOnly: true,
        deferRecent: true,
        immediate: Boolean(options.immediateRender)
      });
    }
    if (!options.silent) setStatus("online", `Loaded ${tickets.length} tickets`);

    if (!options.skipScreenshotSync) {
      const syncPromise = syncPendingScreenshotsToDrive(getValidTickets());
      if (options.deferScreenshotSync) {
        syncPromise.catch((error) => console.error(error));
      } else {
        await syncPromise;
      }
    }
    return true;
  } catch (error) {
    setTicketRefreshFailureStatus({ silent: options.silent });
    console.error(error);
    return false;
  }
}

const AUTO_REFRESH_INTERVAL_MS = 120000;
const AUTO_REFRESH_MIN_GAP_MS = 45000;
let autoRefreshInProgress = false;

function isAnyModalOpen() {
  return Boolean(
    (ticketCreateModal && !ticketCreateModal.hidden)
    || (ticketEditModal && !ticketEditModal.hidden)
    || (screenshotPreviewModal && !screenshotPreviewModal.hidden)
    || (document.querySelector("#procurementItemModal") && !document.querySelector("#procurementItemModal").hidden)
    || (document.querySelector("#procurementQuotesModal") && !document.querySelector("#procurementQuotesModal").hidden)
  );
}

function hasRecentPendingTicketSync() {
  const now = Date.now();
  return getValidTickets().some((ticket) => {
    const pending = Number(ticket.pendingSheetSync) || 0;
    return pending > 0 && (now - pending < PENDING_SYNC_TTL_MS);
  });
}

async function autoRefreshTickets() {
  if (!SHEET_WEB_APP_URL) return;
  if (document.hidden) return;
  if (autoRefreshInProgress || bootRefreshInProgress) return;
  if (isAnyModalOpen()) return;
  // Do not skip auto-refresh when other tickets are pending — mergeTicketFromSheet
  // already preserves only the fields this client is still syncing per ticket.
  if (lastSheetRefreshAt && (Date.now() - lastSheetRefreshAt) < AUTO_REFRESH_MIN_GAP_MS) return;

  autoRefreshInProgress = true;
  try {
    const ok = await refreshFromSheet({
      skipScreenshotSync: true,
      deferSecondary: true,
      silent: true,
      lite: true,
      retries: 1,
      timeoutMs: 25000
    });
    if (ok) {
      setStatus("online", `Auto-refreshed at ${new Date().toLocaleTimeString()}`);
    } else {
      // Keep local board usable; avoid flipping a transient blip into a hard error.
      setTicketRefreshFailureStatus({ forceStatus: true });
    }
  } finally {
    autoRefreshInProgress = false;
  }
}

function initAutoRefresh() {
  if (!SHEET_WEB_APP_URL) return;
  // Skip an immediate interval tick right after boot refresh.
  window.setTimeout(() => {
    setInterval(autoRefreshTickets, AUTO_REFRESH_INTERVAL_MS);
  }, AUTO_REFRESH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      autoRefreshTickets();
    }
  });
}

async function softRefreshAfterLocalPaint() {
  if (!SHEET_WEB_APP_URL || bootRefreshInProgress) return;

  bootRefreshInProgress = true;
  setStatus("", "Refreshing tickets...");
  try {
    await yieldToUi();
    const [ticketsOk] = await Promise.all([
      refreshFromSheet({
        skipScreenshotSync: true,
        deferSecondary: true,
        silent: true
      }),
      refreshUsersFromSheet()
    ]);
    if (ticketsOk) {
      const count = getValidTickets().length;
      setStatus("online", count ? `Loaded ${count} tickets` : "Synced");
      scheduleIdleWork(() => {
        syncPendingScreenshotsToDrive(getValidTickets()).catch((error) => console.error(error));
      }, 2500);
    } else {
      setTicketRefreshFailureStatus({ forceStatus: true });
    }
  } catch (error) {
    setTicketRefreshFailureStatus({ forceStatus: true });
    console.error(error);
  } finally {
    bootRefreshInProgress = false;
  }
}

function statusFilterIncludesCompleted(panel) {
  if (!panel) return false;
  return getMultiFilterValues(panel).some((status) => statusClass(status) === "status-completed");
}

function getFilteredDisplayedTickets() {
  const search = cleanText(ticketSearchFilter?.value);
  const filtered = applyTicketFilters(getValidTickets());
  let displayed = sortTickets(
    filtered,
    ticketSortFilter?.value || DEFAULT_TICKET_SORT,
    { includeCompleted: statusFilterIncludesCompleted(ticketStatusFilterPanel) }
  );
  // Type sorts (sap/infra) and open-only sorts can drop family members — re-attach, then glue.
  displayed = expandFilteredTicketsWithSubtaskFamily(displayed, filtered);
  if (search) {
    autoExpandParentsForNewSearch(search, displayed, "tickets");
  } else {
    lastTicketSearchQueryForExpand = "";
  }
  return groupTicketsWithSubtasks(displayed);
}

function getFilteredDisplayedProjectTickets() {
  const search = cleanText(projectSearchFilter?.value);
  const filtered = applyProjectFilters(getProjectTickets());
  let displayed = sortTickets(
    filtered,
    projectSortFilter?.value || DEFAULT_TICKET_SORT,
    { includeCompleted: statusFilterIncludesCompleted(projectStatusFilterPanel) }
  );
  // Re-attach family after sort so Daily SAP/Infra subtasks stay under their project parent.
  displayed = expandFilteredTicketsWithSubtaskFamily(displayed, filtered);
  if (search) {
    autoExpandParentsForNewSearch(search, displayed, "projects");
  } else {
    lastProjectSearchQueryForExpand = "";
  }
  return groupTicketsWithSubtasks(displayed);
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
  if (form.classList.contains("ticket-form-submitting")) return;

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

  const submissionId = createSubmissionId();
  // Re-submit of the same failed create: reuse existing pending locals with this form's
  // identity instead of pushing more clones. Match by submissionId stamped on first attempt.
  const existingPending = readTickets().filter((ticket) =>
    !Number(ticket.sheetRow)
    && selectedOwners.some((owner) => ticketIdentityKey(ticket) === ticketIdentityKey({ Task: String(new FormData(form).get("Task") || ""), Owner: owner }))
    && Number(ticket.pendingSheetSync) > 0
  );

  let ticketsToCreate;
  const formIntentTickets = buildTicketsFromForm(selectedOwners, { submissionId });
  if (existingPending.length && existingPending.length === selectedOwners.length) {
    ticketsToCreate = existingPending.map((ticket) => normalizeTicket({
      ...ticket,
      submissionId: ticket.submissionId || submissionId,
      ticketId: ticketStableId(ticket) || createTicketId(),
      pendingSheetSync: Date.now(),
      pendingFields: PENDING_SYNC_FIELD_KEYS.slice()
    }));
    writeTickets(readTickets().map((ticket) => {
      const replacement = ticketsToCreate.find((entry) => ticketStableId(entry) === ticketStableId(ticket)
        || (!ticketStableId(entry) && ticketsMatchIdentity(entry, ticket) && !Number(ticket.sheetRow)));
      return replacement || ticket;
    }));
  } else {
    ticketsToCreate = formIntentTickets.map((ticket) =>
      normalizeTicket(applyTicketApprovalPreview({
        ...ticket,
        pendingSheetSync: Date.now(),
        pendingFields: PENDING_SYNC_FIELD_KEYS.slice()
      }))
    );
  }

  // Sheet payload keeps pre-approval status intent so Apps Script applies workflow authoritatively.
  const sheetCreateTickets = ticketsToCreate.map((local) => {
    const intent = formIntentTickets.find((entry) =>
      cleanText(entry.Owner).toLowerCase() === cleanText(local.Owner).toLowerCase()
    ) || local;
    const kind = getRequiredApprovalKind(intent, null);
    if (kind === "completion") return { ...local, Type: intent.Type || local.Type, Status: "Completed" };
    if (kind === "project-type") {
      return { ...local, Type: intent.Type || local.Type, Status: intent.Status || "Not started" };
    }
    if (isPendingApprovalStatus(local.Status) && !isPendingApprovalStatus(intent.Status)) {
      return { ...local, Type: intent.Type || local.Type, Status: intent.Status || "Not started" };
    }
    return local;
  });

  const completionError = formIntentTickets.map(getTicketCompletionError).find(Boolean)
    || ticketsToCreate.map(getTicketCompletionError).find(Boolean);
  if (completionError) {
    alert(completionError);
    return;
  }

  startTicketSubmitProgress("Saving tickets locally...");
  await yieldToUi();

  if (!(existingPending.length && existingPending.length === selectedOwners.length)) {
    const tickets = readTickets();
    ticketsToCreate.forEach((ticket) => {
      const already = tickets.some((entry) => ticketStableId(entry) === ticketStableId(ticket)
        || (cleanText(entry.submissionId) && cleanText(entry.submissionId) === cleanText(ticket.submissionId)
          && ticketsMatchIdentity(entry, ticket)));
      if (!already) tickets.push(ticket);
    });
    writeTickets(tickets);
  }
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
        sheetCreateTickets,
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
        const saved = getValidTickets().find((entry) =>
          (ticketStableId(ticket) && ticketStableId(entry) === ticketStableId(ticket))
          || ticketIdentityKey(entry) === ticketIdentityKey(ticket)
        );
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
        const saved = getValidTickets().find((entry) =>
          (ticketStableId(ticket) && ticketStableId(entry) === ticketStableId(ticket))
          || ticketIdentityKey(entry) === ticketIdentityKey(ticket)
        );
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
    const message = friendlySheetSyncError(error);
    setStatus("error", message);
    console.error(error);
  } finally {
    clearDuplicateTicketInFlight();
  }
});

ticketEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canEditTickets()) {
    alert("You do not have permission to edit tickets.");
    return;
  }
  if (ticketEditSubmitInFlight || ticketEditDeleteInFlight || ticketEditForm.classList.contains("ticket-form-submitting")) {
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

  // Protect Completed → Not started / casual reopen (manager confirm).
  const priorStatus = cleanText(activeEditTicket?.Status);
  const nextStatus = cleanText(updatedTicket.Status);
  if (/^completed$/i.test(priorStatus) && nextStatus && !/^completed$/i.test(nextStatus) && !/^pending approval$/i.test(nextStatus)) {
    if (!canCurrentUserApproveTicket(activeEditTicket || updatedTicket)) {
      if (!confirm("This task is Completed. Reopening it will undo completion. Continue?")) {
        return;
      }
    }
  }

  // Stale Pending Approval must not overwrite a manager Completed already on the sheet.
  if (/^pending approval$/i.test(nextStatus) && /^completed$/i.test(priorStatus)) {
    alert("This task is already Completed. Refresh and reopen the editor before changing status.");
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

  const sheetTicket = {
    ...updatedTicket,
    ...rowIdentityFields(updatedTicket, activeEditTicket),
    ticketId: ticketStableId(updatedTicket) || ticketStableId(activeEditTicket) || createTicketId(),
    expectedStatus: priorStatus || nextStatus,
    lastKnownStatus: priorStatus || nextStatus,
    lastUpdated: cleanText(activeEditTicket?.lastUpdated) || cleanText(updatedTicket.lastUpdated) || new Date().toISOString()
  };
  const localTicket = applyTicketApprovalPreview({
    ...updatedTicket,
    ...rowIdentityFields(updatedTicket, activeEditTicket),
    ticketId: sheetTicket.ticketId,
    lastUpdated: new Date().toISOString()
  }, activeEditTicket);

  ticketEditSubmitInFlight = true;
  ticketEditForm.classList.add("ticket-form-submitting");
  setTicketEditBusyState({ saving: true });
  setStatus("", "Saving ticket...");

  updateLocalTicket(localTicket);
  renderTickets();

  try {
    await sendTicketUpdateToSheet(sheetTicket);
    const hasPendingAttachments = extractNoteAttachments(updatedTicket.NotesHtml || "").length > 0;
    const attachmentsSaved = !hasPendingAttachments
      || await verifyDriveUploadAfterSave(updatedTicket.sheetRow);
    ticketEditSubmitInFlight = false;
    ticketEditForm.classList.remove("ticket-form-submitting");
    setTicketEditBusyState();
    resetTicketEditSaveUi();
    if (attachmentsSaved) {
      closeTicketEditor();
    } else {
      alert("Ticket fields saved, but screenshot upload to Google Drive failed.\n\nKeep the editor open and click Save again, or run setupDriveAccess in Apps Script.");
    }
    renderTickets();
  } catch (error) {
    const message = friendlySheetSyncError(error);
    setStatus("error", message);
    console.error(error);
    // Quiet retries already happened for transient lock contention. Only alert
    // for non-busy failures; busy exhaustion stays in the status bar.
    if (!isSheetBusyError(error)) {
      alert(`${message}\n\nThe editor will stay open so you can retry.`);
    }
  } finally {
    ticketEditSubmitInFlight = false;
    ticketEditForm.classList.remove("ticket-form-submitting");
    setTicketEditBusyState();
    resetTicketEditSaveUi();
  }
});

closeTicketEditButton?.addEventListener("click", closeTicketEditor);
cancelTicketEditButton?.addEventListener("click", closeTicketEditor);
deleteTicketEditButton?.addEventListener("click", requestTicketDelete);
confirmDeleteTicketButton?.addEventListener("click", executeTicketDelete);
cancelDeleteTicketButton?.addEventListener("click", closeTicketDeleteConfirm);
closeTicketDeleteConfirmButton?.addEventListener("click", closeTicketDeleteConfirm);

ticketDeleteConfirmModal?.addEventListener("click", (event) => {
  if (event.target === ticketDeleteConfirmModal && !ticketEditDeleteInFlight) {
    closeTicketDeleteConfirm();
  }
});

ticketEditModal?.addEventListener("click", (event) => {
  if (event.target === ticketEditModal) {
    closeTicketEditor();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ticketDeleteConfirmModal && !ticketDeleteConfirmModal.hidden) {
    closeTicketDeleteConfirm();
    return;
  }
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
    if (button.dataset.tab === "procurement") {
      if (typeof refreshProcurementFromSheet === "function") {
        refreshProcurementFromSheet();
      }
    }
  });
});

enterPresentModeButton?.addEventListener("click", () => setPresentMode(true));
exitPresentModeButton?.addEventListener("click", () => setPresentMode(false));
document.addEventListener("fullscreenchange", onPresentModeFullscreenChange);
document.addEventListener("webkitfullscreenchange", onPresentModeFullscreenChange);
document.addEventListener("MSFullscreenChange", onPresentModeFullscreenChange);
function onPresentationTypeFilterChange() {
  selectedPresentationType = normalizePresentationTypeFilter(presentationTypeFilter?.value);
  if (presentationTypeFilter) presentationTypeFilter.value = selectedPresentationType;
  renderPresentationView();
}
presentationTypeFilter?.addEventListener("change", onPresentationTypeFilterChange);
presentationTypeFilter?.addEventListener("input", onPresentationTypeFilterChange);
presentationOwnerFilter?.addEventListener("change", () => {
  selectedPresentationOwner = cleanText(presentationOwnerFilter.value) || "all";
  renderPresentationView();
});
presentationPeriodFilters?.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPresentationPeriod = button.dataset.period || "all";
    presentationPeriodFilters.querySelectorAll("[data-period]").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });
    syncPresentationCustomRangeVisibility();
    renderPresentationView();
  });
});
presentationDateFrom?.addEventListener("change", () => {
  if (selectedPresentationPeriod === "custom") renderPresentationView();
});
presentationDateTo?.addEventListener("change", () => {
  if (selectedPresentationPeriod === "custom") renderPresentationView();
});
syncPresentationCustomRangeVisibility();
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("present-mode")) {
    setPresentMode(false);
  }
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

async function confirmManualSheetRefresh() {
  if (!hasRecentPendingTicketSync()) return true;
  return confirm(
    "You have recent local edits still syncing. Refresh will pull the latest sheet data for other tickets; fields you edited here stay protected until the save finishes.\n\nUse Clear Local on both machines if you need a full reset.\n\nContinue with Refresh?"
  );
}

async function handleManualSheetRefresh() {
  if (!(await confirmManualSheetRefresh())) return false;
  return refreshFromSheet();
}

refreshUsersButton?.addEventListener("click", refreshUsersFromSheet);

refreshSheetButton?.addEventListener("click", () => { handleManualSheetRefresh(); });
refreshProjectsSheetButton?.addEventListener("click", () => { handleManualSheetRefresh(); });
kanbanRefreshButton?.addEventListener("click", () => { handleManualSheetRefresh(); });
exportButton?.addEventListener("click", () => downloadCsv());
exportProjectsButton?.addEventListener("click", downloadProjectsCsv);
exportPerformanceButton?.addEventListener("click", downloadPerformanceCsv);
openProjectTicketCreateButton?.addEventListener("click", () => openTicketCreateModal());

[kanbanSearchFilter, kanbanOwnerFilter, kanbanPriorityFilter, kanbanShowCompleted]
.filter(Boolean)
.forEach((control) => control.addEventListener("input", () => scheduleRenderTickets()));

performanceOwnerFilter?.addEventListener("change", () => scheduleRenderTickets({ immediate: true }));
performanceTypeFilter?.addEventListener("change", () => scheduleRenderTickets({ immediate: true }));

performancePeriodFilters?.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedPerformancePeriod(button.dataset.period || "today");
    scheduleRenderTickets({ immediate: true });
  });
});
setSelectedPerformancePeriod(selectedPerformancePeriod);

ticketSearchFilter?.addEventListener("input", () => scheduleRenderTickets());
ticketSortFilter?.addEventListener("change", () => scheduleRenderTickets({ immediate: true }));
projectSearchFilter?.addEventListener("input", () => scheduleRenderTickets());
projectSortFilter?.addEventListener("change", () => scheduleRenderTickets({ immediate: true }));

initMultiFilterControls();
setTicketSortFilter(DEFAULT_TICKET_SORT);
setProjectSortFilter(DEFAULT_TICKET_SORT);
bindClearTicketFiltersButtons();

function bindClearTicketFiltersButtons() {
  clearTicketFilters?.addEventListener("click", () => {
    resetTicketFilters();
    scheduleRenderTickets({ immediate: true });
  });
  clearProjectFilters?.addEventListener("click", () => {
    resetProjectFilters();
    scheduleRenderTickets({ immediate: true });
  });
}

async function forceAlignTicketsFromSheet() {
  writeDeletedTicketTombstones([]);
  invalidateTicketsMemoryCache();
  try {
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(LOCAL_BACKUP_KEY);
  } catch (error) {
    console.warn("Could not clear local ticket cache.", error);
  }
  ticketsMemoryCache = null;

  if (!SHEET_WEB_APP_URL) {
    writeTickets([]);
    renderTickets();
    setStatus("", "Sync not configured");
    return false;
  }

  setStatus("", "Pulling tickets from Google Sheet...");
  const ok = await refreshFromSheet({ forceRender: true, immediateRender: true });
  if (ok) {
    setStatus("online", `Aligned ${getValidTickets().length} tickets from sheet`);
  }
  return ok;
}

clearLocalButton?.addEventListener("click", async () => {
  const message = SHEET_WEB_APP_URL
    ? "Discard this device's local ticket cache and reload everything from the Google Sheet?\n\nUse this on both machines if they show different data. Synced sheet rows are not deleted."
    : "Clear locally saved ticket previews? This does not delete synced tickets.";
  if (!confirm(message)) return;
  await forceAlignTicketsFromSheet();
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
  resetSurajTicketCreateTracking();
});

form?.elements.Type?.addEventListener("change", () => {
  ticketCreateTypeTouched = true;
});
form?.elements.Milestone?.addEventListener("change", () => {
  ticketCreateMilestoneTouched = true;
});
form?.elements.Milestone?.addEventListener("input", () => {
  ticketCreateMilestoneTouched = true;
});
form?.elements?.Status?.addEventListener("change", onTicketStatusChangeForEndDate);
ticketEditForm?.elements?.Status?.addEventListener("change", onTicketStatusChangeForEndDate);

if (form?.elements["Start date"]) {
form.elements["Start date"].valueAsDate = new Date();
}
initTicketNotesEditor(ticketNotesEditor, ticketNotesInput);
initTicketNotesEditor(ticketEditNotesEditor, ticketEditNotesInput);
initTicketFormOwnerSelect();
hideTicketSubmitProgress();
initTicketsCrossTabSync();
initChromeCollapse();
initTopbarCollapse();
initPerformanceFilterSidebar();
initToolbarCollapse();
initPresentationHeroCollapse();
const initialTab = document.querySelector(".tab-button.active")?.dataset.tab;
if (initialTab) {
  setActiveTab(initialTab, { skipRender: true });
}
Auth.refreshSessionRights();
Auth.applyAccessControl();
setStatus(SHEET_WEB_APP_URL ? "online" : "", SHEET_WEB_APP_URL ? "Ready to sync" : "Sync not configured");
renderRightsForm(emptyRights());
renderUsers();
// Paint cached local tickets for the active tab only, then soft-refresh in background.
renderTickets({ deferSecondary: true, activeOnly: true, deferRecent: true });
initAutoRefresh();
if (SHEET_WEB_APP_URL) {
  softRefreshAfterLocalPaint();
}
