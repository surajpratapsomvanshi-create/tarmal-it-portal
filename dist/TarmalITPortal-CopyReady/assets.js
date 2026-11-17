const Assets = {
  LOCAL_KEY: "tarmal-it-assets",
  PROVIDERS: ["Airtel", "Safaricom"],
  TYPES: ["Laptop", "Server", "Monitor", "License", "Phone", "Desktop", "Other"],
  STATUSES: ["In use", "In store", "Under repair", "Returned", "Retired"],
  EXPIRY_WINDOWS: [30, 60, 90],

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

  mapLegacyStatus(status) {
    const raw = String(status || "").trim();
    const map = {
      Active: "In use",
      "In Repair": "Under repair",
      Lost: "Retired"
    };
    if (map[raw]) return map[raw];
    if (this.STATUSES.includes(raw)) return raw;
    return raw || "In use";
  },

  parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  },

  last4FromSecret(secret) {
    const raw = String(secret || "").replace(/\s+/g, "");
    if (!raw) return "";
    return raw.slice(-4);
  },

  maskSerialDisplay(asset) {
    if (this.isLicense(asset)) {
      const last4 = asset.licenseKeyLast4 || this.last4FromSecret(asset.licenseKey);
      if (last4) return `••••${last4}`;
      return asset.serialImei || "—";
    }
    return asset.serialImei || "—";
  },

  normalizeHistoryEntry(entry) {
    return {
      id: String(entry?.id || `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      date: String(entry?.date || "").trim(),
      type: ["Repair", "Replacement"].includes(String(entry?.type || "").trim())
        ? String(entry.type).trim()
        : "Repair",
      description: String(entry?.description || "").trim(),
      vendor: String(entry?.vendor || "").trim(),
      cost: String(entry?.cost || "").trim(),
      createdAt: String(entry?.createdAt || new Date().toISOString())
    };
  },

  normalizeHandoverEntry(entry) {
    return {
      id: String(entry?.id || `hand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      date: String(entry?.date || "").trim(),
      kind: ["Handover", "Return"].includes(String(entry?.kind || "").trim())
        ? String(entry.kind).trim()
        : "Handover",
      fromUser: String(entry?.fromUser || "").trim(),
      toUser: String(entry?.toUser || "").trim(),
      notes: String(entry?.notes || "").trim(),
      createdAt: String(entry?.createdAt || new Date().toISOString())
    };
  },

  normalize(asset) {
    const assetType = String(asset.assetType || "").trim();
    const provider = String(asset.serviceProvider || "").trim();
    const licenseKey = String(asset.licenseKey || "").trim();
    let licenseKeyLast4 = String(asset.licenseKeyLast4 || "").trim();
    if (licenseKey) {
      licenseKeyLast4 = this.last4FromSecret(licenseKey);
    }

    const seatsRaw = asset.licenseSeats;
    const licenseSeats = seatsRaw === "" || seatsRaw === null || seatsRaw === undefined
      ? ""
      : String(Math.max(0, Number(seatsRaw) || 0));

    return {
      id: String(asset.id || ""),
      assetCode: String(asset.assetCode || "").trim(),
      employeeId: String(asset.employeeId || "").trim(),
      employeeName: String(asset.employeeName || "").trim(),
      department: String(asset.department || "").trim(),
      assetType,
      deviceModel: String(asset.deviceModel || "").trim(),
      serialImei: String(asset.serialImei || "").trim(),
      phoneNumber: String(asset.phoneNumber || "").trim(),
      serviceProvider: this.PROVIDERS.includes(provider) ? provider : "",
      airtimeBalance: String(asset.airtimeBalance || "").trim(),
      airtimeValidUntil: asset.airtimeValidUntil || "",
      desktopSpecs: String(asset.desktopSpecs || "").trim(),
      purchaseDate: asset.purchaseDate || "",
      warrantyExpiry: asset.warrantyExpiry || "",
      vendor: String(asset.vendor || "").trim(),
      licenseSeats,
      licenseKey,
      licenseKeyLast4,
      status: this.mapLegacyStatus(asset.status),
      notes: String(asset.notes || "").trim(),
      history: this.parseJsonArray(asset.history).map((entry) => this.normalizeHistoryEntry(entry)),
      handovers: this.parseJsonArray(asset.handovers).map((entry) => this.normalizeHandoverEntry(entry)),
      declarationGeneratedAt: String(asset.declarationGeneratedAt || "").trim(),
      declarationSignedFileName: String(asset.declarationSignedFileName || "").trim(),
      declarationSignedDriveFileId: String(asset.declarationSignedDriveFileId || "").trim(),
      declarationSignedDriveUrl: String(asset.declarationSignedDriveUrl || "").trim(),
      declarationSignedUploadedAt: String(asset.declarationSignedUploadedAt || "").trim()
    };
  },

  createId() {
    return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  },

  createAssetCode() {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `AST-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
      const local = this.normalize(asset);
      if (!merged.has(local.id)) {
        merged.set(local.id, local);
        return;
      }
      // Preserve locally held full license keys (sheet only stores last-4).
      const remote = merged.get(local.id);
      const next = { ...remote };
      let changed = false;
      if (local.licenseKey && !remote.licenseKey) {
        next.licenseKey = local.licenseKey;
        next.licenseKeyLast4 = local.licenseKeyLast4 || remote.licenseKeyLast4;
        changed = true;
      }
      if (local.declarationSignedDriveUrl && !remote.declarationSignedDriveUrl) {
        next.declarationSignedFileName = local.declarationSignedFileName;
        next.declarationSignedDriveFileId = local.declarationSignedDriveFileId;
        next.declarationSignedDriveUrl = local.declarationSignedDriveUrl;
        next.declarationSignedUploadedAt = local.declarationSignedUploadedAt;
        changed = true;
      }
      if (local.declarationGeneratedAt && !remote.declarationGeneratedAt) {
        next.declarationGeneratedAt = local.declarationGeneratedAt;
        changed = true;
      }
      if (changed) merged.set(local.id, this.normalize(next));
    });
    return [...merged.values()];
  },

  forSheetSync(asset) {
    const normalized = this.normalize(asset);
    // Never push full license secrets to Google Sheets — last-4 only.
    return {
      ...normalized,
      licenseKey: ""
    };
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
        assets: assets.map((asset) => this.forSheetSync(asset))
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

  isLicense(asset) {
    return String(asset.assetType).toLowerCase() === "license";
  },

  isLaptop(asset) {
    return String(asset.assetType).toLowerCase() === "laptop";
  },

  expiryDate(asset) {
    return String(asset.warrantyExpiry || "").trim();
  },

  daysUntilExpiry(asset) {
    const until = this.expiryDate(asset);
    if (!until) return null;
    const expiry = new Date(until);
    if (Number.isNaN(expiry.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / 86400000);
  },

  expiryStatus(asset, windowDays = 90) {
    const diffDays = this.daysUntilExpiry(asset);
    if (diffDays === null) return "";
    if (diffDays < 0) return "expired";
    if (diffDays <= windowDays) return "expiring";
    return "ok";
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
    "Asset ID",
    "Employee ID",
    "Employee Name",
    "Department",
    "Asset Type",
    "Device Model",
    "Serial / IMEI",
    "Phone Number",
    "Service Provider",
    "Airtime Balance",
    "Airtime Valid Until",
    "Desktop Specs",
    "Purchase Date",
    "Warranty / Expiry",
    "Vendor",
    "License Seats",
    "License Key Last4",
    "Status",
    "Notes",
    "History JSON",
    "Handovers JSON",
    "Declaration Generated At",
    "Declaration Signed File Name",
    "Declaration Signed Drive File Id",
    "Declaration Signed Drive URL",
    "Declaration Signed Uploaded At"
  ]
};

let assetRegisterPanel;
let assetRows;
let assetTypeField;
let assetPhoneFields;
let assetDesktopFields;
let assetLicenseFields;
let assetSearchFilter;
let assetTypeFilter;
let assetStatusFilter;
let assetDepartmentFilter;
let assetUserFilter;
let assetExpiryFilter;
let assetProviderFilter;
let assetFilterSummary;
let assetExpiryBadge;
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
let assetCodeField;
let assetEmployeeId;
let assetEmployeeName;
let assetDepartment;
let assetStatus;
let assetDeviceModel;
let assetSerialImei;
let assetPhoneNumber;
let assetServiceProvider;
let assetAirtimeBalance;
let assetAirtimeValidUntil;
let assetDesktopSpecs;
let assetPurchaseDate;
let assetWarrantyExpiry;
let assetVendor;
let assetLicenseSeats;
let assetLicenseKey;
let assetNotes;
let assetDetailModal;
let assetDetailTitle;
let assetDetailBody;
let closeAssetDetailButton;
let assetHandoverModal;
let closeAssetHandoverButton;
let assetHandoverForm;
let assetHandoverAssetId;
let assetHandoverKind;
let assetHandoverDate;
let assetHandoverFrom;
let assetHandoverTo;
let assetHandoverNotes;
let assetHistoryModal;
let closeAssetHistoryButton;
let assetHistoryForm;
let assetHistoryAssetId;
let assetHistoryDate;
let assetHistoryType;
let assetHistoryDescription;
let assetHistoryVendor;
let assetHistoryCost;
let assetHistoryList;

function canViewAssets() {
  return Auth.canViewAssets();
}

function canManageAssets() {
  return Auth.canManageAssets();
}

function canViewConsumables() {
  return typeof Auth.canViewConsumables === "function"
    ? Auth.canViewConsumables()
    : (Auth.canViewAssets() || Auth.hasPermission?.("viewConsumables"));
}

function canManageConsumables() {
  return typeof Auth.canManageConsumables === "function"
    ? Auth.canManageConsumables()
    : (Auth.canManageAssets() || Auth.hasPermission?.("manageConsumables"));
}

function canEditConsumableHistory() {
  return typeof Auth.canEditConsumableHistory === "function"
    ? Auth.canEditConsumableHistory()
    : Boolean(Auth.hasPermission?.("editConsumableHistory") || Auth.isAdminLevelUser?.());
}

function bindAssetElements() {
  assetRegisterPanel = document.querySelector("#assetRegisterPanel");
  assetRows = document.querySelector("#assetRows");
  assetTypeField = document.querySelector("#assetTypeField");
  assetPhoneFields = document.querySelector("#assetPhoneFields");
  assetDesktopFields = document.querySelector("#assetDesktopFields");
  assetLicenseFields = document.querySelector("#assetLicenseFields");
  assetSearchFilter = document.querySelector("#assetSearchFilter");
  assetTypeFilter = document.querySelector("#assetTypeFilter");
  assetStatusFilter = document.querySelector("#assetStatusFilter");
  assetDepartmentFilter = document.querySelector("#assetDepartmentFilter");
  assetUserFilter = document.querySelector("#assetUserFilter");
  assetExpiryFilter = document.querySelector("#assetExpiryFilter");
  assetProviderFilter = document.querySelector("#assetProviderFilter");
  assetFilterSummary = document.querySelector("#assetFilterSummary");
  assetExpiryBadge = document.querySelector("#assetExpiryBadge");
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
  assetCodeField = document.querySelector("#assetCodeField");
  assetEmployeeId = document.querySelector("#assetEmployeeId");
  assetEmployeeName = document.querySelector("#assetEmployeeName");
  assetDepartment = document.querySelector("#assetDepartment");
  assetStatus = document.querySelector("#assetStatus");
  assetDeviceModel = document.querySelector("#assetDeviceModel");
  assetSerialImei = document.querySelector("#assetSerialImei");
  assetPhoneNumber = document.querySelector("#assetPhoneNumber");
  assetServiceProvider = document.querySelector("#assetServiceProvider");
  assetAirtimeBalance = document.querySelector("#assetAirtimeBalance");
  assetAirtimeValidUntil = document.querySelector("#assetAirtimeValidUntil");
  assetDesktopSpecs = document.querySelector("#assetDesktopSpecs");
  assetPurchaseDate = document.querySelector("#assetPurchaseDate");
  assetWarrantyExpiry = document.querySelector("#assetWarrantyExpiry");
  assetVendor = document.querySelector("#assetVendor");
  assetLicenseSeats = document.querySelector("#assetLicenseSeats");
  assetLicenseKey = document.querySelector("#assetLicenseKey");
  assetNotes = document.querySelector("#assetNotes");
  assetDetailModal = document.querySelector("#assetDetailModal");
  assetDetailTitle = document.querySelector("#assetDetailTitle");
  assetDetailBody = document.querySelector("#assetDetailBody");
  closeAssetDetailButton = document.querySelector("#closeAssetDetailButton");
  assetHandoverModal = document.querySelector("#assetHandoverModal");
  closeAssetHandoverButton = document.querySelector("#closeAssetHandoverButton");
  assetHandoverForm = document.querySelector("#assetHandoverForm");
  assetHandoverAssetId = document.querySelector("#assetHandoverAssetId");
  assetHandoverKind = document.querySelector("#assetHandoverKind");
  assetHandoverDate = document.querySelector("#assetHandoverDate");
  assetHandoverFrom = document.querySelector("#assetHandoverFrom");
  assetHandoverTo = document.querySelector("#assetHandoverTo");
  assetHandoverNotes = document.querySelector("#assetHandoverNotes");
  assetHistoryModal = document.querySelector("#assetHistoryModal");
  closeAssetHistoryButton = document.querySelector("#closeAssetHistoryButton");
  assetHistoryForm = document.querySelector("#assetHistoryForm");
  assetHistoryAssetId = document.querySelector("#assetHistoryAssetId");
  assetHistoryDate = document.querySelector("#assetHistoryDate");
  assetHistoryType = document.querySelector("#assetHistoryType");
  assetHistoryDescription = document.querySelector("#assetHistoryDescription");
  assetHistoryVendor = document.querySelector("#assetHistoryVendor");
  assetHistoryCost = document.querySelector("#assetHistoryCost");
  assetHistoryList = document.querySelector("#assetHistoryList");
}

function toggleAssetFieldGroups() {
  const type = assetTypeField?.value || "";
  const isPhone = type === "Phone";
  const isDesktop = type === "Desktop";
  const isLicense = type === "License";

  if (assetPhoneFields) assetPhoneFields.hidden = !isPhone;
  if (assetDesktopFields) assetDesktopFields.hidden = !isDesktop;
  if (assetLicenseFields) assetLicenseFields.hidden = !isLicense;

  const serialLabel = document.querySelector("#assetSerialLabel");
  if (serialLabel) {
    serialLabel.textContent = isLicense ? "License ID" : "Serial / IMEI";
  }
  const serialInput = assetSerialImei;
  if (serialInput) {
    serialInput.placeholder = isLicense
      ? "License ID or agreement number (not the full key)"
      : "Serial number or IMEI";
  }
  const expiryLabel = document.querySelector("#assetWarrantyLabel");
  if (expiryLabel) {
    expiryLabel.textContent = isLicense ? "License expiry" : "Warranty expiry";
  }
  const modelLabel = document.querySelector("#assetModelLabel");
  if (modelLabel) {
    modelLabel.textContent = isLicense ? "Product / SKU" : "Name / Model";
  }
}

function resetAssetForm() {
  if (assetEditId) assetEditId.value = "";
  if (assetCodeField) assetCodeField.value = "";
  if (assetEmployeeId) assetEmployeeId.value = "";
  if (assetEmployeeName) assetEmployeeName.value = "";
  if (assetDepartment) assetDepartment.value = "";
  if (assetTypeField) assetTypeField.value = "";
  if (assetStatus) assetStatus.value = "In use";
  if (assetDeviceModel) assetDeviceModel.value = "";
  if (assetSerialImei) assetSerialImei.value = "";
  if (assetPhoneNumber) assetPhoneNumber.value = "";
  if (assetServiceProvider) assetServiceProvider.value = "";
  if (assetAirtimeBalance) assetAirtimeBalance.value = "";
  if (assetAirtimeValidUntil) assetAirtimeValidUntil.value = "";
  if (assetDesktopSpecs) assetDesktopSpecs.value = "";
  if (assetPurchaseDate) assetPurchaseDate.value = "";
  if (assetWarrantyExpiry) assetWarrantyExpiry.value = "";
  if (assetVendor) assetVendor.value = "";
  if (assetLicenseSeats) assetLicenseSeats.value = "";
  if (assetLicenseKey) assetLicenseKey.value = "";
  if (assetNotes) assetNotes.value = "";
  if (assetFormTitle) assetFormTitle.textContent = "Register Asset";
  if (assetSubmitButton) assetSubmitButton.textContent = "Save Asset";
  if (assetCancelEditButton) assetCancelEditButton.hidden = true;
  toggleAssetFieldGroups();
}

function assetFromForm() {
  const assetType = String(assetTypeField?.value || "").trim();
  const existingId = assetEditId?.value || "";
  const existing = existingId
    ? Assets.read().find((entry) => entry.id === existingId)
    : null;

  const licenseKeyInput = String(assetLicenseKey?.value || "").trim();
  const licenseKey = licenseKeyInput || existing?.licenseKey || "";

  const asset = {
    id: existingId || Assets.createId(),
    assetCode: String(assetCodeField?.value || "").trim() || existing?.assetCode || Assets.createAssetCode(),
    employeeId: String(assetEmployeeId?.value || "").trim(),
    employeeName: String(assetEmployeeName?.value || "").trim(),
    department: String(assetDepartment?.value || "").trim(),
    assetType,
    deviceModel: String(assetDeviceModel?.value || "").trim(),
    serialImei: String(assetSerialImei?.value || "").trim(),
    phoneNumber: "",
    serviceProvider: "",
    airtimeBalance: "",
    airtimeValidUntil: "",
    desktopSpecs: "",
    purchaseDate: String(assetPurchaseDate?.value || "").trim(),
    warrantyExpiry: String(assetWarrantyExpiry?.value || "").trim(),
    vendor: String(assetVendor?.value || "").trim(),
    licenseSeats: assetType === "License" ? String(assetLicenseSeats?.value || "").trim() : "",
    licenseKey: assetType === "License" ? licenseKey : "",
    licenseKeyLast4: assetType === "License"
      ? (Assets.last4FromSecret(licenseKey) || existing?.licenseKeyLast4 || "")
      : "",
    status: String(assetStatus?.value || "In use").trim(),
    notes: String(assetNotes?.value || "").trim(),
    history: existing?.history || [],
    handovers: existing?.handovers || [],
    declarationGeneratedAt: existing?.declarationGeneratedAt || "",
    declarationSignedFileName: existing?.declarationSignedFileName || "",
    declarationSignedDriveFileId: existing?.declarationSignedDriveFileId || "",
    declarationSignedDriveUrl: existing?.declarationSignedDriveUrl || "",
    declarationSignedUploadedAt: existing?.declarationSignedUploadedAt || ""
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

function populateAssetFilterOptions(assets) {
  const departments = [...new Set(assets.map((a) => a.department).filter(Boolean))].sort();
  const users = [...new Set(assets.map((a) => a.employeeName).filter(Boolean))].sort();

  if (assetDepartmentFilter) {
    const current = assetDepartmentFilter.value;
    assetDepartmentFilter.innerHTML = '<option value="">All departments</option>'
      + departments.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
    assetDepartmentFilter.value = departments.includes(current) ? current : "";
  }

  if (assetUserFilter) {
    const current = assetUserFilter.value;
    assetUserFilter.innerHTML = '<option value="">All users</option>'
      + users.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");
    assetUserFilter.value = users.includes(current) ? current : "";
  }
}

function applyAssetFilters(assets) {
  const search = String(assetSearchFilter?.value || "").trim().toLowerCase();
  const type = String(assetTypeFilter?.value || "").trim();
  const status = String(assetStatusFilter?.value || "").trim();
  const department = String(assetDepartmentFilter?.value || "").trim();
  const user = String(assetUserFilter?.value || "").trim();
  const expiryWindow = Number(assetExpiryFilter?.value || 0);
  const provider = String(assetProviderFilter?.value || "").trim();

  return assets.filter((asset) => {
    if (type && asset.assetType !== type) return false;
    if (status && asset.status !== status) return false;
    if (department && asset.department !== department) return false;
    if (user && asset.employeeName !== user) return false;
    if (provider && asset.serviceProvider !== provider) return false;
    if (expiryWindow > 0) {
      const days = Assets.daysUntilExpiry(asset);
      if (days === null || days > expiryWindow) return false;
    }
    if (!search) return true;

    const haystack = [
      asset.assetCode,
      asset.employeeId,
      asset.employeeName,
      asset.department,
      asset.deviceModel,
      asset.serialImei,
      asset.licenseKeyLast4,
      asset.phoneNumber,
      asset.serviceProvider,
      asset.desktopSpecs,
      asset.vendor,
      asset.notes,
      asset.status,
      asset.assetType
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

function warrantyBadgeClass(asset) {
  const status = Assets.expiryStatus(asset, 90);
  if (status === "expired") return "warranty-expired";
  if (status === "expiring") {
    const days = Assets.daysUntilExpiry(asset);
    if (days !== null && days <= 30) return "warranty-expiring-soon";
    return "warranty-expiring";
  }
  return "";
}

function warrantyLabel(asset) {
  const days = Assets.daysUntilExpiry(asset);
  if (days === null) return formatAssetDate(Assets.expiryDate(asset));
  if (days < 0) return `${formatAssetDate(Assets.expiryDate(asset))} (expired)`;
  if (days === 0) return `${formatAssetDate(Assets.expiryDate(asset))} (today)`;
  if (days <= 90) return `${formatAssetDate(Assets.expiryDate(asset))} (${days}d)`;
  return formatAssetDate(Assets.expiryDate(asset));
}

function countExpiringAssets(assets, windowDays = 90) {
  return assets.filter((asset) => {
    const days = Assets.daysUntilExpiry(asset);
    return days !== null && days <= windowDays;
  }).length;
}

function updateExpiryBadge(assets) {
  if (!assetExpiryBadge) return;
  const count30 = countExpiringAssets(assets, 30);
  const count60 = countExpiringAssets(assets, 60);
  const count90 = countExpiringAssets(assets, 90);
  if (!count90) {
    assetExpiryBadge.hidden = true;
    assetExpiryBadge.textContent = "";
    return;
  }
  assetExpiryBadge.hidden = false;
  assetExpiryBadge.textContent = `${count90} expiring ≤90d (30d: ${count30} · 60d: ${count60})`;
}

function declarationStatusInfo(asset) {
  if (asset?.declarationSignedDriveUrl) {
    return {
      key: "signed",
      label: "Signed uploaded",
      className: "declaration-status-signed"
    };
  }
  if (asset?.employeeName || asset?.declarationGeneratedAt) {
    return {
      key: "ready",
      label: "Declaration ready",
      className: "declaration-status-ready"
    };
  }
  return {
    key: "none",
    label: "Not assigned",
    className: "declaration-status-none"
  };
}

function declarationDisplayValue(value, fallback = "NA") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatDeclarationDate(value) {
  const raw = String(value || "").trim();
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${today.getFullYear()}`;
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function declarationProductDetails(asset) {
  const parts = [asset.assetType, asset.desktopSpecs].map((part) => String(part || "").trim()).filter(Boolean);
  if (parts.length) return parts.join(" - ");
  return declarationDisplayValue(asset.deviceModel);
}

function buildDeclarationFormHtml(asset) {
  const employeeName = declarationDisplayValue(asset.employeeName, "________________");
  const assetType = declarationDisplayValue(asset.assetType, "asset");
  const modelNumber = declarationDisplayValue(asset.deviceModel);
  const productDetails = declarationProductDetails(asset);
  const serialNumber = Assets.isLicense(asset)
    ? declarationDisplayValue(Assets.maskSerialDisplay(asset))
    : declarationDisplayValue(asset.serialImei);
  const accessories = declarationDisplayValue(asset.notes);
  const formDate = formatDeclarationDate(asset.declarationGeneratedAt || new Date().toISOString());
  const title = `Declaration Cum Undertaking — ${asset.assetCode || asset.id || "Asset"}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: "Times New Roman", Times, serif; color: #111; margin: 28px; line-height: 1.45; font-size: 13.5px; }
  h1 { text-align: center; font-size: 20px; letter-spacing: 0.04em; margin: 0 0 18px; text-transform: uppercase; }
  .intro { margin: 0 0 12px; }
  .specs { margin: 0 0 18px 18px; padding: 0; }
  .specs li { margin: 4px 0; }
  .sign-row { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr 1.2fr; gap: 12px; margin: 18px 0 22px; align-items: end; }
  .sign-box { min-height: 64px; }
  .sign-line { border-bottom: 1px solid #222; min-height: 36px; margin-bottom: 4px; }
  .thumb-box { border: 1px solid #222; min-height: 64px; width: 72px; }
  .label { font-size: 12px; }
  .terms-intro { margin: 0 0 8px; }
  .terms { margin: 0 0 14px 18px; padding: 0; }
  .terms li { margin: 5px 0; }
  .liability { margin: 0 0 10px; }
  .note { margin: 0 0 16px; font-weight: 700; }
  .final { margin: 0 0 14px; }
  .final-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 22px; }
  .return-table { width: 100%; border-collapse: collapse; border: 1px solid #222; }
  .return-table td { border: 1px solid #222; vertical-align: top; padding: 10px; width: 50%; }
  .return-line { border-bottom: 1px solid #222; min-height: 22px; margin: 8px 0 4px; }
  .meta { color: #555; font-size: 12px; margin-top: 16px; }
  .actions { margin-top: 20px; }
  @media print { .actions { display: none; } body { margin: 0; } }
</style></head><body>
  <h1>DECLARATION CUM UNDERTAKING</h1>
  <p class="intro">I, <strong>${escapeHtml(employeeName)}</strong>, employee of Tarmal wire products Ltd. acknowledge receipt of company
    <strong>${escapeHtml(assetType)}</strong> with the following specification:</p>
  <ul class="specs">
    <li>Model Number: <strong>${escapeHtml(modelNumber)}</strong></li>
    <li>Product Details: <strong>${escapeHtml(productDetails)}</strong></li>
    <li>Serial Number: <strong>${escapeHtml(serialNumber)}</strong></li>
    <li>Other accessories: <strong>${escapeHtml(accessories)}</strong></li>
  </ul>
  <div class="sign-row">
    <div class="sign-box"><div class="sign-line"></div><div class="label">Signature</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="label">Date: ${escapeHtml(formDate)}</div></div>
    <div class="sign-box"><div class="thumb-box"></div><div class="label">Thumbprint</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="label">Issuing Authority</div></div>
  </div>
  <p class="terms-intro">This <strong>${escapeHtml(assetType)}</strong> has been issued to <strong>${escapeHtml(employeeName)}</strong> with the below mentioned understanding:</p>
  <ul class="terms">
    <li>The ${escapeHtml(assetType)} issued is for solely official purpose.</li>
    <li>The employee shall be fully accountable for theft, loss or damage of the property due to personal negligence.</li>
    <li>The ${escapeHtml(assetType)} requisition form has to be signed before taking possession of the ${escapeHtml(assetType)}.</li>
    <li>Employee can mention necessary specifications needed for their job function before taking handover from the Systems Admin Department.</li>
    <li>Any additional software/hardware required by employee (before or after taking handover) should be clearly communicated through mail to the Systems Admin Department.</li>
    <li>The ${escapeHtml(assetType)} should be returned to the Systems Admin Department in case of leaving the organization or if they do not intend to use it for any reason.</li>
  </ul>
  <p class="liability">In case of any loss or damage to the above mentioned property due to personal negligence, the employee will be liable to replace or pay the equivalent amount of the property and the organization will have the rights to deduct the amount from the employee's salary.</p>
  <p class="note">Note: Company will avail insurance of above property to safeguard from any theft, loss or damage.</p>
  <p class="final">I, <strong>${escapeHtml(employeeName)}</strong>, have read and understood the terms and conditions and declare to abide by them.</p>
  <div class="final-sign">
    <div class="sign-box"><div class="sign-line"></div><div class="label">Signature</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="label">Date: ${escapeHtml(formDate)}</div></div>
  </div>
  <table class="return-table" aria-label="Return details">
    <tr>
      <td>
        <div><strong>Reason for returning:</strong></div>
        <div class="return-line"></div>
        <div><strong>Return Date:</strong></div>
        <div class="return-line"></div>
        <div><strong>Sign:</strong></div>
        <div class="return-line"></div>
      </td>
      <td>
        <div><strong>${escapeHtml(assetType)} Condition (IT Person Receiving):</strong></div>
        <div class="return-line"></div>
        <div><strong>Receipt Date:</strong></div>
        <div class="return-line"></div>
        <div><strong>Sign:</strong></div>
        <div class="return-line"></div>
      </td>
    </tr>
  </table>
  <p class="meta">Asset ID: ${escapeHtml(asset.assetCode || "—")} · Generated ${escapeHtml(new Date().toLocaleString())}</p>
  <div class="actions">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body></html>`;
}

function downloadDeclarationForm(assetId) {
  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;

  if (!asset.employeeName && !asset.declarationGeneratedAt) {
    alert("Assign an employee before downloading the declaration form.");
    return;
  }

  const html = buildDeclarationFormHtml(asset);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeCode = String(asset.assetCode || asset.id || "asset").replace(/[^\w.-]+/g, "_");
  link.href = url;
  link.download = `Declaration-Cum-Undertaking-${safeCode}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  // Also open a print-ready window for immediate Print → PDF.
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

async function ensureDeclarationReady(asset, options = {}) {
  const force = options.force === true;
  if (!asset) return asset;
  if (!asset.employeeName) return Assets.normalize(asset);

  const next = { ...asset };
  if (!next.declarationGeneratedAt || force) {
    next.declarationGeneratedAt = new Date().toISOString();
  }
  return Assets.normalize(next);
}

async function postAssetDeclarationRequest(payload) {
  let body;
  try {
    body = JSON.stringify(payload);
  } catch (error) {
    console.error("Declaration payload stringify failed:", error);
    throw new Error("Could not prepare declaration upload.");
  }

  const response = await fetch(Auth.SHEET_WEB_APP_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body
  });

  const text = await response.text();
  const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!raw) throw new Error("Empty response from Apps Script.");
  if (/^(ok|success|true)$/i.test(raw)) return { ok: true, assumedOk: true };

  try {
    return JSON.parse(raw);
  } catch {
    const okMatch = raw.match(/\{\s*"ok"\s*:[\s\S]*\}/);
    if (okMatch) {
      try { return JSON.parse(okMatch[0]); } catch { /* fall through */ }
    }
    console.error("Apps Script non-JSON response:", raw.slice(0, 240));
    throw new Error("Could not read a response from Apps Script.");
  }
}

function readFileAsDataUrlForAsset(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function triggerDeclarationUpload(assetId) {
  if (!canManageAssets()) {
    alert("You do not have permission to upload signed declarations.");
    return;
  }
  const input = document.querySelector("#assetDeclarationUploadFile");
  if (!input) {
    alert("Upload control is missing from the page.");
    return;
  }
  input.dataset.assetId = assetId;
  input.value = "";
  input.click();
}

async function uploadSignedDeclarationForAsset(assetId, file) {
  if (!canManageAssets()) {
    alert("You do not have permission to upload signed declarations.");
    return;
  }
  if (!assetId || !file) return;

  if (!Auth.SHEET_WEB_APP_URL) {
    alert("Sheet endpoint is not configured. Cannot upload to Drive.");
    return;
  }

  const assets = Assets.read();
  const index = assets.findIndex((entry) => entry.id === assetId);
  if (index < 0) {
    alert("Asset record not found.");
    return;
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert("Signed declaration file is too large (max 12 MB).");
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrlForAsset(file);
    const response = await postAssetDeclarationRequest({
      action: "uploadAssetDeclaration",
      assetId,
      assetCode: assets[index].assetCode || "",
      employeeName: assets[index].employeeName || "",
      title: `Signed-Declaration-${assets[index].assetCode || assetId}`,
      fileName: file.name,
      dataUrl
    });

    if (!response?.ok || !response.file) {
      throw new Error(response?.error || "Upload failed.");
    }

    const updated = Assets.normalize({
      ...assets[index],
      declarationGeneratedAt: assets[index].declarationGeneratedAt || new Date().toISOString(),
      declarationSignedFileName: response.file.fileName || file.name,
      declarationSignedDriveFileId: response.file.driveFileId || "",
      declarationSignedDriveUrl: response.file.driveUrl || "",
      declarationSignedUploadedAt: new Date().toISOString()
    });
    assets[index] = updated;
    await Assets.write(assets);
    renderAssets();
    alert("Signed declaration uploaded.");
  } catch (error) {
    console.error(error);
    alert(error?.message || "Could not upload signed declaration.");
  }
}

function renderAssets() {
  if (!assetRows) return;

  if (!canViewAssets()) {
    assetRows.innerHTML = '<tr class="empty-row"><td colspan="13">You do not have permission to view IT assets.</td></tr>';
    return;
  }

  const allAssets = Assets.read();
  populateAssetFilterOptions(allAssets);
  updateExpiryBadge(allAssets);

  const assets = applyAssetFilters(allAssets);
  const showActions = canManageAssets();
  const colCount = showActions ? 13 : 12;

  updateAssetTableHeader();

  if (assetFilterSummary) {
    assetFilterSummary.textContent = `${assets.length} asset${assets.length === 1 ? "" : "s"} listed`;
  }

  const readonlyNote = document.querySelector("#assetsReadonlyNote");
  if (readonlyNote) {
    readonlyNote.hidden = canManageAssets();
  }

  if (!assets.length) {
    assetRows.innerHTML = `<tr class="empty-row"><td colspan="${colCount}">No IT assets match the current filters.</td></tr>`;
    return;
  }

  assetRows.innerHTML = assets
    .map((asset) => {
      const warrantyClass = warrantyBadgeClass(asset);
      const serialDisplay = Assets.maskSerialDisplay(asset);
      const seats = Assets.isLicense(asset) && asset.licenseSeats !== ""
        ? `<br><small>${escapeHtml(asset.licenseSeats)} seat(s)</small>`
        : "";
      const declaration = declarationStatusInfo(asset);
      const canDownloadDeclaration = Boolean(asset.employeeName || asset.declarationGeneratedAt);
      const signedLink = asset.declarationSignedDriveUrl
        ? `<a class="text-button" href="${escapeHtml(asset.declarationSignedDriveUrl)}" target="_blank" rel="noopener">View signed</a>`
        : "";

      return `
        <tr class="asset-row asset-type-${escapeHtml(String(asset.assetType || "other").toLowerCase())}">
          <td>${escapeHtml(asset.assetCode || "—")}</td>
          <td><span class="asset-type-pill">${escapeHtml(asset.assetType || "—")}</span>${seats}</td>
          <td>${escapeHtml(asset.deviceModel || "—")}</td>
          <td>${escapeHtml(serialDisplay)}</td>
          <td>${escapeHtml(asset.employeeName || "—")}${asset.employeeId ? `<br><small>${escapeHtml(asset.employeeId)}</small>` : ""}</td>
          <td>${escapeHtml(asset.department || "—")}</td>
          <td>${escapeHtml(formatAssetDate(asset.purchaseDate))}</td>
          <td class="${warrantyClass}">${escapeHtml(warrantyLabel(asset))}</td>
          <td>${escapeHtml(asset.vendor || "—")}</td>
          <td>${escapeHtml(asset.status || "—")}</td>
          <td class="asset-declaration-cell">
            <span class="declaration-status-pill ${declaration.className}">${escapeHtml(declaration.label)}</span>
            <div class="asset-actions asset-declaration-actions">
              ${canDownloadDeclaration
                ? `<button class="text-button asset-declaration-download" type="button" data-asset-id="${escapeHtml(asset.id)}">Download declaration</button>`
                : `<span class="muted-text">Assign employee first</span>`}
              ${showActions && canDownloadDeclaration
                ? `<button class="text-button asset-declaration-upload" type="button" data-asset-id="${escapeHtml(asset.id)}">Upload signed</button>`
                : ""}
              ${signedLink}
            </div>
          </td>
          <td>
            <div class="asset-actions">
              <button class="text-button asset-view-button" type="button" data-asset-id="${escapeHtml(asset.id)}">View</button>
              ${showActions ? `
                <button class="text-button asset-edit-button" type="button" data-asset-id="${escapeHtml(asset.id)}">Edit</button>
                <button class="text-button asset-delete-button" type="button" data-asset-id="${escapeHtml(asset.id)}">Delete</button>
              ` : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  assetRows.querySelectorAll(".asset-view-button").forEach((button) => {
    button.addEventListener("click", () => openAssetDetail(button.dataset.assetId));
  });
  assetRows.querySelectorAll(".asset-edit-button").forEach((button) => {
    button.addEventListener("click", () => startAssetEdit(button.dataset.assetId));
  });
  assetRows.querySelectorAll(".asset-delete-button").forEach((button) => {
    button.addEventListener("click", () => deleteAsset(button.dataset.assetId));
  });
  assetRows.querySelectorAll(".asset-declaration-download").forEach((button) => {
    button.addEventListener("click", () => downloadDeclarationForm(button.dataset.assetId));
  });
  assetRows.querySelectorAll(".asset-declaration-upload").forEach((button) => {
    button.addEventListener("click", () => triggerDeclarationUpload(button.dataset.assetId));
  });
}

function updateAssetTableHeader() {
  const headerRow = assetRows?.closest("table")?.querySelector("thead tr")
    || document.querySelector(".asset-table:not(.consumable-table) thead tr");
  if (!headerRow) return;

  if (!headerRow.querySelector(".asset-declaration-col")) {
    const actionHeader = headerRow.querySelector(".asset-actions-col");
    const declarationHeader = '<th class="asset-declaration-col">Declaration</th>';
    if (actionHeader) {
      actionHeader.insertAdjacentHTML("beforebegin", declarationHeader);
    } else {
      headerRow.insertAdjacentHTML("beforeend", declarationHeader);
    }
  }

  const actionHeader = headerRow.querySelector(".asset-actions-col");
  if (!actionHeader) {
    headerRow.insertAdjacentHTML("beforeend", '<th class="asset-actions-col">Actions</th>');
  }
}

function startAssetEdit(assetId) {
  if (!canManageAssets()) {
    alert("You do not have permission to edit IT assets.");
    return;
  }

  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;

  closeAssetDetail();

  if (assetEditId) assetEditId.value = asset.id;
  if (assetCodeField) assetCodeField.value = asset.assetCode;
  if (assetEmployeeId) assetEmployeeId.value = asset.employeeId;
  if (assetEmployeeName) assetEmployeeName.value = asset.employeeName;
  if (assetDepartment) assetDepartment.value = asset.department;
  if (assetTypeField) assetTypeField.value = asset.assetType;
  if (assetDeviceModel) assetDeviceModel.value = asset.deviceModel;
  if (assetSerialImei) assetSerialImei.value = asset.serialImei;
  if (assetStatus) assetStatus.value = asset.status;
  if (assetPurchaseDate) assetPurchaseDate.value = asset.purchaseDate;
  if (assetWarrantyExpiry) assetWarrantyExpiry.value = asset.warrantyExpiry;
  if (assetVendor) assetVendor.value = asset.vendor;
  if (assetLicenseSeats) assetLicenseSeats.value = asset.licenseSeats;
  if (assetLicenseKey) {
    assetLicenseKey.value = "";
    assetLicenseKey.placeholder = asset.licenseKeyLast4
      ? `Stored ••••${asset.licenseKeyLast4} — enter to replace`
      : "Full key (stored securely; table shows last 4 only)";
  }
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
  closeAssetDetail();
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

function openAssetDetail(assetId) {
  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset || !assetDetailModal || !assetDetailBody) return;

  if (assetDetailTitle) {
    assetDetailTitle.textContent = `${asset.assetCode || "Asset"} — ${asset.deviceModel || asset.assetType}`;
  }

  const manage = canManageAssets();
  const history = [...(asset.history || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const handovers = [...(asset.handovers || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const warrantyClass = warrantyBadgeClass(asset);

  assetDetailBody.innerHTML = `
    <div class="asset-detail-grid">
      <div><span class="muted-text">Asset ID</span><strong>${escapeHtml(asset.assetCode || "—")}</strong></div>
      <div><span class="muted-text">Type</span><strong>${escapeHtml(asset.assetType || "—")}</strong></div>
      <div><span class="muted-text">Name / Model</span><strong>${escapeHtml(asset.deviceModel || "—")}</strong></div>
      <div><span class="muted-text">${Assets.isLicense(asset) ? "License ID / Key" : "Serial"}</span><strong>${escapeHtml(Assets.maskSerialDisplay(asset))}</strong></div>
      <div><span class="muted-text">Assigned user</span><strong>${escapeHtml(asset.employeeName || "—")}</strong></div>
      <div><span class="muted-text">Department</span><strong>${escapeHtml(asset.department || "—")}</strong></div>
      <div><span class="muted-text">Purchase</span><strong>${escapeHtml(formatAssetDate(asset.purchaseDate))}</strong></div>
      <div><span class="muted-text">${Assets.isLicense(asset) ? "License expiry" : "Warranty"}</span><strong class="${warrantyClass}">${escapeHtml(warrantyLabel(asset))}</strong></div>
      <div><span class="muted-text">Vendor</span><strong>${escapeHtml(asset.vendor || "—")}</strong></div>
      <div><span class="muted-text">Status</span><strong>${escapeHtml(asset.status || "—")}</strong></div>
      ${Assets.isLicense(asset) ? `<div><span class="muted-text">Seats</span><strong>${escapeHtml(asset.licenseSeats || "—")}</strong></div>` : ""}
      <div class="asset-detail-notes"><span class="muted-text">Notes</span><p>${escapeHtml(asset.notes || "—")}</p></div>
    </div>

    <div class="asset-detail-section">
      <div class="asset-detail-section-head">
        <h3>Declaration Cum Undertaking</h3>
        ${(asset.employeeName || asset.declarationGeneratedAt)
          ? `<button class="secondary-button" type="button" id="assetDetailDownloadDeclaration">Download declaration</button>`
          : ""}
      </div>
      <p><span class="declaration-status-pill ${escapeHtml(declarationStatusInfo(asset).className)}">${escapeHtml(declarationStatusInfo(asset).label)}</span></p>
      ${asset.declarationSignedDriveUrl
        ? `<p><a href="${escapeHtml(asset.declarationSignedDriveUrl)}" target="_blank" rel="noopener">Open signed copy${asset.declarationSignedFileName ? ` (${escapeHtml(asset.declarationSignedFileName)})` : ""}</a></p>`
        : '<p class="muted-text">No signed copy uploaded yet.</p>'}
      ${manage && (asset.employeeName || asset.declarationGeneratedAt)
        ? `<div class="asset-inline-actions"><button class="text-button" type="button" id="assetDetailUploadDeclaration">Upload signed declaration</button></div>`
        : ""}
    </div>

    <div class="asset-detail-section">
      <div class="asset-detail-section-head">
        <h3>Handover / return</h3>
        ${manage && (Assets.isLaptop(asset) || asset.assetType === "Phone" || asset.assetType === "Desktop" || asset.assetType === "Monitor" || asset.assetType === "Other")
          ? `<button class="secondary-button" type="button" id="assetOpenHandoverButton">Record handover / return</button>`
          : ""}
      </div>
      ${handovers.length
        ? `<ul class="asset-history-ul">${handovers.map((h) => `
            <li>
              <strong>${escapeHtml(h.kind)}</strong> · ${escapeHtml(formatAssetDate(h.date))}
              <span class="muted-text"> — ${escapeHtml(h.fromUser || "—")} → ${escapeHtml(h.toUser || "—")}</span>
              ${h.notes ? `<div class="muted-text">${escapeHtml(h.notes)}</div>` : ""}
              <div class="asset-inline-actions">
                <button class="text-button asset-print-handover" type="button" data-handover-id="${escapeHtml(h.id)}">Print / export</button>
              </div>
            </li>`).join("")}</ul>`
        : '<p class="muted-text">No handover or return records yet.</p>'}
    </div>

    <div class="asset-detail-section">
      <div class="asset-detail-section-head">
        <h3>Repair / replacement history</h3>
        ${manage ? '<button class="secondary-button" type="button" id="assetOpenHistoryButton">Add history</button>' : ""}
      </div>
      ${history.length
        ? `<ul class="asset-history-ul">${history.map((h) => `
            <li>
              <strong>${escapeHtml(h.type)}</strong> · ${escapeHtml(formatAssetDate(h.date))}
              <div>${escapeHtml(h.description || "—")}</div>
              <div class="muted-text">${escapeHtml([h.vendor, h.cost].filter(Boolean).join(" · ") || "")}</div>
            </li>`).join("")}</ul>`
        : '<p class="muted-text">No repair or replacement history yet.</p>'}
    </div>

    ${manage ? `<div class="modal-actions asset-detail-actions">
      <button class="secondary-button" type="button" id="assetDetailEditButton">Edit asset</button>
      <button class="secondary-button" type="button" id="assetDetailDeleteButton">Delete</button>
    </div>` : ""}
  `;

  assetDetailModal.hidden = false;

  assetDetailBody.querySelector("#assetOpenHandoverButton")?.addEventListener("click", () => openHandoverModal(asset.id));
  assetDetailBody.querySelector("#assetOpenHistoryButton")?.addEventListener("click", () => openHistoryModal(asset.id));
  assetDetailBody.querySelector("#assetDetailEditButton")?.addEventListener("click", () => startAssetEdit(asset.id));
  assetDetailBody.querySelector("#assetDetailDeleteButton")?.addEventListener("click", () => deleteAsset(asset.id));
  assetDetailBody.querySelector("#assetDetailDownloadDeclaration")?.addEventListener("click", () => downloadDeclarationForm(asset.id));
  assetDetailBody.querySelector("#assetDetailUploadDeclaration")?.addEventListener("click", () => triggerDeclarationUpload(asset.id));
  assetDetailBody.querySelectorAll(".asset-print-handover").forEach((button) => {
    button.addEventListener("click", () => printHandoverReport(asset.id, button.dataset.handoverId));
  });
}

function closeAssetDetail() {
  if (assetDetailModal) assetDetailModal.hidden = true;
}

function openHandoverModal(assetId) {
  if (!canManageAssets()) return;
  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;

  if (assetHandoverAssetId) assetHandoverAssetId.value = asset.id;
  if (assetHandoverKind) assetHandoverKind.value = "Handover";
  if (assetHandoverDate) assetHandoverDate.value = new Date().toISOString().slice(0, 10);
  if (assetHandoverFrom) assetHandoverFrom.value = asset.employeeName || "";
  if (assetHandoverTo) assetHandoverTo.value = "";
  if (assetHandoverNotes) assetHandoverNotes.value = "";
  if (assetHandoverModal) assetHandoverModal.hidden = false;
}

function closeHandoverModal() {
  if (assetHandoverModal) assetHandoverModal.hidden = true;
}

async function saveHandoverFromForm(event) {
  event.preventDefault();
  if (!canManageAssets()) return;

  const assetId = assetHandoverAssetId?.value;
  const assets = Assets.read();
  const index = assets.findIndex((entry) => entry.id === assetId);
  if (index < 0) return;

  const kind = String(assetHandoverKind?.value || "Handover").trim();
  const entry = Assets.normalizeHandoverEntry({
    date: String(assetHandoverDate?.value || "").trim(),
    kind,
    fromUser: String(assetHandoverFrom?.value || "").trim(),
    toUser: String(assetHandoverTo?.value || "").trim(),
    notes: String(assetHandoverNotes?.value || "").trim()
  });

  if (!entry.date) {
    alert("Handover / return date is required.");
    return;
  }

  const previousAssignee = String(assets[index].employeeName || "").trim();
  let asset = { ...assets[index] };
  asset.handovers = [...(asset.handovers || []), entry];

  if (kind === "Handover" && entry.toUser) {
    asset.employeeName = entry.toUser;
    asset.status = "In use";
    if (previousAssignee && previousAssignee !== entry.toUser) {
      asset.declarationSignedFileName = "";
      asset.declarationSignedDriveFileId = "";
      asset.declarationSignedDriveUrl = "";
      asset.declarationSignedUploadedAt = "";
    }
    asset = await ensureDeclarationReady(asset, { force: true });
  }
  if (kind === "Return") {
    if (entry.toUser) asset.employeeName = entry.toUser;
    else asset.employeeName = "";
    asset.status = "Returned";
  }

  assets[index] = Assets.normalize(asset);
  await Assets.write(assets);
  closeHandoverModal();
  renderAssets();
  openAssetDetail(assetId);

  if (confirm("Handover / return saved. Open printable report now?")) {
    printHandoverReport(assetId, entry.id);
  }
}

function printHandoverReport(assetId, handoverId) {
  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;
  const handover = (asset.handovers || []).find((entry) => entry.id === handoverId);
  if (!handover) return;

  const title = `${handover.kind} report — ${asset.assetCode || asset.id}`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Segoe UI, Arial, sans-serif; margin: 32px; color: #0f172a; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { color: #64748b; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { width: 180px; color: #475569; font-weight: 600; }
  .actions { margin-top: 24px; }
  @media print { .actions { display: none; } }
</style></head><body>
  <h1>Tarmal IT — Laptop ${escapeHtml(handover.kind)} Report</h1>
  <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p>
  <table>
    <tr><th>Asset ID</th><td>${escapeHtml(asset.assetCode || "—")}</td></tr>
    <tr><th>Type / Model</th><td>${escapeHtml(asset.assetType)} — ${escapeHtml(asset.deviceModel || "—")}</td></tr>
    <tr><th>Serial</th><td>${escapeHtml(Assets.maskSerialDisplay(asset))}</td></tr>
    <tr><th>Report type</th><td>${escapeHtml(handover.kind)}</td></tr>
    <tr><th>Date</th><td>${escapeHtml(formatAssetDate(handover.date))}</td></tr>
    <tr><th>From</th><td>${escapeHtml(handover.fromUser || "—")}</td></tr>
    <tr><th>To</th><td>${escapeHtml(handover.toUser || "—")}</td></tr>
    <tr><th>Department</th><td>${escapeHtml(asset.department || "—")}</td></tr>
    <tr><th>Vendor</th><td>${escapeHtml(asset.vendor || "—")}</td></tr>
    <tr><th>Notes</th><td>${escapeHtml(handover.notes || "—")}</td></tr>
  </table>
  <div class="actions">
    <button onclick="window.print()">Print</button>
    <button onclick="downloadCsv()">Download CSV</button>
  </div>
  <script>
    function downloadCsv() {
      const rows = [
        ["Field","Value"],
        ["Asset ID",${JSON.stringify(asset.assetCode || "")}],
        ["Type",${JSON.stringify(asset.assetType || "")}],
        ["Model",${JSON.stringify(asset.deviceModel || "")}],
        ["Serial",${JSON.stringify(Assets.maskSerialDisplay(asset))}],
        ["Kind",${JSON.stringify(handover.kind)}],
        ["Date",${JSON.stringify(handover.date)}],
        ["From",${JSON.stringify(handover.fromUser || "")}],
        ["To",${JSON.stringify(handover.toUser || "")}],
        ["Department",${JSON.stringify(asset.department || "")}],
        ["Notes",${JSON.stringify(handover.notes || "")}]
      ];
      const csv = rows.map((r) => r.map((v) => '"' + String(v).replaceAll('"','""') + '"').join(",")).join("\\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ${JSON.stringify(`${(asset.assetCode || "asset").replace(/[^\w-]+/g, "_")}-${handover.kind.toLowerCase()}.csv`)};
      a.click();
    }
  </script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked. Allow pop-ups to print the handover report.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function openHistoryModal(assetId) {
  if (!canManageAssets()) return;
  const asset = Assets.read().find((entry) => entry.id === assetId);
  if (!asset) return;

  if (assetHistoryAssetId) assetHistoryAssetId.value = asset.id;
  if (assetHistoryDate) assetHistoryDate.value = new Date().toISOString().slice(0, 10);
  if (assetHistoryType) assetHistoryType.value = "Repair";
  if (assetHistoryDescription) assetHistoryDescription.value = "";
  if (assetHistoryVendor) assetHistoryVendor.value = "";
  if (assetHistoryCost) assetHistoryCost.value = "";
  renderHistoryList(asset);
  if (assetHistoryModal) assetHistoryModal.hidden = false;
}

function renderHistoryList(asset) {
  if (!assetHistoryList) return;
  const history = [...(asset.history || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!history.length) {
    assetHistoryList.innerHTML = '<p class="muted-text">No history entries yet.</p>';
    return;
  }
  assetHistoryList.innerHTML = `<ul class="asset-history-ul">${history.map((h) => `
    <li><strong>${escapeHtml(h.type)}</strong> · ${escapeHtml(formatAssetDate(h.date))}
      <div>${escapeHtml(h.description || "—")}</div>
      <div class="muted-text">${escapeHtml([h.vendor, h.cost].filter(Boolean).join(" · "))}</div>
    </li>`).join("")}</ul>`;
}

function closeHistoryModal() {
  if (assetHistoryModal) assetHistoryModal.hidden = true;
}

async function saveHistoryFromForm(event) {
  event.preventDefault();
  if (!canManageAssets()) return;

  const assetId = assetHistoryAssetId?.value;
  const assets = Assets.read();
  const index = assets.findIndex((entry) => entry.id === assetId);
  if (index < 0) return;

  const entry = Assets.normalizeHistoryEntry({
    date: String(assetHistoryDate?.value || "").trim(),
    type: String(assetHistoryType?.value || "Repair").trim(),
    description: String(assetHistoryDescription?.value || "").trim(),
    vendor: String(assetHistoryVendor?.value || "").trim(),
    cost: String(assetHistoryCost?.value || "").trim()
  });

  if (!entry.date || !entry.description) {
    alert("Date and description are required.");
    return;
  }

  const asset = { ...assets[index] };
  asset.history = [...(asset.history || []), entry];
  if (entry.type === "Repair") asset.status = "Under repair";
  if (entry.type === "Replacement") asset.status = "In use";

  assets[index] = Assets.normalize(asset);
  await Assets.write(assets);
  renderHistoryList(assets[index]);
  if (assetHistoryDescription) assetHistoryDescription.value = "";
  if (assetHistoryVendor) assetHistoryVendor.value = "";
  if (assetHistoryCost) assetHistoryCost.value = "";
  renderAssets();
  openAssetDetail(assetId);
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
      "AST-LAP-001",
      "EMP-1001",
      "Jane Doe",
      "Finance",
      "Laptop",
      "Dell Latitude 5440",
      "SN-DELL-1001",
      "",
      "",
      "",
      "",
      "",
      "2025-01-15",
      "2028-01-15",
      "Dell",
      "",
      "",
      "In use",
      "Primary laptop",
      "[]",
      "[]"
    ],
    [
      "",
      "AST-LIC-MS365",
      "",
      "",
      "IT",
      "License",
      "Microsoft 365 Business",
      "AGR-MS365-01",
      "",
      "",
      "",
      "",
      "",
      "2025-03-01",
      "2026-03-01",
      "Microsoft",
      "25",
      "7890",
      "In use",
      "Company Microsoft licenses",
      "[]",
      "[]"
    ]
  ];

  downloadAssetCsvFile("tarmal-it-assets-template.csv", headers, sampleRows);
}

function assetToCsvValues(asset, includeId = true) {
  const values = [
    asset.assetCode,
    asset.employeeId,
    asset.employeeName,
    asset.department,
    asset.assetType,
    asset.deviceModel,
    Assets.isLicense(asset) ? (asset.serialImei || `••••${asset.licenseKeyLast4 || ""}`) : asset.serialImei,
    asset.phoneNumber,
    asset.serviceProvider,
    asset.airtimeBalance,
    formatAssetDateForCsv(asset.airtimeValidUntil),
    asset.desktopSpecs,
    formatAssetDateForCsv(asset.purchaseDate),
    formatAssetDateForCsv(asset.warrantyExpiry),
    asset.vendor,
    asset.licenseSeats,
    asset.licenseKeyLast4,
    asset.status,
    asset.notes,
    JSON.stringify(asset.history || []),
    JSON.stringify(asset.handovers || []),
    asset.declarationGeneratedAt || "",
    asset.declarationSignedFileName || "",
    asset.declarationSignedDriveFileId || "",
    asset.declarationSignedDriveUrl || "",
    asset.declarationSignedUploadedAt || ""
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
    assetCode: csvField(headerIndex, values, "Asset ID", "Asset Code"),
    employeeId: csvField(headerIndex, values, "Employee ID", "Emp ID"),
    employeeName: csvField(headerIndex, values, "Employee Name", "Employee", "Assigned user", "Assigned User"),
    department: csvField(headerIndex, values, "Department"),
    assetType: csvField(headerIndex, values, "Asset Type", "Type"),
    deviceModel: csvField(headerIndex, values, "Device Model", "Model", "Name / Model", "Product / SKU"),
    serialImei: csvField(headerIndex, values, "Serial / IMEI", "Serial", "IMEI", "License ID"),
    phoneNumber: csvField(headerIndex, values, "Phone Number", "Phone"),
    serviceProvider: csvField(headerIndex, values, "Service Provider", "Provider"),
    airtimeBalance: csvField(headerIndex, values, "Airtime Balance"),
    airtimeValidUntil: parseAssetDateFromCsv(csvField(headerIndex, values, "Airtime Valid Until", "Valid Until")),
    desktopSpecs: csvField(headerIndex, values, "Desktop Specs"),
    purchaseDate: parseAssetDateFromCsv(csvField(headerIndex, values, "Purchase Date")),
    warrantyExpiry: parseAssetDateFromCsv(csvField(headerIndex, values, "Warranty / Expiry", "Warranty Expiry", "License Expiry", "Expiry")),
    vendor: csvField(headerIndex, values, "Vendor"),
    licenseSeats: csvField(headerIndex, values, "License Seats", "Seats", "Quantity"),
    licenseKeyLast4: csvField(headerIndex, values, "License Key Last4", "License Last4"),
    status: csvField(headerIndex, values, "Status") || "In use",
    notes: csvField(headerIndex, values, "Notes"),
    history: csvField(headerIndex, values, "History JSON", "History"),
    handovers: csvField(headerIndex, values, "Handovers JSON", "Handovers"),
    declarationGeneratedAt: csvField(headerIndex, values, "Declaration Generated At"),
    declarationSignedFileName: csvField(headerIndex, values, "Declaration Signed File Name"),
    declarationSignedDriveFileId: csvField(headerIndex, values, "Declaration Signed Drive File Id"),
    declarationSignedDriveUrl: csvField(headerIndex, values, "Declaration Signed Drive URL"),
    declarationSignedUploadedAt: csvField(headerIndex, values, "Declaration Signed Uploaded At")
  });
}

function validateImportedAsset(asset, rowNumber) {
  if (!asset.assetType || !Assets.TYPES.includes(asset.assetType)) {
    return `Row ${rowNumber}: Asset Type must be one of ${Assets.TYPES.join(", ")}.`;
  }
  if (!asset.deviceModel) {
    return `Row ${rowNumber}: Name / Model is required.`;
  }
  if (asset.assetType === "Phone" && !asset.phoneNumber) {
    return `Row ${rowNumber}: Phone Number is required for Phone assets.`;
  }
  if (asset.assetType === "Phone" && asset.serviceProvider && !Assets.PROVIDERS.includes(asset.serviceProvider)) {
    return `Row ${rowNumber}: Service Provider must be Airtel or Safaricom.`;
  }
  if (asset.status && !Assets.STATUSES.includes(asset.status) && !["Active", "In Repair", "Lost"].includes(asset.status)) {
    return `Row ${rowNumber}: Status must be one of ${Assets.STATUSES.join(", ")}.`;
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
      merged.set(id, {
        ...asset,
        id,
        assetCode: asset.assetCode || Assets.createAssetCode()
      });
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

  if (!asset.assetType) {
    alert("Select an asset type.");
    return;
  }

  if (!Assets.TYPES.includes(asset.assetType)) {
    alert(`Asset type must be one of: ${Assets.TYPES.join(", ")}`);
    return;
  }

  if (!asset.deviceModel) {
    alert("Name / Model is required.");
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

  if (asset.assetType !== "License" && asset.assetType !== "Server" && !asset.employeeName && asset.status === "In use") {
    // Assigned user recommended for in-use hardware, but not hard-required for store items.
  }

  const assets = Assets.read();
  const editIndex = assets.findIndex((entry) => entry.id === asset.id);
  let nextAsset = { ...asset };
  const previousAssignee = editIndex >= 0
    ? String(assets[editIndex].employeeName || "").trim()
    : "";
  const nextAssignee = String(nextAsset.employeeName || "").trim();
  const assigneeChanged = Boolean(nextAssignee) && previousAssignee !== nextAssignee;
  const isNewAsset = editIndex < 0;

  if (editIndex >= 0) {
    const previous = assets[editIndex];
    if (previousAssignee && nextAssignee && previousAssignee !== nextAssignee) {
      nextAsset.declarationSignedFileName = "";
      nextAsset.declarationSignedDriveFileId = "";
      nextAsset.declarationSignedDriveUrl = "";
      nextAsset.declarationSignedUploadedAt = "";
      nextAsset.declarationGeneratedAt = "";
    }
    nextAsset.history = previous.history || [];
    nextAsset.handovers = previous.handovers || [];
  }

  if (nextAsset.employeeName) {
    nextAsset = await ensureDeclarationReady(nextAsset, { force: assigneeChanged });
  }

  if (editIndex >= 0) {
    assets[editIndex] = Assets.normalize(nextAsset);
  } else {
    assets.push(Assets.normalize(nextAsset));
  }

  await Assets.write(assets);
  resetAssetForm();
  renderAssets();
  if (typeof setActiveTab === "function") {
    setActiveTab("asset-list");
  }

  if (nextAssignee && (isNewAsset || assigneeChanged)) {
    if (confirm("Declaration Cum Undertaking is ready. Download / print it now?")) {
      downloadDeclarationForm(nextAsset.id);
    }
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

  document.querySelector("#assetDeclarationUploadFile")?.addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    const assetId = input.dataset.assetId || "";
    input.value = "";
    if (file && assetId) {
      await uploadSignedDeclarationForAsset(assetId, file);
      const detailOpen = assetDetailModal && !assetDetailModal.hidden;
      if (detailOpen) openAssetDetail(assetId);
    }
  });

  [
    assetSearchFilter,
    assetTypeFilter,
    assetStatusFilter,
    assetDepartmentFilter,
    assetUserFilter,
    assetExpiryFilter,
    assetProviderFilter
  ]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", renderAssets));

  closeAssetDetailButton?.addEventListener("click", closeAssetDetail);
  assetDetailModal?.addEventListener("click", (event) => {
    if (event.target === assetDetailModal) closeAssetDetail();
  });

  closeAssetHandoverButton?.addEventListener("click", closeHandoverModal);
  assetHandoverModal?.addEventListener("click", (event) => {
    if (event.target === assetHandoverModal) closeHandoverModal();
  });
  assetHandoverForm?.addEventListener("submit", saveHandoverFromForm);
  document.querySelector("#cancelAssetHandoverButton")?.addEventListener("click", closeHandoverModal);

  closeAssetHistoryButton?.addEventListener("click", closeHistoryModal);
  assetHistoryModal?.addEventListener("click", (event) => {
    if (event.target === assetHistoryModal) closeHistoryModal();
  });
  assetHistoryForm?.addEventListener("submit", saveHistoryFromForm);
  document.querySelector("#cancelAssetHistoryButton")?.addEventListener("click", closeHistoryModal);

  resetAssetForm();
  renderAssets();

  if (Auth.SHEET_WEB_APP_URL && canViewAssets()) {
    refreshAssetsFromSheet();
  }

  initConsumablesModule();
}

/* ========== Consumables inventory (beside IT Assets) ========== */

const Consumables = {
  LOCAL_KEY: "tarmal-it-consumables",
  CATEGORIES: ["Cartridge", "Paper", "Cable", "Barcode ribbon", "Other"],
  MOVE_TYPES: ["Receive", "Issue", "Adjust"],
  // Category → Item ID prefix (seq CRT-001…): Cartridge→CRT, Paper→PPR, Cable→CBL, Barcode ribbon→BRB, Other→OTH.
  CATEGORY_PREFIXES: {
    Cartridge: "CRT",
    Paper: "PPR",
    Cable: "CBL",
    "Barcode ribbon": "BRB",
    Other: "OTH"
  },

  read() {
    const saved = localStorage.getItem(this.LOCAL_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((item) => this.withBalances(item));
    } catch {
      return [];
    }
  },

  save(items) {
    const normalized = items.map((item) => this.withBalances(item));
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(normalized));
    return normalized;
  },

  parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  },

  normalizeMovement(entry) {
    const type = String(entry?.type || "Issue").trim();
    return {
      id: String(entry?.id || `cmov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      date: String(entry?.date || "").trim(),
      type: this.MOVE_TYPES.includes(type) ? type : "Issue",
      quantity: Number(entry?.quantity) || 0,
      issuedBy: String(entry?.issuedBy || "").trim(),
      department: String(entry?.department || "").trim(),
      relatedAsset: String(entry?.relatedAsset || "").trim(),
      notes: String(entry?.notes || "").trim(),
      balanceAfter: entry?.balanceAfter === "" || entry?.balanceAfter === null || entry?.balanceAfter === undefined
        ? null
        : Number(entry.balanceAfter),
      createdAt: String(entry?.createdAt || new Date().toISOString())
    };
  },

  resolveOpeningStock(item, movements = []) {
    const hasOpening = !(item?.openingStock === "" || item?.openingStock === null || item?.openingStock === undefined);
    if (hasOpening) {
      return Math.max(0, Number(item.openingStock) || 0);
    }

    const current = item?.currentStock === "" || item?.currentStock === null || item?.currentStock === undefined
      ? null
      : Number(item.currentStock) || 0;
    if (!movements.length) {
      return Math.max(0, current || 0);
    }
    if (current === null) return 0;

    // Migrate legacy rows. Clamp so a stale currentStock=0 after Receive cannot invent a
    // negative opening that cancels the movement (the Receive-left-stock-at-0 bug).
    const net = movements.reduce((sum, move) => sum + this.signedDelta(move.type, move.quantity), 0);
    return Math.max(0, current - net);
  },

  normalize(item) {
    const category = String(item.category || "").trim();
    const movements = this.parseJsonArray(item.movements).map((entry) => this.normalizeMovement(entry));
    const openingStock = this.resolveOpeningStock(item, movements);
    const movementCopies = movements.map((move) => ({ ...move }));
    const currentStock = this.recomputeStock(openingStock, movementCopies);

    return {
      id: String(item.id || ""),
      itemCode: String(item.itemCode || "").trim(),
      name: String(item.name || "").trim(),
      category: this.CATEGORIES.includes(category) ? category : (category || "Other"),
      unit: String(item.unit || "pcs").trim() || "pcs",
      reorderLevel: Math.max(0, Number(item.reorderLevel) || 0),
      openingStock,
      currentStock,
      vendor: String(item.vendor || "").trim(),
      notes: String(item.notes || "").trim(),
      movements: movementCopies
    };
  },

  createId() {
    return `cns-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  },

  prefixForCategory(category) {
    const key = String(category || "").trim();
    return this.CATEGORY_PREFIXES[key] || this.CATEGORY_PREFIXES.Other;
  },

  createItemCode(category = "Other", items = null, excludeId = "") {
    const prefix = this.prefixForCategory(category);
    const list = items || this.read();
    const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
    let max = 0;
    list.forEach((item) => {
      if (excludeId && item.id === excludeId) return;
      const match = String(item.itemCode || "").trim().match(pattern);
      if (match) max = Math.max(max, Number.parseInt(match[1], 10) || 0);
    });
    return `${prefix}-${String(max + 1).padStart(3, "0")}`;
  },

  signedDelta(type, quantity) {
    const qty = Math.abs(Number(quantity) || 0);
    if (type === "Receive") return qty;
    if (type === "Issue") return -qty;
    return Number(quantity) || 0;
  },

  recomputeStock(opening, movements) {
    let stock = Number(opening) || 0;
    const ordered = [...(movements || [])].sort((a, b) => {
      const dateCmp = String(a.date).localeCompare(String(b.date));
      if (dateCmp !== 0) return dateCmp;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
    ordered.forEach((move) => {
      stock += this.signedDelta(move.type, move.quantity);
      move.balanceAfter = stock;
    });
    return stock;
  },

  withBalances(item) {
    if (!item) return null;
    const normalized = this.normalize(item);
    const movements = normalized.movements.map((move) => ({ ...move }));
    const stock = this.recomputeStock(normalized.openingStock, movements);
    return {
      ...normalized,
      movements,
      currentStock: stock
    };
  },

  averageMonthlyIssue(item) {
    const issues = (item.movements || []).filter((move) => move.type === "Issue" && move.quantity);
    if (!issues.length) return 0;

    const dates = issues
      .map((move) => new Date(move.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    if (!dates.length) return 0;

    const first = dates[0];
    const last = new Date();
    last.setHours(0, 0, 0, 0);
    first.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.ceil((last - first) / 86400000) + 1);
    const total = issues.reduce((sum, move) => sum + Math.abs(Number(move.quantity) || 0), 0);
    return (total / days) * 30;
  },

  averageDailyIssue(item) {
    return this.averageMonthlyIssue(item) / 30;
  },

  daysOfCover(item) {
    const daily = this.averageDailyIssue(item);
    if (!daily || daily <= 0) return null;
    return (Number(item.currentStock) || 0) / daily;
  },

  isLowStock(item) {
    const reorder = Number(item.reorderLevel) || 0;
    if (reorder <= 0) return false;
    return (Number(item.currentStock) || 0) <= reorder;
  },

  lowStockItems(items = null) {
    const list = (items || this.read()).map((item) => this.withBalances(item));
    return list.filter((item) => this.isLowStock(item));
  },

  loadFromSheet() {
    return new Promise((resolve, reject) => {
      const url = Auth.SHEET_WEB_APP_URL;
      if (!url) {
        reject(new Error("Sheet endpoint is not configured."));
        return;
      }

      const localItems = this.read();
      const callbackName = `handleSheetConsumables_${Date.now()}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = async (payload) => {
        cleanup();
        if (!payload || payload.ok === false) {
          reject(new Error(payload?.error || "Could not load consumables."));
          return;
        }

        const remote = (payload.consumables || []).map((item) => this.withBalances(item));
        const merged = this.merge(localItems, remote);
        this.save(merged);
        if (typeof updateGlobalConsumableLowStockWarning === "function") {
          updateGlobalConsumableLowStockWarning(merged);
        }

        if (canManageConsumables() && (!remote.length || merged.length > remote.length)) {
          await this.syncToSheet(merged);
        }

        resolve(merged);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Could not load consumables."));
      };

      script.src = `${url}${separator}resource=consumables&callback=${callbackName}`;
      document.body.appendChild(script);
    });
  },

  merge(localItems, remoteItems) {
    const merged = new Map();
    remoteItems.forEach((item) => merged.set(item.id, this.normalize(item)));
    localItems.forEach((item) => {
      const local = this.normalize(item);
      if (!merged.has(local.id)) merged.set(local.id, local);
    });
    return [...merged.values()].map((item) => this.withBalances(item));
  },

  async syncToSheet(items) {
    const url = Auth.SHEET_WEB_APP_URL;
    if (!url || !canManageConsumables()) return { synced: false };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "syncConsumables",
        consumables: items.map((item) => this.withBalances(item))
      })
    });

    return { synced: true };
  },

  async write(items) {
    const normalized = this.save(items.map((item) => this.withBalances(item)));
    if (typeof updateGlobalConsumableLowStockWarning === "function") {
      updateGlobalConsumableLowStockWarning(normalized);
    }
    try {
      await this.syncToSheet(normalized);
    } catch (error) {
      console.error("Consumables sync failed", error);
    }
    return normalized;
  }
};

let consumableRows;
let consumableSearchFilter;
let consumableCategoryFilter;
let consumableStockFilter;
let consumableIssuerFilter;
let consumableHistoryFrom;
let consumableHistoryTo;
let consumableFilterSummary;
let consumableLowStockBadge;
let refreshConsumablesButton;
let exportConsumablesButton;
let openConsumableFormButton;
let consumableFormModal;
let consumableForm;
let consumableFormTitle;
let consumableEditId;
let consumableItemCode;
let consumableCategory;
let consumableName;
let consumableUnit;
let consumableReorderLevel;
let consumableOpeningStock;
let consumableOpeningStockHint;
let consumableVendor;
let consumableNotes;
let closeConsumableFormButton;
let consumableDetailModal;
let consumableDetailTitle;
let consumableDetailBody;
let closeConsumableDetailButton;
let consumableMoveModal;
let consumableMoveForm;
let consumableMoveItemId;
let consumableMoveEditId;
let consumableMoveType;
let consumableMoveDate;
let consumableMoveQty;
let consumableMoveIssuedBy;
let consumableMoveDepartment;
let consumableMoveRelatedAsset;
let consumableMoveNotes;
let closeConsumableMoveButton;
let consumableLowStockWarning;
let consumableLowStockWarningCompact;
/** True while Item ID is still auto-managed (blank or last filled from category). */
let consumableItemCodeAuto = true;

function bindConsumableElements() {
  consumableRows = document.querySelector("#consumableRows");
  consumableSearchFilter = document.querySelector("#consumableSearchFilter");
  consumableCategoryFilter = document.querySelector("#consumableCategoryFilter");
  consumableStockFilter = document.querySelector("#consumableStockFilter");
  consumableIssuerFilter = document.querySelector("#consumableIssuerFilter");
  consumableHistoryFrom = document.querySelector("#consumableHistoryFrom");
  consumableHistoryTo = document.querySelector("#consumableHistoryTo");
  consumableFilterSummary = document.querySelector("#consumableFilterSummary");
  consumableLowStockBadge = document.querySelector("#consumableLowStockBadge");
  refreshConsumablesButton = document.querySelector("#refreshConsumablesButton");
  exportConsumablesButton = document.querySelector("#exportConsumablesButton");
  openConsumableFormButton = document.querySelector("#openConsumableFormButton");
  consumableFormModal = document.querySelector("#consumableFormModal");
  consumableForm = document.querySelector("#consumableForm");
  consumableFormTitle = document.querySelector("#consumableFormTitle");
  consumableEditId = document.querySelector("#consumableEditId");
  consumableItemCode = document.querySelector("#consumableItemCode");
  consumableCategory = document.querySelector("#consumableCategory");
  consumableName = document.querySelector("#consumableName");
  consumableUnit = document.querySelector("#consumableUnit");
  consumableReorderLevel = document.querySelector("#consumableReorderLevel");
  consumableOpeningStock = document.querySelector("#consumableOpeningStock");
  consumableOpeningStockHint = document.querySelector("#consumableOpeningStockHint");
  consumableVendor = document.querySelector("#consumableVendor");
  consumableNotes = document.querySelector("#consumableNotes");
  closeConsumableFormButton = document.querySelector("#closeConsumableFormButton");
  consumableDetailModal = document.querySelector("#consumableDetailModal");
  consumableDetailTitle = document.querySelector("#consumableDetailTitle");
  consumableDetailBody = document.querySelector("#consumableDetailBody");
  closeConsumableDetailButton = document.querySelector("#closeConsumableDetailButton");
  consumableMoveModal = document.querySelector("#consumableMoveModal");
  consumableMoveForm = document.querySelector("#consumableMoveForm");
  consumableMoveItemId = document.querySelector("#consumableMoveItemId");
  consumableMoveEditId = document.querySelector("#consumableMoveEditId");
  consumableMoveType = document.querySelector("#consumableMoveType");
  consumableMoveDate = document.querySelector("#consumableMoveDate");
  consumableMoveQty = document.querySelector("#consumableMoveQty");
  consumableMoveIssuedBy = document.querySelector("#consumableMoveIssuedBy");
  consumableMoveDepartment = document.querySelector("#consumableMoveDepartment");
  consumableMoveRelatedAsset = document.querySelector("#consumableMoveRelatedAsset");
  consumableMoveNotes = document.querySelector("#consumableMoveNotes");
  closeConsumableMoveButton = document.querySelector("#closeConsumableMoveButton");
  consumableLowStockWarning = document.querySelector("#consumableLowStockWarning");
  consumableLowStockWarningCompact = document.querySelector("#consumableLowStockWarningCompact");
}

function formatConsumableNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return Number.isInteger(num) ? String(num) : num.toFixed(digits);
}

function getConsumableIssuerNames() {
  if (typeof getAllHierarchyUsers === "function") {
    return [...getAllHierarchyUsers()].sort((a, b) => String(a).localeCompare(String(b)));
  }
  if (typeof getVisibleOwnerNames === "function") {
    return [...getVisibleOwnerNames()];
  }
  if (typeof DEFAULT_TICKET_OWNERS !== "undefined" && Array.isArray(DEFAULT_TICKET_OWNERS)) {
    return [...DEFAULT_TICKET_OWNERS].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }
  return [];
}

function resolveConsumableIssuerDefault(names) {
  const list = Array.isArray(names) ? names : [];
  const current = currentPortalUserName();
  if (!current || !list.length) return "";
  if (typeof matchesHierarchyIdentity === "function") {
    const match = list.find((name) => matchesHierarchyIdentity(current, name));
    if (match) return match;
  }
  const lower = current.toLowerCase();
  return list.find((name) => String(name).toLowerCase() === lower) || "";
}

function populateConsumableIssuerFilter() {
  if (!consumableIssuerFilter) return;
  const current = consumableIssuerFilter.value;
  const issuers = getConsumableIssuerNames();
  consumableIssuerFilter.innerHTML = '<option value="">Anyone</option>'
    + issuers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  consumableIssuerFilter.value = issuers.includes(current) ? current : "";
}

function populateConsumableMoveIssuedBy(selected = "") {
  if (!consumableMoveIssuedBy) return;
  const issuers = getConsumableIssuerNames();
  const preferred = String(selected || "").trim();
  const defaultName = preferred && issuers.includes(preferred)
    ? preferred
    : resolveConsumableIssuerDefault(issuers);
  consumableMoveIssuedBy.innerHTML = '<option value="">Select user</option>'
    + issuers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  consumableMoveIssuedBy.value = issuers.includes(defaultName) ? defaultName : "";
}

function filterConsumableMovements(movements) {
  const issuer = String(consumableIssuerFilter?.value || "").trim();
  const from = String(consumableHistoryFrom?.value || "").trim();
  const to = String(consumableHistoryTo?.value || "").trim();

  return (movements || []).filter((move) => {
    if (issuer && move.issuedBy !== issuer) return false;
    if (from && String(move.date) < from) return false;
    if (to && String(move.date) > to) return false;
    return true;
  });
}

function applyConsumableFilters(items) {
  const search = String(consumableSearchFilter?.value || "").trim().toLowerCase();
  const category = String(consumableCategoryFilter?.value || "").trim();
  const stock = String(consumableStockFilter?.value || "").trim();
  const issuer = String(consumableIssuerFilter?.value || "").trim();
  const from = String(consumableHistoryFrom?.value || "").trim();
  const to = String(consumableHistoryTo?.value || "").trim();

  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (stock === "low" && !Consumables.isLowStock(item)) return false;
    if (issuer || from || to) {
      if (!filterConsumableMovements(item.movements).length) return false;
    }
    if (!search) return true;
    const haystack = [
      item.itemCode,
      item.name,
      item.category,
      item.unit,
      item.vendor,
      item.notes
    ].join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

function updateConsumableLowStockBadge(items) {
  if (!consumableLowStockBadge) return;
  const low = items.filter((item) => Consumables.isLowStock(item)).length;
  if (!low) {
    consumableLowStockBadge.hidden = true;
    consumableLowStockBadge.textContent = "";
    return;
  }
  consumableLowStockBadge.hidden = false;
  consumableLowStockBadge.textContent = `${low} low stock`;
}

function hideGlobalConsumableLowStockWarning(targets) {
  targets.forEach((el) => {
    el.hidden = true;
    el.style.display = "none";
    el.textContent = "";
    el.removeAttribute("title");
    el.setAttribute("aria-hidden", "true");
  });
}

function updateGlobalConsumableLowStockWarning(items = null) {
  const buttons = [consumableLowStockWarning, consumableLowStockWarningCompact].filter(Boolean);
  if (!buttons.length) {
    consumableLowStockWarning = document.querySelector("#consumableLowStockWarning");
    consumableLowStockWarningCompact = document.querySelector("#consumableLowStockWarningCompact");
  }
  const targets = [consumableLowStockWarning, consumableLowStockWarningCompact].filter(Boolean);
  if (!targets.length) return;

  if (!canViewConsumables()) {
    hideGlobalConsumableLowStockWarning(targets);
    return;
  }

  const lowItems = Consumables.lowStockItems(items);
  if (!lowItems.length) {
    hideGlobalConsumableLowStockWarning(targets);
    return;
  }

  const names = lowItems
    .slice(0, 3)
    .map((item) => item.itemCode || item.name || "Item")
    .join(", ");
  const more = lowItems.length > 3 ? ` +${lowItems.length - 3} more` : "";
  const label = lowItems.length === 1
    ? `Low stock: ${names}`
    : `Low stock: ${lowItems.length} items (${names}${more})`;
  const title = lowItems
    .map((item) => `${item.itemCode || "—"} ${item.name || ""} (${item.currentStock}/${item.reorderLevel})`)
    .join(" · ");

  targets.forEach((el) => {
    el.hidden = false;
    el.style.display = "";
    el.removeAttribute("aria-hidden");
    el.textContent = label;
    el.title = title;
  });
}

function openConsumablesLowStockFromWarning() {
  if (!canViewConsumables()) return;
  if (typeof setActiveTab === "function") {
    setActiveTab("consumables");
  } else {
    document.querySelector('.tab-button[data-tab="consumables"]')?.click();
  }
  if (consumableStockFilter) {
    consumableStockFilter.value = "low";
  }
  renderConsumables();
}

function renderConsumables() {
  if (!consumableRows) return;

  if (!canViewConsumables()) {
    consumableRows.innerHTML = '<tr class="empty-row"><td colspan="10">You do not have permission to view consumables.</td></tr>';
    updateGlobalConsumableLowStockWarning([]);
    return;
  }

  const allItems = Consumables.read().map((item) => Consumables.withBalances(item));
  populateConsumableIssuerFilter();
  updateConsumableLowStockBadge(allItems);
  updateGlobalConsumableLowStockWarning(allItems);

  const items = applyConsumableFilters(allItems);
  const manage = canManageConsumables();
  const readonlyNote = document.querySelector("#consumablesReadonlyNote");
  if (readonlyNote) readonlyNote.hidden = manage;

  if (consumableFilterSummary) {
    consumableFilterSummary.textContent = `${items.length} item${items.length === 1 ? "" : "s"} listed`;
  }

  if (!items.length) {
    consumableRows.innerHTML = '<tr class="empty-row"><td colspan="10">No consumables match the current filters.</td></tr>';
    return;
  }

  consumableRows.innerHTML = items.map((item) => {
    const avg = Consumables.averageMonthlyIssue(item);
    const cover = Consumables.daysOfCover(item);
    const lowClass = Consumables.isLowStock(item) ? "consumable-low-stock" : "";

    return `
      <tr class="asset-row ${lowClass}">
        <td>${escapeHtml(item.itemCode || "—")}</td>
        <td>${escapeHtml(item.name || "—")}</td>
        <td><span class="asset-type-pill">${escapeHtml(item.category || "—")}</span></td>
        <td>${escapeHtml(item.unit || "—")}</td>
        <td class="${lowClass}"><strong>${escapeHtml(formatConsumableNumber(item.currentStock, 0))}</strong></td>
        <td>${escapeHtml(formatConsumableNumber(item.reorderLevel, 0))}</td>
        <td>${escapeHtml(formatConsumableNumber(avg, 1))}</td>
        <td>${cover === null ? "—" : escapeHtml(formatConsumableNumber(cover, 0))}</td>
        <td>${escapeHtml(item.vendor || "—")}</td>
        <td class="asset-actions">
          <button class="text-button consumable-view-button" type="button" data-item-id="${escapeHtml(item.id)}">View</button>
          ${manage ? `
            <button class="text-button consumable-move-button" type="button" data-item-id="${escapeHtml(item.id)}">Stock</button>
            <button class="text-button consumable-edit-button" type="button" data-item-id="${escapeHtml(item.id)}">Edit</button>
            <button class="text-button consumable-delete-button" type="button" data-item-id="${escapeHtml(item.id)}">Delete</button>
          ` : ""}
        </td>
      </tr>
    `;
  }).join("");

  consumableRows.querySelectorAll(".consumable-view-button").forEach((button) => {
    button.addEventListener("click", () => openConsumableDetail(button.dataset.itemId));
  });
  consumableRows.querySelectorAll(".consumable-move-button").forEach((button) => {
    button.addEventListener("click", () => openConsumableMoveModal(button.dataset.itemId));
  });
  consumableRows.querySelectorAll(".consumable-edit-button").forEach((button) => {
    button.addEventListener("click", () => openConsumableForm(button.dataset.itemId));
  });
  consumableRows.querySelectorAll(".consumable-delete-button").forEach((button) => {
    button.addEventListener("click", () => deleteConsumable(button.dataset.itemId));
  });
}

function isEditingConsumable() {
  return Boolean(String(consumableEditId?.value || "").trim());
}

function applyAutoConsumableItemCode() {
  if (!consumableItemCode || isEditingConsumable() || !consumableItemCodeAuto) return;
  const category = String(consumableCategory?.value || "").trim();
  if (!category) {
    consumableItemCode.value = "";
    return;
  }
  consumableItemCode.value = Consumables.createItemCode(category);
}

function openConsumableForm(itemId = "") {
  if (!canManageConsumables()) {
    alert("You do not have permission to manage consumables.");
    return;
  }

  const existing = itemId
    ? Consumables.withBalances(Consumables.read().find((entry) => entry.id === itemId) || null)
    : null;

  if (consumableEditId) consumableEditId.value = existing?.id || "";
  consumableItemCodeAuto = !existing;
  if (consumableItemCode) {
    consumableItemCode.value = existing?.itemCode || "";
    consumableItemCode.placeholder = "Auto from category (e.g. CRT-001, PPR-001)";
  }
  if (consumableCategory) consumableCategory.value = existing?.category || "";
  if (consumableName) consumableName.value = existing?.name || "";
  if (consumableUnit) consumableUnit.value = existing?.unit || "pcs";
  if (consumableReorderLevel) consumableReorderLevel.value = existing ? existing.reorderLevel : 0;
  if (consumableOpeningStock) {
    consumableOpeningStock.value = existing ? (Number(existing.openingStock) || 0) : 0;
    consumableOpeningStock.disabled = Boolean(existing && (existing.movements || []).length);
  }
  if (consumableOpeningStockHint) {
    consumableOpeningStockHint.textContent = existing && (existing.movements || []).length
      ? "Opening stock is locked after movements. Current stock = opening + receives − issues ± adjusts."
      : "Used as starting stock for new items. Current stock = opening + movement history.";
  }
  if (consumableVendor) consumableVendor.value = existing?.vendor || "";
  if (consumableNotes) consumableNotes.value = existing?.notes || "";
  if (consumableFormTitle) consumableFormTitle.textContent = existing ? "Edit consumable" : "Add consumable";
  if (!existing) applyAutoConsumableItemCode();
  if (consumableFormModal) consumableFormModal.hidden = false;
}

function closeConsumableForm() {
  if (consumableFormModal) consumableFormModal.hidden = true;
}

async function saveConsumableFromForm(event) {
  event.preventDefault();
  if (!canManageConsumables()) return;

  const existingId = consumableEditId?.value || "";
  const items = Consumables.read();
  const index = items.findIndex((entry) => entry.id === existingId);
  const existing = index >= 0 ? Consumables.withBalances(items[index]) : null;

  const category = String(consumableCategory?.value || "").trim();
  const name = String(consumableName?.value || "").trim();
  const unit = String(consumableUnit?.value || "").trim();
  if (!category || !name || !unit) {
    alert("Category, name, and unit are required.");
    return;
  }

  const openingInput = Number(consumableOpeningStock?.value);
  const openingStock = existing && (existing.movements || []).length
    ? (Number(existing.openingStock) || 0)
    : (Number.isFinite(openingInput) ? Math.max(0, openingInput) : 0);
  const typedCode = String(consumableItemCode?.value || "").trim();
  let item = {
    id: existing?.id || Consumables.createId(),
    itemCode: typedCode || existing?.itemCode || Consumables.createItemCode(category, items, existing?.id || ""),
    name,
    category,
    unit,
    reorderLevel: Math.max(0, Number(consumableReorderLevel?.value) || 0),
    openingStock,
    currentStock: openingStock,
    vendor: String(consumableVendor?.value || "").trim(),
    notes: String(consumableNotes?.value || "").trim(),
    movements: existing?.movements || []
  };

  // New item with opening stock > 0: seed an Adjust movement for history (opening stays 0).
  if (!existing && openingStock > 0 && !(item.movements || []).length) {
    item.openingStock = 0;
    item.movements = [Consumables.normalizeMovement({
      date: new Date().toISOString().slice(0, 10),
      type: "Adjust",
      quantity: openingStock,
      issuedBy: currentPortalUserName() || "System",
      notes: "Opening stock",
      balanceAfter: openingStock
    })];
  }

  item = Consumables.withBalances(item);

  if (index >= 0) items[index] = item;
  else items.push(item);

  await Consumables.write(items);
  closeConsumableForm();
  renderConsumables();
}

async function deleteConsumable(itemId) {
  if (!canManageConsumables()) return;
  if (!confirm("Delete this consumable and its movement history?")) return;
  const remaining = Consumables.read().filter((item) => item.id !== itemId);
  await Consumables.write(remaining);
  closeConsumableDetail();
  renderConsumables();
}

function openConsumableDetail(itemId) {
  const item = Consumables.withBalances(
    Consumables.read().find((entry) => entry.id === itemId) || null
  );
  if (!item || !consumableDetailModal || !consumableDetailBody) return;

  if (consumableDetailTitle) {
    consumableDetailTitle.textContent = `${item.itemCode || "Item"} — ${item.name}`;
  }

  const manage = canManageConsumables();
  const editHistory = canEditConsumableHistory();
  const avg = Consumables.averageMonthlyIssue(item);
  const cover = Consumables.daysOfCover(item);
  const history = filterConsumableMovements(item.movements)
    .slice()
    .sort((a, b) => {
      const dateCmp = String(b.date).localeCompare(String(a.date));
      if (dateCmp !== 0) return dateCmp;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

  consumableDetailBody.dataset.openItem = item.id;
  consumableDetailBody.innerHTML = `
    <div class="asset-detail-grid">
      <div><span class="muted-text">Item ID</span><strong>${escapeHtml(item.itemCode || "—")}</strong></div>
      <div><span class="muted-text">Category</span><strong>${escapeHtml(item.category || "—")}</strong></div>
      <div><span class="muted-text">Unit</span><strong>${escapeHtml(item.unit || "—")}</strong></div>
      <div><span class="muted-text">Current stock</span><strong class="${Consumables.isLowStock(item) ? "consumable-low-stock" : ""}">${escapeHtml(formatConsumableNumber(item.currentStock, 0))}</strong></div>
      <div><span class="muted-text">Reorder level</span><strong>${escapeHtml(formatConsumableNumber(item.reorderLevel, 0))}</strong></div>
      <div><span class="muted-text">Avg issue / 30 days</span><strong>${escapeHtml(formatConsumableNumber(avg, 1))}</strong></div>
      <div><span class="muted-text">Days of cover</span><strong>${cover === null ? "—" : escapeHtml(formatConsumableNumber(cover, 0))}</strong></div>
      <div><span class="muted-text">Vendor</span><strong>${escapeHtml(item.vendor || "—")}</strong></div>
      <div class="asset-detail-notes"><span class="muted-text">Notes</span><p>${escapeHtml(item.notes || "—")}</p></div>
    </div>

    <div class="asset-detail-section">
      <div class="asset-detail-section-head">
        <h3>Inventory level history</h3>
        ${manage ? `<button class="secondary-button" type="button" id="consumableDetailMoveButton">Record movement</button>` : ""}
      </div>
      ${history.length
        ? `<div class="table-wrap consumable-history-wrap"><table class="asset-table consumable-history-table">
            <thead><tr>
              <th>Date</th><th>Type</th><th>Qty</th><th>Balance</th><th>Who</th><th>Dept / recipient</th><th>Asset</th><th>Notes</th>
              ${editHistory ? "<th>Actions</th>" : ""}
            </tr></thead>
            <tbody>${history.map((move) => `
              <tr>
                <td>${escapeHtml(formatAssetDate(move.date))}</td>
                <td>${escapeHtml(move.type)}</td>
                <td>${escapeHtml(formatConsumableNumber(move.quantity, 0))}</td>
                <td>${move.balanceAfter === null || move.balanceAfter === undefined ? "—" : escapeHtml(formatConsumableNumber(move.balanceAfter, 0))}</td>
                <td>${escapeHtml(move.issuedBy || "—")}</td>
                <td>${escapeHtml(move.department || "—")}</td>
                <td>${escapeHtml(move.relatedAsset || "—")}</td>
                <td>${escapeHtml(move.notes || "—")}</td>
                ${editHistory ? `<td class="asset-actions">
                  <button class="text-button consumable-history-edit" type="button" data-move-id="${escapeHtml(move.id)}">Edit</button>
                  <button class="text-button consumable-history-delete" type="button" data-move-id="${escapeHtml(move.id)}">Delete</button>
                </td>` : ""}
              </tr>`).join("")}</tbody>
          </table></div>`
        : '<p class="muted-text">No movements in the selected date / issuer filters.</p>'}
    </div>

    ${manage ? `<div class="modal-actions asset-detail-actions">
      <button class="secondary-button" type="button" id="consumableDetailEditButton">Edit item</button>
      <button class="secondary-button" type="button" id="consumableDetailDeleteButton">Delete</button>
    </div>` : ""}
  `;

  consumableDetailModal.hidden = false;
  consumableDetailBody.querySelector("#consumableDetailMoveButton")?.addEventListener("click", () => openConsumableMoveModal(item.id));
  consumableDetailBody.querySelector("#consumableDetailEditButton")?.addEventListener("click", () => openConsumableForm(item.id));
  consumableDetailBody.querySelector("#consumableDetailDeleteButton")?.addEventListener("click", () => deleteConsumable(item.id));
  consumableDetailBody.querySelectorAll(".consumable-history-edit").forEach((button) => {
    button.addEventListener("click", () => openConsumableMoveModal(item.id, button.dataset.moveId));
  });
  consumableDetailBody.querySelectorAll(".consumable-history-delete").forEach((button) => {
    button.addEventListener("click", () => deleteConsumableMovement(item.id, button.dataset.moveId));
  });
}

function closeConsumableDetail() {
  if (consumableDetailModal) consumableDetailModal.hidden = true;
}

function fillRelatedAssetOptions() {
  if (!consumableMoveRelatedAsset) return;
  const current = consumableMoveRelatedAsset.value;
  const assets = typeof Assets !== "undefined" ? Assets.read() : [];
  const options = assets
    .map((asset) => ({
      value: asset.assetCode || asset.id,
      label: `${asset.assetCode || asset.id} — ${asset.deviceModel || asset.assetType || "Asset"}`
    }))
    .filter((entry) => entry.value)
    .sort((a, b) => a.label.localeCompare(b.label));

  consumableMoveRelatedAsset.innerHTML = '<option value="">None</option>'
    + options.map((entry) => `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`).join("");
  if ([...consumableMoveRelatedAsset.options].some((opt) => opt.value === current)) {
    consumableMoveRelatedAsset.value = current;
  }
}

function openConsumableMoveModal(itemId, moveId = "") {
  const editing = Boolean(String(moveId || "").trim());
  if (editing ? !canEditConsumableHistory() : !canManageConsumables()) {
    alert(editing
      ? "You do not have permission to edit consumable history."
      : "You do not have permission to record stock movements.");
    return;
  }

  const item = Consumables.withBalances(Consumables.read().find((entry) => entry.id === itemId) || null);
  if (!item) return;

  const existingMove = editing
    ? (item.movements || []).find((move) => move.id === moveId)
    : null;
  if (editing && !existingMove) {
    alert("That movement could not be found.");
    return;
  }

  if (consumableMoveItemId) consumableMoveItemId.value = item.id;
  if (consumableMoveEditId) consumableMoveEditId.value = existingMove?.id || "";
  if (consumableMoveType) consumableMoveType.value = existingMove?.type || "Receive";
  if (consumableMoveDate) {
    consumableMoveDate.value = existingMove?.date || new Date().toISOString().slice(0, 10);
  }
  if (consumableMoveQty) {
    consumableMoveQty.value = existingMove
      ? String(existingMove.quantity)
      : "1";
  }
  populateConsumableMoveIssuedBy(existingMove?.issuedBy || currentPortalUserName());
  if (consumableMoveDepartment) consumableMoveDepartment.value = existingMove?.department || "";
  if (consumableMoveNotes) consumableMoveNotes.value = existingMove?.notes || "";
  fillRelatedAssetOptions();
  if (consumableMoveRelatedAsset) {
    consumableMoveRelatedAsset.value = existingMove?.relatedAsset || "";
  }
  const title = document.querySelector("#consumableMoveTitle");
  if (title) title.textContent = existingMove ? "Edit stock movement" : "Receive / Issue / Adjust";
  if (consumableMoveModal) consumableMoveModal.hidden = false;
}

function closeConsumableMoveModal() {
  if (consumableMoveModal) consumableMoveModal.hidden = true;
  if (consumableMoveEditId) consumableMoveEditId.value = "";
  const title = document.querySelector("#consumableMoveTitle");
  if (title) title.textContent = "Receive / Issue / Adjust";
}

async function deleteConsumableMovement(itemId, moveId) {
  if (!canEditConsumableHistory()) {
    alert("You do not have permission to edit consumable history.");
    return;
  }
  if (!confirm("Delete this stock movement? Balances and current stock will be recalculated.")) return;

  const items = Consumables.read();
  const index = items.findIndex((entry) => entry.id === itemId);
  if (index < 0) return;

  const item = Consumables.withBalances(items[index]);
  item.movements = (item.movements || []).filter((move) => move.id !== moveId);
  items[index] = Consumables.withBalances(item);
  await Consumables.write(items);
  renderConsumables();
  openConsumableDetail(itemId);
}

async function saveConsumableMoveFromForm(event) {
  event.preventDefault();

  const itemId = consumableMoveItemId?.value;
  const editMoveId = String(consumableMoveEditId?.value || "").trim();
  const editing = Boolean(editMoveId);
  if (editing ? !canEditConsumableHistory() : !canManageConsumables()) return;

  const items = Consumables.read();
  const index = items.findIndex((entry) => entry.id === itemId);
  if (index < 0) return;

  const type = String(consumableMoveType?.value || "Issue").trim();
  const quantity = Number(consumableMoveQty?.value);
  const date = String(consumableMoveDate?.value || "").trim();
  const issuedBy = String(consumableMoveIssuedBy?.value || "").trim();

  if (!date || !issuedBy || !Number.isFinite(quantity) || quantity === 0) {
    alert("Date, who issued, and a non-zero quantity are required.");
    return;
  }
  if ((type === "Receive" || type === "Issue") && quantity < 0) {
    alert("Receive and Issue quantities must be positive.");
    return;
  }

  const item = Consumables.withBalances(items[index]);
  const previousMovements = [...(item.movements || [])];
  const existingMove = editing
    ? previousMovements.find((move) => move.id === editMoveId)
    : null;
  if (editing && !existingMove) {
    alert("That movement could not be found.");
    return;
  }

  const movement = Consumables.normalizeMovement({
    id: existingMove?.id,
    createdAt: existingMove?.createdAt,
    date,
    type,
    quantity: type === "Adjust" ? quantity : Math.abs(quantity),
    issuedBy,
    department: String(consumableMoveDepartment?.value || "").trim(),
    relatedAsset: String(consumableMoveRelatedAsset?.value || "").trim(),
    notes: String(consumableMoveNotes?.value || "").trim()
  });

  const nextMovements = editing
    ? previousMovements.map((move) => (move.id === editMoveId ? movement : move))
    : [...previousMovements, movement];

  const trial = Consumables.withBalances({ ...item, movements: nextMovements });
  if ((Number(trial.currentStock) || 0) < 0) {
    alert(`Insufficient stock. Resulting balance would be ${trial.currentStock} ${item.unit}.`);
    return;
  }

  items[index] = trial;
  await Consumables.write(items);
  closeConsumableMoveModal();
  renderConsumables();
  openConsumableDetail(itemId);
}

async function refreshConsumablesFromSheet() {
  if (!canViewConsumables()) return;
  try {
    await Consumables.loadFromSheet();
    renderConsumables();
  } catch (error) {
    console.error(error);
    renderConsumables();
  }
}

function exportConsumablesCsv() {
  if (!canManageConsumables()) {
    alert("You do not have permission to export consumables.");
    return;
  }

  const headers = [
    "Item ID", "Name", "Category", "Unit", "Current Stock", "Reorder Level",
    "Avg Issue / 30d", "Days Cover", "Vendor", "Notes", "Movements JSON"
  ];
  const rows = Consumables.read().map((raw) => {
    const item = Consumables.withBalances(raw);
    const avg = Consumables.averageMonthlyIssue(item);
    const cover = Consumables.daysOfCover(item);
    return [
      item.itemCode,
      item.name,
      item.category,
      item.unit,
      item.currentStock,
      item.reorderLevel,
      formatConsumableNumber(avg, 2),
      cover === null ? "" : formatConsumableNumber(cover, 1),
      item.vendor,
      item.notes,
      JSON.stringify(item.movements || [])
    ];
  });

  downloadAssetCsvFile("tarmal-it-consumables.csv", headers, rows);
}

function initConsumablesModule() {
  bindConsumableElements();
  if (!consumableRows) return;

  openConsumableFormButton?.addEventListener("click", () => openConsumableForm());
  refreshConsumablesButton?.addEventListener("click", refreshConsumablesFromSheet);
  exportConsumablesButton?.addEventListener("click", exportConsumablesCsv);

  closeConsumableFormButton?.addEventListener("click", closeConsumableForm);
  document.querySelector("#cancelConsumableFormButton")?.addEventListener("click", closeConsumableForm);
  consumableFormModal?.addEventListener("click", (event) => {
    if (event.target === consumableFormModal) closeConsumableForm();
  });
  consumableForm?.addEventListener("submit", saveConsumableFromForm);
  consumableCategory?.addEventListener("change", () => {
    if (isEditingConsumable()) return;
    applyAutoConsumableItemCode();
  });
  consumableItemCode?.addEventListener("input", () => {
    if (isEditingConsumable()) return;
    const value = String(consumableItemCode.value || "").trim();
    if (!value) {
      consumableItemCodeAuto = true;
      applyAutoConsumableItemCode();
      return;
    }
    consumableItemCodeAuto = false;
  });

  closeConsumableDetailButton?.addEventListener("click", closeConsumableDetail);
  consumableDetailModal?.addEventListener("click", (event) => {
    if (event.target === consumableDetailModal) closeConsumableDetail();
  });

  closeConsumableMoveButton?.addEventListener("click", closeConsumableMoveModal);
  document.querySelector("#cancelConsumableMoveButton")?.addEventListener("click", closeConsumableMoveModal);
  consumableMoveModal?.addEventListener("click", (event) => {
    if (event.target === consumableMoveModal) closeConsumableMoveModal();
  });
  consumableMoveForm?.addEventListener("submit", saveConsumableMoveFromForm);

  [
    consumableSearchFilter,
    consumableCategoryFilter,
    consumableStockFilter,
    consumableIssuerFilter,
    consumableHistoryFrom,
    consumableHistoryTo
  ]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", () => {
      renderConsumables();
      const openId = consumableDetailModal && !consumableDetailModal.hidden
        ? consumableDetailBody?.dataset?.openItem
        : "";
      if (openId) openConsumableDetail(openId);
    }));

  consumableLowStockWarning?.addEventListener("click", openConsumablesLowStockFromWarning);
  consumableLowStockWarningCompact?.addEventListener("click", openConsumablesLowStockFromWarning);

  // Persist recalculated balances for any legacy rows left at stock 0 after Receive.
  const repaired = Consumables.save(Consumables.read());
  renderConsumables();
  updateGlobalConsumableLowStockWarning(repaired);
  if (Auth.SHEET_WEB_APP_URL && canViewConsumables()) {
    refreshConsumablesFromSheet();
  }
}

function currentPortalUserName() {
  try {
    if (typeof Auth.currentUser === "function") {
      const user = Auth.currentUser();
      if (user?.name) return String(user.name);
    }
  } catch {
    /* ignore */
  }
  return "";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAssetsModule);
} else {
  initAssetsModule();
}
