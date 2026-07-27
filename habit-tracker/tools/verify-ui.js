/* UI verification: screenshots of Today (alerts), Stats (track-till-hour), modal, empty state. */
const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://localhost:8765";
const OUT = path.join(__dirname, "..");

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function buildData(counts, opts = {}) {
  const today = new Date();
  const created = new Date(today); created.setDate(created.getDate() - 30);
  const habits = [
    { id: "h-good1", name: "Brush teeth", emoji: "🦷", color: "#5b8def", createdAt: iso(created), archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null },
    { id: "h-good2", name: "Read 10 minutes", emoji: "📖", color: "#3ecf8e", createdAt: iso(created), archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null },
    { id: "h-bad1", name: "Ciggarettes", emoji: "🚭", color: "#f07178", createdAt: iso(created), archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: opts.dailyLimit === undefined ? 5 : opts.dailyLimit },
  ];
  const checks = {};
  const countsMap = {};
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    checks[iso(d)] = ["h-good1"].concat(i % 2 ? ["h-good2"] : []);
  }
  counts.forEach((c, i) => {
    if (c == null) return;
    const d = new Date(today); d.setDate(d.getDate() - i);
    countsMap[iso(d)] = { "h-bad1": c };
  });
  return { habits, checks, counts: countsMap };
}

async function seedAndShot(page, data, name, view) {
  await page.goto(BASE + "/?verify=" + name);
  await page.evaluate((d) => {
    localStorage.setItem("ah.data", JSON.stringify(d));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "", autoSync: false, lastSync: null }));
  }, data);
  await page.reload();
  await page.waitForTimeout(400);
  if (view === "stats") {
    await page.click('.nav-btn[data-view="stats"]');
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: path.join(OUT, "_v8-" + name + ".png"), fullPage: true });
  console.log("shot", name);
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // 1. Today view: count 7, limit 5, prior history -> both alerts
  await seedAndShot(page, buildData([7, 3, 5, 2, 4, 6, 3]), "today-alerts", "today");

  // 2. Stats: track-till-hour with varied history (limit 5)
  await seedAndShot(page, buildData([2, 3, 5, 2, 4, 6, 3, 12, 11, 10, 2, 0, 4, 8]), "stats-track", "stats");

  // 3. Stats: over expected / over limit today
  await seedAndShot(page, buildData([9, 4, 4, 4, 4, 4, 4]), "stats-over", "stats");

  // 4. Stats: average-based target (no daily limit)
  await seedAndShot(page, buildData([128, 200, 240, 180, 220], { dailyLimit: null }), "stats-avg-target", "stats");

  // 5. Stats: pending (no limit, no history)
  await seedAndShot(page, buildData([3], { dailyLimit: null }), "stats-pending", "stats");

  // 6. Modal (bad habit editing shows limit field)
  await page.goto(BASE + "/?verify=modal");
  await page.evaluate((d) => { localStorage.setItem("ah.data", JSON.stringify(d)); }, buildData([7, 3]));
  await page.reload();
  await page.waitForTimeout(400);
  await page.click(".habit-card.bad-habit .habit-edit");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "_v8-modal.png"), fullPage: true });
  console.log("shot modal");

  // 7. Empty state
  await page.goto(BASE + "/?verify=empty");
  await page.evaluate(() => {
    localStorage.setItem("ah.data", JSON.stringify({ habits: [], checks: {}, counts: {} }));
    localStorage.setItem("ah.settings", JSON.stringify({ scriptUrl: "x", autoSync: false, lastSync: null }));
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "_v8-empty.png"), fullPage: true });
  console.log("shot empty");

  // Functional assertions
  await page.goto(BASE + "/?verify=assert");
  await page.evaluate((d) => { localStorage.setItem("ah.data", JSON.stringify(d)); }, buildData([2, 3, 5, 2]));
  await page.reload();
  await page.waitForTimeout(400);
  const warns = await page.$$eval(".habit-warn", els => els.map(e => e.textContent.trim()));
  const pills = await page.$$eval(".habit-pill.avg", els => els.map(e => e.textContent.trim()));
  const greeting = await page.$eval("#header-title", e => e.textContent.trim());
  const brand = await page.$eval(".header-brand", e => e.textContent.trim());
  await page.click('.nav-btn[data-view="stats"]');
  await page.waitForTimeout(350);
  const trackTitle = await page.$eval(".track-chart-title", e => e.textContent.trim());
  const trackSub = await page.$eval(".track-chart-sub", e => e.textContent.trim());
  const paceOpts = await page.$$eval(".pace-opt", els => els.map(e => e.textContent.trim()));
  const legend = await page.$$eval(".track-legend-item", els => els.map(e => e.textContent.trim()));
  const trackVals = await page.$$eval(".track-vals", els => els.map(e => e.textContent.replace(/\s+/g, " ").trim()));
  const expectedMark = await page.$(".track-expected-mark");
  const tillRegion = await page.$(".track-till-region");
  const miniLabel = await page.$eval(".mini-count-label", e => e.textContent.trim());
  const tones = await page.$$eval(".track-fill", els => els.map(e => [...e.classList].filter(c => c.startsWith("tone-")).join(" ")));
  const dragHandles = await page.$$eval(".habit-drag", els => els.length);
  await page.click('.nav-btn[data-view="today"]');
  await page.waitForTimeout(300);
  const todayDrags = await page.$$eval("#habit-list .habit-drag", els => els.length);
  const ringPct = await page.$eval("#day-ring-label", e => e.textContent.trim());
  // Ring should be good-habits only: 0 of 2 goods checked in assert seed → 0%
  console.log(JSON.stringify({
    warns, pills, greeting, brand,
    trackTitle, trackSub, paceOpts, legend, trackVals,
    hasExpectedMark: !!expectedMark,
    hasTillRegion: !!tillRegion,
    miniLabel,
    tones,
    statsDragHandles: dragHandles,
    todayDragHandles: todayDrags,
    ringPct,
  }, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
