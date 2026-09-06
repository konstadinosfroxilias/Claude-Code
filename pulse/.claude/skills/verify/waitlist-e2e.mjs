/* Waitlist end-to-end, made DETERMINISTIC.

   The old scripts hunted for a FORGE class that happened to be full, which
   depends on the time of day. Instead the studio owner makes one full through
   the real schedule editor (release exactly as many spots as are booked),
   which is a legitimate product action — then:
     member joins the queue → owner frees a spot via no-show → #1 auto-books. */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:3000";
const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const SHOT = (n) => `${SHOTS}wle2e-${n}.png`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, locale: "el-GR" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));

// ---------- owner: make tomorrow's busiest FORGE class full ----------
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως FORGE Athletic Club")');
await page.waitForURL(/\/studio/);
await wait(2000);
await page.goto(`${BASE}/studio/schedule/`);
await page.waitForSelector("text=Πρόγραμμα & διαθεσιμότητα");
await wait(1200);

let madeFull = null;
for (let d = 1; d <= 3 && !madeFull; d++) {
  await page.locator("button").filter({ hasText: /^(Αύριο|[Α-Ωα-ω]{3} \d+ [Α-Ωα-ω]{3,})$/ }).nth(d).click().catch(() => {});
  await wait(1200);
  const rows = page.locator("div").filter({ hasText: /μέσω PULSE/ });
  const badges = await page.locator("text=/\\d+\\/\\d+ μέσω PULSE/").allInnerTexts();
  // pick the row with the most bookings (>=1) so a no-show can free a spot later
  let bestIdx = -1, bestBooked = 0, bestReleased = 0;
  badges.forEach((b, i) => {
    const m = b.match(/(\d+)\/(\d+)/);
    if (m && Number(m[1]) > bestBooked) { bestBooked = Number(m[1]); bestReleased = Number(m[2]); bestIdx = i; }
  });
  if (bestIdx < 0 || bestBooked < 1) continue;
  await page.locator('button[aria-label="Επεξεργασία μαθήματος"]').nth(bestIdx).click();
  await page.waitForSelector("text=Επεξεργασία μαθήματος");
  await wait(600);
  await page.fill("#released", String(bestBooked));
  await page.locator('div[role=dialog] button:has-text("Αποθήκευση")').click();
  await page.waitForSelector("text=Το μάθημα ενημερώθηκε", { timeout: 8000 });
  await wait(1500);
  madeFull = { day: d, booked: bestBooked, wasReleased: bestReleased };
  void rows;
}
check("owner made a class full via the schedule editor", !!madeFull,
  madeFull ? `day+${madeFull.day}, released ${madeFull.wasReleased}→${madeFull.booked}` : "none found");
if (!madeFull) { console.log("\nABORT"); await browser.close(); process.exit(1); }
await page.screenshot({ path: SHOT("1-schedule-full") });

// ---------- member: join that class's waitlist ----------
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως Έλενα Βασιλείου")');
await page.waitForURL(/member\/home/);
await wait(2000);

let joined = false, slotTime = "";
for (let d = 0; d < 5 && !joined; d++) {
  await page.goto(`${BASE}/member/studios/st_forge/`);
  await page.waitForSelector("text=FORGE Athletic Club");
  await wait(1000);
  if (d > 0) {
    await page.locator("section").filter({ hasText: "Πρόγραμμα" }).locator("button").nth(d).click().catch(() => {});
    await wait(1000);
  }
  const fullRows = page.locator("button:has-text('Πλήρες')");
  const n = await fullRows.count();
  for (let i = 0; i < n && !joined; i++) {
    const txt = await fullRows.nth(i).innerText();
    await fullRows.nth(i).click();
    await page.waitForSelector("text=Επιβεβαίωση κράτησης");
    await wait(800);
    const joinBtn = page.locator("div[role=dialog]").locator('button:has-text("Μπες σε λίστα αναμονής")');
    if (await joinBtn.count()) {
      slotTime = txt.match(/\d{2}:\d{2}/)?.[0] ?? "";
      check("waitlist explainer says no charge now",
        (await page.locator("text=/Δεν χρεώνεσαι τώρα/").count()) > 0);
      await page.screenshot({ path: SHOT("2-sheet") });
      await joinBtn.click();
      await page.waitForSelector("text=Μπήκες στη λίστα αναμονής", { timeout: 8000 });
      joined = true;
    } else {
      await page.keyboard.press("Escape");
      await wait(400);
    }
  }
}
check("member joined the waitlist", joined, slotTime);
if (!joined) { console.log("\nABORT"); await browser.close(); process.exit(1); }

await page.goto(`${BASE}/member/bookings/`);
await wait(1800);
check("queue position shown in My bookings",
  (await page.locator("text=/Λίστα αναμονής · #\\d/").count()) > 0);
const balanceBefore = Number((await page.locator("header a[aria-label] span.tnum").first().innerText()).trim());
await page.screenshot({ path: SHOT("3-waitlisted") });

// ---------- owner: free a spot with a no-show ----------
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως FORGE Athletic Club")');
await wait(2000);
await page.goto(`${BASE}/studio/roster/`);
await page.waitForSelector("text=Παρουσίες & check-in");
await wait(1200);

let freed = false;
await page.locator("button[role=combobox]").click();
await wait(400);
const optCount = await page.locator("div[role=option]").count();
await page.keyboard.press("Escape");
for (let i = 0; i < optCount && !freed; i++) {
  await page.locator("button[role=combobox]").click();
  await wait(300);
  await page.locator("div[role=option]").nth(i).click();
  await wait(1000);
  if ((await page.locator("text=/σε αναμονή/").count()) > 0 &&
      (await page.locator('button:has-text("No-show")').count()) > 0) {
    await page.screenshot({ path: SHOT("4-roster") });
    await page.locator('button:has-text("No-show")').first().click();
    await wait(2500);
    freed = true;
  }
}
check("owner freed a spot on the waitlisted class (no-show)", freed);

// ---------- member: auto-booked from the queue ----------
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως Έλενα Βασιλείου")');
await wait(2000);
await page.goto(`${BASE}/member/notifications/`);
await wait(1800);
check("auto-book notification delivered",
  (await page.locator("text=/Αυτόματη κράτηση από τη λίστα/").count()) > 0);
await page.screenshot({ path: SHOT("5-notification") });

await page.goto(`${BASE}/member/bookings/`);
await wait(1800);
check("no longer on the waitlist",
  (await page.locator("text=/Λίστα αναμονής · #\\d/").count()) === 0);
const balanceAfter = Number((await page.locator("header a[aria-label] span.tnum").first().innerText()).trim());
check("promotion turned the soft hold into a real spend", balanceAfter < balanceBefore,
  `${balanceBefore} → ${balanceAfter}`);
await page.screenshot({ path: SHOT("6-after") });

console.log("\nERRORS:", errs.length ? errs.slice(0, 4) : "none");
console.log(fails === 0 ? "\nWAITLIST E2E: ALL GOOD ✔" : `\nWAITLIST E2E: ${fails} ISSUE(S) ✗`);
await browser.close();
