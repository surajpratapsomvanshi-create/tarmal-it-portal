/* Verify v18: simplified Until-now pace + last-used from punch timestamps. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:8765";
const OUT = path.join(__dirname, "..");

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + "/?v18=ui");

  const today = new Date();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const counts = {};
  for (let i = 1; i <= 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts[iso(d)] = { "h-bad1": 6 + i, "h-bad2": 2 };
  }
  counts[iso(today)] = { "h-bad1": 10, "h-bad2": 0 };

  const seed = {
    habits: [
      { id: "h-good", name: "Brush", emoji: "🦷", color: "#5b8def", createdAt: "2026-01-01", archived: false, type: "good", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 },
      { id: "h-bad1", name: "Cigarettes", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 1 },
      { id: "h-bad2", name: "PS", emoji: "🎮", color: "#a78bfa", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: 3, sortIndex: 2 },
    ],
    checks: {},
    counts,
    lastUsedAt: { "h-bad1": twoHoursAgo },
    punches: [{ id: "p-seed1", habitId: "h-bad1", at: twoHoursAgo, delta: 1 }],
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

  // Today: last-used labels
  const todayState = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#habit-list .habit-card.bad-habit")].map(card => ({
      name: card.querySelector(".habit-name")?.textContent.trim(),
      last: card.querySelector(".habit-last-used")?.textContent.trim(),
    }));
    return { cards };
  });
  console.log("todayState", todayState);

  await page.screenshot({ path: path.join(OUT, "_v18-today-lastused.png"), fullPage: true });

  // Tap + on PS → Just now / updates lastUsedAt
  await page.click('#habit-list .habit-card.bad-habit:nth-child(3) .counter-btn.inc');
  await page.waitForTimeout(300);
  const afterInc = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    const ps = [...document.querySelectorAll("#habit-list .habit-card.bad-habit")]
      .find(c => c.querySelector(".habit-name")?.textContent.trim() === "PS");
    return {
      lastLabel: ps?.querySelector(".habit-last-used")?.textContent.trim(),
      lastUsedAt: d.lastUsedAt && d.lastUsedAt["h-bad2"],
      punchCount: (d.punches || []).length,
      lastPunch: (d.punches || []).slice(-1)[0] || null,
    };
  });
  console.log("afterInc", afterInc);

  // Decrement must not clear lastUsedAt
  await page.click('#habit-list .habit-card.bad-habit:nth-child(3) .counter-btn.dec');
  await page.waitForTimeout(250);
  const afterDec = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ah.data"));
    return {
      lastUsedAt: d.lastUsedAt && d.lastUsedAt["h-bad2"],
      count: (d.counts && d.counts[Object.keys(d.counts).sort().pop()]) ? d.counts[Object.keys(d.counts).sort().pop()]["h-bad2"] : null,
      punches: (d.punches || []).filter(p => p.habitId === "h-bad2").map(p => p.delta),
    };
  });
  console.log("afterDec", afterDec);

  // Stats: Full day + Until now simplified
  await page.click('.nav-btn[data-view="stats"]');
  await page.waitForTimeout(400);
  const full = await page.evaluate(() => ({
    vals: [...document.querySelectorAll(".track-vals")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
    expectedMark: !!document.querySelector(".track-expected-mark"),
    paceNote: document.querySelector(".track-pace-note")?.textContent || null,
    fractional: [...document.querySelectorAll(".track-vals, .track-chart-sub")].some(e => /\d+\.\d/.test(e.textContent)),
  }));
  console.log("full", full);
  await page.screenshot({ path: path.join(OUT, "_v18-stats-full.png"), fullPage: true });

  await page.click('.pace-opt[data-pace="until"]');
  await page.waitForTimeout(300);
  const until = await page.evaluate(() => ({
    vals: [...document.querySelectorAll(".track-vals")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
    expectedMark: !!document.querySelector(".track-expected-mark"),
    paceNote: document.querySelector(".track-pace-note")?.textContent.replace(/\s+/g, " ").trim(),
    fractionalExpected: /\d+\.\d/.test(document.querySelector(".track-pace-note")?.textContent || ""),
  }));
  console.log("until", until);
  await page.screenshot({ path: path.join(OUT, "_v18-stats-until.png"), fullPage: true });

  // Merge: later lastUsedAt wins
  const mergeOk = await page.evaluate(() => {
    const earlier = "2026-07-20T10:00:00.000Z";
    const later = "2026-07-26T12:00:00.000Z";
    const a = {
      habits: [{ id: "h1", name: "A", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 }],
      checks: {}, counts: {}, lists: [{ id: "list-default", name: "Atomic Habits", sortIndex: 0, createdAt: "2026-01-01" }],
      activeListId: "list-default",
      lastUsedAt: { h1: earlier },
      punches: [{ id: "p1", habitId: "h1", at: earlier, delta: 1 }],
    };
    const b = {
      habits: [{ id: "h1", name: "A", emoji: "🚭", color: "#f07178", createdAt: "2026-01-01", archived: false, type: "bad", schedule: { kind: "daily" }, dailyLimit: null, sortIndex: 0 }],
      checks: {}, counts: {}, lists: [{ id: "list-default", name: "Atomic Habits", sortIndex: 0, createdAt: "2026-01-01" }],
      activeListId: "list-default",
      lastUsedAt: { h1: later },
      punches: [{ id: "p2", habitId: "h1", at: later, delta: 1 }],
    };
    const m = window.__ahSync.mergeHabitData(a, b);
    return m.lastUsedAt.h1 === later && m.punches.length === 2;
  });
  console.log("mergeOk", mergeOk);

  const cig = todayState.cards.find(c => c.name === "Cigarettes");
  const ps = todayState.cards.find(c => c.name === "PS");
  const ok =
    cig && /2h ago/.test(cig.last) &&
    ps && /Not used yet/.test(ps.last) &&
    afterInc.lastLabel === "Just now" &&
    !!afterInc.lastUsedAt &&
    afterInc.punchCount >= 2 &&
    afterInc.lastPunch && afterInc.lastPunch.delta === 1 &&
    afterDec.lastUsedAt === afterInc.lastUsedAt &&
    afterDec.punches.includes(-1) &&
    full.expectedMark === false &&
    full.paceNote == null &&
    full.fractional === false &&
    until.expectedMark === false &&
    /Pace:/.test(until.paceNote || "") &&
    until.fractionalExpected === false &&
    until.vals.every(v => /(avg|limit) \d+$/.test(v)) &&
    mergeOk;

  fs.writeFileSync(path.join(OUT, "_v18-verify-results.json"), JSON.stringify({
    ok, todayState, afterInc, afterDec, full, until, mergeOk,
  }, null, 2));
  console.log("v18 verify", ok ? "ok" : "FAIL");
  await browser.close();
  if (!ok) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
