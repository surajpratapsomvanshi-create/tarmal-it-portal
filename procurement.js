/* Procurement tab — materials, vendor quotes, PDF/image attachments */

const Procurement = {
  LOCAL_KEY: "tarmal-it-procurement",
  STATUSES: ["Requested", "Quoting", "Ordered", "Received", "Cancelled"],
  MAX_FILE_BYTES: 12 * 1024 * 1024,
  ACCEPT_TYPES: ".pdf,.png,.jpg,.jpeg,.webp,.gif",

  read() {
    const saved = localStorage.getItem(this.LOCAL_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((item) => this.normalize(item));
    } catch {
      return [];
    }
  },

  save(items) {
    const normalized = items.map((item) => this.normalize(item));
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(normalized));
    return normalized;
  },

  createId(prefix = "proc") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  },

  normalizeQuote(quote = {}) {
    return {
      id: String(quote.id || this.createId("quote")),
      vendor: String(quote.vendor || "").trim(),
      unitPrice: String(quote.unitPrice || "").trim(),
      total: String(quote.total || quote.amount || "").trim(),
      currency: String(quote.currency || "").trim(),
      validUntil: String(quote.validUntil || "").trim(),
      notes: String(quote.notes || "").trim(),
      fileName: String(quote.fileName || "").trim(),
      mimeType: String(quote.mimeType || "").trim(),
      driveFileId: String(quote.driveFileId || "").trim(),
      driveUrl: String(quote.driveUrl || "").trim(),
      pendingDataUrl: String(quote.pendingDataUrl || "").trim()
    };
  },

  normalize(item = {}) {
    let quotes = item.quotes;
    if (typeof quotes === "string") {
      try {
        quotes = JSON.parse(quotes || "[]");
      } catch {
        quotes = [];
      }
    }
    if (!Array.isArray(quotes)) quotes = [];

    const status = String(item.status || "Requested").trim();
    return {
      id: String(item.id || ""),
      material: String(item.material || item.itemName || "").trim(),
      quantity: String(item.quantity || "").trim(),
      unit: String(item.unit || "").trim(),
      requestedBy: String(item.requestedBy || item.owner || "").trim(),
      status: this.STATUSES.includes(status) ? status : "Requested",
      neededBy: String(item.neededBy || item.milestone || "").trim(),
      remarks: String(item.remarks || item.notes || "").trim(),
      updatedAt: String(item.updatedAt || "").trim(),
      quotes: quotes.map((quote) => this.normalizeQuote(quote))
    };
  },

  forSheet(item) {
    const normalized = this.normalize(item);
    return {
      ...normalized,
      quotes: normalized.quotes.map((quote) => {
        const { pendingDataUrl, ...rest } = quote;
        return rest;
      })
    };
  },

  merge(localItems, remoteItems) {
    const merged = new Map();
    remoteItems.forEach((item) => merged.set(item.id, this.normalize(item)));
    localItems.forEach((local) => {
      const remote = merged.get(local.id);
      if (!remote) {
        merged.set(local.id, this.normalize(local));
        return;
      }
      const localQuotes = new Map(local.quotes.map((q) => [q.id, q]));
      const quotes = remote.quotes.map((quote) => {
        const localQuote = localQuotes.get(quote.id);
        if (localQuote?.pendingDataUrl && !quote.driveUrl) {
          return this.normalizeQuote({ ...quote, pendingDataUrl: localQuote.pendingDataUrl });
        }
        return quote;
      });
      local.quotes.forEach((quote) => {
        if (!quotes.some((q) => q.id === quote.id)) quotes.push(quote);
      });
      merged.set(local.id, this.normalize({ ...remote, quotes }));
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

      const localItems = this.read();
      const callbackName = `handleSheetProcurement_${Date.now()}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = async (payload) => {
        cleanup();
        if (!payload || payload.ok === false) {
          reject(new Error(payload?.error || "Could not load procurement."));
          return;
        }

        const remoteItems = (payload.procurement || []).map((item) => this.normalize(item));
        const merged = this.merge(localItems, remoteItems);
        this.save(merged);

        if (!remoteItems.length || merged.length > remoteItems.length) {
          await this.syncToSheet(merged);
        }

        resolve(merged);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Could not load procurement."));
      };

      script.src = `${url}${separator}resource=procurement&callback=${callbackName}`;
      document.body.appendChild(script);
    });
  },

  async syncToSheet(items) {
    const url = Auth.SHEET_WEB_APP_URL;
    if (!url) return { synced: false };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "syncProcurement",
        procurement: items.map((item) => this.forSheet(item))
      })
    });

    return { synced: true };
  },

  async write(items) {
    const normalized = this.save(items);
    try {
      await this.syncToSheet(normalized);
    } catch (error) {
      console.error("Procurement sync failed", error);
    }
    return normalized;
  },

  async uploadQuoteFile(file, title) {
    const dataUrl = await readProcurementFileAsDataUrl(file);
    const response = await postProcurementRequest({
      action: "uploadProcurementAttachment",
      title: title || file.name,
      fileName: file.name,
      dataUrl
    });

    if (!response?.ok || !response.file) {
      throw new Error(response?.error || "Upload failed.");
    }

    return response.file;
  },

  parseNumeric(value) {
    const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return NaN;
    return Number(cleaned);
  },

  quoteCompareValue(quote) {
    const total = this.parseNumeric(quote.total);
    if (!Number.isNaN(total)) return total;
    return this.parseNumeric(quote.unitPrice);
  }
};

let procurementRows;
let procurementSearchFilter;
let procurementStatusFilter;
let procurementFilterSummary;
let refreshProcurementButton;
let exportProcurementButton;
let openProcurementCreateButton;
let procurementItemModal;
let procurementItemForm;
let procurementItemModalTitle;
let procurementItemId;
let closeProcurementItemButton;
let cancelProcurementItemButton;
let procurementItemAttachmentsPanel;
let procurementItemFileInput;
let procurementItemAttachButton;
let procurementItemProgress;
let procurementItemProgressLabel;
let procurementQuotesModal;
let procurementQuotesTitle;
let procurementQuotesSubtitle;
let procurementQuotesCompare;
let procurementQuoteForm;
let closeProcurementQuotesButton;
let cancelProcurementQuoteButton;
let procurementActiveItemId = "";
let procurementQuoteEditId = "";
let procurementItemAttachments = [];
let procurementItemBaselineQuotes = [];

function canUseProcurement() {
  return Auth.hasPermission("dashboard") || Auth.isAdminLevelUser();
}

function readProcurementFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function postProcurementRequest(payload) {
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

function escapeProcurementHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function procurementStatusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "received") return "status-completed";
  if (key === "ordered") return "status-progress";
  if (key === "quoting") return "status-approval";
  if (key === "cancelled") return "status-blocked";
  if (key === "requested") return "status-pending";
  return "status-other";
}

function formatProcurementMoney(quote) {
  const currency = String(quote.currency || "").trim();
  const total = String(quote.total || "").trim();
  const unit = String(quote.unitPrice || "").trim();
  if (total && unit) {
    return currency ? `${currency} ${total} (unit ${unit})` : `${total} (unit ${unit})`;
  }
  if (total) return currency ? `${currency} ${total}` : total;
  if (unit) return currency ? `${currency} ${unit}` : unit;
  return "—";
}

function isProcurementImageMime(mimeType, fileName = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(String(fileName || ""));
}

function resetProcurementItemAttachments() {
  procurementItemAttachments = [];
  renderProcurementItemAttachmentsPanel();
  if (procurementItemFileInput) procurementItemFileInput.value = "";
}

function seedProcurementItemAttachmentsFromQuotes(quotes = []) {
  procurementItemAttachments = [];
  quotes.forEach((quote, index) => {
    const url = quote.driveUrl || quote.pendingDataUrl;
    if (!url && !quote.fileName) return;
    const assignTo = index === 0 ? "vendor1" : index === 1 ? "vendor2" : "general";
    procurementItemAttachments.push({
      id: quote.id || Procurement.createId("attach"),
      quoteId: quote.id || "",
      fileName: quote.fileName || "Attachment",
      mimeType: quote.mimeType || "",
      driveUrl: quote.driveUrl || "",
      driveFileId: quote.driveFileId || "",
      pendingDataUrl: quote.pendingDataUrl || "",
      assignTo,
      isExisting: true,
      removed: false
    });
  });
  renderProcurementItemAttachmentsPanel();
}

function renderProcurementItemAttachmentsPanel() {
  if (!procurementItemAttachmentsPanel) return;

  const visible = procurementItemAttachments.filter((item) => !item.removed);
  procurementItemAttachmentsPanel.replaceChildren();

  if (!visible.length) {
    procurementItemAttachmentsPanel.hidden = true;
    procurementItemAttachmentsPanel.classList.remove("has-attachments");
    return;
  }

  visible.forEach((item) => {
    const row = document.createElement("div");
    row.className = "ticket-notes-attachment-item procurement-item-attachment-item";
    row.dataset.attachmentId = item.id;

    const previewTile = document.createElement("button");
    previewTile.type = "button";
    previewTile.className = "ticket-notes-attachment-preview";
    previewTile.setAttribute("aria-label", `Preview ${item.fileName || "attachment"}`);

    const previewUrl = item.driveUrl || item.pendingDataUrl;
    if (previewUrl && isProcurementImageMime(item.mimeType, item.fileName)) {
      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = item.fileName || "Quote attachment";
      previewTile.appendChild(img);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "procurement-file-chip-icon";
      placeholder.textContent = /\.pdf$/i.test(item.fileName || "") || /pdf/i.test(item.mimeType || "")
        ? "PDF"
        : "FILE";
      previewTile.appendChild(placeholder);
    }

    previewTile.addEventListener("click", () => {
      const url = item.driveUrl || item.pendingDataUrl;
      if (!url) {
        alert("No preview available for this file yet.");
        return;
      }
      if (typeof openScreenshotPreview === "function") {
        openScreenshotPreview([url], 0, {
          title: item.fileName || "Quotation",
          eyebrow: "Quote attachment"
        });
        return;
      }
      window.open(url, "_blank", "noopener");
    });

    const name = document.createElement("span");
    name.className = "procurement-file-chip-name";
    name.textContent = item.fileName || "Attachment";
    name.title = item.fileName || "Attachment";

    const assign = document.createElement("select");
    assign.className = "procurement-attach-assign";
    assign.setAttribute("aria-label", "Assign attachment");
    [
      { value: "vendor1", label: "Vendor 1" },
      { value: "vendor2", label: "Vendor 2" },
      { value: "general", label: "General" }
    ].forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      if (item.assignTo === option.value) opt.selected = true;
      assign.appendChild(opt);
    });
    assign.addEventListener("change", () => {
      item.assignTo = assign.value;
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ticket-notes-attachment-remove";
    removeButton.setAttribute("aria-label", "Remove attachment");
    removeButton.title = "Remove attachment";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      item.removed = true;
      if (!item.isExisting) {
        procurementItemAttachments = procurementItemAttachments.filter((entry) => entry.id !== item.id);
      }
      renderProcurementItemAttachmentsPanel();
    });

    row.append(previewTile, name, assign, removeButton);
    procurementItemAttachmentsPanel.appendChild(row);
  });

  procurementItemAttachmentsPanel.hidden = false;
  procurementItemAttachmentsPanel.classList.add("has-attachments");
}

async function addProcurementItemFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;

  for (const file of files) {
    if (file.size > Procurement.MAX_FILE_BYTES) {
      alert(`${file.name} is too large. Maximum size is 12 MB.`);
      continue;
    }

    const visibleCount = procurementItemAttachments.filter((item) => !item.removed).length;
    const defaultAssign = visibleCount === 0 ? "vendor1" : visibleCount === 1 ? "vendor2" : "general";

    try {
      const dataUrl = await readProcurementFileAsDataUrl(file);
      procurementItemAttachments.push({
        id: Procurement.createId("attach"),
        quoteId: "",
        fileName: file.name,
        mimeType: file.type || "",
        driveUrl: "",
        driveFileId: "",
        pendingDataUrl: dataUrl,
        assignTo: defaultAssign,
        isExisting: false,
        removed: false,
        file
      });
    } catch (error) {
      console.error(error);
      alert(`Could not read ${file.name}.`);
    }
  }

  renderProcurementItemAttachmentsPanel();
  if (procurementItemFileInput) procurementItemFileInput.value = "";
}

function readInlineVendorFields(form) {
  return {
    vendor1: {
      vendor: String(form.vendor1Name?.value || "").trim(),
      total: String(form.vendor1Amount?.value || "").trim(),
      notes: String(form.vendor1Notes?.value || "").trim()
    },
    vendor2: {
      vendor: String(form.vendor2Name?.value || "").trim(),
      total: String(form.vendor2Amount?.value || "").trim(),
      notes: String(form.vendor2Notes?.value || "").trim()
    }
  };
}

function fillInlineVendorFields(form, quotes = []) {
  const q1 = quotes[0] || {};
  const q2 = quotes[1] || {};
  if (form.vendor1Name) form.vendor1Name.value = q1.vendor || "";
  if (form.vendor1Amount) form.vendor1Amount.value = q1.total || "";
  if (form.vendor1Notes) form.vendor1Notes.value = q1.notes || "";
  if (form.vendor2Name) form.vendor2Name.value = q2.vendor || "";
  if (form.vendor2Amount) form.vendor2Amount.value = q2.total || "";
  if (form.vendor2Notes) form.vendor2Notes.value = q2.notes || "";
}

function quoteHasInlineContent(data = {}) {
  return Boolean(String(data.vendor || "").trim() || String(data.total || "").trim() || String(data.notes || "").trim());
}

function attachmentFileMeta(attachment) {
  if (!attachment || attachment.removed) return null;
  return {
    fileName: attachment.fileName || "",
    mimeType: attachment.mimeType || "",
    driveFileId: attachment.driveFileId || "",
    driveUrl: attachment.driveUrl || "",
    pendingDataUrl: attachment.pendingDataUrl || ""
  };
}

async function uploadProcurementAttachmentFile(file, title) {
  if (Auth.SHEET_WEB_APP_URL) {
    try {
      const uploaded = await Procurement.uploadQuoteFile(file, title);
      return {
        fileName: uploaded.fileName || file.name,
        mimeType: uploaded.mimeType || file.type,
        driveFileId: uploaded.driveFileId || "",
        driveUrl: uploaded.driveUrl || "",
        pendingDataUrl: ""
      };
    } catch (error) {
      console.error(error);
      const dataUrl = await readProcurementFileAsDataUrl(file);
      return {
        fileName: file.name,
        mimeType: file.type || "",
        driveFileId: "",
        driveUrl: "",
        pendingDataUrl: dataUrl
      };
    }
  }

  const dataUrl = file ? await readProcurementFileAsDataUrl(file) : "";
  return {
    fileName: file?.name || "",
    mimeType: file?.type || "",
    driveFileId: "",
    driveUrl: "",
    pendingDataUrl: dataUrl
  };
}

async function resolveProcurementItemAttachments(material) {
  const resolved = [];
  for (const item of procurementItemAttachments) {
    if (item.removed) {
      resolved.push({ ...item, fileMeta: null });
      continue;
    }

    if (item.file) {
      const fileMeta = await uploadProcurementAttachmentFile(
        item.file,
        `${material || "procurement"}-${item.assignTo || "quote"}`
      );
      resolved.push({ ...item, fileMeta });
      continue;
    }

    resolved.push({ ...item, fileMeta: attachmentFileMeta(item) });
  }
  return resolved;
}

function buildInlineVendorQuote(existing, formData, fileMeta, fileCleared) {
  const hasForm = quoteHasInlineContent(formData);
  const hasNewOrKeptFile = Boolean(fileMeta && (fileMeta.driveUrl || fileMeta.pendingDataUrl || fileMeta.fileName));

  if (!hasForm && !hasNewOrKeptFile) {
    // Empty form and no file → drop this vendor slot (user cleared, or never filled).
    return null;
  }

  const preservedFile = (!fileCleared && !fileMeta && existing)
    ? {
        fileName: existing.fileName || "",
        mimeType: existing.mimeType || "",
        driveFileId: existing.driveFileId || "",
        driveUrl: existing.driveUrl || "",
        pendingDataUrl: existing.pendingDataUrl || ""
      }
    : null;

  const nextFile = fileMeta || preservedFile || {
    fileName: "",
    mimeType: "",
    driveFileId: "",
    driveUrl: "",
    pendingDataUrl: ""
  };

  if (!hasForm && !(nextFile.driveUrl || nextFile.pendingDataUrl || nextFile.fileName)) {
    return null;
  }

  return Procurement.normalizeQuote({
    id: existing?.id || Procurement.createId("quote"),
    vendor: formData.vendor || existing?.vendor || "",
    unitPrice: existing?.unitPrice || "",
    total: formData.total,
    currency: existing?.currency || "",
    validUntil: existing?.validUntil || "",
    notes: formData.notes,
    ...nextFile
  });
}

function mergeProcurementQuotesFromItemForm(existingQuotes, vendorFields, resolvedAttachments) {
  const existing = Array.isArray(existingQuotes) ? existingQuotes.map((q) => Procurement.normalizeQuote(q)) : [];
  const rest = existing.slice(2);

  const active = resolvedAttachments.filter((item) => !item.removed);
  const byAssign = {
    vendor1: active.filter((item) => item.assignTo === "vendor1"),
    vendor2: active.filter((item) => item.assignTo === "vendor2"),
    general: active.filter((item) => item.assignTo === "general")
  };

  const removedExisting = resolvedAttachments.filter((item) => item.removed && item.isExisting);
  const clearedVendor1File = removedExisting.some(
    (item) => item.assignTo === "vendor1" || (existing[0] && item.quoteId === existing[0].id)
  );
  const clearedVendor2File = removedExisting.some(
    (item) => item.assignTo === "vendor2" || (existing[1] && item.quoteId === existing[1].id)
  );

  // Prefer newly assigned file; otherwise keep existing quote file unless explicitly cleared.
  const pickFile = (assigned, _existingQuote, cleared) => {
    if (!assigned.length && cleared) {
      return { fileName: "", mimeType: "", driveFileId: "", driveUrl: "", pendingDataUrl: "" };
    }
    const preferred = assigned.find((item) => !item.isExisting) || assigned[assigned.length - 1];
    if (preferred?.fileMeta) return preferred.fileMeta;
    if (cleared) {
      return { fileName: "", mimeType: "", driveFileId: "", driveUrl: "", pendingDataUrl: "" };
    }
    return null;
  };

  const quote1 = buildInlineVendorQuote(
    existing[0],
    vendorFields.vendor1,
    pickFile(byAssign.vendor1, existing[0], clearedVendor1File),
    clearedVendor1File && !byAssign.vendor1[0]
  );
  const quote2 = buildInlineVendorQuote(
    existing[1],
    vendorFields.vendor2,
    pickFile(byAssign.vendor2, existing[1], clearedVendor2File),
    clearedVendor2File && !byAssign.vendor2[0]
  );

  const next = [];
  if (quote1) next.push(quote1);
  if (quote2) next.push(quote2);

  const usedIds = new Set(next.map((q) => q.id));
  const removedQuoteIds = new Set(
    removedExisting
      .filter((item) => item.assignTo === "general")
      .map((item) => item.quoteId)
      .filter(Boolean)
  );

  rest.forEach((quote) => {
    if (usedIds.has(quote.id)) return;

    const movedToVendor = active.find(
      (item) => item.quoteId === quote.id && (item.assignTo === "vendor1" || item.assignTo === "vendor2")
    );
    if (movedToVendor) return;

    if (removedQuoteIds.has(quote.id)) {
      const stillHasText = quote.vendor || quote.total || quote.unitPrice || quote.notes;
      if (!stillHasText) return;
      next.push(Procurement.normalizeQuote({
        ...quote,
        fileName: "",
        mimeType: "",
        driveFileId: "",
        driveUrl: "",
        pendingDataUrl: ""
      }));
      return;
    }

    next.push(quote);
  });

  byAssign.general.forEach((item) => {
    if (!item.fileMeta) return;
    const matched = next.find((quote) => item.quoteId && quote.id === item.quoteId);
    if (matched) {
      Object.assign(matched, item.fileMeta);
      return;
    }
    next.push(Procurement.normalizeQuote({
      id: item.quoteId || Procurement.createId("quote"),
      vendor: item.fileName ? `File: ${item.fileName}` : "Attached quote",
      notes: "Uploaded with item remarks",
      ...item.fileMeta
    }));
  });

  return next.map((quote) => Procurement.normalizeQuote(quote));
}

function getFilteredProcurementItems() {
  const query = String(procurementSearchFilter?.value || "").trim().toLowerCase();
  const status = String(procurementStatusFilter?.value || "").trim();

  return Procurement.read().filter((item) => {
    if (status && item.status !== status) return false;
    if (!query) return true;
    const haystack = [
      item.material,
      item.quantity,
      item.unit,
      item.requestedBy,
      item.status,
      item.remarks,
      ...item.quotes.map((q) => q.vendor)
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function renderProcurement() {
  if (!procurementRows) return;

  const items = getFilteredProcurementItems();
  if (procurementFilterSummary) {
    procurementFilterSummary.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  }

  if (!items.length) {
    procurementRows.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">No procurement items yet. Create one to start comparing vendor quotes.</td>
      </tr>`;
    return;
  }

  procurementRows.innerHTML = items.map((item) => {
    const qty = item.unit ? `${escapeProcurementHtml(item.quantity)} ${escapeProcurementHtml(item.unit)}` : escapeProcurementHtml(item.quantity || "—");
    const quoteCount = item.quotes.length;
    const lowest = item.quotes
      .map((q) => ({ q, value: Procurement.quoteCompareValue(q) }))
      .filter((entry) => !Number.isNaN(entry.value))
      .sort((a, b) => a.value - b.value)[0];

    return `
      <tr data-procurement-id="${escapeProcurementHtml(item.id)}" class="${procurementActiveItemId === item.id ? "is-selected" : ""}">
        <td class="procurement-material-col">
          <strong>${escapeProcurementHtml(item.material || "Untitled")}</strong>
          ${item.remarks ? `<span class="procurement-row-note">${escapeProcurementHtml(item.remarks)}</span>` : ""}
        </td>
        <td class="procurement-col-compact">${qty || "—"}</td>
        <td class="procurement-col-compact procurement-hide-mobile">${escapeProcurementHtml(item.requestedBy || "—")}</td>
        <td class="procurement-col-compact">
          <span class="status-pill ${procurementStatusClass(item.status)}">${escapeProcurementHtml(item.status)}</span>
        </td>
        <td class="procurement-col-compact procurement-hide-mobile">${escapeProcurementHtml(item.neededBy || "—")}</td>
        <td class="procurement-col-compact">
          <span class="procurement-quote-count">${quoteCount} quote${quoteCount === 1 ? "" : "s"}</span>
          ${lowest ? `<span class="procurement-lowest-hint">Low: ${escapeProcurementHtml(formatProcurementMoney(lowest.q))}</span>` : ""}
        </td>
        <td class="actions-col procurement-actions-col">
          <div class="row-actions">
            <button class="secondary-button row-action-btn" type="button" data-procurement-quotes="${escapeProcurementHtml(item.id)}">Quotes</button>
            <button class="secondary-button row-action-btn" type="button" data-procurement-edit="${escapeProcurementHtml(item.id)}">Edit</button>
            <button class="secondary-button row-action-btn danger-text" type="button" data-procurement-delete="${escapeProcurementHtml(item.id)}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function openProcurementItemModal(item = null) {
  if (!procurementItemModal || !procurementItemForm) return;
  procurementItemId = item?.id || "";
  procurementItemBaselineQuotes = item?.quotes ? item.quotes.map((quote) => Procurement.normalizeQuote(quote)) : [];
  if (procurementItemModalTitle) {
    procurementItemModalTitle.textContent = item ? "Edit Procurement Item" : "New Procurement Item";
  }

  procurementItemForm.material.value = item?.material || "";
  procurementItemForm.quantity.value = item?.quantity || "";
  procurementItemForm.unit.value = item?.unit || "";
  procurementItemForm.requestedBy.value = item?.requestedBy || Auth.currentUser()?.name || "";
  procurementItemForm.status.value = item?.status || "Requested";
  procurementItemForm.neededBy.value = item?.neededBy || "";
  procurementItemForm.remarks.value = item?.remarks || "";
  fillInlineVendorFields(procurementItemForm, procurementItemBaselineQuotes);
  seedProcurementItemAttachmentsFromQuotes(procurementItemBaselineQuotes);

  if (procurementItemProgress) procurementItemProgress.hidden = true;

  procurementItemModal.hidden = false;
  document.body.classList.add("modal-open");
  procurementItemForm.material.focus();
}

function closeProcurementItemModal() {
  if (!procurementItemModal) return;
  procurementItemModal.hidden = true;
  procurementItemId = "";
  procurementItemBaselineQuotes = [];
  resetProcurementItemAttachments();
  procurementItemForm?.reset();
  if (procurementItemProgress) procurementItemProgress.hidden = true;
  if (!document.querySelector(".modal-overlay:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

async function saveProcurementItem(event) {
  event.preventDefault();
  if (!canUseProcurement()) {
    alert("You do not have permission to manage procurement.");
    return;
  }

  const form = event.currentTarget;
  const material = String(form.material.value || "").trim();
  if (!material) {
    alert("Material / item name is required.");
    return;
  }

  const vendorFields = readInlineVendorFields(form);
  const items = Procurement.read();
  const existing = items.find((item) => item.id === procurementItemId);
  const baselineQuotes = existing?.quotes?.length
    ? existing.quotes
    : procurementItemBaselineQuotes;

  if (procurementItemProgress) procurementItemProgress.hidden = false;
  if (procurementItemProgressLabel) {
    const pendingUploads = procurementItemAttachments.some((item) => !item.removed && item.file);
    procurementItemProgressLabel.textContent = pendingUploads
      ? "Uploading quote files..."
      : "Saving procurement item...";
  }

  let quotes = baselineQuotes;
  try {
    const resolvedAttachments = await resolveProcurementItemAttachments(material);
    quotes = mergeProcurementQuotesFromItemForm(baselineQuotes, vendorFields, resolvedAttachments);
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not save quote attachments.");
    if (procurementItemProgress) procurementItemProgress.hidden = true;
    return;
  }

  let status = String(form.status.value || "Requested").trim();

  const next = Procurement.normalize({
    id: existing?.id || Procurement.createId(),
    material,
    quantity: form.quantity.value,
    unit: form.unit.value,
    requestedBy: form.requestedBy.value,
    status,
    neededBy: form.neededBy.value,
    remarks: form.remarks.value,
    updatedAt: new Date().toISOString(),
    quotes
  });

  const updated = existing
    ? items.map((item) => (item.id === existing.id ? next : item))
    : [next, ...items];

  try {
    await Procurement.write(updated);
  } finally {
    if (procurementItemProgress) procurementItemProgress.hidden = true;
  }

  closeProcurementItemModal();
  renderProcurement();
  if (procurementActiveItemId === next.id) {
    renderProcurementQuotesCompare(next);
  }
  if (typeof setStatus === "function") setStatus("online", "Procurement item saved");
}

async function deleteProcurementItem(id) {
  if (!canUseProcurement()) return;
  const item = Procurement.read().find((entry) => entry.id === id);
  if (!item) return;
  if (!window.confirm(`Delete procurement item "${item.material}"?`)) return;

  const updated = Procurement.read().filter((entry) => entry.id !== id);
  await Procurement.write(updated);
  if (procurementActiveItemId === id) closeProcurementQuotesModal();
  renderProcurement();
}

function findProcurementItem(id) {
  return Procurement.read().find((item) => item.id === id) || null;
}

function openProcurementQuotesModal(id) {
  const item = findProcurementItem(id);
  if (!item || !procurementQuotesModal) return;

  procurementActiveItemId = id;
  procurementQuoteEditId = "";
  if (procurementQuotesTitle) procurementQuotesTitle.textContent = item.material || "Quotes";
  if (procurementQuotesSubtitle) {
    const qty = item.unit ? `${item.quantity} ${item.unit}` : (item.quantity || "—");
    procurementQuotesSubtitle.textContent = `${item.status} · Qty ${qty} · ${item.requestedBy || "Unassigned"}`;
  }

  resetProcurementQuoteForm();
  renderProcurementQuotesCompare(item);
  renderProcurement();
  procurementQuotesModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeProcurementQuotesModal() {
  if (!procurementQuotesModal) return;
  procurementQuotesModal.hidden = true;
  procurementActiveItemId = "";
  procurementQuoteEditId = "";
  resetProcurementQuoteForm();
  renderProcurement();
  if (!document.querySelector(".modal-overlay:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

function resetProcurementQuoteForm() {
  if (!procurementQuoteForm) return;
  procurementQuoteForm.reset();
  procurementQuoteEditId = "";
  const submitLabel = document.querySelector("#procurementQuoteSubmitLabel");
  if (submitLabel) submitLabel.textContent = "Add Quote";
  const fileHint = document.querySelector("#procurementQuoteFileHint");
  if (fileHint) fileHint.textContent = "PDF or image (optional)";
}

function renderProcurementQuotesCompare(item) {
  if (!procurementQuotesCompare) return;

  if (!item.quotes.length) {
    procurementQuotesCompare.innerHTML = `
      <div class="procurement-empty-quotes">
        <p>No vendor quotes yet. Add the first quote below and attach a PDF or image if available.</p>
      </div>`;
    return;
  }

  const values = item.quotes.map((q) => Procurement.quoteCompareValue(q));
  const numeric = values.filter((v) => !Number.isNaN(v));
  const lowest = numeric.length ? Math.min(...numeric) : null;

  procurementQuotesCompare.innerHTML = `
    <div class="table-wrap procurement-quotes-table-wrap">
      <table class="procurement-quotes-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Unit price</th>
            <th>Total</th>
            <th>Currency</th>
            <th>Valid until</th>
            <th>Notes</th>
            <th>File</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${item.quotes.map((quote) => {
            const value = Procurement.quoteCompareValue(quote);
            const isLowest = lowest !== null && !Number.isNaN(value) && value === lowest;
            const hasFile = Boolean(quote.driveUrl || quote.pendingDataUrl);
            return `
              <tr class="${isLowest ? "is-lowest-quote" : ""}">
                <td>
                  <strong>${escapeProcurementHtml(quote.vendor || "Vendor")}</strong>
                  ${isLowest ? `<span class="procurement-lowest-badge">Lowest</span>` : ""}
                </td>
                <td>${escapeProcurementHtml(quote.unitPrice || "—")}</td>
                <td>${escapeProcurementHtml(quote.total || "—")}</td>
                <td>${escapeProcurementHtml(quote.currency || "—")}</td>
                <td>${escapeProcurementHtml(quote.validUntil || "—")}</td>
                <td>${escapeProcurementHtml(quote.notes || "—")}</td>
                <td>
                  ${hasFile
                    ? `<button class="secondary-button row-action-btn" type="button" data-quote-view="${escapeProcurementHtml(quote.id)}">View</button>
                       <span class="procurement-file-name">${escapeProcurementHtml(quote.fileName || "Attachment")}</span>`
                    : `<span class="muted-text">None</span>`}
                </td>
                <td>
                  <div class="row-actions">
                    <button class="secondary-button row-action-btn" type="button" data-quote-edit="${escapeProcurementHtml(quote.id)}">Edit</button>
                    <button class="secondary-button row-action-btn danger-text" type="button" data-quote-delete="${escapeProcurementHtml(quote.id)}">Remove</button>
                  </div>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function fillProcurementQuoteForm(quote) {
  if (!procurementQuoteForm || !quote) return;
  procurementQuoteEditId = quote.id;
  procurementQuoteForm.vendor.value = quote.vendor || "";
  procurementQuoteForm.unitPrice.value = quote.unitPrice || "";
  procurementQuoteForm.total.value = quote.total || "";
  procurementQuoteForm.currency.value = quote.currency || "";
  procurementQuoteForm.validUntil.value = quote.validUntil || "";
  procurementQuoteForm.notes.value = quote.notes || "";
  const submitLabel = document.querySelector("#procurementQuoteSubmitLabel");
  if (submitLabel) submitLabel.textContent = "Update Quote";
  const fileHint = document.querySelector("#procurementQuoteFileHint");
  if (fileHint) {
    fileHint.textContent = quote.fileName
      ? `Current file: ${quote.fileName} (choose a new file to replace)`
      : "PDF or image (optional)";
  }
}

async function saveProcurementQuote(event) {
  event.preventDefault();
  if (!canUseProcurement() || !procurementActiveItemId) return;

  const form = event.currentTarget;
  const vendor = String(form.vendor.value || "").trim();
  if (!vendor) {
    alert("Vendor name is required.");
    return;
  }

  const items = Procurement.read();
  const itemIndex = items.findIndex((entry) => entry.id === procurementActiveItemId);
  if (itemIndex < 0) return;

  const item = items[itemIndex];
  const existingQuote = item.quotes.find((quote) => quote.id === procurementQuoteEditId);
  let fileMeta = {
    fileName: existingQuote?.fileName || "",
    mimeType: existingQuote?.mimeType || "",
    driveFileId: existingQuote?.driveFileId || "",
    driveUrl: existingQuote?.driveUrl || "",
    pendingDataUrl: existingQuote?.pendingDataUrl || ""
  };

  const fileInput = form.querySelector("#procurementQuoteFile");
  const file = fileInput?.files?.[0];
  const progress = document.querySelector("#procurementQuoteProgress");
  const progressLabel = document.querySelector("#procurementQuoteProgressLabel");

  if (file) {
    if (file.size > Procurement.MAX_FILE_BYTES) {
      alert("File is too large. Maximum size is 12 MB.");
      return;
    }

    if (progress) progress.hidden = false;
    if (progressLabel) progressLabel.textContent = "Uploading quotation file...";

    try {
      if (Auth.SHEET_WEB_APP_URL) {
        const uploaded = await Procurement.uploadQuoteFile(file, `${item.material}-${vendor}`);
        fileMeta = {
          fileName: uploaded.fileName || file.name,
          mimeType: uploaded.mimeType || file.type,
          driveFileId: uploaded.driveFileId || "",
          driveUrl: uploaded.driveUrl || "",
          pendingDataUrl: ""
        };
      } else {
        const dataUrl = await readProcurementFileAsDataUrl(file);
        fileMeta = {
          fileName: file.name,
          mimeType: file.type || "",
          driveFileId: "",
          driveUrl: "",
          pendingDataUrl: dataUrl
        };
      }
    } catch (error) {
      console.error(error);
      try {
        const dataUrl = await readProcurementFileAsDataUrl(file);
        fileMeta = {
          fileName: file.name,
          mimeType: file.type || "",
          driveFileId: "",
          driveUrl: "",
          pendingDataUrl: dataUrl
        };
        if (typeof setStatus === "function") {
          setStatus("error", "Saved locally — redeploy Apps Script for Drive upload");
        }
      } catch (readError) {
        alert(error.message || "Could not upload quotation file.");
        if (progress) progress.hidden = true;
        return;
      }
    } finally {
      if (progress) progress.hidden = true;
    }
  }

  const nextQuote = Procurement.normalizeQuote({
    id: existingQuote?.id || Procurement.createId("quote"),
    vendor,
    unitPrice: form.unitPrice.value,
    total: form.total.value,
    currency: form.currency.value,
    validUntil: form.validUntil.value,
    notes: form.notes.value,
    ...fileMeta
  });

  const quotes = existingQuote
    ? item.quotes.map((quote) => (quote.id === existingQuote.id ? nextQuote : quote))
    : [...item.quotes, nextQuote];

  const nextItem = Procurement.normalize({
    ...item,
    quotes,
    updatedAt: new Date().toISOString()
  });

  items[itemIndex] = nextItem;
  await Procurement.write(items);
  resetProcurementQuoteForm();
  renderProcurementQuotesCompare(nextItem);
  renderProcurement();
  if (typeof setStatus === "function") setStatus("online", "Quote saved");
}

async function deleteProcurementQuote(quoteId) {
  if (!procurementActiveItemId) return;
  const items = Procurement.read();
  const itemIndex = items.findIndex((entry) => entry.id === procurementActiveItemId);
  if (itemIndex < 0) return;
  const item = items[itemIndex];
  const quote = item.quotes.find((entry) => entry.id === quoteId);
  if (!quote) return;
  if (!window.confirm(`Remove quote from ${quote.vendor || "vendor"}?`)) return;

  const nextItem = Procurement.normalize({
    ...item,
    quotes: item.quotes.filter((entry) => entry.id !== quoteId),
    updatedAt: new Date().toISOString()
  });
  items[itemIndex] = nextItem;
  await Procurement.write(items);
  renderProcurementQuotesCompare(nextItem);
  renderProcurement();
}

function viewProcurementQuoteFile(quoteId) {
  const item = findProcurementItem(procurementActiveItemId);
  const quote = item?.quotes.find((entry) => entry.id === quoteId);
  if (!quote) return;

  const url = quote.driveUrl || quote.pendingDataUrl;
  if (!url) {
    alert("No file attached to this quote.");
    return;
  }

  if (typeof openScreenshotPreview === "function") {
    openScreenshotPreview([url], 0, {
      title: `${quote.vendor || "Vendor"} — ${quote.fileName || "Quotation"}`,
      eyebrow: "Quotation file"
    });
    return;
  }

  window.open(url, "_blank", "noopener");
}

async function refreshProcurementFromSheet() {
  if (!Auth.SHEET_WEB_APP_URL) {
    renderProcurement();
    if (typeof setStatus === "function") setStatus("", "Sync not configured — using local procurement data");
    return;
  }

  if (typeof setStatus === "function") setStatus("", "Refreshing procurement...");
  try {
    await Procurement.loadFromSheet();
    await syncPendingProcurementUploads();
    renderProcurement();
    if (procurementActiveItemId) {
      const item = findProcurementItem(procurementActiveItemId);
      if (item) renderProcurementQuotesCompare(item);
    }
    if (typeof setStatus === "function") setStatus("online", "Procurement refreshed");
  } catch (error) {
    console.error(error);
    renderProcurement();
    if (typeof setStatus === "function") setStatus("error", "Could not refresh procurement");
  }
}

async function syncPendingProcurementUploads() {
  if (!Auth.SHEET_WEB_APP_URL) return;

  const items = Procurement.read();
  let changed = false;

  for (const item of items) {
    for (const quote of item.quotes) {
      if (!quote.pendingDataUrl || quote.driveUrl) continue;
      try {
        const response = await postProcurementRequest({
          action: "uploadProcurementAttachment",
          title: `${item.material}-${quote.vendor}`,
          fileName: quote.fileName || "quotation",
          dataUrl: quote.pendingDataUrl
        });
        if (response?.ok && response.file) {
          quote.driveFileId = response.file.driveFileId || "";
          quote.driveUrl = response.file.driveUrl || "";
          quote.fileName = response.file.fileName || quote.fileName;
          quote.mimeType = response.file.mimeType || quote.mimeType;
          quote.pendingDataUrl = "";
          changed = true;
        }
      } catch (error) {
        console.error("Pending procurement upload failed", error);
      }
    }
  }

  if (changed) await Procurement.write(items);
}

function exportProcurementCsv() {
  const items = getFilteredProcurementItems();
  const headers = [
    "Id", "Material", "Quantity", "Unit", "Requested By", "Status", "Needed By", "Remarks",
    "Quote Vendor", "Unit Price", "Total", "Currency", "Valid Until", "Quote Notes", "File Name", "Drive URL"
  ];

  const rows = [];
  items.forEach((item) => {
    if (!item.quotes.length) {
      rows.push([
        item.id, item.material, item.quantity, item.unit, item.requestedBy, item.status,
        item.neededBy, item.remarks, "", "", "", "", "", "", "", ""
      ]);
      return;
    }
    item.quotes.forEach((quote) => {
      rows.push([
        item.id, item.material, item.quantity, item.unit, item.requestedBy, item.status,
        item.neededBy, item.remarks, quote.vendor, quote.unitPrice, quote.total, quote.currency,
        quote.validUntil, quote.notes, quote.fileName, quote.driveUrl
      ]);
    });
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tarmal-procurement.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindProcurementElements() {
  procurementRows = document.querySelector("#procurementRows");
  procurementSearchFilter = document.querySelector("#procurementSearchFilter");
  procurementStatusFilter = document.querySelector("#procurementStatusFilter");
  procurementFilterSummary = document.querySelector("#procurementFilterSummary");
  refreshProcurementButton = document.querySelector("#refreshProcurementButton");
  exportProcurementButton = document.querySelector("#exportProcurementButton");
  openProcurementCreateButton = document.querySelector("#openProcurementCreateButton");
  procurementItemModal = document.querySelector("#procurementItemModal");
  procurementItemForm = document.querySelector("#procurementItemForm");
  procurementItemModalTitle = document.querySelector("#procurementItemModalTitle");
  closeProcurementItemButton = document.querySelector("#closeProcurementItemButton");
  cancelProcurementItemButton = document.querySelector("#cancelProcurementItemButton");
  procurementItemAttachmentsPanel = document.querySelector("#procurementItemAttachmentsPanel");
  procurementItemFileInput = document.querySelector("#procurementItemFileInput");
  procurementItemAttachButton = document.querySelector("#procurementItemAttachButton");
  procurementItemProgress = document.querySelector("#procurementItemProgress");
  procurementItemProgressLabel = document.querySelector("#procurementItemProgressLabel");
  procurementQuotesModal = document.querySelector("#procurementQuotesModal");
  procurementQuotesTitle = document.querySelector("#procurementQuotesTitle");
  procurementQuotesSubtitle = document.querySelector("#procurementQuotesSubtitle");
  procurementQuotesCompare = document.querySelector("#procurementQuotesCompare");
  procurementQuoteForm = document.querySelector("#procurementQuoteForm");
  closeProcurementQuotesButton = document.querySelector("#closeProcurementQuotesButton");
  cancelProcurementQuoteButton = document.querySelector("#cancelProcurementQuoteButton");
}

function initProcurementModule() {
  bindProcurementElements();
  if (!procurementRows) return;

  openProcurementCreateButton?.addEventListener("click", () => openProcurementItemModal());
  closeProcurementItemButton?.addEventListener("click", closeProcurementItemModal);
  cancelProcurementItemButton?.addEventListener("click", closeProcurementItemModal);
  procurementItemForm?.addEventListener("submit", saveProcurementItem);
  procurementItemModal?.addEventListener("click", (event) => {
    if (event.target === procurementItemModal) closeProcurementItemModal();
  });

  procurementItemAttachButton?.addEventListener("click", () => {
    procurementItemFileInput?.click();
  });
  procurementItemFileInput?.addEventListener("change", (event) => {
    addProcurementItemFiles(event.target.files);
  });

  const remarksField = procurementItemForm?.querySelector(".procurement-remarks-field");
  remarksField?.addEventListener("dragover", (event) => {
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
    }
  });
  remarksField?.addEventListener("drop", (event) => {
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    addProcurementItemFiles(files);
  });
  remarksField?.addEventListener("paste", async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageItem = [...items].find((entry) => entry.type.startsWith("image/"));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) await addProcurementItemFiles([file]);
  });

  closeProcurementQuotesButton?.addEventListener("click", closeProcurementQuotesModal);
  cancelProcurementQuoteButton?.addEventListener("click", () => {
    resetProcurementQuoteForm();
  });
  procurementQuoteForm?.addEventListener("submit", saveProcurementQuote);
  procurementQuotesModal?.addEventListener("click", (event) => {
    if (event.target === procurementQuotesModal) closeProcurementQuotesModal();
  });

  refreshProcurementButton?.addEventListener("click", refreshProcurementFromSheet);
  exportProcurementButton?.addEventListener("click", exportProcurementCsv);

  [procurementSearchFilter, procurementStatusFilter]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", renderProcurement));

  procurementRows.addEventListener("click", (event) => {
    const quotesBtn = event.target.closest("[data-procurement-quotes]");
    if (quotesBtn) {
      openProcurementQuotesModal(quotesBtn.dataset.procurementQuotes);
      return;
    }
    const editBtn = event.target.closest("[data-procurement-edit]");
    if (editBtn) {
      const item = findProcurementItem(editBtn.dataset.procurementEdit);
      if (item) openProcurementItemModal(item);
      return;
    }
    const deleteBtn = event.target.closest("[data-procurement-delete]");
    if (deleteBtn) {
      deleteProcurementItem(deleteBtn.dataset.procurementDelete);
    }
  });

  procurementQuotesCompare?.addEventListener("click", (event) => {
    const viewBtn = event.target.closest("[data-quote-view]");
    if (viewBtn) {
      viewProcurementQuoteFile(viewBtn.dataset.quoteView);
      return;
    }
    const editBtn = event.target.closest("[data-quote-edit]");
    if (editBtn) {
      const item = findProcurementItem(procurementActiveItemId);
      const quote = item?.quotes.find((entry) => entry.id === editBtn.dataset.quoteEdit);
      if (quote) fillProcurementQuoteForm(quote);
      return;
    }
    const deleteBtn = event.target.closest("[data-quote-delete]");
    if (deleteBtn) {
      deleteProcurementQuote(deleteBtn.dataset.quoteDelete);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (procurementQuotesModal && !procurementQuotesModal.hidden) {
      closeProcurementQuotesModal();
      return;
    }
    if (procurementItemModal && !procurementItemModal.hidden) {
      closeProcurementItemModal();
    }
  });

  renderProcurement();
  if (Auth.SHEET_WEB_APP_URL && canUseProcurement()) {
    refreshProcurementFromSheet();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProcurementModule);
} else {
  initProcurementModule();
}
