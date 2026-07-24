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
let procurementQuotesModal;
let procurementQuotesTitle;
let procurementQuotesSubtitle;
let procurementQuotesCompare;
let procurementQuoteForm;
let closeProcurementQuotesButton;
let cancelProcurementQuoteButton;
let procurementActiveItemId = "";
let procurementQuoteEditId = "";

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

  procurementItemModal.hidden = false;
  document.body.classList.add("modal-open");
  procurementItemForm.material.focus();
}

function closeProcurementItemModal() {
  if (!procurementItemModal) return;
  procurementItemModal.hidden = true;
  procurementItemId = "";
  procurementItemForm?.reset();
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

  const items = Procurement.read();
  const existing = items.find((item) => item.id === procurementItemId);
  const next = Procurement.normalize({
    id: existing?.id || Procurement.createId(),
    material,
    quantity: form.quantity.value,
    unit: form.unit.value,
    requestedBy: form.requestedBy.value,
    status: form.status.value,
    neededBy: form.neededBy.value,
    remarks: form.remarks.value,
    updatedAt: new Date().toISOString(),
    quotes: existing?.quotes || []
  });

  const updated = existing
    ? items.map((item) => (item.id === existing.id ? next : item))
    : [next, ...items];

  await Procurement.write(updated);
  closeProcurementItemModal();
  renderProcurement();
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
