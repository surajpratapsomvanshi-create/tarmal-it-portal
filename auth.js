const Auth = {
  SESSION_KEY: "tarmal-session",
  USERS_KEY: "tarmal-users",
  SHEET_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbxHaOjHagv-HuDxMuNoIjXCSCwSlbabV1glYUBgNEdYfLvpQepmPdEzjuJIoHrSOrMW/exec",
  ADMIN_USER: {
    id: "user-admin",
    name: "Admin",
    username: "admin",
    email: "admin@tarmal.com",
    password: "1234",
    active: true,
    rights: {
      dashboard: true,
      createTicket: true,
      editTicket: true,
      exportData: true,
      syncSheet: true,
      manageUsers: true,
      viewAssets: true,
      manageAssets: true,
      viewDocuments: true,
      manageDocuments: true
    }
  },

  allRights() {
    return { ...this.ADMIN_USER.rights };
  },

  isBuiltInAdmin(user) {
    if (!user) return false;
    if (user.id === this.ADMIN_USER.id) return true;
    const username = String(user.username || "").toLowerCase();
    const name = String(user.name || "").toLowerCase();
    return username === "admin" || name === "admin";
  },

  findStoredUser(user) {
    if (!user) return null;

    const name = String(user.name || "").toLowerCase();
    const username = String(user.username || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();
    const saved = localStorage.getItem(this.USERS_KEY);
    if (!saved) return null;

    try {
      const list = JSON.parse(saved);
      if (!Array.isArray(list)) return null;
      const match = list.find((entry) =>
        entry.id === user.id
        || String(entry.name || "").toLowerCase() === name
        || String(entry.username || "").toLowerCase() === username
        || (email && String(entry.email || "").toLowerCase() === email)
      );
      return match ? this.normalizeUser(match) : null;
    } catch {
      return null;
    }
  },

  generatePassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let password = "";
    const random = crypto.getRandomValues(new Uint32Array(length));
    random.forEach((value) => {
      password += chars[value % chars.length];
    });
    return password;
  },

  migrateDocumentRights(rights) {
    const next = { ...rights };

    if (!next.viewDocuments) {
      next.viewDocuments = Boolean(next.viewAssets || next.manageAssets || next.manageUsers);
    }
    if (!next.manageDocuments) {
      next.manageDocuments = Boolean(next.manageAssets || next.manageUsers);
    }

    return next;
  },

  normalizeUser(user) {
    const rights = this.migrateDocumentRights({
      dashboard: Boolean(user.rights?.dashboard),
      createTicket: Boolean(user.rights?.createTicket),
      editTicket: Boolean(user.rights?.editTicket),
      exportData: Boolean(user.rights?.exportData),
      syncSheet: Boolean(user.rights?.syncSheet),
      manageUsers: Boolean(user.rights?.manageUsers),
      viewAssets: Boolean(user.rights?.viewAssets),
      manageAssets: Boolean(user.rights?.manageAssets),
      viewDocuments: Boolean(user.rights?.viewDocuments),
      manageDocuments: Boolean(user.rights?.manageDocuments)
    });

    const finalRights = this.isBuiltInAdmin(user) || rights.manageUsers
      ? this.allRights()
      : rights;

    return {
      id: String(user.id || ""),
      name: String(user.name || "").trim(),
      username: String(user.username || user.name || "").trim(),
      email: String(user.email || "").trim(),
      password: String(user.password || "").trim(),
      active: user.active !== false,
      rights: finalRights
    };
  },

  matchesIdentifier_(user, value) {
    const needle = String(value || "").trim().toLowerCase();
    if (!needle) return false;

    const name = String(user.name || "").trim().toLowerCase();
    const username = String(user.username || "").trim().toLowerCase();
    const email = String(user.email || "").trim().toLowerCase();

    if (name === needle || username === needle || (email && email === needle)) {
      return true;
    }

    // Allow first-token match so "Suraj" works when username is "Suraj Pratap".
    const tokens = new Set(
      [name, username]
        .filter(Boolean)
        .flatMap((part) => part.split(/[\s._@-]+/).filter(Boolean))
    );
    return tokens.has(needle);
  },

  hasPermission(rightId) {
    if (this.isAdminLevelUser()) return true;
    if (rightId === "viewAssets") return this.canViewAssets();
    if (rightId === "manageAssets") return this.canManageAssets();
    if (rightId === "viewDocuments") return this.canViewDocuments();
    if (rightId === "manageDocuments") return this.canManageDocuments();
    return this.hasRight(rightId);
  },

  canViewAssets() {
    return this.isAdminLevelUser()
      || this.hasRight("viewAssets")
      || this.hasRight("manageAssets");
  },

  isAdminUser(user = this.currentUser()) {
    if (!user) return false;
    if (this.isBuiltInAdmin(user)) return true;

    const stored = this.findStoredUser(user);
    return Boolean(stored && this.isBuiltInAdmin(stored));
  },

  isAdminLevelUser(user = this.currentUser()) {
    if (!user) return false;
    if (this.isAdminUser(user)) return true;
    if (Boolean(user.rights?.manageUsers)) return true;

    const stored = this.findStoredUser(user);
    return Boolean(stored?.rights?.manageUsers);
  },

  canManageAssets() {
    return this.isAdminLevelUser() || this.hasRight("manageAssets");
  },

  canViewDocuments() {
    return this.isAdminLevelUser()
      || this.hasRight("viewDocuments")
      || this.hasRight("manageDocuments");
  },

  canManageDocuments() {
    return this.isAdminLevelUser() || this.hasRight("manageDocuments");
  },

  canEditTickets() {
    return this.isAdminLevelUser() || this.hasRight("editTicket");
  },

  readUsers() {
    let users = [];
    const saved = localStorage.getItem(this.USERS_KEY);

    if (saved) {
      try {
        users = JSON.parse(saved);
      } catch {
        users = [];
      }
    }

    return this.ensureAdminUser(users).map((user) => this.normalizeUser(user));
  },

  saveUsers(users) {
    const normalized = this.ensureAdminUser(users).map((user) => this.normalizeUser(user));
    localStorage.setItem(this.USERS_KEY, JSON.stringify(normalized));
    return normalized;
  },

  ensureAdminUser(users) {
    const list = Array.isArray(users) ? users.slice() : [];
    const hasAdmin = list.some((entry) =>
      String(entry.username || "").toLowerCase() === "admin" || entry.id === this.ADMIN_USER.id
    );

    if (!hasAdmin) {
      list.unshift({ ...this.ADMIN_USER });
    } else {
      list.forEach((entry, index) => {
        if (entry.id === this.ADMIN_USER.id || String(entry.username || "").toLowerCase() === "admin") {
          list[index] = this.normalizeUser({
            ...entry,
            rights: this.allRights()
          });
        }
      });
    }

    return list;
  },

  userIdentityKeys_(user) {
    const keys = new Set();
    const id = String(user.id || "").trim().toLowerCase();
    const name = String(user.name || "").trim().toLowerCase();
    const username = String(user.username || "").trim().toLowerCase();
    const email = String(user.email || "").trim().toLowerCase();
    if (id) keys.add(`id:${id}`);
    if (name) keys.add(`name:${name}`);
    if (username) keys.add(`username:${username}`);
    if (email) keys.add(`email:${email}`);
    return [...keys];
  },

  findMergedUserId_(index, user) {
    for (const key of this.userIdentityKeys_(user)) {
      const existingId = index.get(key);
      if (existingId) return existingId;
    }
    return String(user.id || "");
  },

  indexMergedUser_(index, user) {
    this.userIdentityKeys_(user).forEach((key) => index.set(key, user.id));
  },

  mergeUsers(localUsers, remoteUsers, preferRemote = false) {
    const merged = new Map();
    const identityIndex = new Map();

    remoteUsers.forEach((user) => {
      const normalized = this.normalizeUser(user);
      const id = normalized.id || `user-${merged.size + 1}`;
      const next = this.normalizeUser({ ...normalized, id });
      merged.set(id, next);
      this.indexMergedUser_(identityIndex, next);
    });

    localUsers.forEach((user) => {
      const normalized = this.normalizeUser(user);
      const existingId = this.findMergedUserId_(identityIndex, normalized);

      if (existingId && merged.has(existingId)) {
        if (preferRemote) return;

        const remote = merged.get(existingId);
        const next = this.normalizeUser({
          ...remote,
          ...normalized,
          id: existingId,
          rights: {
            ...remote.rights,
            ...normalized.rights
          }
        });
        merged.set(existingId, next);
        this.indexMergedUser_(identityIndex, next);
        return;
      }

      const id = normalized.id || `user-local-${merged.size + 1}`;
      const next = this.normalizeUser({ ...normalized, id });
      merged.set(id, next);
      this.indexMergedUser_(identityIndex, next);
    });

    return this.ensureAdminUser([...merged.values()]).map((user) => this.normalizeUser(user));
  },

  loadUsersFromSheet(options = {}) {
    const deferSync = options.deferSync !== false;
    const timeoutMs = Number(options.timeoutMs) || 0;

    const fetchUsers = new Promise((resolve, reject) => {
      if (!this.SHEET_WEB_APP_URL) {
        reject(new Error("Sync is not configured."));
        return;
      }

      const localUsers = this.readUsers();
      const callbackName = `handleSheetUsers_${Date.now()}`;
      const script = document.createElement("script");
      const separator = this.SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (payload) => {
        cleanup();
        if (!payload || payload.ok === false) {
          reject(new Error(payload?.error || "Could not load users."));
          return;
        }

        const remoteUsers = (payload.users || []).map((user) => this.normalizeUser(user));
        const merged = this.mergeUsers(localUsers, remoteUsers, true);
        this.saveUsers(merged);

        // Never push when the sheet returned an empty user list — that wipe risk
        // has deleted real AppUsers rows after a failed/partial read.
        const shouldPushToSheet = remoteUsers.length > 0
          && (merged.length > remoteUsers.length || this.usersChanged_(merged, remoteUsers));

        if (shouldPushToSheet) {
          const syncPromise = this.syncUsersToSheet(merged);
          if (deferSync) {
            syncPromise.catch(() => {});
          } else {
            syncPromise.then(() => resolve(merged)).catch(() => resolve(merged));
            return;
          }
        }

        resolve(merged);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Could not load users."));
      };

      script.src = `${this.SHEET_WEB_APP_URL}${separator}resource=users&callback=${callbackName}`;
      document.body.appendChild(script);
    });

    if (timeoutMs > 0) {
      return Promise.race([
        fetchUsers,
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("User sync timed out.")), timeoutMs);
        })
      ]);
    }

    return fetchUsers;
  },

  async syncUsersToSheet(users) {
    if (!this.SHEET_WEB_APP_URL) return { synced: false };

    const payload = this.ensureAdminUser(users).map((user) => this.normalizeUser(user));
    await fetch(this.SHEET_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "syncUsers",
        users: payload
      })
    });

    return { synced: true };
  },

  usersChanged_(nextUsers, previousUsers) {
    const previous = new Map(previousUsers.map((user) => [user.id, this.normalizeUser(user)]));

    return nextUsers.some((user) => {
      const before = previous.get(user.id);
      if (!before) return true;
      return JSON.stringify(before.rights) !== JSON.stringify(this.normalizeUser(user).rights)
        || before.password !== user.password
        || before.active !== user.active
        || before.name !== user.name
        || before.username !== user.username
        || before.email !== user.email;
    });
  },

  getSession() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(user) {
    const normalized = this.normalizeUser(user);
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      id: normalized.id,
      name: normalized.name,
      username: normalized.username,
      email: normalized.email || "",
      rights: normalized.rights || {}
    }));
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  currentUser() {
    return this.getSession();
  },

  hasRight(rightId) {
    const user = this.currentUser();
    if (!user) return false;
    if (this.isAdminLevelUser(user)) return true;
    return Boolean(user.rights?.[rightId]);
  },

  login(identifier, password) {
    const value = String(identifier || "").trim().toLowerCase();
    const secret = String(password || "");
    const users = this.readUsers();
    const matches = users.filter((entry) => this.matchesIdentifier_(entry, value));

    // Prefer a password match when stale local duplicates share the same name.
    const user = matches.find((entry) => entry.password === secret)
      || matches.find((entry) => entry.password === secret.trim())
      || null;

    if (!user) {
      return { ok: false, error: "Invalid username or password." };
    }

    if (user.active === false) {
      return { ok: false, error: "This account is disabled." };
    }

    this.setSession(user);
    return { ok: true, user };
  },

  logout() {
    this.clearSession();
    window.location.href = "./login.html";
  },

  requireLogin() {
    if (this.getSession()) return true;
    window.location.href = "./login.html";
    return false;
  },

  applyAccessControl() {
    const user = this.currentUser();
    if (!user) return;

    const userLabel = document.querySelector("#currentUserLabel");
    if (userLabel) {
      userLabel.textContent = user.name;
    }

    document.querySelectorAll("[data-requires]").forEach((element) => {
      const rights = element.dataset.requires.split(",").map((item) => item.trim());
      const allowed = rights.some((right) => this.hasPermission(right));

      if (element.classList.contains("tab-panel")) {
        element.toggleAttribute("data-access-denied", !allowed);
        return;
      }

      element.hidden = !allowed;
      element.style.display = allowed ? "" : "none";
    });

    document.querySelectorAll(".tab-button[data-tab='users']").forEach((button) => {
      const allowed = this.hasPermission("manageUsers");
      button.hidden = !allowed;
      button.style.display = allowed ? "" : "none";
    });

    document.querySelectorAll(".tab-button[data-tab='asset-register']").forEach((button) => {
      const allowed = this.canManageAssets();
      button.hidden = !allowed;
      button.style.display = allowed ? "" : "none";
    });

    document.querySelectorAll(".tab-button[data-tab='asset-list']").forEach((button) => {
      const allowed = this.canViewAssets();
      button.hidden = !allowed;
      button.style.display = allowed ? "" : "none";
    });

    document.querySelectorAll(".tab-button[data-tab='documents']").forEach((button) => {
      const allowed = this.canViewDocuments();
      button.hidden = !allowed;
      button.style.display = allowed ? "" : "none";
    });
  },

  refreshSessionRights() {
    const session = this.getSession();
    if (!session) return;

    const sessionName = String(session.name || "").toLowerCase();
    const updated = this.readUsers().find((user) =>
      user.id === session.id
      || String(user.username || "").toLowerCase() === sessionName
      || String(user.name || "").toLowerCase() === sessionName
      || String(user.email || "").toLowerCase() === sessionName
    );

    if (updated) {
      this.setSession(updated);
      this.applyAccessControl();
    }
  }
};
