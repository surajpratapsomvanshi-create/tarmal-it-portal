import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "http://127.0.0.1:8123";

function dateStr(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function addDays(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dateStr(dt);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const today = dateStr(new Date());
  const yesterday = addDays(today, -1);

  await context.addInitScript(
    ({ today }) => {
      const data = {
        habits: [
          {
            id: "h-daily",
            name: "Brush teeth",
            emoji: "\u{1FAE7}",
            color: "#5b8def",
            // Intentionally "created today" — must still show on past days after the fix
            createdAt: today,
            archived: false,
            type: "good",
            schedule: { kind: "daily" },
            dailyLimit: null,
          },
          {
            id: "h-weekdays",
            name: "Gym workout",
            emoji: "\u{1F3CB}\uFE0F",
            color: "#3ecf8e",
            createdAt: today,
            archived: false,
            type: "good",
            schedule: { kind: "weekdays", weekdays: [1, 2, 3, 4, 5] },
            dailyLimit: null,
          },
          {
            id: "h-bad",
            name: "Cigarettes",
            emoji: "\u{1F6AC}",
            color: "#f07178",
            createdAt: today,
            archived: false,
            type: "bad",
            schedule: { kind: "daily" },
            dailyLimit: 3,
          },
        ],
        checks: { [today]: ["h-daily"] },
        counts: { [today]: { "h-bad": 4 } },
      };
      localStorage.setItem("ah.data", JSON.stringify(data));
      localStorage.setItem(
        "ah.settings",
        JSON.stringify({ scriptUrl: "https://example.invalid/exec", autoSync: false, lastSync: null })
      );
    },
    { today }
  );

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("#habit-list .habit-card", { timeout: 15000 });
  await page.waitForSelector("#btn-week-prev");

  const outToday = path.join(root, "_verify-today.png");
  await page.screenshot({ path: outToday });

  // Select yesterday (first non-today chip if present, else week-prev then pick)
  const yesterdayChip = page.locator(".date-chip").filter({ hasNot: page.locator(".today") }).first();
  await yesterdayChip.click();
  await page.waitForTimeout(200);

  const emptyVisible = await page.locator("#empty-state:not(.hidden)").count();
  const habitCount = await page.locator("#habit-list .habit-card").count();
  if (emptyVisible > 0 || habitCount < 1) {
    throw new Error(
      `Past day empty-state bug still present (empty=${emptyVisible}, habits=${habitCount})`
    );
  }

  const outPast = path.join(root, "_verify-past-day.png");
  await page.screenshot({ path: outPast });

  // Check off first good habit on past day
  const checkBtn = page.locator("#habit-list .habit-card:not(.bad-habit) .habit-check").first();
  await checkBtn.click();
  await page.waitForTimeout(200);
  const doneCount = await page.locator("#habit-list .habit-card.done").count();
  if (doneCount < 1) throw new Error("Failed to check habit on past day");

  const outPastChecked = path.join(root, "_verify-past-checked.png");
  await page.screenshot({ path: outPastChecked });

  // Previous week navigation
  await page.click("#btn-week-prev");
  await page.waitForTimeout(200);
  const stripDays = await page.locator(".date-chip .dom").allTextContents();
  if (stripDays.length !== 7) throw new Error("Date strip should show 7 days");
  const outPrevWeek = path.join(root, "_verify-prev-week.png");
  await page.screenshot({ path: outPrevWeek });

  // Habits should still appear on previous week (daily)
  const weekHabits = await page.locator("#habit-list .habit-card").count();
  if (weekHabits < 1) throw new Error("No habits on previous week day");

  // Calendar control present
  const cal = await page.locator("#btn-pick-date").count();
  if (!cal) throw new Error("Missing calendar pick button");

  // Jump via pickDate API (date input change)
  await page.evaluate((d) => {
    const input = document.getElementById("date-picker");
    input.value = d;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, yesterday);
  await page.waitForTimeout(200);
  const header = await page.locator("#header-date").textContent();

  await page.click('button.nav-btn[data-view="stats"]');
  await page.waitForSelector("#view-stats.active");
  await page.waitForTimeout(300);
  const outStats = path.join(root, "_verify-stats.png");
  await page.screenshot({ path: outStats });

  await page.click("button.nav-add");
  await page.waitForSelector("#habit-modal:not(.hidden)");
  await page.waitForTimeout(300);
  const outModal = path.join(root, "_verify-modal.png");
  await page.screenshot({ path: outModal });

  const results = {
    ok: true,
    yesterday,
    header,
    habitCountOnPast: habitCount,
    doneCount,
    weekHabits,
    screenshots: {},
  };
  for (const p of [outToday, outPast, outPastChecked, outPrevWeek, outStats, outModal]) {
    const st = fs.statSync(p);
    results.screenshots[path.basename(p)] = st.size;
    console.log(JSON.stringify({ path: p, bytes: st.size }));
  }
  fs.writeFileSync(path.join(root, "_verify-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
