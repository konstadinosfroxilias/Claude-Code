# Verify PULSE

Surface: GUI in the browser. Everything is client-side (mock DB in
localStorage), so drive it with Playwright — API-level checks prove nothing.

## Launch

```bash
cd pulse && npm run dev   # ready in <1s on :3000
```

If `node_modules` is missing (containers reclaim it between sessions),
`npm install` first — `tsc` will otherwise report every import as unresolved.

## Drive

Playwright is a devDependency; the environment pins browsers elsewhere, so
launch chromium with the bundled binary:

```js
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
```

Ready-made suites live next to this file and run from the repo root against a
dev server on :3000 (screenshots land in the gitignored `shots/`):

```bash
npx tsx --tsconfig tsconfig.json .claude/skills/verify/rules-test.ts  # pure rules, no browser
node .claude/skills/verify/engagement-test.mjs   # goal · streak · achievements · nudges · discovery · social
node .claude/skills/verify/unlock-test.mjs       # the achievement unlock moment
node .claude/skills/verify/waitlist-e2e.mjs      # waitlist → no-show → auto-book
node .claude/skills/verify/copy-audit.mjs        # body-neutral copy sweep, both languages
node .claude/skills/verify/tap-probe.mjs         # .tap hit areas are real, and don't collide
```

- Each new browser context = empty localStorage = fresh seed (idempotent runs).
- Copy is Greek by default — select by Greek strings, or click `EN` first.
- Sign-in: `/auth` → `button:has-text("Συνέχεια ως Έλενα Βασιλείου")` (member)
  or `…FORGE Athletic Club` (owner). Both roles share the same localStorage DB
  within one context — that's what makes the cross-side flow testable.
- Allow ~800ms after navigation for the mock services' artificial latency.
- The DB key is versioned (`pulse.db.v4` — see `lib/config.ts` `STORAGE_KEYS`).
  If a test reads/writes localStorage directly, **discover** the key rather
  than hard-coding it — bumps happen whenever the seed shape changes, and a
  stale literal fails as a confusing `null` deref:

  ```js
  const KEY = Object.keys(localStorage).find((k) => k.startsWith("pulse.db."));
  ```

## Flows worth driving

