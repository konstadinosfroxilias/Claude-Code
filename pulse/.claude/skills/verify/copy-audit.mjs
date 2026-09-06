/* Body-neutrality audit: dump every match of appearance/weight/calorie/daily
   framing across the member surfaces, in BOTH languages, with context. */
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Words that would violate the healthy-by-design rules if they appeared in UI copy.
const BAD = [
  "θερμίδ", "κιλά", "κιλό", "ζυγ", "λίπος", "αδυνάτισ", "σιλουέτα", "κάθε μέρα", "καθημερινά",
  "calorie", "calories", "weight", "lbs", "fat loss", "slim", "shred", "burn", "before/after",
  "every day", "daily streak",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [locale, btn, langBtn] of [
  ["el-GR", 'button:has-text("Συνέχεια ως Έλενα Βασιλείου")', null],
  ["en-GB", 'button:has-text("Continue as")', "EN"],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/`);
  if (langBtn) {
    await page.locator(`button:has-text("${langBtn}")`).first().click().catch(() => {});
    await wait(500);
  }
  await page.click(btn);
  await page.waitForURL(/member\/home/);
  await wait(2500);
  console.log(`\n=== ${locale} ===`);
  for (const path of [
    "/member/home/",
    "/member/progress/",
    "/member/profile/",
    "/member/settings/",
    "/member/bookings/",
    "/member/notifications/",
  ]) {
    await page.goto(BASE + path);
    await wait(2000);
    const text = await page.locator("body").innerText();
    const hits = [];
    for (const w of BAD) {
      let i = text.toLowerCase().indexOf(w.toLowerCase());
      while (i >= 0) {
        hits.push(`${w} → …${text.slice(Math.max(0, i - 45), i + w.length + 45).replace(/\n/g, " ")}…`);
        i = text.toLowerCase().indexOf(w.toLowerCase(), i + 1);
      }
    }
    console.log(`${path}: ${hits.length === 0 ? "clean" : ""}`);
    hits.forEach((h) => console.log("   ! " + h));
  }
  await ctx.close();
}
await browser.close();
