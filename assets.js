const Assets = {
  LOCAL_KEY: "tarmal-it-assets",
  PROVIDERS: ["Airtel", "Safaricom"],
  TYPES: ["Phone", "Desktop"],

  read() {
    const saved = localStorage.getItem(this.LOCAL_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved).map((asset) => this.normalize(asset));
    } catch {
      return [];
    }
  },

  save(assets) {
    const normalized = assets.map((asset) => this.normalize(asset));
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(normalized));
    return normalized;
  },

  normalize(asset) {
    const assetType = String(asset.assetType || "").trim();
    const provider = String(asset.serviceProvider || "").trim();
    return {
      id: String(asset.id || ""),
      employeeId: String(asset.employeeId || "").trim(),
      employeeName: String(asset.employeeName || "").trim(),
      assetType,
      deviceModel: String(asset.deviceModel || "").trim(),
      serialImei: String(asset.serialImei || "").trim(),
      phoneNumber: String(asset.phoneNumber || "").trim(),
      serviceProvider: this.PROVIDERS.includes(provider) ? provider : "",
      airtimeBalance: String(asset.airtimeBalance || "").trim(),
      airtimeValidUntil: asset.airtimeValidUntil || "",
      desktopSpecs: String(asset.desktopSpecs || "").trim(),
      status: String(asset.status || "Active").trim() || "Active",
      notes: String(asset.notes || "").trim()
    };
  },

  createId() {
    return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  },

  loadFromSheet() {
    return new Promise((resolve, reject) => {
      const url = Auth.SHEET_WEB_APP_URL;
      if (!url) {
        reject(new Error("Sheet endpoint is not configured."));
        return;
      }

      const localAssets = this.read();
      const callbackName = `handleSheetAssets_${Date.now()}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = async (payload) => {
        cleanup();
        if (!payload || payload.ok === false) {
          reject(new Error(payload?.error || "Could not load IT assets."));
          return;
        }

        const remoteAssets = (payload.assets || []).map((asset) => this.normalize(asset));
        const merged = this.merge(localAssets, remoteAssets);
        this.save(merged);

        if (canManageAssets() && (!remoteAssets.length || merged.length > remoteAssets.length)) {
          await this.syncToSheet(merged);
        }

        resolve(merged);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Could not load IT assets."));
      };

      script.src = `${url}${separator}resource=assets&callback=${callbackName}`;
      document.body.appendChild(script);
    });
  },

  merge(localAssets, remoteAssets) {
    const merged = new Map();
    remoteAssets.forEach((asset) => merged.set(asset.id, this.normalize(asset)));
    localAssets.forEach((asset) => {
      if (!merged.has(asset.id)) {
        merged.set(asset.id, this.normalize(asset));
      }
    });
    return [...merged.values()];
  },

  async syncToSheet(assets) {
    const url = Auth.SHEET_WEB_APP_URL;
    if (!url || !canManageAssets()) return { synced: false };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "syncAssets",
        assets: assets.map((asset) => this.normalize(asset))
      })
    });

    return { synced: true };
  },

  async write(assets) {
    const normalized = this.save(assets);
    try {
      await this.syncToSheet(normalized);
    } catch (error) {
      console.error("Asset sync failed", error);
    }
    return normalized;
  },

  isPhone(asset) {
    return String(asset.assetType).toLowerCase() === "phone";
  },

  isDesktop(asset) {
    return String(asset.assetType).toLowerCase() === "desktop";
  },

  airtimeStatus(asset) {
    if (!this.isPhone(asset)) return "";
    const until = asset.airtimeValidUntil;
    if (!until) return "unknown";

    const expiry = new Date(until);
    if (Number.isNaN(expiry.getTime())) return "unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / 86400000);

    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "expiring";
    return "valid";
  },

  CSV_HEADERS: [
    "Id",
    "Employee ID",
    "Employee Name",
    "Asset Type",
    "Device Model",
    "Serial / IMEI",
    "Phone Number",
    "Service Provider",
    "Airtime Balance",
    "Airtime Valid Until",
    "Desktop Specs",
    "Status",
    "Notes"
  ]
};

let assetRegisterPanel;
let assetRows;
let assetTypeField;
let assetPhoneFields;
let assetDesktopFields;
let assetSearchFilter;
let assetTypeFilter;
let assetProviderFilter;
let assetFilterSummary;
let refreshAssetsButton;
let exportAssetsButton;
let downloadAssetTemplateButton;
let importAssetsButton;
let importAssetsFile;
let downloadAssetTemplateRegisterButton;
let importAssetsRegisterButton;
let assetEditId;
let assetFormTitle;
let assetSubmitButton;
let assetCancelEditButton;
let assetClearButton;
let assetEmployeeId;
let assetEmployeeName;
let assetStatus;
let assetDeviceModel;
let assetSerialImei;
let assetPhoneNumber;
let assetServiceProvider;
let assetAirtimeBalance;
let assetAirtimeValidUntil;
let assetDesktopSpecs;
let assetNotes;

function canViewAssets() {
  return Auth.canViewAssets();
}

function canManageAssets() {
  return Auth.canManageAssets();
}

function bindAssetElements() {
  assetRegisterPanel = document.querySelector("#assetRegisterPanel");
  assetRows = document.querySelector("#assetRows");
  assetTypeField = document.querySelector("#assetTypeField");
  assetPhoneFields = document.querySelector("#assetPhoneFields");
  assetDesktopFields = document.querySelector("#assetDesktopFields");
  assetSearchFilter = document.querySelector("#assetSearchFilter");
  assetTypeFilter = document.querySelector("#assetTypeFilter");
  assetProviderFilter = document.querySelector("#assetProviderFilter");
  assetFilterSummary = document.querySelector("#assetFilterSummary");
  refreshAssetsButton = document.querySelector("#refreshAssetsButton");
  exportAssetsButton = document.querySelector("#exportAssetsButton");
  downloadAssetTemplateButton = document.querySelector("#downloadAssetTemplateButton");
  importAssetsButton = document.querySelector("#importAssetsButton");
  importAssetsFile = document.querySelector("#importAssetsFile");
  downloadAssetTemplateRegisterButton = document.querySelector("#downloadAssetTemplateRegisterButton");
  importAssetsRegisterButton = document.querySelector("#importAssetsRegisterButton");
  assetEditId = document.querySelector("#assetEditId");
  assetFormTitle = document.querySelector("#assetFormTitle");
  assetSubmitButton = document.querySelector("#assetSubmitButton");
  assetCancelEditButton = document.querySelector("#assetCancelEditButton");
  assetClearButton = document.querySelector("#assetClearButton");
  assetEmployeeId = document.querySelector("#assetEmployeeId");
  assetEmployeeName = document.querySelector("#assetEmployeeName");
  assetStatus = document.querySelector("#assetStatus");
  assetDeviceModel = document.querySelector("#assetDeviceModel");
  assetSerialImei = document.querySelector("#assetSerialImei");
  assetPhoneNumber = document.querySelector("#assetPhoneNumber");
  assetServiceProvider = document.querySelector("#assetServiceProvider");
  assetAirtimeBalance = document.querySelector("#assetAirtimeBalance");
  assetAirtimeValidUntil = document.querySelector("#assetAirtimeValidUntil");
  assetDesktopSpecs = document.querySelector("#assetDesktopSpecs");
  assetNotes = document.querySelector("#assetNotes");
}

function toggleAssetFieldGroups() {
  const type = assetTypeField?.value || "";
  const isPhone = type === "Phone";
  const isDesktop = type === "Desktop";

  if (assetPhoneFields) assetPhoneFields.hidden = !isPhone;
  if (assetDesktopFields) assetDesktopFields.hidden = !isDesktop;
}

function resetAssetForm() {
  if (assetEditId) assetEditId.value = "";
  if (assetEmployeeId) assetEmployeeId.value = "";
  if (assetEmployeeName) assetEmployeeName.value = "";
  if (assetTypeField) assetTypeField.value = "";
  if (assetStatus) assetStatus.value = "Active";
  if (assetDeviceModel) assetDeviceModel.value = "";
  if (assetSerialImei) assetSerialImei.value = "";
  if (assetPhoneNumber) assetPhoneNumber.value = "";
  if (assetServiceProvider) assetServiceProvider.value = "";
  if (assetAirtimeBalance) assetAirtimeBalance.value = "";
  if (assetAirtimeValidUntil) assetAirtimeValidUntil.value = "";
  if (assetDesktopSpecs) assetDesktopSpecs.value = "";
  if (assetNotes) assetNotes.value = "";
  if (assetFormTitle) assetFormTitle.textContent = "Register Asset";
  if (assetSubmitButton) assetSubmitButton.textContent = "Save Asset";
  if (assetCancelEditButton) assetCancelEditButton.hidden = true;
  toggleAssetFieldGroups();
}

function assetFromForm() {
  const assetType = String(assetTypeField?.value || "").trim();

  const asset = {
    id: assetEditId?.value || Assets.createId(),
    employeeId: String(assetEmployeeId?.value || "").trim(),
    employeeName: String(assetEmployeeName?.value || "").trim(),
    assetType,
    deviceModel: String(assetDeviceModel?.value || "").trim(),
    serialImei: String(assetSerialImei?.value || "").trim(),
    phoneNumber: "",
    serviceProvider: "",
    airtimeBalance: "",
    airtimeValidUntil: "",
    desktopSpecs: "",
    status: String(assetStatus?.value || "Active").trim(),
    notes: String(assetNotes?.value || "").trim()
  };

  if (assetType === "Phone") {
    asset.phoneNumber = String(assetPhoneNumber?.value || "").trim();
    asset.serviceProvider = String(assetServiceProvider?.value || "").trim();
    asset.airtimeBalance = String(assetAirtimeBalance?.value || "").trim();
    asset.airtimeValidUntil = String(assetAirtimeValidUntil?.value || "").trim();
  }

  if (assetType === "Desktop") {
    asset.desktopSpecs = String(assetDesktopSpecs?.value || "").trim();
  }

  return Assets.normalize(asset);
}

function applyAssetFilters(assets) {
  const search = String(assetSearchFilter?.value || "").trim().toLowerCase();
  const type = String(assetTypeFilter?.value || "").trim();
  const provider = String(assetProviderFilter?.value || "").trim();

  return assets.filter((asset) => {
    if (type && asset.assetType !== type) return false;
    if (provider && asset.serviceProvider !== provider) return false;
    if (!search) return true;

    const haystack = [
      asset.employeeId,
      asset.employeeName,
      asset.deviceModel,
      asset.serialImei,
      asset.phoneNumber,
      asset.serviceProvider,
      asset.desktopSpecs,
      asset.notes
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });
}

function formatAssetDate(value) {
  if (!value) return "—";
  if (String(value).includes("/")) return value;
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function providerBadge(provider) {
  if (provider === "Airtel") return "provider-airtel";
  if (provider === "Safaricom") return "provider-safaricom";
  return "";
}

function airtimeBadge(asset) {
  const status = Assets.airtimeStatus(asset);
  if (status === "expired") return "airtime-expired";
  if (status === "expiring") return "airtime-expiring";
  if (status === "valid") return "airtime-valid";
  return "";
}

function renderAssets() {
  if (!assetRows) return;

  if (!canViewAssets()) {
    assetRows.innerHTML = '<tr class="empty-row"><td colspan="11">You do not have permission to view IT assets.</td></tr>';
    return;
  }

  const assets = applyAssetFilters(Assets.read());
  const showActions = canManageAssets();
  const colCount = showActions ? 11 : 10;

  updateAssetTableHeader();

  if (assetFilterSummary) {
    assetFilterSummary.textContent = `${assets.length} asset${assets.length === 1 ? "" : "s"} listed`;
  }

  if (!assets.length) {
    assetRows.innerHTML = `<tr class="empty-row"><td colspan="${colCount}">No IT assets match the current filters.</td></tr>`;
    return;
  }

  assetRows.innerHTML = assets
    .map((asset) => {
      const isPhone = Assets.isPhone(asset);
      const isDesktop = Assets.isDesktop(asset);
      const airtimeClass = airtimeBadge(asset);

      return `
        <tr class="asset-row asset-type-${asset.assetType.toLowerCase()}">
          <td>${escapeHtml(asset.employeeId)}</td>
          <td>${escapeHtml(asset.employeeName)}</td>
          <td><span class="asset-type-pill">${escapeHtml(asset.assetType)}</span></td>
          <td>${escapeHtml(asset.deviceModel || "—")}</td>
          <td>${escapeHtml(asset.serialImei || "—")}</td>
          <td>${isPhone ? escapeHtml(asset.phoneNumber || "—") : '<span class="muted-text">—</span>'}</td>
          <td>${isPhone && asset.serviceProvider
            ? `<span class="provider-pill ${providerBadge(asset.serviceProvider)}">${escapeHtml(asset.serviceProvider)}</span>`
            : '<span class="muted-text">—</span>'}</td>
          <td class="${airtimeClass}">${isPhone
            ? `${escapeHtml(asset.airtimeBalance || "—")}<br><small>Until ${escapeHtml(formatAssetDate(asset.airtimeValidUntil))}</small>`
            : '<span class="muted-text">—</span>'}</td>
          <td>${isDesktop ? escapeHtml(asset.desktopSpecs || "—") : '<span class="muted-text">—</span>'}</td>
          <td>${escapeHtml(asset.status)}</td>
          ${showActions ? `<td class="asset-actions">
            <button class="text-button asset-edit-button" type="button" data-asset-id="${escapeHtml(asset.id)}">Edit</button>
            <button class="text-button asset-delete-button" type="button" data-asset-id="${escapeHtml(asset.id)}">Delete</button>
          </td>` : ""}
        </tr>
      `;
    })
    .join("");

  assetRows.querySelectorAll(".asset-edit-button").forEach((button) => {
    button.addEventListener("click", () => startAssetEdit(button.dataset.assetId));
  });

  assetRows.querySelectorAll(".asset-delete-button").forEach((button) => {
    button.addEventListener("click", () => deleteAsset(button.dataset.assetId));
  });
}

function updateAssetTableHeader() {
  const headerRow = document.querySelector(".asset-table thead tr");
  if (!headerRow) return;

  const actionHeader = headerRow.querySelector(".asset-actions-col");
  if (canManageAssets()) {
    if (!actionHeader) {
      headerRow.insertAdjacentHTML("beforeend", '<th class="asset-actions-col">Actions</th>');
    }
  } else if (actionHeader) {
    actionHeader.remove();
  }
}

function startAssetEdit(assetId) {
  if (!canManageAssets()) {
    alert("You do not have permission to edit IT assets.");
    return;
  }

  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;

  if (assetEditId) assetEditId.value = asset.id;
  if (assetEmployeeId) assetEmployeeId.value = asset.employeeId;
  if (assetEmployeeName) assetEmployeeName.value = asset.employeeName;
  if (assetTypeField) assetTypeField.value = asset.assetType;
  if (assetDeviceModel) assetDeviceModel.value = asset.deviceModel;
  if (assetSerialImei) assetSerialImei.value = asset.serialImei;
  if (assetStatus) assetStatus.value = asset.status;
  if (assetNotes) assetNotes.value = asset.notes;

  toggleAssetFieldGroups();

  if (asset.assetType === "Phone") {
    if (assetPhoneNumber) assetPhoneNumber.value = asset.phoneNumber;
    if (assetServiceProvider) assetServiceProvider.value = asset.serviceProvider;
    if (assetAirtimeBalance) assetAirtimeBalance.value = asset.airtimeBalance;
    if (assetAirtimeValidUntil) assetAirtimeValidUntil.value = asset.airtimeValidUntil;
  }

  if (asset.assetType === "Desktop" && assetDesktopSpecs) {
    assetDesktopSpecs.value = asset.desktopSpecs;
  }

  if (assetFormTitle) assetFormTitle.textContent = "Edit Asset";
  if (assetSubmitButton) assetSubmitButton.textContent = "Update Asset";
  if (assetCancelEditButton) assetCancelEditButton.hidden = false;
  if (typeof setActiveTab === "function") {
    setActiveTab("asset-register");
  }
  assetRegisterPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteAsset(assetId) {
  if (!canManageAssets()) {
    alert("You do not have permission to delete IT assets.");
    return;
  }

  if (!confirm("Delete this IT asset record?")) return;
  const remaining = Assets.read().filter((asset) => asset.id !== assetId);
  await Assets.write(remaining);
  renderAssets();
}

async function refreshAssetsFromSheet() {
  if (!canViewAssets()) return;

  try {
    await Assets.loadFromSheet();
    renderAssets();
  } catch (error) {
    console.error(error);
    renderAssets();
  }
}

function exportAssetsCsv() {
  if (!canManageAssets()) {
    alert("You do not have permission to export IT assets.");
    return;
  }

  const headers = Assets.CSV_HEADERS.slice(1);
  const rows = Assets.read().map((asset) => assetToCsvValues(asset, false));

  downloadAssetCsvFile("tarmal-it-assets.csv", headers, rows);
}

function downloadAssetTemplateCsv() {
  if (!canManageAssets()) {
    alert("You do not have permission to download the IT assets template.");
    return;
  }

  const headers = Assets.CSV_HEADERS;
  const sampleRows = [
    [
      "",
      "EMP-1001",
      "Jane Doe",
      "Phone",
      "iPhone 14",
      "IMEI123456789",
      "+254712345678",
      "Safaricom",
      "KES 500",
      "2026-12-31",
      "",
      "Active",
      "Company phone"
    ],
    [
      "",
      "EMP-1002",
      "John Smith",
      "Desktop",
      "Dell OptiPlex 7090",
      "SN-DELL-99001",
      "",
      "",
      "",
      "",
      "Intel i7, 16GB RAM, 512GB SSD, Windows 11",
      "Active",
      "Office desk 3"
    ]
  ];

  downloadAssetCsvFile("tarmal-it-assets-template.csv", headers, sampleRows);
}

function assetToCsvValues(asset, includeId = true) {
  const values = [
    asset.employeeId,
    asset.employeeName,
    asset.assetType,
    asset.deviceModel,
    asset.serialImei,
    asset.phoneNumber,
    asset.serviceProvider,
    asset.airtimeBalance,
    formatAssetDateForCsv(asset.airtimeValidUntil),
    asset.desktopSpecs,
    asset.status,
    asset.notes
  ];

  return includeId ? [asset.id, ...values] : values;
}

function formatAssetDateForCsv(value) {
  if (!value) return "";
  if (String(value).includes("/")) return value;
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseAssetDateFromCsv(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("/")) {
    const parts = raw.split("/");
    if (parts.length === 3) {
      return `${parts[2].padStart(4, "0")}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

function normalizeCsvHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => String(cell).trim()));
}

