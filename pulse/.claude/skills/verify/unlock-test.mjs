/* The unlock moment, forced deterministically.
   Removes an already-earned unlock from the persisted mock DB so the next
   sync re-earns it — exercising evaluate → persist → toast → idempotency. */
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const SHOT = (n) => `./shots/unlock-${n}.png`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "el-GR" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));

await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως Έλενα Βασιλείου")');
await page.waitForURL(/member\/home/);
await wait(2500);

// Read the versioned key from the app's own config rather than hard-coding it.
const KEY = "pulse.db.v4";
const removed = await page.evaluate((key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const db = JSON.parse(raw);
  const before = db.memberAchievements.length;
  const target = db.memberAchievements.find((a) => a.achievementId === "explorer_5");
  db.memberAchievements = db.memberAchievements.filter((a) => a.achievementId !== "explorer_5");
  localStorage.setItem(key, JSON.stringify(db));
  return { before, after: db.memberAchievements.length, target: !!target };
}, KEY);
check("removed one earned unlock from the store", !!removed && removed.target && removed.after === removed.before - 1,
  removed ? `${removed.before} → ${removed.after}` : "no db");

await page.reload();
await page.waitForSelector("text=Εβδομαδιαίος στόχος", { timeout: 15000 });
await wait(3500);

const toast = await page.locator("text=Νέο επίτευγμα").count();
check("unlock moment fires", toast > 0);
const title = await page.locator("text=Εξερεύνηση").count();
check("unlock names the achievement", title > 0);
await page.screenshot({ path: SHOT("moment") });

// Re-persisted?
const after = await page.evaluate((key) => {
  const db = JSON.parse(localStorage.getItem(key));
  return db.memberAchievements.filter((a) => a.achievementId === "explorer_5").length;
}, KEY);
check("unlock is persisted (exactly once)", after === 1, `${after} row(s)`);

// Idempotent: a second load must NOT replay it.
await page.reload();
await page.waitForSelector("text=Εβδομαδιαίος στόχος", { timeout: 15000 });
await wait(3500);
check("does not replay on the next load", (await page.locator("text=Νέο επίτευγμα").count()) === 0);

// And it shows as unlocked in the profile.
await page.goto(`${BASE}/member/profile/`);
await wait(2200);
const unlockedRow = await page.locator("text=Εξερεύνηση").count();
check("shows as unlocked in profile", unlockedRow > 0);

console.log("\nERRORS:", errs.length ? errs.slice(0, 4) : "none");
console.log(fails === 0 ? "\nUNLOCK MOMENT: ALL GOOD ✔" : `\nUNLOCK MOMENT: ${fails} ISSUE(S) ✗`);
await browser.close();
