const Documents = {
  LOCAL_KEY: "tarmal-it-documents",
  CATEGORIES: ["Policy", "SOP", "Manual", "Network", "Security", "Hardware", "Software", "Compliance", "Other"],
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  ACCEPT_TYPES: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv",

  read() {
    const saved = localStorage.getItem(this.LOCAL_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved).map((doc) => this.normalize(doc));
    } catch {
      return [];
    }
  },

  save(documents) {
    const normalized = documents.map((doc) => this.normalize(doc));
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(normalized));
    return normalized;
  },

  normalize(doc) {
    const category = String(doc.category || "").trim();
    return {
      id: String(doc.id || ""),
      title: String(doc.title || "").trim(),
      category: this.CATEGORIES.includes(category) ? category : "Other",
      description: String(doc.description || "").trim(),
      fileName: String(doc.fileName || "").trim(),
      mimeType: String(doc.mimeType || "").trim(),
      driveFileId: String(doc.driveFileId || "").trim(),
      driveUrl: String(doc.driveUrl || "").trim(),
      ownerUserId: String(doc.ownerUserId || "").trim(),
      ownerName: String(doc.ownerName || "").trim(),
      visibility: ["all", "restricted", "private"].includes(doc.visibility) ? doc.visibility : "restricted",
      sharedWith: String(doc.sharedWith || "").trim(),
      uploadedAt: String(doc.uploadedAt || "").trim()
    };
  },

  createId() {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  },

  merge(localDocs, remoteDocs) {
    const merged = new Map();
    remoteDocs.forEach((doc) => merged.set(doc.id, this.normalize(doc)));
    localDocs.forEach((doc) => {
      if (!merged.has(doc.id)) {
        merged.set(doc.id, this.normalize(doc));
      }
    });
    return [...merged.values()];
  },

  loadFromSheet() {
    return new Promise((resolve, reject) => {
      const url = Auth.SHEET_WEB_APP_URL;
      if (!url) {
        reject(new Error("Sheet endpoint is not configured."));
        return;
      }

      const localDocs = this.read();
      const callbackName = `handleSheetDocuments_${Date.now()}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = async (payload) => {
        cleanup();
        if (!payload || payload.ok === false) {
          reject(new Error(payload?.error || "Could not load documents."));
          return;
        }

        const remoteDocs = (payload.documents || []).map((doc) => this.normalize(doc));
        const merged = this.merge(localDocs, remoteDocs);
        this.save(merged);

        if (canManageDocuments() && (!remoteDocs.length || merged.length > remoteDocs.length)) {
          await this.syncToSheet(merged);
        }

        resolve(merged);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Could not load documents."));
      };

      script.src = `${url}${separator}resource=documents&callback=${callbackName}`;
      document.body.appendChild(script);
    });
  },

  async syncToSheet(documents) {
    const url = Auth.SHEET_WEB_APP_URL;
    if (!url) return { synced: false };

    const me = Auth.currentUser();
    const canSync = canManageDocuments()
      || (canViewDocuments() && documents.some((doc) => doc.ownerUserId === me?.id));
    if (!canSync) return { synced: false };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "syncDocuments",
        documents: documents.map((doc) => this.normalize(doc))
      })
    });

    return { synced: true };
  },

  async write(documents) {
    const normalized = this.save(documents);
    try {
      await this.syncToSheet(normalized);
    } catch (error) {
      console.error("Document sync failed", error);
    }
    return normalized;
  },

  async uploadFile(file, title) {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await postDocumentRequest({
      action: "uploadDocument",
      title: title || file.name,
      fileName: file.name,
      dataUrl
    });

    if (!response?.ok || !response.file) {
      throw new Error(response?.error || "Upload failed.");
    }

    return response.file;
  }
};

let documentGrid;
let documentTotalCount;
let documentSharedCount;
let documentCategoryCount;
let documentSearchFilter;
let documentCategoryFilter;
let documentFilterSummary;
let refreshDocumentsButton;
let openDocumentUploadButton;
let documentUploadModal;
let documentUploadForm;
let documentUploadTitle;
let documentUploadCategory;
let documentUploadDescription;
let documentUploadVisibility;
let documentSharedUsersPanel;
let documentSharedUsersList;
let documentUploadFile;
let documentUploadProgress;
let documentUploadProgressLabel;
let closeDocumentUploadButton;
let cancelDocumentUploadButton;
let documentEditId;

function canViewDocuments() {
  return Auth.canViewDocuments();
}

function canManageDocuments() {
  return Auth.canManageDocuments();
}

function parseSharedWith(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function canAccessDocument(doc) {
  if (!doc) return false;
  if (canManageDocuments()) return true;

  const me = Auth.currentUser();
  if (!me) return false;
  if (!canViewDocuments()) return false;

  if (doc.ownerUserId && doc.ownerUserId === me.id) return true;
  if (doc.visibility === "all") return true;

  const shared = parseSharedWith(doc.sharedWith);
  if (shared.includes(me.id) || shared.includes(me.name)) return true;

  if (doc.visibility === "private") {
    return doc.ownerUserId === me.id;
  }

  return false;
}

function canEditDocument(doc) {
  if (canManageDocuments()) return true;
  const me = Auth.currentUser();
  return Boolean(me && doc?.ownerUserId === me.id);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function postDocumentRequest(payload) {
  const response = await fetch(Auth.SHEET_WEB_APP_URL, {
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
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not read a response from Apps Script.");
  }
}

function bindDocumentElements() {
  documentGrid = document.querySelector("#documentGrid");
  documentTotalCount = document.querySelector("#documentTotalCount");
  documentSharedCount = document.querySelector("#documentSharedCount");
  documentCategoryCount = document.querySelector("#documentCategoryCount");
  documentSearchFilter = document.querySelector("#documentSearchFilter");
  documentCategoryFilter = document.querySelector("#documentCategoryFilter");
  documentFilterSummary = document.querySelector("#documentFilterSummary");
  refreshDocumentsButton = document.querySelector("#refreshDocumentsButton");
  openDocumentUploadButton = document.querySelector("#openDocumentUploadButton");
  documentUploadModal = document.querySelector("#documentUploadModal");
  documentUploadForm = document.querySelector("#documentUploadForm");
  documentUploadTitle = document.querySelector("#documentUploadTitle");
  documentUploadCategory = document.querySelector("#documentUploadCategory");
  documentUploadDescription = document.querySelector("#documentUploadDescription");
  documentUploadVisibility = document.querySelector("#documentUploadVisibility");
  documentSharedUsersPanel = document.querySelector("#documentSharedUsersPanel");
  documentSharedUsersList = document.querySelector("#documentSharedUsersList");
  documentUploadFile = document.querySelector("#documentUploadFile");
  documentUploadProgress = document.querySelector("#documentUploadProgress");
  documentUploadProgressLabel = document.querySelector("#documentUploadProgressLabel");
  closeDocumentUploadButton = document.querySelector("#closeDocumentUploadButton");
  cancelDocumentUploadButton = document.querySelector("#cancelDocumentUploadButton");
  documentEditId = document.querySelector("#documentEditId");
}

function formatDocumentDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fileTypeLabel(doc) {
  const mime = String(doc.mimeType || "").toLowerCase();
  const name = String(doc.fileName || "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (mime.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
  if (mime.includes("sheet") || mime.includes("excel") || name.endsWith(".xls") || name.endsWith(".xlsx")) return "Excel";
  if (mime.includes("presentation") || mime.includes("powerpoint") || name.endsWith(".ppt") || name.endsWith(".pptx")) return "PowerPoint";
  if (mime.includes("image") || /\.(png|jpe?g|gif|webp)$/i.test(name)) return "Image";
  if (mime.includes("text") || name.endsWith(".txt")) return "Text";
  if (name.endsWith(".csv")) return "CSV";
  return "File";
}

function fileTypeIconClass(doc) {
  const label = fileTypeLabel(doc).toLowerCase();
  if (label === "pdf") return "document-icon-pdf";
  if (label === "word") return "document-icon-word";
  if (label === "excel") return "document-icon-excel";
  if (label === "powerpoint") return "document-icon-ppt";
  if (label === "image") return "document-icon-image";
  return "document-icon-file";
}

function visibilityBadgeClass(doc) {
  if (doc.visibility === "all") return "document-access-all";
  if (doc.visibility === "private") return "document-access-private";
  return "document-access-restricted";
}

function updateDocumentStats(docs) {
  const allAccessible = Documents.read().filter((doc) => canAccessDocument(doc));
  const categories = new Set(allAccessible.map((doc) => doc.category).filter(Boolean));
  const shared = allAccessible.filter((doc) => doc.visibility === "all" || parseSharedWith(doc.sharedWith).length > 0).length;

  if (documentTotalCount) documentTotalCount.textContent = String(allAccessible.length);
  if (documentSharedCount) documentSharedCount.textContent = String(shared);
  if (documentCategoryCount) documentCategoryCount.textContent = String(categories.size);
}

function setSharedUserSelection(selectAll) {
  document.querySelectorAll('input[name="documentSharedUser"]').forEach((input) => {
    input.checked = selectAll;
  });
}

function shareWithAllStaff() {
  if (documentUploadVisibility) {
    documentUploadVisibility.value = "all";
  }
  toggleSharedUsersPanel();
}

function selectAllSharedUsers() {
  if (documentUploadVisibility) {
    documentUploadVisibility.value = "restricted";
  }
  toggleSharedUsersPanel();
  setSharedUserSelection(true);
}

function clearSharedUsers() {
  setSharedUserSelection(false);
}

async function shareDocumentWithAll(docId) {
  const doc = Documents.read().find((entry) => entry.id === docId);
  if (!doc || !canEditDocument(doc)) {
    alert("You do not have permission to change sharing for this document.");
    return;
  }

  if (!confirm(`Share "${doc.title}" with all IT staff?`)) return;

  const updated = Documents.normalize({
    ...doc,
    visibility: "all",
    sharedWith: ""
  });

  const docs = Documents.read().map((entry) => (entry.id === updated.id ? updated : entry));
  await Documents.write(docs);
  renderDocuments();
}

function applyDocumentFilters(documents) {
  const search = String(documentSearchFilter?.value || "").trim().toLowerCase();
  const category = String(documentCategoryFilter?.value || "").trim();

  return documents.filter((doc) => {
    if (!canAccessDocument(doc)) return false;
    if (category && doc.category !== category) return false;
    if (!search) return true;

    const haystack = [
      doc.title,
      doc.description,
      doc.fileName,
      doc.category,
      doc.ownerName
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

function renderSharedUsersCheckboxes(selectedIds = []) {
  if (!documentSharedUsersList) return;

  const users = Auth.readUsers().filter((user) => user.active !== false);
  documentSharedUsersList.innerHTML = users.map((user) => {
    const checked = selectedIds.includes(user.id) ? "checked" : "";
    return `
      <label class="document-share-option">
        <input type="checkbox" name="documentSharedUser" value="${escapeHtml(user.id)}" ${checked}>
        <span>${escapeHtml(user.name)}</span>
      </label>
    `;
  }).join("");
}

function toggleSharedUsersPanel() {
  const visibility = documentUploadVisibility?.value || "restricted";
  if (documentSharedUsersPanel) {
    documentSharedUsersPanel.hidden = visibility !== "restricted";
  }
}

function resetDocumentUploadForm() {
  if (documentEditId) documentEditId.value = "";
  documentUploadForm?.reset();
  if (documentUploadCategory) documentUploadCategory.value = "Policy";
  if (documentUploadVisibility) documentUploadVisibility.value = "restricted";
  renderSharedUsersCheckboxes();
  toggleSharedUsersPanel();
  if (documentUploadProgress) documentUploadProgress.hidden = true;
}

function openDocumentUploadModal(doc = null) {
  if (!canViewDocuments() && !doc) {
    alert("You do not have permission to upload documents.");
    return;
  }

  resetDocumentUploadForm();

  if (doc) {
    if (documentEditId) documentEditId.value = doc.id;
    if (documentUploadTitle) documentUploadTitle.value = doc.title;
    if (documentUploadCategory) documentUploadCategory.value = doc.category;
    if (documentUploadDescription) documentUploadDescription.value = doc.description;
    if (documentUploadVisibility) documentUploadVisibility.value = doc.visibility;
    renderSharedUsersCheckboxes(parseSharedWith(doc.sharedWith));
    toggleSharedUsersPanel();
    if (documentUploadFile) documentUploadFile.required = false;
  } else if (documentUploadFile) {
    documentUploadFile.required = true;
  }

  if (documentUploadModal) documentUploadModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDocumentUploadModal() {
  if (documentUploadModal) documentUploadModal.hidden = true;
  document.body.classList.remove("modal-open");
  resetDocumentUploadForm();
}

function selectedSharedUserIds() {
  return [...document.querySelectorAll('input[name="documentSharedUser"]:checked')]
    .map((input) => input.value);
}

function documentFromForm(fileInfo = null) {
  const me = Auth.currentUser();
  const existingId = documentEditId?.value || "";
  const existing = existingId ? Documents.read().find((doc) => doc.id === existingId) : null;
  const visibility = documentUploadVisibility?.value || "restricted";

  const doc = Documents.normalize({
    id: existingId || Documents.createId(),
    title: String(documentUploadTitle?.value || "").trim(),
    category: String(documentUploadCategory?.value || "Other").trim(),
    description: String(documentUploadDescription?.value || "").trim(),
    fileName: fileInfo?.fileName || existing?.fileName || "",
    mimeType: fileInfo?.mimeType || existing?.mimeType || "",
    driveFileId: fileInfo?.driveFileId || existing?.driveFileId || "",
    driveUrl: fileInfo?.driveUrl || existing?.driveUrl || "",
    ownerUserId: existing?.ownerUserId || me?.id || "",
    ownerName: existing?.ownerName || me?.name || "",
    visibility,
    sharedWith: visibility === "restricted" ? selectedSharedUserIds().join(",") : "",
    uploadedAt: existing?.uploadedAt || new Date().toISOString()
  });

  return doc;
}

async function saveDocumentFromModal(event) {
  event.preventDefault();

  const isEdit = Boolean(documentEditId?.value);
  const existing = isEdit ? Documents.read().find((entry) => entry.id === documentEditId.value) : null;

  if (!isEdit && !canViewDocuments()) {
    alert("You do not have permission to upload documents.");
    return;
  }

  if (isEdit && existing && !canEditDocument(existing)) {
    alert("You do not have permission to edit this document.");
    return;
  }

  const title = String(documentUploadTitle?.value || "").trim();
  if (!title) {
    alert("Document title is required.");
    return;
  }

  const file = documentUploadFile?.files?.[0];
  if (!isEdit && !file) {
    alert("Select a file to upload.");
    return;
  }

  if (file && file.size > Documents.MAX_FILE_BYTES) {
    alert("File is too large. Maximum size is 10 MB.");
    return;
  }

  if (documentUploadProgress) documentUploadProgress.hidden = false;
  if (documentUploadProgressLabel) {
    documentUploadProgressLabel.textContent = file ? "Uploading..." : "Saving changes...";
  }

  try {
    let fileInfo = null;
    if (file) {
      fileInfo = await Documents.uploadFile(file, title);
    }

    const doc = documentFromForm(fileInfo);
    if (!doc.driveUrl && !isEdit) {
      throw new Error("Upload did not return a Drive link.");
    }

    const docs = Documents.read();
    const index = docs.findIndex((entry) => entry.id === doc.id);
    if (index >= 0) {
      docs[index] = doc;
    } else {
      docs.unshift(doc);
    }

    await Documents.write(docs);
    closeDocumentUploadModal();
    renderDocuments();
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not save document.");
  } finally {
    if (documentUploadProgress) documentUploadProgress.hidden = true;
  }
}

function getDocumentDownloadUrl(doc) {
  if (doc.driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${doc.driveFileId}`;
  }
  if (typeof toDriveDownloadUrl === "function") {
    return toDriveDownloadUrl(doc.driveUrl);
  }
  if (typeof extractDriveFileId === "function") {
    const fileId = extractDriveFileId(doc.driveUrl);
    if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return doc.driveUrl || "";
}

function downloadDocument(docId) {
  const doc = Documents.read().find((entry) => entry.id === docId);
  if (!doc || !canAccessDocument(doc)) {
    alert("You do not have permission to download this document.");
    return;
  }

  const url = getDocumentDownloadUrl(doc);
  if (!url) {
    alert("This document does not have a download link yet.");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function openDocumentPreview(docId) {
  const doc = Documents.read().find((entry) => entry.id === docId);
  if (!doc || !canAccessDocument(doc)) {
    alert("You do not have permission to preview this document.");
    return;
  }

  if (!doc.driveUrl) {
    alert("This document does not have a preview link yet.");
    return;
  }

  if (typeof openScreenshotPreview === "function") {
    openScreenshotPreview([doc.driveUrl], 0, {
      title: doc.title,
      eyebrow: "Document"
    });
    return;
  }

  window.open(doc.driveUrl, "_blank", "noopener,noreferrer");
}

async function deleteDocument(docId) {
  const doc = Documents.read().find((entry) => entry.id === docId);
  if (!doc || !canEditDocument(doc)) {
    alert("You do not have permission to delete this document.");
    return;
  }

  if (!confirm(`Delete "${doc.title}"?`)) return;

  const remaining = Documents.read().filter((entry) => entry.id !== docId);
  await Documents.write(remaining);
  renderDocuments();
}

function startDocumentAccessEdit(docId) {
  const doc = Documents.read().find((entry) => entry.id === docId);
  if (!doc || !canEditDocument(doc)) {
    alert("You do not have permission to edit this document.");
    return;
  }

  openDocumentUploadModal(doc);
}

function visibilityLabel(doc) {
  if (doc.visibility === "all") return "All IT staff";
  if (doc.visibility === "private") return "Private";
  const shared = parseSharedWith(doc.sharedWith);
  return shared.length ? `${shared.length} user${shared.length === 1 ? "" : "s"}` : "Restricted";
}

function groupDocumentsByCategory(docs) {
  const buckets = new Map();
  docs.forEach((doc) => {
    const category = doc.category || "Other";
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push(doc);
  });

  const ordered = [];
  Documents.CATEGORIES.forEach((category) => {
    const items = buckets.get(category) || [];
    if (items.length) ordered.push({ category, docs: items });
    buckets.delete(category);
  });

  [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([category, items]) => {
      if (items.length) ordered.push({ category, docs: items });
    });

  return ordered;
}

function renderDocumentRow(doc) {
  const canEdit = canEditDocument(doc);
  const typeLabel = fileTypeLabel(doc);
  const iconClass = fileTypeIconClass(doc);
  const accessClass = visibilityBadgeClass(doc);

  return `
    <tr class="document-row">
      <td class="document-row-title">
        <div class="document-row-title-inner">
          <span class="document-type-badge ${iconClass}">${escapeHtml(typeLabel)}</span>
          <div class="document-row-copy">
            <strong>${escapeHtml(doc.title)}</strong>
            ${doc.description ? `<span class="document-row-description">${escapeHtml(doc.description)}</span>` : ""}
          </div>
        </div>
      </td>
      <td>${escapeHtml(doc.ownerName || "—")}</td>
      <td><span class="document-access-pill ${accessClass}">${escapeHtml(visibilityLabel(doc))}</span></td>
      <td>${escapeHtml(formatDocumentDate(doc.uploadedAt))}</td>
      <td class="document-row-actions">
        <div class="document-row-actions-inner">
          <button class="doc-action-btn doc-action-preview document-preview-button" type="button" data-document-id="${escapeHtml(doc.id)}">Preview</button>
          <button class="doc-action-btn doc-action-download document-download-button" type="button" data-document-id="${escapeHtml(doc.id)}">Download</button>
          ${canEdit ? `<button class="doc-action-btn doc-action-share document-share-all-button" type="button" data-document-id="${escapeHtml(doc.id)}">Share all</button>` : ""}
          ${canEdit ? `<button class="doc-action-btn doc-action-access document-access-button" type="button" data-document-id="${escapeHtml(doc.id)}">Access</button>` : ""}
          ${canEdit ? `<button class="doc-action-btn doc-action-delete document-delete-button" type="button" data-document-id="${escapeHtml(doc.id)}">Delete</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function bindDocumentCategoryToggles(root) {
  root.querySelectorAll(".document-category-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".document-category-group");
      if (!group) return;
      const collapsed = group.classList.toggle("is-collapsed");
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  });
}

function initDocumentHeroCollapse() {
  const panel = document.querySelector("#documentHeroPanel");
  const button = document.querySelector("#toggleDocumentHeroButton");
  if (!panel || !button) return;

  const storageKey = "tarmal-document-hero-collapsed";
  const collapsed = localStorage.getItem(storageKey) === "1";
  panel.classList.toggle("is-collapsed", collapsed);
  button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  button.textContent = collapsed ? "Show summary" : "Hide summary";

  button.addEventListener("click", () => {
    const nextCollapsed = !panel.classList.contains("is-collapsed");
    panel.classList.toggle("is-collapsed", nextCollapsed);
    localStorage.setItem(storageKey, nextCollapsed ? "1" : "0");
    button.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
    button.textContent = nextCollapsed ? "Show summary" : "Hide summary";
  });
}

function bindDocumentRowActions(root) {
  root.querySelectorAll(".document-preview-button").forEach((button) => {
    button.addEventListener("click", () => openDocumentPreview(button.dataset.documentId));
  });

  root.querySelectorAll(".document-download-button").forEach((button) => {
    button.addEventListener("click", () => downloadDocument(button.dataset.documentId));
  });

  root.querySelectorAll(".document-share-all-button").forEach((button) => {
    button.addEventListener("click", () => shareDocumentWithAll(button.dataset.documentId));
  });

  root.querySelectorAll(".document-access-button").forEach((button) => {
    button.addEventListener("click", () => startDocumentAccessEdit(button.dataset.documentId));
  });

  root.querySelectorAll(".document-delete-button").forEach((button) => {
    button.addEventListener("click", () => deleteDocument(button.dataset.documentId));
  });
}

function renderDocuments() {
  if (!documentGrid) return;

  if (!canViewDocuments()) {
    documentGrid.innerHTML = '<div class="document-empty-state"><p>You do not have permission to view documents.</p></div>';
    return;
  }

  const docs = applyDocumentFilters(Documents.read());
  updateDocumentStats(docs);

  if (documentFilterSummary) {
    documentFilterSummary.textContent = `${docs.length} document${docs.length === 1 ? "" : "s"} shown`;
  }

  if (!docs.length) {
    const canUpload = canViewDocuments();
    documentGrid.innerHTML = `
      <div class="document-empty-state">
        <div class="document-empty-icon" aria-hidden="true">📁</div>
        <h3>No documents yet</h3>
        <p>Upload IT policies, manuals, and guides for your team.</p>
        ${canUpload
          ? '<button class="primary-button document-empty-upload" type="button">+ Upload your first document</button>'
          : "<span>Ask an admin to share documents with you.</span>"}
      </div>`;
    documentGrid.querySelector(".document-empty-upload")?.addEventListener("click", () => openDocumentUploadModal());
    return;
  }

  const groups = groupDocumentsByCategory(docs);

  documentGrid.innerHTML = groups.map(({ category, docs: categoryDocs }) => `
    <section class="document-category-group" data-category-group="${escapeHtml(category)}">
      <header class="document-category-header">
        <button class="document-category-toggle" type="button" aria-expanded="true" title="Collapse ${escapeHtml(category)}">
          <span class="document-category-toggle-icon" aria-hidden="true"></span>
        </button>
        <div class="document-category-header-main">
          <h3>${escapeHtml(category)}</h3>
          <span class="document-category-count">${categoryDocs.length} document${categoryDocs.length === 1 ? "" : "s"}</span>
        </div>
      </header>
      <div class="document-category-body">
        <div class="document-table-wrap">
          <table class="document-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Access</th>
                <th>Uploaded</th>
                <th class="document-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${categoryDocs.map((doc) => renderDocumentRow(doc)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `).join("");

  bindDocumentRowActions(documentGrid);
  bindDocumentCategoryToggles(documentGrid);
}

async function refreshDocumentsFromSheet() {
  if (!canViewDocuments()) return;

  try {
    await Documents.loadFromSheet();
    renderDocuments();
  } catch (error) {
    console.error(error);
    renderDocuments();
  }
}

function initDocumentsModule() {
  bindDocumentElements();

  if (!documentGrid) {
    console.error("Documents panel not found in the page.");
    return;
  }

  Auth.refreshSessionRights();

  if (documentCategoryFilter) {
    documentCategoryFilter.innerHTML = [
      '<option value="">All categories</option>',
      ...Documents.CATEGORIES.map((category) => `<option value="${category}">${category}</option>`)
    ].join("");
  }

  if (documentUploadCategory) {
    documentUploadCategory.innerHTML = Documents.CATEGORIES
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("");
  }

  if (documentUploadFile) {
    documentUploadFile.accept = Documents.ACCEPT_TYPES;
  }

  renderSharedUsersCheckboxes();
  toggleSharedUsersPanel();

  openDocumentUploadButton?.addEventListener("click", () => openDocumentUploadModal());
  closeDocumentUploadButton?.addEventListener("click", closeDocumentUploadModal);
  cancelDocumentUploadButton?.addEventListener("click", closeDocumentUploadModal);
  refreshDocumentsButton?.addEventListener("click", refreshDocumentsFromSheet);
  documentUploadForm?.addEventListener("submit", saveDocumentFromModal);
  documentUploadVisibility?.addEventListener("change", toggleSharedUsersPanel);
  document.querySelector("#documentShareSelectAllButton")?.addEventListener("click", selectAllSharedUsers);
  document.querySelector("#documentShareClearButton")?.addEventListener("click", clearSharedUsers);
  initDocumentHeroCollapse();

  [documentSearchFilter, documentCategoryFilter]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", renderDocuments));

  documentUploadModal?.addEventListener("click", (event) => {
    if (event.target === documentUploadModal) closeDocumentUploadModal();
  });

  renderDocuments();

  if (Auth.SHEET_WEB_APP_URL && canViewDocuments()) {
    refreshDocumentsFromSheet();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDocumentsModule);
} else {
  initDocumentsModule();
}
