/* Verify drag reorder does not wipe habits + pace chart UX. */
const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://localhost:8765";
const OUT = path.join(__dirname, "..");

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + "/?drag-test=1");

  const today = new Date();
  const counts = {};
  for (let i = 1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts[iso(d)] = { h4: 8 + i };
  }
  counts[iso(today)] = { h4: 11 };

  const seed = {
    habits: [
      { id: "h1", name: "Alpha", emoji: "🦷", color: "#5b8def", createdAt: "2026-01-01", archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
      { id: "h2", name: "Beta", emoji: "💧", color: "#3ecf8e", createdAt: "2026-01-01", archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
      { id: "h3", name: "Gamma", emoji: "📖", color: "#e8b84a", createdAt: "2026-01-01", archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 2 },
      { id: "h4", name: "Ciggarettes", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 3 },
    ],
    checks: {},
    counts,
  };

  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({
      scriptUrl: "http://127.0.0.1:9/disabled",
      autoSync: false,
      autoRefresh: false,
      lastSync: null,
    }));
  }, seed);
  await page.reload();
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("ah.data")).habits.map(h => h.id));
  console.log("before", before);

  const handles = page.locator("#habit-list .habit-drag");
  console.log("handles", await handles.count());
  const box0 = await handles.nth(0).boundingBox();
  const box2 = await handles.nth(2).boundingBox();
  await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2 + 20, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  let after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      count: d.habits.length,
      names: d.habits.filter(h => !h.archived).sort((a, b) => a.sortIndex - b.sortIndex).map(h => h.name),
    };
  });
  console.log("afterTodayDrag", after);

  await page.click('.nav-btn[data-view="stats"]');
  await page.waitForTimeout(400);
  const sh = page.locator("#stats-list .habit-drag");
  const s0 = await sh.nth(0).boundingBox();
  const s1 = await sh.nth(1).boundingBox();
  await page.mouse.move(s0.x + s0.width / 2, s0.y + s0.height / 2);
  await page.mouse.down();
  await page.mouse.move(s1.x + s1.width / 2, s1.y + s1.height / 2 + 30, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      count: d.habits.length,
      names: d.habits.filter(h => !h.archived).sort((a, b) => a.sortIndex - b.sortIndex).map(h => h.name),
    };
  });
  console.log("afterStatsDrag", after);

  const chart = await page.evaluate(() => ({
    title: document.querySelector(".track-chart-title")?.textContent?.trim(),
    sub: document.querySelector(".track-chart-sub")?.textContent?.trim(),
    pace: [...document.querySelectorAll(".pace-opt")].map(e => ({
      t: e.textContent.trim(),
      sel: e.classList.contains("selected"),
    })),
    legend: [...document.querySelectorAll(".track-legend-item")].map(e => e.textContent.trim()),
    vals: [...document.querySelectorAll(".track-vals")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
    till: !!document.querySelector(".track-till-region"),
    expected: !!document.querySelector(".track-expected-mark"),
  }));
  console.log("chartFull", chart);

  await page.click('.pace-opt[data-pace="until"]');
  await page.waitForTimeout(300);
  const chartUntil = await page.evaluate(() => ({
    pace: [...document.querySelectorAll(".pace-opt")].map(e => ({
      t: e.textContent.trim(),
      sel: e.classList.contains("selected"),
    })),
    expected: !!document.querySelector(".track-expected-mark"),
    caption: document.querySelector(".track-expected-caption")?.textContent?.trim() || "",
    paceNote: document.querySelector(".track-pace-note")?.textContent?.replace(/\s+/g, " ").trim() || "",
    vals: [...document.querySelectorAll(".track-vals")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
  }));
  console.log("chartUntil", chartUntil);

  await page.screenshot({ path: path.join(OUT, "_v9-stats-pace.png"), fullPage: true });

  await page.reload();
  await page.waitForTimeout(500);
  const persisted = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      count: d.habits.length,
      names: d.habits.filter(h => !h.archived).sort((a, b) => a.sortIndex - b.sortIndex).map(h => h.name),
    };
  });
  console.log("persisted", persisted);

  const ok =
    before.length === 4 &&
    after.count === 4 &&
    persisted.count === 4 &&
    chart.title === "Pace vs average" &&
    chart.till === false &&
    chart.pace.some(p => p.t === "Full day" && p.sel) &&
    chartUntil.expected === false &&
    /Pace:/.test(chartUntil.paceNote) &&
    /expected ~\d+ by now/.test(chartUntil.paceNote) &&
    chartUntil.vals.every(v => /used · (avg|limit) \d+$/.test(v));

  console.log("PASS", ok);
  await browser.close();
  if (!ok) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
