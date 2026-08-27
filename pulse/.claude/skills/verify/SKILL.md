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

- Each new browser context = empty localStorage = fresh seed (idempotent runs).
- Copy is Greek by default — select by Greek strings, or click `EN` first.
- Sign-in: `/auth` → `button:has-text("Συνέχεια ως Έλενα Βασιλείου")` (member)
  or `…FORGE Athletic Club` (owner). Both roles share the same localStorage DB
  within one context — that's what makes the cross-side flow testable.
- Allow ~800ms after navigation for the mock services' artificial latency.
- The DB key is versioned (`pulse.db.v3` — see `lib/config.ts` `STORAGE_KEYS`).
  If a test reads/writes localStorage directly, read the key from there rather
  than hard-coding it; bumps happen whenever the seed shape changes.

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
`button,a,[role=button],input,[role=combobox]` rect at 390px. Expect only the
OpenStreetMap attribution links to fall below — those are required fine print.