function buildCsvHeaderIndex(headerRow) {
  const index = new Map();
  headerRow.forEach((header, columnIndex) => {
    index.set(normalizeCsvHeader(header), columnIndex);
  });
  return index;
}

function csvField(headerIndex, values, ...names) {
  for (const name of names) {
    const columnIndex = headerIndex.get(normalizeCsvHeader(name));
    if (columnIndex !== undefined) {
      return String(values[columnIndex] ?? "").trim();
    }
  }
  return "";
}

function assetFromCsvRow(headerIndex, values) {
  return Assets.normalize({
    id: csvField(headerIndex, values, "Id", "ID"),
    employeeId: csvField(headerIndex, values, "Employee ID", "Emp ID"),
    employeeName: csvField(headerIndex, values, "Employee Name", "Employee"),
    assetType: csvField(headerIndex, values, "Asset Type", "Type"),
    deviceModel: csvField(headerIndex, values, "Device Model", "Model"),
    serialImei: csvField(headerIndex, values, "Serial / IMEI", "Serial", "IMEI"),
    phoneNumber: csvField(headerIndex, values, "Phone Number", "Phone"),
    serviceProvider: csvField(headerIndex, values, "Service Provider", "Provider"),
    airtimeBalance: csvField(headerIndex, values, "Airtime Balance"),
    airtimeValidUntil: parseAssetDateFromCsv(csvField(headerIndex, values, "Airtime Valid Until", "Valid Until")),
    desktopSpecs: csvField(headerIndex, values, "Desktop Specs"),
    status: csvField(headerIndex, values, "Status") || "Active",
    notes: csvField(headerIndex, values, "Notes")
  });
}

