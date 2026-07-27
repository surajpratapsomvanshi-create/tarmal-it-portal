/* Verify v14: no Habits header title/date; single progress in list card header; no tab progress. */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 8770;
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
  for (let i = 1; i <= 5; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    checks[iso(d)] = ["h-good1"].concat(i % 2 ? ["h-good2"] : []);
    counts[iso(d)] = { "h-bad1": 2 + (i % 3) };
  }
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

  await page.goto(BASE + "/?v14=ui");
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
  }, buildPopulated());
  await page.reload();
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".list-tab")].map(t => ({
      name: t.querySelector(".list-tab-name")?.textContent,
      hasTabProgress: !!t.querySelector(".list-tab-progress"),
      hasProgressClass: t.classList.contains("has-progress"),
    }));
    return {
      noHeaderTitle: !document.getElementById("header-title"),
      noHeaderDate: !document.getElementById("header-date"),
      hasAvatar: !!document.getElementById("avatar-btn"),
      tabs,
      progress: {
        hidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
        meta: document.getElementById("list-day-progress-meta")?.textContent || "",
        fill: document.getElementById("list-day-progress-fill")?.style.width || "",
        inCardHead: !!document.querySelector(".tasks-card-head #list-day-progress"),
      },
    };
  });
  console.log("state", JSON.stringify(state, null, 2));

  if (!state.noHeaderTitle || !state.noHeaderDate) throw new Error("Header title/date should be removed");
  if (!state.hasAvatar) throw new Error("Avatar should remain");
  if (state.tabs.some(t => t.hasTabProgress || t.hasProgressClass)) {
    throw new Error("Tab progress should be removed: " + JSON.stringify(state.tabs));
  }
  if (state.progress.hidden || state.progress.meta !== "1/2" || state.progress.fill !== "50%" || !state.progress.inCardHead) {
    throw new Error("Card-header progress mismatch: " + JSON.stringify(state.progress));
  }

  await page.screenshot({ path: path.join(OUT, "_v14-ui-partial.png"), fullPage: true });

  await page.click('.habit-card:has-text("Read 10 minutes") .habit-check');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    meta: document.getElementById("list-day-progress-meta")?.textContent,
    fill: document.getElementById("list-day-progress-fill")?.style.width,
    complete: document.getElementById("list-day-progress")?.classList.contains("progress-complete"),
    tabProgress: !!document.querySelector(".list-tab-progress"),
  }));
  console.log("after check", after);
  if (after.meta !== "2/2" || after.fill !== "100%" || !after.complete || after.tabProgress) {
    throw new Error("Expected 100% card progress and no tab bars after toggle: " + JSON.stringify(after));
  }
  await page.screenshot({ path: path.join(OUT, "_v14-ui-complete.png"), fullPage: true });

  await page.click('.list-tab:has-text("Ideas")');
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    headerHidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
    title: document.getElementById("active-list-title")?.textContent,
  }));
  console.log("empty", empty);
  if (!empty.headerHidden || empty.title !== "Ideas") {
    throw new Error("Empty list should hide progress: " + JSON.stringify(empty));
  }
  await page.screenshot({ path: path.join(OUT, "_v14-ui-empty.png"), fullPage: true });

  await page.click('.list-tab:has-text("Atomic Habits")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "_v14-ui-clean.png"), fullPage: true });

  fs.writeFileSync(path.join(OUT, "_v14-verify-results.json"), JSON.stringify({ ok: true, state, after, empty }, null, 2));
  console.log("v14 verify ok");
  await browser.close();
  server.kill();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
