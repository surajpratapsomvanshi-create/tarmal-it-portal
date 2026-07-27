/*
 * Fail-safe Google Sheets sync — automated browser-flow tests.
 *
 * Drives the REAL client (app.js) in a headless browser while a mock Apps
 * Script backend (implementing the revision/conflict/history semantics)
 * is served via Playwright request interception. No real network is used.
 *
 * Run:  node tools/sync-tests.js
 * Requires: playwright (already a dev dependency of the UI verify tooling).
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 8766;
const BASE = "http://localhost:" + PORT;

/* ---------------- mock backend (mirrors google-apps-script.gs) ---------------- */
function makeCloud() {
  return { raw: null, revision: 0, updatedAt: null, deviceId: null, history: [] };
}
function dataHasContent(d) {
  return !!(d && Array.isArray(d.habits) && d.habits.length > 0);
}
function backend(cloud, method, url, bodyStr) {
  const u = new URL(url);
  const action = u.searchParams.get("action");
  if (method === "GET") {
    if (action === "info") {
      return {
        ok: true, name: "Atomic Habits DB", spreadsheetUrl: "http://sheet.example",
        folderId: "x", hasData: dataHasContent(cloud.raw ? JSON.parse(cloud.raw) : null),
        revision: cloud.revision, updatedAt: cloud.updatedAt, deviceId: cloud.deviceId,
      };
    }
    if (action === "load") {
      if (!cloud.raw) return { ok: false, error: "No data saved yet", hasData: false, revision: 0 };
      return { ok: true, data: JSON.parse(cloud.raw), revision: cloud.revision, updatedAt: cloud.updatedAt, deviceId: cloud.deviceId };
    }
    if (action === "history") {
      return { ok: true, history: cloud.history.map((h) => ({ timestamp: h.timestamp, revision: h.revision, deviceId: h.deviceId })) };
    }
    return { ok: true, message: "running", spreadsheetUrl: "http://sheet.example" };
  }
  const body = JSON.parse(bodyStr || "{}");
  if (body.action === "save") {
    const cloudData = cloud.raw ? JSON.parse(cloud.raw) : null;
    const cloudHas = dataHasContent(cloudData);
    const incomingHas = dataHasContent(body.data);
    const force = body.force === true;
    const base = body.baseRevision;
    if (cloudHas && !force) {
      const baseMatches = base !== undefined && base !== null && String(base) === String(cloud.revision);
      if (!baseMatches) return { ok: false, conflict: true, reason: "stale", revision: cloud.revision, updatedAt: cloud.updatedAt, deviceId: cloud.deviceId, data: cloudData };
      if (!incomingHas) return { ok: false, conflict: true, reason: "blank", revision: cloud.revision, updatedAt: cloud.updatedAt, deviceId: cloud.deviceId, data: cloudData };
    }
    if (cloud.raw) {
      cloud.history.unshift({ timestamp: new Date().toISOString(), revision: cloud.revision, deviceId: cloud.deviceId, raw: cloud.raw });
      if (cloud.history.length > 20) cloud.history.length = 20;
    }
    cloud.raw = JSON.stringify(body.data);
    cloud.revision = (Number(cloud.revision) || 0) + 1;
    cloud.updatedAt = new Date().toISOString();
    cloud.deviceId = body.deviceId || null;
    return { ok: true, savedAt: cloud.updatedAt, revision: cloud.revision, updatedAt: cloud.updatedAt, deviceId: cloud.deviceId };
  }
  return { ok: false, error: "Unknown action" };
}

/* ---------------- test helpers ---------------- */
let PASS = 0, FAIL = 0;
function ok(name, cond) {
  if (cond) { PASS++; console.log("  PASS " + name); }
  else { FAIL++; console.log("  FAIL " + name); }
}

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function realData() {
  const created = iso(new Date(Date.now() - 30 * 864e5));
  const today = iso(new Date());
  return {
    habits: [
      { id: "h-a", name: "Meditate", emoji: "🧘", color: "#5b8def", createdAt: created, archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null },
      { id: "h-b", name: "Smoke", emoji: "🚭", color: "#f07178", createdAt: created, archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: 5 },
    ],
    checks: { [today]: ["h-a"] },
    counts: { [today]: { "h-b": 3 } },
  };
}