function validateImportedAsset(asset, rowNumber) {
  if (!asset.employeeId || !asset.employeeName) {
    return `Row ${rowNumber}: Employee ID and Employee Name are required.`;
  }
  if (!Assets.TYPES.includes(asset.assetType)) {
    return `Row ${rowNumber}: Asset Type must be Phone or Desktop.`;
  }
  if (asset.assetType === "Phone" && !asset.phoneNumber) {
    return `Row ${rowNumber}: Phone Number is required for Phone assets.`;
  }
  if (asset.assetType === "Phone" && asset.serviceProvider && !Assets.PROVIDERS.includes(asset.serviceProvider)) {
    return `Row ${rowNumber}: Service Provider must be Airtel or Safaricom.`;
  }
  return "";
}

function mergeImportedAssets(existingAssets, importedAssets) {
  const merged = new Map(existingAssets.map((asset) => [asset.id, asset]));
  let added = 0;
  let updated = 0;

  importedAssets.forEach((asset) => {
    if (asset.id && merged.has(asset.id)) {
      merged.set(asset.id, { ...asset, id: asset.id });
      updated += 1;
      return;
    }

    const id = asset.id || Assets.createId();
    if (merged.has(id)) {
      merged.set(id, { ...asset, id });
      updated += 1;
    } else {
      merged.set(id, { ...asset, id });
      added += 1;
    }
  });

  return { assets: [...merged.values()], added, updated };
}

