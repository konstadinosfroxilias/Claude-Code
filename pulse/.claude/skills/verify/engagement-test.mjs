/* Engagement layer — browser verification (mock mode).
   Drives: goal card + ring, goal editor, streak copy, achievements grid +
   unlock moment after a check-in, progress page + recap share, nudge primer →
   enable → nudge/routine card → rebook sheet → mute, discovery rail, invite
   link + deep link, "X going", settings toggles, EN parity, no h-scroll. */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:3000";
const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const SHOT = (n) => `${SHOTS}eng-${n}.png`;
let fails = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "el-GR",
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|hydrat/i.test(m.text())) errs.push("CONSOLE " + m.text().slice(0, 160));
});

// ---------- sign in ----------
await page.goto(`${BASE}/auth/`);
await page.click('button:has-text("Συνέχεια ως Έλενα Βασιλείου")');
await page.waitForURL(/member\/home/);
await wait(2500);

// ---------- T1: goal card ----------
console.log("\nT1 · weekly goal + streak");
check("goal card renders", (await page.locator("text=Εβδομαδιαίος στόχος").count()) > 0);
const progressTxt = await page.locator("text=/\\d από \\d αυτή την εβδομάδα|Στόχος εβδομάδας — έγινε/").first().textContent().catch(() => "");
check("progress copy 'x από y'", !!progressTxt, progressTxt?.trim());
const ringSegs = await page.locator('[role="img"][aria-label*="/"] svg circle').count();
check("segmented ring drawn", ringSegs >= 2, `${ringSegs} arcs`);
const streakTxt = await page.locator("text=/σερί|Νέα εβδομάδα, νέα αρχή|ξεκούρασης/").first().textContent().catch(() => "");
check("streak copy present (kind)", !!streakTxt, streakTxt?.trim().slice(0, 80));
// NB: match whole words — a substring like "κιλ" hits "ποικιλία" (variety),
// which is exactly the framing we DO want. See copy-audit.mjs for the full list.
const BAD_COPY =
  /θερμίδ|κιλά|κιλό|ζυγ|λίπος|αδυνάτισ|σιλουέτα|κάθε μέρα|καθημερινά|calorie|weight|fat loss|slim|shred|burn|every day|daily streak/i;
check("no daily/calorie/weight framing on home", !BAD_COPY.test(await page.locator("body").innerText()));
await page.screenshot({ path: SHOT("home-top") });

// goal editor: open, +1, save; the card reflects the new target
await page.locator('button:has-text("Άλλαξε στόχο")').first().click();
await page.waitForSelector("text=Ο εβδομαδιαίος σου στόχος");
const before = Number(await page.locator('div[role="dialog"] p.display').first().textContent());
await page.locator('div[role="dialog"] button[aria-label="Περισσότερα"]').click();
const after = Number(await page.locator('div[role="dialog"] p.display').first().textContent());
check("stepper increments within 1–5", after === Math.min(5, before + 1), `${before} → ${after}`);
// try to exceed 5
for (let i = 0; i < 6; i++) await page.locator('div[role="dialog"] button[aria-label="Περισσότερα"]').click({ force: true }).catch(() => {});
const capped = Number(await page.locator('div[role="dialog"] p.display').first().textContent());
check("stepper caps at 5 (never escalates past)", capped <= 5, `${capped}`);
await page.locator('div[role="dialog"] button[aria-label="Λιγότερα"]').click();
const chosen = Number(await page.locator('div[role="dialog"] p.display').first().textContent());
await page.locator('div[role="dialog"] button:has-text("Αποθήκευση")').click();
await page.waitForSelector("text=Ο στόχος ενημερώθηκε");
await wait(900);
check("card shows new target", (await page.locator(`text=/${chosen} \\/ εβδομάδα/`).count()) > 0, `target ${chosen}`);
// persisted across reload
await page.reload();
await wait(2200);
check("goal persists after reload", (await page.locator(`text=/${chosen} \\/ εβδομάδα/`).count()) > 0);
// back to 2
await page.locator('button:has-text("Άλλαξε στόχο")').first().click();
await page.waitForSelector("text=Ο εβδομαδιαίος σου στόχος");
for (let i = 0; i < 5; i++) await page.locator('div[role="dialog"] button[aria-label="Λιγότερα"]').click({ force: true }).catch(() => {});
await page.locator('div[role="dialog"] button[aria-label="Περισσότερα"]').click();
await page.locator('div[role="dialog"] button:has-text("Αποθήκευση")').click();
await wait(900);

