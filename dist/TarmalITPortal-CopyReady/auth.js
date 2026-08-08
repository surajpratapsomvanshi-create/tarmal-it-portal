const Auth = {
  SESSION_KEY: "tarmal-session",
  USERS_KEY: "tarmal-users",
  // Auth session persisted when "Remember me on this device" is enabled.
  // This intentionally stores only the app-side authorization payload (no password).
  REMEMBER_IDENTIFIER_KEY: "tarmal-login-remember",
  REMEMBER_SESSION_KEY: "tarmal-auth",
  // Keep the session long enough for "remember me" to feel reliable.
  REMEMBER_TTL_MS: 1000 * 60 * 60 * 24 * 30,
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

  hasCachedUsers() {
    const saved = localStorage.getItem(this.USERS_KEY);
    if (!saved) return false;
    try {
      const list = JSON.parse(saved);
      return Array.isArray(list) && list.length > 0;
    } catch {
      return false;
    }
  },

  sleep_(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  },

  tryParseJsonText_(candidate) {
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      return { ok: false };
    }
  },

  /**
   * Soft-parse Apps Script users responses the same way ticket sync does:
   * tolerate BOM, HTML error wrappers, and callback(...) JSONP envelopes.
   */
  parseUsersResponse_(text) {
    const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();
    if (!raw) {
      throw new Error("Empty response from Apps Script.");
    }

    const head = raw.slice(0, 80).toLowerCase();
    const looksHtml = head.startsWith("<!doctype")
      || head.startsWith("<html")
      || head.startsWith("<head")
      || head.startsWith("<body")
      || head.startsWith("<pre");

    let parsed = this.tryParseJsonText_(raw);
    if (parsed.ok) return parsed.value;

    const jsonpMatch = raw.match(/^[a-zA-Z_$][\w$]*\s*\(\s*([\s\S]*)\s\)\s*;?\s*$/);
    if (jsonpMatch) {
      parsed = this.tryParseJsonText_(jsonpMatch[1]);
      if (parsed.ok) return parsed.value;
    }

    const okObjectMatch = raw.match(/\{\s*"ok"\s*:[\s\S]*\}/);
    if (okObjectMatch) {
      parsed = this.tryParseJsonText_(okObjectMatch[0]);
      if (parsed.ok && parsed.value && typeof parsed.value === "object") return parsed.value;
    }

    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      parsed = this.tryParseJsonText_(braceMatch[0]);
      if (parsed.ok && parsed.value && typeof parsed.value === "object") return parsed.value;
    }

    if (looksHtml) {
      throw new Error("Sheet sync returned an HTML error page instead of JSON.");
    }
    throw new Error("Could not read users response from Apps Script.");
  },

  applyRemoteUsersPayload_(payload, options = {}) {
    const deferSync = options.deferSync !== false;
    if (!payload || payload.ok === false) {
      throw new Error(payload?.error || "Could not load users.");
    }

    // Read cache at apply-time so failed attempts never wipe local users.
    const localUsers = this.readUsers();
    const remoteUsers = (payload.users || []).map((user) => this.normalizeUser(user));
    const merged = this.mergeUsers(localUsers, remoteUsers, true);
    this.saveUsers(merged);

    // Never push when the sheet returned an empty user list — that wipe risk
    // has deleted real AppUsers rows after a failed/partial read.
    const shouldPushToSheet = remoteUsers.length > 0
      && (merged.length > remoteUsers.length || this.usersChanged_(merged, remoteUsers));

    if (!shouldPushToSheet) {
      return Promise.resolve(merged);
    }

    const syncPromise = this.syncUsersToSheet(merged);
    if (deferSync) {
      syncPromise.catch(() => {});
      return Promise.resolve(merged);
    }

    return syncPromise.then(() => merged).catch(() => merged);
  },

  fetchUsersViaHttp_(timeoutMs) {
    if (!this.SHEET_WEB_APP_URL) {
      return Promise.reject(new Error("Sync is not configured."));
    }

    const separator = this.SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;

    const request = fetch(`${this.SHEET_WEB_APP_URL}${separator}resource=users`, {
      method: "GET",
      redirect: "follow",
      credentials: "omit",
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    }).then(async (response) => {
      const text = await response.text();
      return this.parseUsersResponse_(text);
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
        reject(new Error("User sync timed out."));
      }, timeoutMs);
    });

    return Promise.race([request, timeoutPromise]).finally(() => {
      if (timer) window.clearTimeout(timer);
    });
  },

  fetchUsersViaJsonp_(timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!this.SHEET_WEB_APP_URL) {
        reject(new Error("Sync is not configured."));
        return;
      }

      const callbackName = `handleSheetUsers_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const script = document.createElement("script");
      const separator = this.SHEET_WEB_APP_URL.includes("?") ? "&" : "?";
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
        reject(new Error("Could not load users."));
      };

      script.src = `${this.SHEET_WEB_APP_URL}${separator}resource=users&callback=${callbackName}`;
      document.body.appendChild(script);

      if (timeoutMs > 0) {
        timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("User sync timed out."));
        }, timeoutMs);
      }
    });
  },

  loadUsersFromSheet(options = {}) {
    const deferSync = options.deferSync !== false;
    // Apps Script cold starts + redirects are routinely >20s on phones.
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 35000;
    const retries = Math.max(0, Number.isFinite(Number(options.retries)) ? Number(options.retries) : 2);
    const backoffMs = [400, 1000, 1800];

    const fetchOnce = async () => {
      let payload;
      try {
        payload = await this.fetchUsersViaHttp_(timeoutMs);
      } catch (httpError) {
        // CORS / opaque gateway failures: fall back to JSONP.
        payload = await this.fetchUsersViaJsonp_(timeoutMs);
      }
      return this.applyRemoteUsersPayload_(payload, { deferSync });
    };

    const runWithRetries = async () => {
      let lastError;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          return await fetchOnce();
        } catch (error) {
          lastError = error;
          // Failed refresh must never clear cached users — readUsers/saveUsers
          // are only called after a successful payload parse.
          if (attempt < retries) {
            await this.sleep_(backoffMs[Math.min(attempt, backoffMs.length - 1)]);
          }
        }
      }
      throw lastError || new Error("Could not load users.");
    };

    return runWithRetries();
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
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fall through to restore remembered session.
      }
    }

    return this.restoreRememberedSession_();
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

  persistRememberedSession(user = null) {
    const session = user || this.currentUser();
    if (!session) return;

    const expiresAt = Date.now() + this.REMEMBER_TTL_MS;
    const payload = {
      v: 1,
      savedAt: Date.now(),
      expiresAt,
      session: {
        id: session.id,
        name: session.name,
        username: session.username,
        email: session.email || "",
        rights: session.rights || {}
      }
    };

    localStorage.setItem(this.REMEMBER_SESSION_KEY, JSON.stringify(payload));
  },

  clearRememberedSession() {
    localStorage.removeItem(this.REMEMBER_SESSION_KEY);
    localStorage.removeItem(this.REMEMBER_IDENTIFIER_KEY);
  },

  restoreRememberedSession_() {
    const raw = localStorage.getItem(this.REMEMBER_SESSION_KEY);
    if (!raw) return null;

    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      this.clearRememberedSession();
      return null;
    }

    const expiresAt = Number(stored?.expiresAt);
    if (!expiresAt || expiresAt < Date.now()) {
      this.clearRememberedSession();
      return null;
    }

    const session = stored?.session;
    if (!session?.id) {
      this.clearRememberedSession();
      return null;
    }

    try {
      this.setSession(session);
    } catch {
      this.clearRememberedSession();
      return null;
    }

    const restoredRaw = sessionStorage.getItem(this.SESSION_KEY);
    if (!restoredRaw) return null;

    try {
      return JSON.parse(restoredRaw);
    } catch {
      return null;
    }
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
    this.clearRememberedSession();
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