function downloadAssetCsvFile(filename, headers, rows) {
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importAssetsFromFile(file) {
  if (!canManageAssets()) {
    alert("You do not have permission to import IT assets.");
    return;
  }

  if (!file) return;

  let text = "";
  try {
    text = await file.text();
  } catch {
    alert("Could not read the selected file.");
    return;
  }

  const rows = parseCsvText(text);
  if (rows.length < 2) {
    alert("The CSV must include a header row and at least one data row.");
    return;
  }

  const headerIndex = buildCsvHeaderIndex(rows[0]);
  const imported = [];
  const errors = [];

  rows.slice(1).forEach((values, index) => {
    if (values.every((cell) => !String(cell).trim())) return;

    const rowNumber = index + 2;
    const asset = assetFromCsvRow(headerIndex, values);
    const error = validateImportedAsset(asset, rowNumber);
    if (error) {
      errors.push(error);
      return;
    }
    imported.push(asset);
  });

  if (errors.length) {
    alert(`Import failed:\n\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ""}`);
    return;
  }

  if (!imported.length) {
    alert("No valid asset rows were found in the file.");
    return;
  }

  const { assets, added, updated } = mergeImportedAssets(Assets.read(), imported);
  const summary = `Import ${imported.length} row(s)?\n\nNew: ${added}\nUpdated: ${updated}`;
  if (!confirm(summary)) return;

  await Assets.write(assets);
  renderAssets();
  if (typeof setActiveTab === "function") {
    setActiveTab("asset-list");
  }
  alert(`Imported successfully. ${added} new and ${updated} updated.`);
}

function triggerAssetImport() {
  importAssetsFile?.click();
}

async function saveAssetFromPanel() {
  if (!canManageAssets()) {
    alert("You do not have permission to save IT assets.");
    return;
  }

  const asset = assetFromForm();

  if (!asset.employeeId || !asset.employeeName) {
    alert("Employee ID and name are required.");
    return;
  }

  if (!asset.assetType) {
    alert("Select an asset type.");
    return;
  }

  if (asset.assetType === "Phone") {
    if (!asset.phoneNumber) {
      alert("Phone number is required for phone assets.");
      return;
    }
    if (!Assets.PROVIDERS.includes(asset.serviceProvider)) {
      alert("Select Airtel or Safaricom as the service provider.");
      return;
    }
  }

  const assets = Assets.read();
  const editIndex = assets.findIndex((entry) => entry.id === asset.id);

  if (editIndex >= 0) {
    assets[editIndex] = asset;
  } else {
    assets.push(asset);
  }

  await Assets.write(assets);
  resetAssetForm();
  renderAssets();
  if (typeof setActiveTab === "function") {
    setActiveTab("asset-list");
  }
}

function initAssetsModule() {
  bindAssetElements();

  if (!assetRegisterPanel || !assetEmployeeId) {
    console.error("IT Assets register panel not found in the page.");
    return;
  }

  Auth.refreshSessionRights();

  assetTypeField?.addEventListener("change", toggleAssetFieldGroups);
  assetSubmitButton?.addEventListener("click", saveAssetFromPanel);
  assetCancelEditButton?.addEventListener("click", resetAssetForm);
  assetClearButton?.addEventListener("click", resetAssetForm);
  refreshAssetsButton?.addEventListener("click", refreshAssetsFromSheet);
  exportAssetsButton?.addEventListener("click", exportAssetsCsv);
  downloadAssetTemplateButton?.addEventListener("click", downloadAssetTemplateCsv);
  downloadAssetTemplateRegisterButton?.addEventListener("click", downloadAssetTemplateCsv);
  importAssetsRegisterButton?.addEventListener("click", triggerAssetImport);
  importAssetsButton?.addEventListener("click", triggerAssetImport);
  importAssetsFile?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await importAssetsFromFile(file);
  });

  [assetSearchFilter, assetTypeFilter, assetProviderFilter]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", renderAssets));

  resetAssetForm();
  renderAssets();

  if (Auth.SHEET_WEB_APP_URL && canViewAssets()) {
    refreshAssetsFromSheet();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAssetsModule);
} else {
  initAssetsModule();
}