1. **Core loop:** member books a FORGE slot (balance chip in header drops by
   the sheet's credit cost) → owner `/studio/roster`, pick that session in the
   combobox, Check-in → toast "κατοχυρώθηκαν …€" → `/studio/payouts` top entry
   is that member, Επιβεβαιωμένα.
2. **Guards:** re-open a booked slot → "Έχεις ήδη κράτηση" with confirm
   disabled (or row disabled if the spot filled). Visit-cap meter on studio
   pages.
3. **Location:** the primer must appear BEFORE any native prompt — assert
   `getCurrentPosition` is called 0 times on load (wrap it in an init script),
   then click "Ενεργοποίηση". Granted → distance labels appear; denied → there
   must be ZERO distance labels anywhere.
4. **Waitlist:** join a full FORGE class ("Πλήρες" rows are tappable) → owner
   frees a spot via No-show → member gets "Αυτόματη κράτηση από τη λίστα".
   To pick the right roster session, loop the combobox options and select the
   one showing the "σε αναμονή" badge — matching on time alone is ambiguous
   across days.
5. **Cap at promotion:** waitlist first (while under the cap), then book up to
   4/4 at that studio, then free a spot → expect "Έχασες μια θέση" and NO
   auto-book.
6. **Calendar/reminders:** `.ics` downloads via a real download event (use
   `acceptDownloads: true`); reminder timers can be asserted by wrapping
   `window.setTimeout` in an init script and checking the armed delays equal
   `sessionStart − 120min` and `− 30min`.
7. Wallet ledger shows the pending spend; bookings QR dialog renders
   (`svg[height='196']`).

## Gotchas

- **Do NOT measure horizontal overflow under mobile emulation.** With
  `isMobile: true`, Chrome expands the *layout viewport* to the content width,
  so `documentElement.scrollWidth - clientWidth` reads ~0 while a real narrow
  browser scrolls sideways. This masked a genuine 1172px overflow on the home
  page. Measure it like a user instead, in a plain (non-emulated) context:

  ```js
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // …
  await page.evaluate(() => { window.scrollTo(9999, 0); const x = window.scrollX;
    window.scrollTo(0, 0); return x; });   // must be 0
  ```
  Check 390 emulated, 390 plain, and 1280 — they disagree.
- **Transformed children escape a scroll container's clip.** framer-motion
  leaves a `translateY(0px)` on elements after an entrance animation, and such
  descendants leak a horizontal rail's full width into the page.
  `overflow-x: hidden` does not contain them; `contain: paint` does (see the
  rail in `components/member/near-you.tsx`). If a new rail animates its cards,
  it needs the same treatment.
- A naive "element right edge > viewport" scan flags content that is simply
  scrolled inside a rail. Before believing it, walk up the ancestors and skip
  anything inside an `auto`/`scroll`/`hidden`/`clip` container.
- The demo member is pre-seeded into one FORGE session (~tomorrow): when
  picking a slot to book, skip rows whose sheet shows the already-booked
  error instead of assuming the first row works.
- Seed is date-relative and Sundays run a reduced schedule; don't assert on
  specific session counts.
- Seeded visit history feeds the cap. The demo member sits at 3/4 at CORE by
  design — if a change makes them 4/4, booking there is blocked and several
  tests will fail for what looks like an unrelated reason (see the day offsets
  in `prevSpends`, `lib/mock/seed.ts`).

## Tap targets

Controls must be ≥44px on touch. Audit by measuring every
`button,a,[role=button],input,[role=combobox]` rect at 390px. Two entries are
expected to fall below and are fine:

- the OpenStreetMap attribution links (required fine print), and
- the settings toggle (`components/ui/switch.tsx`), painted 40×24 but carrying
  `.tap`, which gives it a real 44px hit area.

**`.tap` is invisible to a rect-based audit.** It enlarges the hit area with a
`::after` overlay, so `getBoundingClientRect()` still reports the small painted
box. Prove the area is real by clicking outside the painted box and asserting
the control reacted (`.claude/skills/verify/tap-probe.mjs`) — `document.elementFromPoint`
should return the control itself.

**Never stack two `.tap` controls vertically.** Their 44px bands overlap and
the later sibling silently steals the other's taps — this bit the goal card's
footer, where a tap just under "change goal" navigated to the progress page
instead. Two controls that can wrap onto separate lines need real height
(`min-h-11 … sm:min-h-0`), not overlapping pseudo-elements.

## Engagement layer

- `.claude/skills/verify/rules-test.ts` (run with `npx tsx`) covers the healthy-by-design
  invariants directly against `lib/rules/engagement.ts`: goal clamping, one
  rest week preserved / two breaking the run, ease-off for frequent trainers,
  nudges silent when muted or when the goal is met. Run it before touching
  that module — it is much faster than driving the browser, and those rules
  are the product's non-negotiables.
- The rules refuse to count a class that hasn't started yet. A test fixture
  that places "attended" classes later today will silently under-count.
- **Forcing an unlock moment:** achievements are idempotent, so a fresh member
  won't produce one on demand. Delete one row from `memberAchievements` in the
  persisted DB and reload — the next sync re-earns it, exercising the real
  evaluate → persist → toast path (`.claude/skills/verify/unlock-test.mjs`).
- The demo member's seeded history is WEEK-relative, so the pattern
  (`2 · 2 · 3 · rest · 2 · 3 · 2 · current`) holds whatever weekday you run on.
  Don't assert absolute class counts; assert the shape.

## Copy safety

Greek substring matching produces false alarms: a bare `κιλ` matches
**ποι-κιλ-ία** ("variety"), which is exactly the framing the product wants.
Match whole words. `.claude/skills/verify/copy-audit.mjs` sweeps every member surface in
both languages for weight/calorie/appearance/daily-streak language and should
always report clean.

Likewise, "no Greek in EN mode" must be scoped to UI **chrome** with data
tokens stripped: studio addresses, instructor and member names, and reviews
(`Review.lang`) are deliberately Greek in both languages.
