/* UI screenshots for Tasks-style multi-list redesign. */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 8768;
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

  await page.goto(BASE + "/?v12=populated");
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
  }, buildPopulated());
  await page.reload();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "_v12-populated.png"), fullPage: true });
  console.log("shot populated");

  await page.click('.list-tab:has-text("Ideas")');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "_v12-empty.png"), fullPage: true });
  console.log("shot empty");

  await page.click('.list-tab:has-text("Health")');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "_v12-tabs.png"), fullPage: true });
  console.log("shot tabs");

  // Move modal
  await page.click('.list-tab:has-text("Atomic Habits")');
  await page.waitForTimeout(250);
  await page.click(".habit-card .habit-edit");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "_v12-move-modal.png"), fullPage: true });
  console.log("shot move-modal");

  await browser.close();
  server.kill();
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