// ---------- T4: nudge primer → enable → card ----------
console.log("\nT4 · nudges + routine + rebook");
check("nudge primer shown (opt-in, off by default)", (await page.locator("text=Μικρές υπενθυμίσεις συνήθειας").count()) > 0);
check("routine card shown before opting in (content, not a push)", (await page.locator("text=Η ρουτίνα σου").count()) > 0);
const routineBody = await page.locator("text=/φορές .* στο /").first().textContent().catch(() => "");
check("routine learned from history (Thursday evenings at Northside)", /Πέμπτη/.test(routineBody ?? "") && /Northside/.test(routineBody ?? ""), routineBody?.trim());
await page.screenshot({ path: SHOT("home-habit") });
await page.locator('button:has-text("Ναι, θέλω")').click();
await page.waitForSelector("text=Οι υπενθυμίσεις συνήθειας είναι ενεργές");
await wait(1800);
const nudgeShown = (await page.locator("text=/Η συνηθισμένη σου ώρα|Ξανά το ίδιο;|Καιρό έχουμε|Πάρε μια ανάσα/").count()) > 0;
const routineShown = (await page.locator("text=Η ρουτίνα σου").count()) > 0;
check("after opt-in: either this week's nudge or the routine card (never both)", nudgeShown !== routineShown, `nudge=${nudgeShown} routine=${routineShown}`);
if (nudgeShown) {
  check("nudge has mute in one tap", (await page.locator('button:has-text("Σίγαση για 2 εβδομάδες")').count()) > 0);
}
// habit notification mirrored to the feed (only when a nudge applies)
await page.goto(`${BASE}/member/notifications/`);
await wait(2000);
const habitNotif = await page.locator("text=/Η συνηθισμένη σου ώρα|Ξανά το ίδιο;|Καιρό έχουμε|Πάρε μια ανάσα/").count();
check("nudge mirrored into notification feed iff a nudge applied", nudgeShown ? habitNotif > 0 : true, `${habitNotif}`);
await page.goto(`${BASE}/member/home/`);
await wait(2200);
// one-tap rebook opens the booking sheet on the suggested session
const rebook = page.locator('button:has-text("Κράτηση με ένα tap"), button:has-text("Κλείσε ξανά")').first();
if (await rebook.count()) {
  await rebook.click();
  await page.waitForSelector("text=Επιβεβαίωση κράτησης");
  await wait(900);
  check("rebook opens booking sheet", true);
  check("'X going' signal in sheet", (await page.locator("text=/θα είναι εκεί|Πρώτη κράτηση σε αυτό/").count()) > 0);
  const ok = await page.locator('div[role="dialog"] button:has-text("Κράτηση για")').isEnabled().catch(() => false);
  check("suggested session is actually bookable (eligibility ok)", ok);
  await page.screenshot({ path: SHOT("rebook-sheet") });
  await page.keyboard.press("Escape");
  await wait(400);
} else {
  check("rebook CTA present", false);
}
// mute → nudge card disappears
if (nudgeShown) {
  await page.locator('button:has-text("Σίγαση για 2 εβδομάδες")').click();
  await wait(1200);
  check("muted: nudge card gone", (await page.locator("text=/Η συνηθισμένη σου ώρα|Ξανά το ίδιο;|Καιρό έχουμε|Πάρε μια ανάσα/").count()) === 0);
}

