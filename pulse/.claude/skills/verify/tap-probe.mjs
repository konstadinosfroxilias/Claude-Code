/* Is the .tap hit area REAL?
   Clicks a point that is inside the 44px band but OUTSIDE the painted box,
   and checks the control actually reacted. If this fails, .tap is cosmetic
   and the controls need real height instead. */
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, e = "") => { console.log(`${ok ? "  ✓" : "  ✗"} ${n}${e ? " — " + e : ""}`); if (!ok) fails++; };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "el-GR" });
const page = await ctx.newPage();
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως Έλενα Βασιλείου")');
await page.waitForURL(/member\/home/);
await wait(2500);

// ---- 1. settings switch: click 16px above the painted centre ----
await page.goto(`${BASE}/member/settings/`);
await wait(2000);
const sw = page.locator('button[role="switch"][aria-label="Υπενθυμίσεις συνήθειας"]');
const box = await sw.boundingBox();
const stateBefore = await sw.getAttribute("aria-checked");
// The painted switch is 24px tall; +16px from centre is outside it but inside 44px.
const y = box.y + box.height / 2 - 16;
check("probe point is outside the painted box", y < box.y, `box top ${box.y.toFixed(0)}, click y ${y.toFixed(0)}`);
await page.mouse.click(box.x + box.width / 2, y);
await wait(900);
const stateAfter = await sw.getAttribute("aria-checked");
check("switch toggles from the extended .tap area", stateBefore !== stateAfter, `${stateBefore} → ${stateAfter}`);
// what the browser says is at that point
const hit = await page.evaluate(([px, py]) => {
  const el = document.elementFromPoint(px, py);
  return el ? `${el.tagName.toLowerCase()}${el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : ""}` : "none";
}, [box.x + box.width / 2, y]);
console.log(`     elementFromPoint at the probe: ${hit}`);

// ---- 2. goal-card footer link: click 14px below the painted text ----
await page.goto(`${BASE}/member/home/`);
await wait(2500);
// These two wrap onto separate lines on a phone, so each needs a real 44px
// box — overlapping .tap bands used to make the lower half of "change goal"
// activate the progress link instead.
const edit = page.locator('button:has-text("Άλλαξε στόχο")').first();
const eb = await edit.boundingBox();
check("goal edit control is a real 44px target", eb.height >= 44, `${Math.round(eb.height)}px`);
const link = page.locator('a:has-text("Δες την πρόοδό σου")').first();
const lb = await link.boundingBox();
check("progress link is a real 44px target", lb.height >= 44, `${Math.round(lb.height)}px`);
check("their hit areas do not overlap",
  eb.y + eb.height <= lb.y + 1 || lb.y + lb.height <= eb.y + 1,
  `edit ${Math.round(eb.y)}–${Math.round(eb.y + eb.height)}, link ${Math.round(lb.y)}–${Math.round(lb.y + lb.height)}`);
// a tap near the bottom edge of "change goal" must open the editor, not navigate
await page.mouse.click(eb.x + 20, eb.y + eb.height - 4);
await wait(1200);
check("tapping its bottom edge opens the goal editor",
  (await page.locator("text=Ο εβδομαδιαίος σου στόχος").count()) > 0);
check("and did not navigate to the progress page", !page.url().includes("/progress"));

console.log(fails === 0 ? "\nTAP AREAS: REAL ✔" : `\nTAP AREAS: ${fails} PROBLEM(S) ✗`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
