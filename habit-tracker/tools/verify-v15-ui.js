/* Verify v15: no avatar/sync chrome; progress under tabs only; no card-header progress. */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 8771;
const BASE = "http://localhost:" + PORT;
const ROOT = path.join(__dirname, "..");
const OUT = ROOT;

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function buildPopulated() {
  const today = new Date();
  const created = iso(new Date(today.getTime() - 30 * 864e5));
  const lists = [
    { id: "list-default", name: "Atomic Habits", sortIndex: 0, createdAt: created },
    { id: "list-health", name: "Health", sortIndex: 1, createdAt: created },
    { id: "list-empty", name: "Ideas", sortIndex: 2, createdAt: created },
  ];
  const habits = [
    { id: "h-good1", name: "Brush teeth", emoji: "🪥", color: "#8ab4f8", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
    { id: "h-good2", name: "Read 10 minutes", emoji: "📖", color: "#81c995", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
    { id: "h-bad1", name: "Cigarettes", emoji: "🚬", color: "#f28b82", createdAt: created, archived: false, listId: "list-default", type: "bad", schedule: { kind: "daily" }, dailyLimit: 5, sortIndex: 2 },
    { id: "h-health", name: "Stretch", emoji: "🧘", color: "#a78bfa", createdAt: created, archived: false, listId: "list-health", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
  ];
  const checks = {};
  const counts = {};
  const t = iso(today);
  checks[t] = ["h-good1"];
  counts[t] = { "h-bad1": 4 };
  return { lists, activeListId: "list-default", habits, checks, counts };
}

(async () => {
  const server = spawn("node", ["dev-server.js", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server timeout")), 8000);
    const onData = (buf) => {
      if (String(buf).includes(String(PORT))) { clearTimeout(t); resolve(); }
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
  });

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(BASE + "/?v15=ui");
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
  }, buildPopulated());
  await page.reload();
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const progress = document.getElementById("list-day-progress");
    return {
      noAvatar: !document.getElementById("avatar-btn"),
      noAppHeader: !document.querySelector(".app-header"),
      hasTopBand: !!document.getElementById("top-band"),
      progressInTopBand: !!document.querySelector(".top-band #list-day-progress"),
      progressNotInCard: !document.querySelector(".tasks-card #list-day-progress"),
      noCardTitle: !document.getElementById("active-list-title"),
      syncInSettings: !!document.querySelector("#view-settings #sync-indicator"),
      progress: {
        hidden: progress?.classList.contains("hidden"),
        meta: document.getElementById("list-day-progress-meta")?.textContent || "",
        fill: document.getElementById("list-day-progress-fill")?.style.width || "",
      },
      hasSort: !!document.getElementById("btn-sort-hint"),
      hasMenu: !!document.getElementById("btn-list-menu"),
    };
  });
  console.log("state", JSON.stringify(state, null, 2));

  if (!state.noAvatar || !state.noAppHeader) throw new Error("Avatar/header still present: " + JSON.stringify(state));
  if (!state.hasTopBand || !state.progressInTopBand || !state.progressNotInCard) {
    throw new Error("Progress placement wrong: " + JSON.stringify(state));
  }
  if (!state.noCardTitle) throw new Error("Card title still present");
  if (!state.syncInSettings) throw new Error("Sync indicator missing from Settings");
  if (state.progress.hidden || state.progress.meta !== "1/2" || state.progress.fill !== "50%") {
    throw new Error("Expected top progress 1/2: " + JSON.stringify(state.progress));
  }
  if (!state.hasSort || !state.hasMenu) throw new Error("Card actions missing");

  await page.screenshot({ path: path.join(OUT, "_v15-ui-populated.png"), fullPage: true });

  await page.click('.list-tab:has-text("Ideas")');
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    hidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
  }));
  if (!empty.hidden) throw new Error("Empty list should hide top progress");
  await page.screenshot({ path: path.join(OUT, "_v15-ui-empty.png"), fullPage: true });

  await page.click('.nav-btn[data-view="settings"]');
  await page.waitForTimeout(250);
  const settingsSync = await page.evaluate(() => ({
    visible: !!document.querySelector("#view-settings.active #sync-indicator"),
  }));
  if (!settingsSync.visible) throw new Error("Settings sync indicator not visible");
  await page.screenshot({ path: path.join(OUT, "_v15-ui-settings.png"), fullPage: true });

  fs.writeFileSync(path.join(OUT, "_v15-verify-results.json"), JSON.stringify({ ok: true, state, empty, settingsSync }, null, 2));
  console.log("v15 verify ok");

  await browser.close();
  server.kill();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
