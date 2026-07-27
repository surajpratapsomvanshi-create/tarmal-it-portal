/*
 * List migration + CRUD tests (Playwright + real app.js).
 * Run: node tools/list-tests.js
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 8767;
const BASE = "http://localhost:" + PORT;
const ROOT = path.join(__dirname, "..");

let PASS = 0, FAIL = 0;
function ok(name, cond) {
  if (cond) { PASS++; console.log("  PASS " + name); }
  else { FAIL++; console.log("  FAIL " + name); }
}

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

(async () => {
  const server = spawn("node", ["dev-server.js", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server start timeout")), 8000);
    const onData = (buf) => {
      if (String(buf).includes(String(PORT))) {
        clearTimeout(t);
        resolve();
      }
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
  });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  console.log("\n== migration ==");
  await page.goto(BASE + "/?list-test=migrate");
  const migrated = await page.evaluate(() => {
    const legacy = {
      habits: [
        { id: "h1", name: "Walk", emoji: "🏃", color: "#5b8def", createdAt: "2026-01-01", archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
        { id: "h2", name: "Smoke", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: 5, sortIndex: 1 },
      ],
      checks: { "2026-07-01": ["h1"] },
      counts: { "2026-07-01": { h2: 2 } },
    };
    localStorage.setItem("ah.data", JSON.stringify(legacy));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, autoRefresh: false }));
    return true;
  });
  ok("seeded legacy", migrated);
  await page.reload();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      listCount: (d.lists || []).length,
      listName: d.lists && d.lists[0] && d.lists[0].name,
      listIds: (d.habits || []).map(h => h.listId),
      checks: d.checks,
      counts: d.counts,
      activeListId: d.activeListId,
      habitTypes: (d.habits || []).map(h => h.type),
    };
  });
  ok("creates default list", after.listCount === 1 && after.listName === "Atomic Habits");
  ok("assigns listId to all habits", after.listIds.length === 2 && after.listIds.every(Boolean) && after.listIds[0] === after.listIds[1]);
  ok("preserves checks", Array.isArray(after.checks["2026-07-01"]) && after.checks["2026-07-01"].includes("h1"));
  ok("preserves counts", after.counts["2026-07-01"] && after.counts["2026-07-01"].h2 === 2);
  ok("preserves types", after.habitTypes.join() === "good,bad");

  console.log("\n== list CRUD ==");
  await page.evaluate(() => {
    window.__ahSync.createList("Health");
  });
  await page.waitForTimeout(200);
  const afterCreate = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      names: d.lists.map(l => l.name),
      active: d.activeListId,
      activeName: d.lists.find(l => l.id === d.activeListId).name,
    };
  });
  ok("create list", afterCreate.names.includes("Health") && afterCreate.activeName === "Health");

  // Add habit to active (Health) list via UI API
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    d.habits.push({
      id: "h-new", name: "Stretch", emoji: "🧘", color: "#8ab4f8",
      createdAt: new Date().toISOString().slice(0, 10), archived: false,
      listId: d.activeListId, type: "good", schedule: { kind: "daily" },
      dailyLimit: null, sortIndex: 0,
    });
    localStorage.setItem("ah.data", JSON.stringify(d));
  });
  await page.reload();
  await page.waitForTimeout(400);
  const filtered = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".list-tab")].map(t => t.textContent.trim());
    const names = [...document.querySelectorAll(".habit-name")].map(n => n.textContent);
    return { tabs, names, empty: !document.getElementById("empty-state").classList.contains("hidden") };
  });
  ok("tabs show lists", filtered.tabs.some(t => t.includes("Health")) && filtered.tabs.some(t => t.includes("Atomic")));
  ok("active list filters habits", filtered.names.includes("Stretch") && !filtered.names.includes("Walk"));

  // Switch to Atomic Habits
  await page.click('.list-tab:has-text("Atomic Habits")');
  await page.waitForTimeout(200);
  const onAtomic = await page.evaluate(() =>
    [...document.querySelectorAll(".habit-name")].map(n => n.textContent)
  );
  ok("switch list shows its habits", onAtomic.includes("Walk") && onAtomic.includes("Smoke") && !onAtomic.includes("Stretch"));

  // Rename
  await page.evaluate(() => {
    const id = window.__ahSync.getActiveListId();
    window.__ahSync.renameList(id, "Core Habits");
  });
  await page.waitForTimeout(150);
  const renamed = await page.evaluate(() =>
    [...document.querySelectorAll(".list-tab")].map(t => t.textContent.trim()).join("|")
  );
  ok("rename list", renamed.includes("Core Habits"));

  // Delete Health (with habit) — auto-confirm
  page.once("dialog", d => d.accept());
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    const health = d.lists.find(l => l.name === "Health");
    window.__ahSync.deleteList(health.id);
  });
  await page.waitForTimeout(250);
  const afterDelete = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      names: d.lists.map(l => l.name),
      habitIds: d.habits.map(h => h.id),
    };
  });
  ok("delete list removes it", !afterDelete.names.includes("Health"));
  ok("delete list removes its habits", !afterDelete.habitIds.includes("h-new") && afterDelete.habitIds.includes("h1"));

  // Cannot delete last list
  const blocked = await page.evaluate(() => {
    const id = window.__ahSync.getActiveListId();
    return window.__ahSync.deleteList(id);
  });
  ok("block delete last list", blocked === false);

  // Empty list empty-state
  await page.evaluate(() => window.__ahSync.createList("Empty Box"));
  await page.waitForTimeout(200);
  const emptyUi = await page.evaluate(() => {
    const empty = document.getElementById("empty-state");
    return {
      visible: !empty.classList.contains("hidden"),
      title: empty.querySelector("h2").textContent,
    };
  });
  ok("empty list shows empty state", emptyUi.visible && emptyUi.title === "No habits yet");

  console.log("\n== create + move ==");
  // Tab "+" button exists
  const hasTabAdd = await page.locator("#btn-tab-new-list").count();
  ok("tab bar has create +", hasTabAdd === 1);

  // Create via prompt from tab +
  page.once("dialog", d => d.accept("Focus"));
  await page.click("#btn-tab-new-list");
  await page.waitForTimeout(250);
  const focusCreated = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return d.lists.some(l => l.name === "Focus") && d.lists.find(l => l.id === d.activeListId).name === "Focus";
  });
  ok("tab + creates and switches", focusCreated);

  // Seed a habit on Focus, then move via API to Core Habits
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    d.habits.push({
      id: "h-move", name: "Deep work", emoji: "💻", color: "#8ab4f8",
      createdAt: new Date().toISOString().slice(0, 10), archived: false,
      listId: d.activeListId, type: "good", schedule: { kind: "daily" },
      dailyLimit: null, sortIndex: 0,
    });
    localStorage.setItem("ah.data", JSON.stringify(d));
  });
  await page.reload();
  await page.waitForTimeout(400);
  const beforeMove = await page.evaluate(() =>
    [...document.querySelectorAll(".habit-name")].map(n => n.textContent)
  );
  ok("habit on Focus before move", beforeMove.includes("Deep work"));

  const moved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    const core = d.lists.find(l => l.name === "Core Habits");
    return window.__ahSync.moveHabitToList("h-move", core.id);
  });
  ok("moveHabitToList returns true", moved === true);
  await page.waitForTimeout(200);
  const afterMoveFocus = await page.evaluate(() =>
    [...document.querySelectorAll(".habit-name")].map(n => n.textContent)
  );
  ok("habit gone from Focus", !afterMoveFocus.includes("Deep work"));

  await page.click('.list-tab:has-text("Core Habits")');
  await page.waitForTimeout(200);
  const onCore = await page.evaluate(() =>
    [...document.querySelectorAll(".habit-name")].map(n => n.textContent)
  );
  ok("habit appears on Core Habits", onCore.includes("Deep work"));

  // Modal list select present when editing
  await page.click(".habit-card .habit-edit");
  await page.waitForTimeout(250);
  const modalList = await page.evaluate(() => {
    const sel = document.getElementById("habit-list-select");
    return sel ? { count: sel.options.length, value: sel.value } : null;
  });
  ok("edit modal has list picker", modalList && modalList.count >= 2);

  console.log("\n== no duplicate names ==");
  const dupBlocked = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    const before = d.habits.length;
    // Simulate saveHabit duplicate guard via findDuplicateActiveHabit
    const hit = window.__ahSync.findDuplicateActiveHabit("Walk", null);
    const listDup = window.__ahSync.createList("Core Habits"); // already renamed earlier
    const listDup2 = window.__ahSync.createList("  core habits  ");
    return {
      before,
      hitName: hit && hit.name,
      listDupNull: listDup == null,
      listDup2Null: listDup2 == null,
      afterLists: JSON.parse(localStorage.getItem("ah.data")).lists.map(l => l.name),
    };
  });
  ok("detects duplicate habit name", dupBlocked.hitName === "Walk");
  ok("blocks duplicate list name", dupBlocked.listDupNull && dupBlocked.listDup2Null);

  const mergeDedup = await page.evaluate(() => {
    const local = {
      lists: [{ id: "list-default", name: "Atomic Habits", sortIndex: 0, createdAt: "2026-01-01" }],
      activeListId: "list-default",
      habits: [
        { id: "h-keep", name: "Smoke", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, listId: "list-default", type: "bad", schedule: { kind: "daily" }, dailyLimit: 5, sortIndex: 0 },
        { id: "h-other", name: "Walk", emoji: "🏃", color: "#5b8def", createdAt: "2026-01-01", archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
      ],
      checks: { "2026-07-01": ["h-other"] },
      counts: { "2026-07-01": { "h-keep": 3 } },
      lastUsedAt: { "h-keep": "2026-07-01T12:00:00.000Z" },
      punches: [{ id: "p1", habitId: "h-keep", at: "2026-07-01T12:00:00.000Z", delta: 1 }],
    };
    const cloud = {
      lists: [
        { id: "list-default", name: "Atomic Habits", sortIndex: 0, createdAt: "2026-01-01" },
        { id: "list-b", name: "Other", sortIndex: 1, createdAt: "2026-01-01" },
      ],
      activeListId: "list-default",
      habits: [
        { id: "h-cloud-smoke", name: "smoke", emoji: "🚬", color: "#f28b82", createdAt: "2026-01-01", archived: false, listId: "list-b", type: "bad", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 2 },
        { id: "h-cloud-walk", name: "Walk", emoji: "🚶", color: "#81c995", createdAt: "2026-01-01", archived: false, listId: "list-default", type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
      ],
      checks: { "2026-07-02": ["h-cloud-walk"] },
      counts: { "2026-07-02": { "h-cloud-smoke": 7 } },
      lastUsedAt: { "h-cloud-smoke": "2026-07-02T09:00:00.000Z" },
      punches: [{ id: "p2", habitId: "h-cloud-smoke", at: "2026-07-02T09:00:00.000Z", delta: 1 }],
    };
    const merged = window.__ahSync.mergeHabitData(local, cloud);
    const names = merged.habits.filter(h => !h.archived).map(h => h.name.toLowerCase()).sort();
    const smoke = merged.habits.find(h => h.name.toLowerCase() === "smoke");
    const smokeCounts = Object.values(merged.counts || {}).reduce((n, row) => n + (row[smoke.id] || 0), 0);
    const punchIds = (merged.punches || []).filter(p => p.habitId === smoke.id).map(p => p.id).sort();
    return {
      habitCount: merged.habits.filter(h => !h.archived).length,
      names,
      smokeId: smoke && smoke.id,
      smokeCounts,
      punchIds,
      uniqueNames: names.length === new Set(names).size,
    };
  });
  ok("merge collapses same-name habits", mergeDedup.uniqueNames && mergeDedup.habitCount === 2);
  ok("merge remaps counts onto kept id", mergeDedup.smokeCounts >= 10);
  ok("merge remaps punches onto kept id", mergeDedup.punchIds.join() === "p1,p2" || mergeDedup.punchIds.length === 2);

  console.log("\n== stats UI ==");
  await page.evaluate(() => {
    const m = document.getElementById("habit-modal");
    if (m) m.classList.add("hidden");
  });
  await page.click('.list-tab:has-text("Core Habits")');
  await page.waitForTimeout(150);
  await page.click('.nav-btn[data-view="stats"]');
  await page.waitForTimeout(400);
  const statsUi = await page.evaluate(() => ({
    summary: !!document.getElementById("stats-summary"),
    tiles: document.querySelectorAll(".summary-tile").length,
    miniVals: [...document.querySelectorAll(".mini-val")].map(el => el.textContent.trim()),
    miniH: document.querySelector(".mini-count-body")
      ? parseFloat(getComputedStyle(document.querySelector(".mini-count-body")).height)
      : 0,
  }));
  ok("summary tiles removed", !statsUi.summary && statsUi.tiles === 0);
  ok("mini chart has data labels", statsUi.miniVals.length >= 7);
  ok("mini chart is taller", statsUi.miniH >= 70);

  await browser.close();
  server.kill();
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  process.exit(FAIL ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