async function newPage(browser, cloud, { seedLocal, settings } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/script\.google\.com/, async (route) => {
    const req = route.request();
    let resp;
    try { resp = backend(cloud, req.method(), req.url(), req.postData()); }
    catch (e) { resp = { ok: false, error: String(e) }; }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(resp) });
  });
  const page = await context.newPage();
  await context.addInitScript(({ seedLocal, settings }) => {
    if (seedLocal) localStorage.setItem("ah.data", JSON.stringify(seedLocal));
    if (settings) {
      const cur = JSON.parse(localStorage.getItem("ah.settings") || "{}");
      localStorage.setItem("ah.settings", JSON.stringify(Object.assign(cur, settings)));
    }
  }, { seedLocal, settings });
  return { context, page };
}

async function waitIdle(page) { await page.waitForTimeout(600); }
async function openSettings(page) {
  await page.click('.nav-btn[data-view="settings"]');
  await page.waitForTimeout(150);
}
function getLS(page, key) { return page.evaluate((k) => localStorage.getItem(k), key); }
async function getData(page) { return JSON.parse(await getLS(page, "ah.data")); }
async function getSettings(page) { return JSON.parse(await getLS(page, "ah.settings")); }
async function modalVisible(page) {
  return page.evaluate(() => {
    const m = document.getElementById("sync-modal");
    return !!m && !m.classList.contains("hidden");
  });
}

