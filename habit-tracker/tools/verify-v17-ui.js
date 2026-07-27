/* Verify v17: progress meta shows percent (e.g. 50%), not fraction-only. */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 8773;
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
    { id: "list-empty", name: "Ideas", sortIndex: 1, createdAt: created },
  ];
  const habits = [
    { id: "h-good1", name: "Brush teeth", emoji: "🪥", color: "#8ab4f8", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
    { id: "h-good2", name: "Read 10 minutes", emoji: "📖", color: "#81c995", createdAt: created, archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
  ];
  const checks = {};
  checks[iso(today)] = ["h-good1"];
  return { lists, activeListId: "list-default", habits, checks, counts: {} };
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

  await page.goto(BASE + "/?v17=ui");
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
  }, buildPopulated());
  await page.reload();
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const progress = document.getElementById("list-day-progress");
    const fill = document.getElementById("list-day-progress-fill");
    return {
      progressVisible: progress && !progress.classList.contains("hidden"),
      progressFill: fill?.style.width || "",
      progressMeta: document.getElementById("list-day-progress-meta")?.textContent || "",
      progressBars: document.querySelectorAll(".top-day-progress-track, .list-tab-progress, .list-tab-progress-fill").length,
      cacheHint: typeof caches !== "undefined",
    };
  });
  console.log("state", JSON.stringify(state, null, 2));

  // 1 of 2 → 50%
  if (!state.progressVisible || state.progressMeta !== "50%" || state.progressFill !== "50%") {
    throw new Error("Expected progress meta 50%: " + JSON.stringify(state));
  }
  if (state.progressBars !== 1) {
    throw new Error("Expected exactly one progress track: " + JSON.stringify(state));
  }

  // Switch to empty list → progress hidden (0 scheduled)
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".list-tab")];
    const ideas = tabs.find((t) => (t.textContent || "").includes("Ideas"));
    if (ideas) ideas.click();
  });
  await page.waitForTimeout(200);
  const emptyState = await page.evaluate(() => ({
    hidden: document.getElementById("list-day-progress")?.classList.contains("hidden"),
    meta: document.getElementById("list-day-progress-meta")?.textContent || "",
  }));
  if (!emptyState.hidden) {
    throw new Error("Expected progress hidden when 0 scheduled: " + JSON.stringify(emptyState));
  }

  await page.screenshot({ path: path.join(OUT, "_v17-ui-percent.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT, "_v17-verify-results.json"), JSON.stringify({ ok: true, state, emptyState }, null, 2));
  console.log("v17 verify ok");

  await browser.close();
  server.kill();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
