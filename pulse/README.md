# PULSE — One pass. Every studio.

A premium, credit-based membership pass for boutique fitness across Greece —
"ClassPass, reimagined and premium-only." One subscription buys credits that
book classes at independent studios (reformer Pilates, CrossFit, boxing &
Muay Thai, EMS, yoga, functional/HIIT) in Thessaloniki and Athens.

It is a **two-sided marketplace** behind role-based auth:

- **Member app** (`/member/*`) — discovery, map + filters, booking with
  dynamic credit pricing, QR check-in, wallet & ledger, subscription tiers,
  favorites, notifications, activity stats.
- **Studio dashboard** (`/studio/*`) — schedule & availability, per-session
  pricing and spots-released controls, roster & check-in, radically
  transparent payouts, analytics.

The whole app runs **end-to-end on mock data** (in-memory, persisted to
`localStorage`, reseeded daily) and is architected so real services plug in
behind one seam with **zero UI changes** — see
[Swapping in a real backend](#swapping-in-a-real-backend).

## Run it

```bash
cd pulse
npm install
npm run dev        # → http://localhost:3000
```

`npm run build && npm start` for a production build. No keys, no env vars
needed — copy `.env.example` to `.env.local` if you want to flip flags.

**Demo accounts** (pick on the `/auth` screen):

| Role | Who | What you'll see |
|---|---|---|
| Member | Έλενα Βασιλείου | Active Plus plan, credit history, upcoming bookings, 3/4 visit cap at CORE Reformer |
| Studio owner | FORGE Athletic Club (Δημήτρης Οικονόμου) | Full schedule, live roster, accrued payouts, analytics |

The two sides share one mock DB: book a FORGE class as Έλενα, sign in as the
studio, check her in on the roster — her ledger settles and the payout flips
to confirmed in real time. *Settings → "Reset demo data"* reseeds everything.

## The strategy, implemented

These aren't copy — they're enforced in code:

- **Premium-only catalog.** 22 boutique studios, floor prices €7–12, where a
  per-class credit model makes economic sense.
- **Anti-cannibalization visit cap.** Hard cap of **4 confirmed visits per
  member per studio per rolling 30 days** (`lib/rules/policy.ts`). Enforced
  at booking time, surfaced everywhere ("x/4 this month" meters, explainer
  cards, a warm block state when reached). PULSE fills empty spots; it never
  replaces a studio membership.
- **Total studio control.** Every session carries its own
  `floorPriceEUR` and `spotsReleasedToPlatform`, set by the studio in the
  schedule editor. The platform never overrides them.
- **Radical payout transparency.** A studio earns **exactly its floor price
  per confirmed attendance**. The payouts screen is a per-attendance ledger:
  one line = one member × one class × the price the studio set. Dynamic
  credit pricing only shapes what the *member pays* — never studio earnings.
- **Flexibility.** No lock-in, instant plan switches, in-app-only
  notifications.

## Core business logic

All rules live in `lib/rules/` — one module each, config-first:

- **Dynamic credit pricing** — `lib/rules/pricing.ts`.
  `creditCost = round(floorPrice / €2 × timeMultiplier × fillMultiplier)`,
  clamped to 3–12 credits. Peak (07–10, 17–21) ×1.2, off-peak ×0.8; nearly
  full ×1.15, empty ×0.9. Every knob sits in `PRICING_CONFIG`.
- **Fees & cutoffs** — `lib/rules/policy.ts`. Free cancellation until the
  studio's cutoff (default 12h, studio-configurable 6/8/12/24h); after that
  a 2-credit late fee. No-show: 3 credits. Top-up packs live here too.
- **Booking → ledger flow** (`lib/services/mock/index.ts`, `booking.*`):
  1. **Reserve** → Booking `reserved` + **pending** credit spend + **pending**
     payout accrual for the studio.
  2. **Check-in** (member QR simulate or studio roster) → both flip to
     **confirmed**: the spend settles, the studio's € locks in.
  3. **Cancel before cutoff** → spend reversed, spot released, no charge.
     **After cutoff** → spend reversed + late fee; **no-show** → fee, payout
     reversed.
- **Wallet** — balance = Σ signed ledger deltas (pending spends already
  reduce it). Subscription cycles self-roll and grant `creditsPerCycle` on
  renewal (`ensureCycleCurrent`).

## Architecture

```
app/                      Next.js App Router (all data screens are client components)
  page.tsx                landing · auth/ · member/* · studio/*
components/
  ui/                     design-system primitives (button, card, dialog, …)
  member/ studio/ shared/ feature components — ZERO direct data imports
lib/
  config.ts               APP_NAME (single rename point), USE_MOCK flag, storage keys
  types/                  the entire domain model + service DTOs
  rules/                  pricing.ts (credit costs) · policy.ts (caps, fees, cutoffs)
  i18n/                   el.ts (master) · en.ts (parity typechecked) · useI18n()
  services/
    types.ts              ★ THE SEAM — typed async interfaces for every domain
    index.ts              getServices() registry, switched by NEXT_PUBLIC_USE_MOCK
    mock/                 the only current implementation (swap target)
  mock/                   seed.ts (Greek catalog generator) · db.ts (localStorage store)
  hooks/                  useLiveQuery (fetch + subscribe to service change feed)
  stores/                 zustand: session (persisted), language prefs
```

**Data flow:** UI component → `useLiveQuery(svc => svc.x.y())` →
`getServices()` → active `Services` implementation. Writes go through the
same services, which emit on the change feed; every live query refetches.
Components never touch `lib/mock` — that directory is an implementation
detail of the mock services.

## Swapping in a real backend

The contract is `Services` in **`lib/services/types.ts`** — eleven small
interfaces (auth, catalog, booking, wallet, subscriptions, payouts, reviews,
notifications, studioAdmin, analytics, demo) plus a `subscribe` change feed.
The UI depends on nothing else.

1. **Create `lib/services/api/`** implementing `Services` against your
   REST/tRPC backend (fetch per method; map errors to `ServiceError` codes —
   the UI already renders `full`, `insufficient_credits`, `visit_cap`,
   `already_booked`, `in_past`).
2. **Wire it** in `lib/services/index.ts`'s else-branch and set
   `NEXT_PUBLIC_USE_MOCK=false`. That's the entire switch.
3. **Real auth** — replace `AuthService` (mock lives in
   `lib/services/mock`, session mirror in `lib/stores/session.ts`) with your
   provider (NextAuth/Clerk/etc.). Keep `getCurrentUser()` and the role
   field; the route guards in `app/member/layout.tsx` / `app/studio/layout.tsx`
   already key off it.
4. **Database** — the entities in `lib/types` map 1:1 to tables
   (Booking, CreditTransaction and PayoutEntry are your ledgers — keep the
   signed-delta + status model; balance stays a fold over the ledger).
   Move `lib/rules/*` server-side unchanged and enforce reserve/check-in/cancel
   in one transaction each.
5. **Stripe Connect** — `WalletService.topUp` → Checkout/PaymentIntents;
   `SubscriptionService.changePlan` → Billing; `PayoutService` → per-studio
   connected accounts, `PayoutEntry.confirmed` ⇒ transfer line items. The
   per-attendance breakdown screen is already the statement UI.
6. **Live updates** — map `Services.subscribe` to your websocket/SSE/poll;
   `useLiveQuery` needs nothing else.
7. Delete `lib/mock/` when done. No component changes.

## Extending the catalog

All seed data lives in **`lib/mock/seed.ts`**:

- **New studio** — add a `StudioSpec` to `STUDIO_SPECS` (name, neighborhood,
  categories, floor price, coords, bilingual description). Class types and a
  weekly schedule generate automatically from its categories.
- **New city / neighborhood** — add to `CITIES` / `NEIGHBORHOODS`
  (id + bilingual name + coords). Filters, map centering and search pick
  them up automatically.
- **New category** — add to the `CategoryId` union (`lib/types`), `CATEGORIES`
  in the seed, a palette in `components/shared/cover-art.tsx`, class-type
  templates in `CLASS_TEMPLATES`, and capacity defaults in `capacityFor`.
- **Plans / packs / fees** — `PLANS` in the seed, `POLICY.topUpPacks`,
  `POLICY` fees.
- **Rename the product** — change `APP_NAME` in `lib/config.ts`.

## Design system

Dark-first, editorial, one volt accent — defined entirely as tokens in
`app/globals.css` (`@theme`): surfaces `#0a0b0e → #21252f`, text tiers
`hi/mid/low`, accent `--color-volt #c8f13f`, semantic good/warn/bad/info,
radii 8–28px, card/pop/volt shadows. Type: Space Grotesk (display, tight
tracking via `.display`) + Inter (body, Greek+Latin). Cover art is generated
(category palette + seeded gradients + contour rings + grain) so the demo
needs no external images. Motion: Framer Motion micro-interactions —
staggered list entrances, credit-count roll on booking, springy QR reveal —
all respecting `prefers-reduced-motion`. Charts use dedicated series steps
(`#7e9a22`, `#6389df`) validated for CVD separation and contrast on the card
surface (not the UI accent, which is too light for data marks).

Bilingual: Greek default, full English. Copy lives in `lib/i18n/el.ts`
(master) and `en.ts` — typed `Record<TranslationKey, string>`, so a missing
translation is a compile error. Data-level text (descriptions, notifications)
uses `LocalizedText {el,en}`.

## Notes & known trade-offs

- Screens are client components by design: the mock DB lives in the browser.
  With a real backend you can migrate reads to server components screen by
  screen — the service interfaces don't change.
- Demo data reseeds after ~20h (sessions are generated relative to "now")
  and on schema version bumps (`STORAGE_KEYS.db`).
- Payments, auth and emails are intentionally stubbed behind the service
  layer; there are no secrets anywhere in the repo.