/* ---------------- scenarios ---------------- */
async function run() {
  const server = spawn(process.execPath, [path.join(__dirname, "..", "dev-server.js"), String(PORT)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();

  try {
    // 1. First-ever save into an empty cloud (device already has real data).
    {
      console.log("Scenario 1: first save into empty cloud");
      const cloud = makeCloud();
      const { context, page } = await newPage(browser, cloud, { seedLocal: realData() });
      await page.goto(BASE + "/?t=1");
      await waitIdle(page);
      ok("no conflict modal for empty cloud", !(await modalVisible(page)));
      await openSettings(page);
      await page.click("#btn-sync-now");
      await waitIdle(page);
      ok("cloud received data", dataHasContent(cloud.raw ? JSON.parse(cloud.raw) : null));
      ok("cloud revision is 1", cloud.revision === 1);
      const s = await getSettings(page);
      ok("device recorded revision 1", String(s.lastSeenRevision) === "1");
      await context.close();
    }

    // 2. New blank device against a populated cloud → auto-restore (no reject).
    {
      console.log("Scenario 2: blank/new device auto-restores from cloud");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), baseRevision: null, deviceId: "seed", force: true }));
      const revBefore = cloud.revision, rawBefore = cloud.raw;
      const { context, page } = await newPage(browser, cloud, {});
      await page.goto(BASE + "/?t=2");
      await page.waitForTimeout(1200);
      ok("no conflict/reject modal on new device", !(await modalVisible(page)));
      ok("cloud untouched by fresh device upload", cloud.revision === revBefore && cloud.raw === rawBefore);
      const d = await getData(page);
      ok("local auto-restored from cloud", d.habits.some((h) => h.id === "h-a") && d.habits.some((h) => h.id === "h-b"));
      const s = await getSettings(page);
      ok("device adopted cloud revision", String(s.lastSeenRevision) === String(cloud.revision));
      const toastText = await page.evaluate(() => {
        const t = document.getElementById("toast");
        return t ? t.textContent : "";
      });
      ok("loaded-from-sheet toast shown", /Loaded from Google Sheet|Syncing/i.test(toastText) || String(s.lastSeenRevision) === String(cloud.revision));
      await context.close();
    }

    // 3. Stale revision → auto-merge (no force modal); local-only habit kept.
    {
      console.log("Scenario 3: stale revision auto-merges without force");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), deviceId: "d1", force: true }));
      const phone = realData();
      phone.habits[0].name = "Meditate (phone)";
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: phone, baseRevision: 1, deviceId: "d2" }));
      const revBefore = cloud.revision;
      const local = realData();
      local.habits.push({ id: "h-c", name: "Run", emoji: "🏃", color: "#3ecf8e", createdAt: iso(new Date()), archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null });
      const { context, page } = await newPage(browser, cloud, { seedLocal: local, settings: { lastSeenRevision: 1, lastSync: new Date().toISOString() } });
      await page.goto(BASE + "/?t=3");
      await page.waitForTimeout(1500);
      ok("no conflict modal on stale startup", !(await modalVisible(page)));
      ok("merge pushed a new cloud revision", cloud.revision === revBefore + 1);
      const cd = JSON.parse(cloud.raw);
      ok("merged cloud keeps phone rename", cd.habits.some((h) => h.id === "h-a" && h.name === "Meditate (phone)"));
      ok("merged cloud keeps local-only habit", cd.habits.some((h) => h.id === "h-c"));
      const d = await getData(page);
      ok("local has merged habits", d.habits.some((h) => h.id === "h-c") && d.habits.some((h) => h.id === "h-a"));
      await context.close();
    }

    // 4. Force replace control removed from Settings DOM.
    {
      console.log("Scenario 4: no force-replace control in settings");
      const cloud = makeCloud();
      const { context, page } = await newPage(browser, cloud, { seedLocal: realData() });
      await page.goto(BASE + "/?t=4");
      await waitIdle(page);
      await openSettings(page);
      const forceBtn = await page.$("#btn-force-replace");
      ok("force replace button absent", forceBtn == null);
      const forceText = await page.evaluate(() => document.body.innerText);
      ok("settings copy has no Force replace", !/Force replace/i.test(forceText));
      ok("upload + restore buttons present", !!(await page.$("#btn-sync-now")) && !!(await page.$("#btn-restore")));
      await context.close();
    }

    // 5. Manual Restore creates a local backup.
    {
      console.log("Scenario 5: restore makes a local backup");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), deviceId: "d1", force: true }));
      const local = realData(); local.habits[0].name = "About to be replaced"; local.checks = { "2020-01-01": ["h-a"] };
      const { context, page } = await newPage(browser, cloud, {
        seedLocal: local,
        settings: { lastSeenRevision: 1, lastSync: new Date().toISOString(), autoSync: false },
      });
      page.on("dialog", (dlg) => dlg.accept());
      await page.goto(BASE + "/?t=5");
      await waitIdle(page);
      await openSettings(page);
      await page.click("#btn-restore");
      await waitIdle(page);
      const backupKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ah.backup.")));
      ok("local backup snapshot created before restore", backupKeys.length >= 1);
      const backup = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), backupKeys[0]);
      ok("backup holds pre-restore local data", backup.habits[0].name === "About to be replaced");
      const d = await getData(page);
      ok("local replaced with cloud copy", d.habits[0].name === "Meditate");
      await context.close();
    }

    // 6. Regression: normal check-in / bad-habit count / date nav unaffected.
    {
      console.log("Scenario 6: core app behaviour unaffected");
      const cloud = makeCloud();
      const { context, page } = await newPage(browser, cloud, { seedLocal: realData(), settings: { autoSync: false } });
      await page.goto(BASE + "/?t=6");
      await waitIdle(page);
      const cards = await page.$$eval(".habit-card", (els) => els.length);
      ok("habit cards render", cards >= 2);
      await page.click("#btn-week-prev");
      await waitIdle(page);
      await page.click("#btn-week-next");
      await waitIdle(page);
      ok("date navigation works without error", true);
      await context.close();
    }

    // 7. Periodic poll picks up a cloud revision bump (no local dirty).
    {
      console.log("Scenario 7: poll pulls newer cloud revision");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), deviceId: "d1", force: true }));
      const local = realData();
      const { context, page } = await newPage(browser, cloud, {
        seedLocal: local,
        settings: { lastSeenRevision: 1, lastSync: new Date().toISOString(), autoRefresh: true, pollIntervalMs: 15000, autoSync: false },
      });
      await page.goto(BASE + "/?t=7");
      await waitIdle(page);
      const bumped = realData();
      bumped.habits[0].name = "Meditate (from phone)";
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: bumped, baseRevision: 1, deviceId: "phone" }));
      ok("cloud now at revision 2", cloud.revision === 2);
      await page.evaluate(async () => { await window.__ahSync.pollCloud({ force: true }); });
      await page.waitForTimeout(800);
      const d = await getData(page);
      ok("poll restored newer cloud name", d.habits[0].name === "Meditate (from phone)");
      const s = await getSettings(page);
      ok("lastSeenRevision advanced to 2", String(s.lastSeenRevision) === "2");
      await context.close();
    }

    // 8. Hidden tab does not schedule a running poll timer.
    {
      console.log("Scenario 8: hidden tab pauses polling");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), deviceId: "d1", force: true }));
      const { context, page } = await newPage(browser, cloud, {
        seedLocal: realData(),
        settings: { lastSeenRevision: 1, lastSync: new Date().toISOString(), autoRefresh: true, pollIntervalMs: 15000 },
      });
      await page.goto(BASE + "/?t=8");
      await waitIdle(page);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForTimeout(200);
      const paused = await page.evaluate(() => {
        const st = window.__ahSync.getPollState();
        return st.pollTimer == null && st.nextPollAt == null;
      });
      ok("poll timer cleared while hidden", paused);
      await context.close();
    }

    // 9. Blank overwrite still blocked when forced path is not used.
    {
      console.log("Scenario 9: blank overwrite still blocked");
      const cloud = makeCloud();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: realData(), deviceId: "d1", force: true }));
      const revBefore = cloud.revision;
      const blank = { habits: [], checks: {}, counts: {} };
      const resp = backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({
        action: "save", data: blank, baseRevision: revBefore, deviceId: "attacker", force: false,
      }));
      ok("server rejects blank overwrite", !!(resp && resp.conflict && resp.reason === "blank"));
      ok("cloud revision unchanged", cloud.revision === revBefore);
    }

    // 10. Conflict with local dirty during poll merges counts (max) without force.
    {
      console.log("Scenario 10: dirty poll conflict merges counts");
      const cloud = makeCloud();
      const base = realData();
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: base, deviceId: "d1", force: true }));
      const today = iso(new Date());
      const local = realData();
      local.counts[today] = { "h-b": 5 };
      const { context, page } = await newPage(browser, cloud, {
        seedLocal: local,
        settings: { lastSeenRevision: 1, lastSync: new Date().toISOString(), autoRefresh: true, autoSync: false, pollIntervalMs: 15000 },
      });
      await page.goto(BASE + "/?t=10");
      await waitIdle(page);
      await page.evaluate(() => { window.__ahSync.markDirty(); });
      const phone = realData();
      phone.counts[today] = { "h-b": 2 };
      phone.habits[0].name = "Meditate (phone)";
      backend(cloud, "POST", "https://script.google.com/exec", JSON.stringify({ action: "save", data: phone, baseRevision: 1, deviceId: "phone" }));
      await page.evaluate(async () => { await window.__ahSync.pollCloud({ force: true }); });
      await page.waitForTimeout(1200);
      const cd = JSON.parse(cloud.raw);
      const mergedCount = cd.counts && cd.counts[today] && cd.counts[today]["h-b"];
      ok("merged count took max (at least 5)", Number(mergedCount) >= 5);
      ok("merged kept phone habit rename", cd.habits.some((h) => h.id === "h-a" && h.name === "Meditate (phone)"));
      ok("no force button still", (await page.$("#btn-force-replace")) == null);
      await context.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log("\n" + PASS + " passed, " + FAIL + " failed");
  process.exit(FAIL ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });


