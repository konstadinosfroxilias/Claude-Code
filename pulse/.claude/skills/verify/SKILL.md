# Verify PULSE

Surface: GUI in the browser. Everything is client-side (mock DB in
localStorage), so drive it with Playwright — API-level checks prove nothing.

## Launch

```bash
cd pulse && npm run dev   # ready in <1s on :3000
```

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

## Flows worth driving

1. **Core loop:** member books a FORGE slot (balance chip in header drops by
   the sheet's credit cost) → owner `/studio/roster`, pick that session in the
   combobox, Check-in → toast "κατοχυρώθηκαν …€" → `/studio/payouts` top entry
   is that member, Επιβεβαιωμένα.
2. **Guards:** re-open a booked slot → "Έχεις ήδη κράτηση" with confirm
   disabled (or row disabled if the spot filled). Visit-cap meter on studio
   pages.
3. Wallet ledger shows the pending spend; bookings QR dialog renders
   (`svg[height='196']`).

## Gotchas

- The demo member is pre-seeded into one FORGE session (~tomorrow): when
  picking a slot to book, skip rows whose sheet shows the already-booked
  error instead of assuming the first row works.
- Seed is date-relative and Sundays run a reduced schedule; don't assert on
  specific session counts.
