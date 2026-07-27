/* Verify good-habit progress bars on list tabs + active list header. */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 8769;
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
    { id: "h-good1", name: "Brush teeth", emoji: "🦷", color: "#8ab4f8", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
    { id: "h-good2", name: "Read 10 minutes", emoji: "📖", color: "#81c995", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
    { id: "h-bad1", name: "Cigarettes", emoji: "🚭", color: "#f28b82", createdAt: created, archived: false, listId: "list-default", type: "bad", schedule: { kind: "daily" }, dailyLimit: 5, sortIndex: 2 },
    { id: "h-health", name: "Stretch", emoji: "🧘", color: "#a78bfa", createdAt: created, archived: false, listId: "list-health", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
  ];
  const checks = {};
  const counts = {};
  const t = iso(today);
  // 1 of 2 good habits done in default; bad habit ignored
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

  await page.goto(BASE + "/?v13=progress");
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
  }, buildPopulated());
  await page.reload();
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".list-tab")].map(t => ({
      name: t.querySelector(".list-tab-name")?.textContent,
      hasProgress: t.classList.contains("has-progress"),
      complete: t.classList.contains("progress-complete"),
      fill: t.querySelector(".list-tab-progress-fill")?.style.width || null,
    }));
    const header = {
      hidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
      meta: document.getElementById("list-day-progress-meta")?.textContent || "",
      fill: document.getElementById("list-day-progress-fill")?.style.width || "",
      complete: document.getElementById("list-day-progress")?.classList.contains("progress-complete"),
    };
    return { tabs, header };
  });
  console.log("state", JSON.stringify(state, null, 2));

  // Expect: Atomic Habits 50% (1/2), Health 0% (0/1), Ideas no bar
  const atomic = state.tabs.find(t => t.name === "Atomic Habits");
  const health = state.tabs.find(t => t.name === "Health");
  const ideas = state.tabs.find(t => t.name === "Ideas");
  if (!atomic || atomic.fill !== "50%") throw new Error("Atomic tab expected 50%, got " + atomic?.fill);
  if (!health || health.fill !== "0%") throw new Error("Health tab expected 0%, got " + health?.fill);
  if (!ideas || ideas.hasProgress) throw new Error("Ideas should hide progress");
  if (state.header.hidden || state.header.meta !== "1/2" || state.header.fill !== "50%") {
    throw new Error("Header progress mismatch: " + JSON.stringify(state.header));
  }

  await page.screenshot({ path: path.join(OUT, "_v13-progress-partial.png"), fullPage: true });
  console.log("shot partial");

  // Toggle second good habit → 100%
  await page.click('.habit-card:has-text("Read 10 minutes") .habit-check');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    meta: document.getElementById("list-day-progress-meta")?.textContent,
    fill: document.getElementById("list-day-progress-fill")?.style.width,
    tabFill: document.querySelector('.list-tab.active .list-tab-progress-fill')?.style.width,
    complete: document.getElementById("list-day-progress")?.classList.contains("progress-complete"),
  }));
  console.log("after check", after);
  if (after.meta !== "2/2" || after.fill !== "100%" || after.tabFill !== "100%" || !after.complete) {
    throw new Error("Expected 100% after toggle");
  }
  await page.screenshot({ path: path.join(OUT, "_v13-progress-complete.png"), fullPage: true });
  console.log("shot complete");

  // Empty list hides bars
  await page.click('.list-tab:has-text("Ideas")');
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    headerHidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
    tabHas: document.querySelector('.list-tab.active')?.classList.contains("has-progress"),
  }));
  console.log("empty", empty);
  if (!empty.headerHidden || empty.tabHas) throw new Error("Empty list should hide progress");
  await page.screenshot({ path: path.join(OUT, "_v13-progress-empty.png"), fullPage: true });
  console.log("shot empty");

  fs.writeFileSync(path.join(OUT, "_v13-verify-results.json"), JSON.stringify({ ok: true, state, after, empty }, null, 2));
  await browser.close();
  server.kill();
  console.log("done ok");
})().catch((e) => { console.error(e); process.exit(1); });