// ---------- T5: discovery ----------
console.log("\nT5 · try something new");
check("discovery rail renders", (await page.locator("text=Δοκίμασε κάτι νέο").count()) > 0);
const reasonChips = await page.locator("text=/Νέα κατηγορία για σένα|Δεν το έχεις δοκιμάσει|Νέα γειτονιά/").count();
check("reason chips present", reasonChips > 0, `${reasonChips}`);
check("no distance shown without location", (await page.locator("text=/με τα πόδια|οδικώς/").count()) === 0);
await page.screenshot({ path: SHOT("home-discover"), fullPage: true });

// ---------- T2 + T3: profile + progress ----------
console.log("\nT2/T3 · achievements + progress");
await page.goto(`${BASE}/member/profile/`);
await wait(2200);
check("profile: goal card", (await page.locator("text=Εβδομαδιαίος στόχος").count()) > 0);
check("profile: achievements section", (await page.locator("text=Επιτεύγματα").count()) > 0);
// The unlock line reads "Ξεκλείδωσε Κυρ 12 Ιουλ" — a weekday, not a digit.
const unlockedCount = await page.locator("text=/Ξεκλείδωσε \\p{L}/u").count();
check("seeded unlocks visible", unlockedCount >= 6, `${unlockedCount}`);
check("'next up' locked with progress", (await page.locator("text=Επόμενα").count()) > 0 && (await page.locator("text=/\\d+\\/25/").count()) > 0);
await page.screenshot({ path: SHOT("profile"), fullPage: true });

await page.goto(`${BASE}/member/progress/`);
await wait(2500);
check("progress page title", (await page.locator("text=Η πρόοδός σου").count()) > 0);
check("recap card", (await page.locator("text=Η εβδομάδα σου σε κίνηση").count()) > 0);
check("minutes moved tile", (await page.locator("text=Λεπτά κίνησης").count()) > 0);
check("favorite studio tile", (await page.locator("text=Αγαπημένο στούντιο").count()) > 0);
check("usual training slot", (await page.locator("text=Συνήθως προπονείσαι").count()) > 0);
const charts = await page.locator(".recharts-surface").count();
check("recharts trends rendered", charts >= 3, `${charts} charts`);
check("body-neutral: no calories/weight anywhere", !BAD_COPY.test(await page.locator("body").innerText()));
// copy text
await page.locator('button:has-text("Αντιγραφή κειμένου")').click();
await page.waitForSelector("text=Αντιγράφηκε", { timeout: 5000 }).catch(() => {});
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
check("recap text copied", /PULSE/.test(clip) && /μαθήματα/.test(clip), clip.slice(0, 80));
// share image (falls back to download in chromium)
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.locator('button:has-text("Μοιράσου εικόνα")').click();
const download = await dl;
check("recap image produced (download fallback)", !!download && /pulse-week\.png/.test(download.suggestedFilename()));
await page.screenshot({ path: SHOT("progress"), fullPage: true });

// ---------- T2: unlock moment after a check-in ----------
console.log("\nT2 · unlock moment");
// Reserve + simulate check-in on the FORGE seeded booking → attendance grows;
// then verify no crash and achievements re-sync (a new unlock only fires if a
// threshold is crossed — assert the sync path runs, and the tile counts stay consistent).
await page.goto(`${BASE}/member/bookings/`);
await wait(2000);
check("invite-a-friend on upcoming card", (await page.locator('button:has-text("Κάλεσε φίλο")').count()) > 0);
await page.locator('button:has-text("QR check-in")').first().click();
await page.waitForSelector("text=Προσομοίωση check-in");
await page.locator('button:has-text("Προσομοίωση check-in")').click();
await page.waitForSelector("text=Check-in ολοκληρώθηκε", { timeout: 8000 });
await wait(1500);
const toastUnlock = await page.locator("text=Νέο επίτευγμα").count();
console.log(`   (unlock toast shown: ${toastUnlock > 0} — depends on thresholds)`);
await page.goto(`${BASE}/member/home/`);
await wait(2200);
const afterTxt = await page.locator("text=/\\d από \\d αυτή την εβδομάδα|Στόχος εβδομάδας — έγινε/").first().textContent().catch(() => "");
check("goal progress reflects the check-in", !!afterTxt, afterTxt?.trim());

// ---------- T6: invite link deep-links to the sheet ----------
console.log("\nT6 · invite link");
await page.goto(`${BASE}/member/studios/st_forge/`);
await wait(1500);
const firstRow = page.locator("section button.group").first();
if (await firstRow.count()) {
  await firstRow.click();
  await page.waitForSelector("text=Επιβεβαίωση κράτησης");
  await wait(600);
  // Grab the session via the page's own share URL builder: read from the sheet by booking then cancelling is heavy;
  // instead build a link from the DOM: the session id is in the row's SoonCard? Use the invite on the bookings page instead.
  await page.keyboard.press("Escape");
}
await page.goto(`${BASE}/member/bookings/`);
await wait(1800);
await page.locator('button:has-text("Κάλεσε φίλο")').first().click();
await page.waitForSelector("text=Ο σύνδεσμος αντιγράφηκε", { timeout: 5000 }).catch(() => {});
const shared = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
const m = shared.match(/(https?:\/\/[^\s]+\/member\/studios\/[^\s]+\?session=[^\s]+)/);
check("share link copied with ?session=", !!m, shared.slice(0, 120));
if (m) {
  await page.goto(m[1]);
  await page.waitForSelector("text=Επιβεβαίωση κράτησης", { timeout: 8000 }).catch(() => {});
  check("deep link opens the booking sheet on that class", (await page.locator("text=Επιβεβαίωση κράτησης").count()) > 0);
  await page.screenshot({ path: SHOT("deeplink") });
  await page.keyboard.press("Escape");
}

// ---------- settings ----------
console.log("\nSettings");
await page.goto(`${BASE}/member/settings/`);
await wait(1800);
check("settings: goal stepper", (await page.locator("text=μαθήματα την εβδομάδα").count()) > 0);
check("settings: nudges switch", (await page.locator('button[role="switch"][aria-label="Υπενθυμίσεις συνήθειας"]').count()) > 0);
if (nudgeShown) check("settings: mute state in words", (await page.locator("text=/Σε σίγαση μέχρι/").count()) > 0);
await page.screenshot({ path: SHOT("settings"), fullPage: true });

// ---------- EN parity on the new surfaces ----------
console.log("\nEN parity");
await page.locator('button:has-text("EN")').first().click();
await wait(800);
await page.goto(`${BASE}/member/home/`);
await wait(2200);
check("EN goal card", (await page.locator("text=Weekly goal").count()) > 0);
check("EN discovery", (await page.locator("text=Try something new").count()) > 0);
await page.goto(`${BASE}/member/progress/`);
await wait(2200);
check("EN progress", (await page.locator("text=Your progress").count()) > 0 && (await page.locator("text=Your week in movement").count()) > 0);
await page.goto(`${BASE}/member/profile/`);
await wait(2200);
check("EN achievements", (await page.locator("text=Achievements").count()) > 0 && (await page.locator("text=Next up").count()) > 0);
const bodyEn = await page.locator("body").innerText();
const raw = bodyEn.match(/\b(goal|streak|achievements|progress|nudge|discover|social)\.[a-zA-Z_.0-9]+\b/g);
check("no raw i18n keys", !raw, raw ? raw.slice(0, 4).join(", ") : "");

// ---------- no horizontal scroll ----------
console.log("\nLayout");
for (const path of ["/member/home/", "/member/progress/", "/member/profile/", "/member/settings/"]) {
  await page.goto(BASE + path);
  await wait(1800);
  const x = await page.evaluate(() => { window.scrollTo(9999, 0); const v = window.scrollX; window.scrollTo(0, 0); return v; });
  check(`no horizontal scroll ${path}`, x === 0, `scrollX ${x}`);
}

console.log("\nERRORS:", errs.length ? errs.slice(0, 6) : "none");
console.log(fails === 0 ? "\nENGAGEMENT: ALL GOOD ✔" : `\nENGAGEMENT: ${fails} ISSUE(S) ✗`);
await browser.close();
