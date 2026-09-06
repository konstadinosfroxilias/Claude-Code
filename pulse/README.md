# PULSE — One pass. Every studio.

A premium, credit-based membership pass for boutique fitness across Greece —
"ClassPass, reimagined and premium-only." One subscription buys credits that
book classes at independent studios (reformer Pilates, CrossFit, boxing &
Muay Thai, EMS, yoga, functional/HIIT) in Thessaloniki and Athens.

It is a **two-sided marketplace** behind role-based auth:

- **Member app** (`/member/*`) — discovery, map + filters, booking with
  dynamic credit pricing, QR check-in, wallet & ledger, subscription tiers,
  favorites, notifications, activity stats, and a
  [habit/engagement layer](#the-engagement-layer-habit-not-compulsion)
  (weekly goal, rest-tolerant streak, achievements, progress, gentle nudges).
- **Studio dashboard** (`/studio/*`) — schedule & availability, per-session
  pricing and spots-released controls, roster & check-in, radically
  transparent payouts, analytics.

It runs on **either of two interchangeable backends**, selected by a single env
flag and with **zero UI differences** between them:

- **Mock** (default) — in-memory, persisted to `localStorage`, reseeded daily.
  No accounts, no network, works offline.
- **Supabase** — real Postgres with row-level security, auth, atomic
  booking/ledger functions and realtime.

See [Two backends, one contract](#two-backends-one-contract).

## Run it

```bash
cd pulse
npm install
npm run dev        # → http://localhost:3000
```

`npm run build && npm start` for a production build. No keys and no env vars
are needed for mock mode; copy `.env.example` to `.env.local` to change
anything. To run against a real database instead, see
[Running against Supabase](#running-against-supabase).

**Demo accounts** (pick on the `/auth` screen):

| Role | Who | What you'll see |
|---|---|---|
| Member | Έλενα Βασιλείου | Active Plus plan, credit history, upcoming bookings, 3/4 visit cap at CORE Reformer, 8 weeks of attendance (with a rest week), a weekly goal, 10 unlocked achievements |
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

## Discovery, waitlist & reminders

- **Location, asked for properly.** A soft primer explains the value first;
  `navigator.geolocation.getCurrentPosition` is *never* called cold, and
  "Not now" is remembered. Granted → every studio card, session row and the
  studio header shows walk/drive time + distance. Denied or unavailable →
  **no distance is shown anywhere**, with no placeholder and no estimate.
- **"Near you, starting soon"** on the member home aggregates classes
  starting within the next 6 hours. With location it ranks on a blend of
  urgency and travel time (penalising classes you couldn't physically reach);
  without it, purely by start time. Capped studios appear disabled with the
  cap explainer rather than vanishing.
- **Waitlist with auto-book.** A full class offers "Join waitlist" — no
  credits are charged, just a soft hold verified against your balance. When a
  spot frees (member cancels, studio marks a no-show), position #1 is booked
  automatically: the hold becomes a pending spend, a pending payout accrues,
  and both member and studio are notified. Promotion re-checks the visit cap
  and balance — anyone who no longer qualifies is skipped, told why, and the
  next in queue is tried. Studios see waitlist counts on the overview,
  schedule and roster.
- **Reminders & calendar.** Every upcoming booking exports a real `.ics`
  (RFC 5545, with a 30-minute `VALARM`) or opens a Google Calendar template —
  both entirely client-side. In-app reminders fire at 2 h and 30 min before
  class while a PULSE tab is open, optionally as real browser notifications
  behind an opt-in primer. **Background push is not faked** — see
  [Where to plug in real push](#where-to-plug-in-real-push).

## The engagement layer (habit, not compulsion)

A motivation layer sits on top of booking whose only job is to help a member
build a **real, sustainable movement habit** — which is what ultimately fills
studio spots. It is derived almost entirely from attendance the app already
records; the member never logs anything.

- **Weekly goal + progress ring.** A self-chosen target of **1–5 classes a
  week** (default 2, changeable anytime in the goal card, profile or
  settings). Home and profile show a segmented ring — "2 of 3 this week" —
  that resets each week. Meeting it fires one warm celebration per week.
- **Week-based streak with rest tolerance.** Consecutive *weeks* with at least
  one class. **A single rest week never breaks it**; two quiet weeks in a row
  simply end the run. The four states each get their own kind copy:
  `on_track`, `building` ("the week is open"), `rested` ("you took a rest week
  — that counts too"), `fresh_start` ("new week, fresh start"). There is no
  daily streak anywhere, by design — daily targets push overtraining.
- **Achievements** (13) reward consistency and variety, never volume extremes:
  first booking, first check-in, 5/10/25/50 classes, first week at goal, four
  consecutive weeks at goal, three categories, a second neighborhood, five
  studios, an early-morning class, and a **comeback after a break** (framed as
  a win). Locked ones appear as a gentle "next up" with honest progress.
- **Your progress** (`/member/progress`): classes this month and all-time,
  **minutes moved**, category mix, favorite studio, usual training day and
  time band, plus 8-week and 6-month trends in Recharts (same validated chart
  steps as the studio dashboard).
- **"Your week in movement"** recap card, shareable as a PNG rendered on a
  canvas or as plain text — both entirely client-side, nothing is uploaded.
- **Habit nudges**, opt-in behind the same soft-primer pattern as location and
  reminders. At most one per week, learned from the member's own history:
  their usual slot, a rebook of the last class, or a kind "it's been a while"
  after 14 quiet days. **One tap mutes them for two weeks**; settings has a
  switch and shows the mute state in words.
- **Ease off, don't push.** A member averaging **5+ classes a week over 3 of
  the last 4 weeks** gets exactly one message — "take a breath, a lighter week
  will do you more good" — and no booking nudges at all. Anyone who has
  already met the week's goal gets no nudge either.
- **Your routine** — the next logical booking (usual slot, else the last
  class), bookable in one tap. Shown when no nudge applies, so home never
  stacks two prompts.
- **Try something new** — untried categories first, then new neighborhoods,
  then untried studios, ranked by distance *only* when location was granted,
  preferring a beginner-friendly upcoming class. Entirely optional: no badge,
  streak or nudge is attached to it.
- **Light social, no competition.** "Invite a friend" shares a deep link that
  opens the booking sheet on that exact class, and a session shows a plain
  "3 going". **There are no leaderboards and no member-vs-member comparison
  anywhere** — that is a deliberate product constraint, not an omission.

### Healthy by design — constraints future changes must preserve

These are enforced in code, not just in copy. `lib/rules/engagement.ts` is the
single place they live, and the reasoning is in comments there.

| Constraint | Where it is enforced |
|---|---|
| Motivate via consistency, progress, variety, enjoyment — **never** appearance, body shape, weight or calories | The domain model has no such concept; progress is counted in classes and **minutes moved** only |
| Goals and streaks are **weekly**, never daily | `computeWeeklyProgress`, `computeStreak` bucket by ISO week (Monday) |
| Rest is part of training | One rest week is skipped, not penalised (`computeStreak`); `rested` copy is warm |
| Targets stay 1–5 and never auto-escalate | `clampGoal` + the stepper's own bounds; nothing in the app ever raises a target |
| Frequent trainers are eased, not pushed | `planNudges` returns `["ease_off"]` and nothing else past the threshold |
| Nudges are opt-in and muteable | `EngagementPrefs.nudgesEnabled` defaults false; `isMuted` short-circuits `planNudges` |
| A met goal never triggers another prompt | `planNudges` returns `[]` once `progress.met` |
| Missed weeks are never failure | No "lost streak" state exists — the fourth state is `fresh_start` |
| No comparison mechanics | No ranking data is computed or stored; "X going" is a count, never a list or a rank |

### Engagement data — what is stored vs derived

Only **four** collections are persisted (in the same localStorage mock store as
everything else). Everything visible is recomputed from bookings on read, so
nothing can drift:

| Persisted | Shape |
|---|---|
| `goals` | `{ userId, weeklyTarget, updatedAt }` |
| `memberAchievements` | `{ userId, achievementId, unlockedAt }` |
| `engagementPrefs` | `{ userId, nudgesEnabled, nudgesMutedUntil?, updatedAt }` |
| `nudgeDeliveries` | `{ userId, nudgeId, deliveredAt }` — makes a nudge fire once |

Derived on every read from `Booking` + `Session` + `ClassType` + `Studio` via
`buildAttendanceFacts` (`lib/mock/facts.ts`) and the pure rules: weekly
progress, streak, achievement eligibility, insights, the recap, the inferred
routine and every nudge decision. The achievements **catalog** is a constant
(`ACHIEVEMENTS`), not data.

The seed gives the demo member eight weeks of history shaped as
`2 · 2 · 3 · rest · 2 · 3 · 2 · (current)` — deliberately including a rest week
— so the streak, the "next up" badges, the trends and the recap all look real
on first load, and Thursday evenings at Northside Boxing Lab read as a routine.
Unlocks are not hand-written: the seed runs the same `evaluateAchievements`
the app uses, so day-one state is exactly what that history earns.

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
- **Visit-cap window** — `countVisitsInWindow` opens the rolling window
  `rollingWindowDays` before the *earlier* of now and the session being
  attempted, and leaves it open, so every active booking counts: past visits
  in the rolling month **and** all upcoming holds. Anchoring this way is what
  keeps the "x/4 used this month" meter and the actual enforcement identical —
  if the window merely ended at the attempted session's start, a member could
  hold a 5th visit by queuing an early class and then booking four later ones.
  The same function backs display, booking and waitlist promotion.

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
                          engagement.ts (goals, streaks, achievements, nudges — PURE)
  geo/                    haversine + walk/drive travel estimates (pure)
  calendar/               .ics builder + Google Calendar url (pure, client-side)
  share/                  recap-image.ts — canvas PNG for the weekly recap
  reminders/              opt-in store, Notification helpers, PUSH SEAM (TODO)
  i18n/                   el.ts (master) · en.ts (parity typechecked) · useI18n()
  services/
    types.ts              ★ THE SEAM — typed async interfaces for every domain
    index.ts              getServices() registry, switched by NEXT_PUBLIC_USE_MOCK
    mock/                 backend #1: localStorage
      engagement.ts       goal/streak/achievement/nudge/discovery reads + writes
    supabase/             backend #2: Postgres (mappers.ts · realtime.ts)
  supabase/               client singleton + GENERATED database.types.ts
  mock/                   seed.ts (Greek catalog generator) · db.ts (localStorage store)
                          facts.ts (bookings → attendance facts for the rules)
  hooks/                  useLiveQuery (fetch + subscribe to service change feed)
  stores/                 zustand: session, language prefs, geo, engagement UI
                          (all persisted; engagement.ts holds per-DEVICE state only)
```

```
supabase/
  migrations/             0001 core · 0002 engagement · 0003 functions
                          0004 RLS · 0005 realtime · 0006 views
  seed-data.ts            mock seed → rows (the mock↔Supabase parity guarantee)
  seed.ts                 seeds a hosted project (npm run db:seed)
  scripts/                migrations runner · type generator · local seed
                          test_logic.sql · verify-parity.ts · smoke.ts
```

**Data flow:** UI component → `useLiveQuery(svc => svc.x.y())` →
`getServices()` → active `Services` implementation. Writes go through the
same services, which emit on the change feed; every live query refetches.
Components never touch `lib/mock`, `lib/supabase` or `@supabase/supabase-js` —
those are implementation details of the two service backends.

## Two backends, one contract

The contract is `Services` in **`lib/services/types.ts`** — twelve small
interfaces (auth, catalog, booking, wallet, subscriptions, payouts, reviews,
notifications, studioAdmin, analytics, engagement, demo) plus a `subscribe`
change feed. The UI depends on nothing else, and there are now **two complete
implementations** of it:

| `NEXT_PUBLIC_USE_MOCK` | Implementation | What you get |
|---|---|---|
| `true` (default) | `lib/services/mock` | Everything in `localStorage`. No accounts, no network, works on a plane. "Reset demo data" reseeds it. |
| `false` | `lib/services/supabase` | Real Postgres: RLS, auth, atomic booking/ledger functions, realtime. |

Switching is a one-line env change. **No component code differs between the
two** — components never import Supabase, and `getServices()` is the only thing
that knows which backend is live.

Two rules keep them honest:

- Anything that must be **atomic** (booking, check-in, cancel, waitlist
  promotion, top-up) is a Postgres function. The Supabase service only calls
  `rpc()` and re-throws the same `ServiceError` codes the UI already renders.
- Anything that is a **rule** is imported from `lib/rules/*` by *both*
  implementations. The entire engagement layer runs through
  `lib/rules/engagement.ts` on either backend, so streak, goal and achievement
  logic literally cannot drift. Numbers that SQL also needs (`PRICING_CONFIG`,
  `POLICY`) are pushed into the `pricing_config` and `platform_policy` tables
  by the seed rather than retyped in SQL.

## Running against Supabase

```bash
# 1. Create a project at supabase.com, then:
cp .env.example .env.local          # fill in URL + anon key + service-role key

# 2. Apply the schema (or `supabase db push` if you use the CLI)
export DATABASE_URL="postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres"
npm run db:migrate

# 3. Load the demo data — the same content mock mode shows
npm run db:seed

# 4. Prove the wiring end to end (signs in, books, cancels, under RLS)
npm run db:smoke

# 5. Flip the switch and restart
echo "NEXT_PUBLIC_USE_MOCK=false" >> .env.local
npm run dev
```

The seed is **idempotent** — every row upserts on its primary key and auth
users are created only if missing, so re-running changes nothing. Because the
schedule is generated relative to "now", re-run it whenever the demo classes
have drifted into the past.

After any migration, regenerate the DB types:

```bash
supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
# or, with no Docker and no CLI:
npm run db:types -- "$DATABASE_URL"
```

### What lives where

| File | Contents |
|---|---|
| `supabase/migrations/0001_core.sql` | Enums, lookup tables, profiles, studios, sessions, bookings, waitlist, ledger, payouts, reviews, favorites, notifications, config tables |
| `supabase/migrations/0002_engagement.sql` | Goals, achievements catalog, unlocks, nudge prefs and deliveries — plus the healthy-by-design constraints, written down |
| `supabase/migrations/0003_functions.sql` | The atomic business logic: `book_session`, `check_in`, `mark_no_show`, `cancel_booking`, `join_waitlist`, `promote_waitlist`, `top_up`, `change_plan`, `cancel_session`, `ensure_cycle_current` |
| `supabase/migrations/0004_rls.sql` | Row-level security and grants |
| `supabase/migrations/0005_realtime.sql` | Realtime publication |
| `supabase/migrations/0006_views.sql` | `session_view` — occupancy + derived credit cost in one read |
| `supabase/seed-data.ts` | Mock seed → database rows (the parity guarantee) |
| `supabase/seed.ts` | Seeds a hosted project |
| `supabase/scripts/` | Migration runner, offline type generator, local seed, SQL tests, parity check, smoke test |

### Verifying the backend

Everything below runs against a plain local Postgres — no Docker, no hosted
project — which is how the SQL layer is tested:

```bash
createdb pulse_test
psql -d pulse_test -f supabase/scripts/local_auth_shim.sql   # fakes auth.uid()
node supabase/scripts/apply-migrations.mjs "postgresql://…/pulse_test"
psql -d pulse_test -v ON_ERROR_STOP=1 -f supabase/scripts/test_logic.sql
```

`test_logic.sql` asserts the things that actually matter: a spot is consumed
exactly once, the fifth booking at one studio is refused, the ledger and payout
flip together on check-in, a late cancellation charges the fee, waitlist
promotion skips a capped or broke member and tells them why, and one member
cannot read another's ledger.

`supabase/scripts/verify-parity.ts` goes further and proves mock mode and the
seeded database produce **identical** numbers — same attendance facts, same
streak, same balance, same visit-cap position, and the same credit cost
computed independently in SQL and in TypeScript.

### Auth and RLS

Supabase Auth backs `profiles`, and `profiles.role` drives member vs studio
owner exactly as before. The app's one-tap role picker signs into two seeded
accounts (`demo.member@pulse.fit` / `demo.owner@pulse.fit`), so the demo stays
frictionless while running through real authentication.

The policies are production-shaped, not demo-shaped:

- Members read and write **only their own** bookings, wallet, goal,
  achievements and nudge settings.
- Studio owners manage **only their own** studio, classes, sessions, roster and
  payouts.
- The catalog (studios, sessions, reviews, achievements catalog) is public.
- Booking, check-in, cancel, waitlist and top-up have **no table-level write
  policy at all** — they are reachable only through `SECURITY DEFINER`
  functions that do their own permission checks. A client cannot hand-craft a
  booking row or mint credits even with a valid token.

There is no cross-member read anywhere in the engagement layer, which is what
makes leaderboards and comparison mechanics impossible by construction rather
than by convention.

### Realtime

`0005_realtime.sql` publishes bookings, waitlist entries, notifications,
sessions, credit transactions and achievement unlocks. The client subscribes in
`lib/services/supabase/realtime.ts`, and RLS applies to realtime too, so a
member only receives rows they may read.

It **degrades gracefully**: if the socket never connects or realtime is off,
the app falls back to local change emits plus ordinary fetches and behaves
exactly as it does today. Nothing in the UI depends on it.

### Payments — still mock, with one seam

Top-up and plan changes write the correct ledger rows (`topup_pack`,
`cycle_grant`) and charge nothing; the "mock payment — no real charge" copy is
unchanged. The seam is deliberately narrow:

- `WalletService.topUp` → `top_up()` — confirm a Stripe PaymentIntent *before*
  calling it; the ledger row is the fulfilment step.
- `SubscriptionService.changePlan` → `change_plan()` — drive from Stripe
  Billing webhooks instead of a direct call.
- `PayoutService` → Stripe Connect. `payout_entries` is already a
  per-attendance statement: each confirmed row is one transfer line item.

Nothing else in the app touches money, so swapping in Stripe means editing
those three places.

## Extending it

### Add a real studio

A studio is one row plus its categories. Everything else (its page, map pin,
search, filters, cover art) follows automatically:

```sql
insert into studios (
  id, owner_id, name, city_id, neighborhood_id,
  description_el, description_en, address, lat, lng,
  amenities, default_floor_price_eur, cancellation_cutoff_hours, art_seed
) values (
  'st_new_box',
  (select id from profiles where email = 'owner@thatstudio.gr'),
  'That Studio', 'thessaloniki', 'kentro',
  'Περιγραφή στα ελληνικά.', 'English description.',
  'Οδός 1, Θεσσαλονίκη', 40.6301, 22.9439,
  array['showers','lockers','towels'], 11, 12, 42
);

insert into studio_categories (studio_id, category_id)
values ('st_new_box', 'pilates');

insert into class_types (id, studio_id, category_id, name, duration_min,
                         level, description_el, description_en)
values ('ct_new_reformer', 'st_new_box', 'pilates', 'Reformer Flow', 55,
        'all', 'Ροή στο reformer.', 'A flow on the reformer.');
```

Sessions are then created from the studio dashboard (Schedule → New class),
which is the intended path for a real owner: they set their own
`spots_released_to_platform` and `floor_price_eur` per class, and the platform
never overrides them.

To onboard the owner: create the auth user (Supabase dashboard → Authentication
→ Add user), insert a matching `profiles` row with `role = 'studio_owner'`, and
point `studios.owner_id` at it. RLS does the rest.

### Onboarding a studio's real requirements

Real studios arrive with rules the demo doesn't model — a membership tier that
blocks platform bookings at peak hours, an intro offer, a waiver, a different
cancellation window per class type. Where each belongs:

| Requirement | Where it goes |
|---|---|
| Per-studio policy (cutoff, cap override, no-show fee) | Columns on `studios`, read by the functions in `0003_functions.sql` |
| Per-class-type policy | Columns on `class_types`, or a `class_type_policies` table |
| Anything free-form and studio-specific | A `jsonb` column, e.g. `studios.settings` — no migration per studio |
| Platform-wide pricing or policy changes | `lib/rules/pricing.ts` / `lib/rules/policy.ts`, then re-run the seed to push them into `pricing_config` / `platform_policy` |

Worked example — a studio wants a 24-hour cancellation window on one class type
only:

1. `alter table class_types add column cancellation_cutoff_hours integer;`
2. In `quote_cancellation()`, prefer `class_types.cancellation_cutoff_hours`
   over the studio's, then the platform default. One function, one line.
3. `npm run db:types`, and the new column is typed everywhere.

No service interface changes, so no UI changes.

### Add a field, a table, or an achievement

1. Write a new numbered migration in `supabase/migrations/`. Keep it idempotent
   (`if not exists`, `create or replace`, `on conflict`).
2. Apply it (`npm run db:migrate`) and regenerate types (`npm run db:types`).
3. If the field should reach the UI, add it to `lib/types`, then update **both**
   implementations and the mapper in `lib/services/supabase/mappers.ts`. The
   compiler points at every place that needs attention.

For a new **achievement**, see [Extending the catalog](#extending-the-catalog):
the key, group and threshold live in `lib/rules/engagement.ts` and are pushed to
the `achievements` table by the seed, so the rule and the row cannot disagree.

> **Healthy-by-design constraint — preserve this.** The schema has no weight,
> body-measurement or calorie column, and must never gain one. Progress is
> counted in classes attended and minutes moved. Goals and streaks stay
> week-based with rest tolerance, `goals.weekly_target` stays `CHECK`ed to 1–5
> so no client can set an escalating target, and
> `engagement_prefs.nudges_enabled` stays `DEFAULT false`. The reasoning is
> written into `0002_engagement.sql` so it survives contact with future changes.

## Going to production

Everything below is deliberately *not* done yet — this is a demo-grade
foundation, and each item is a known, bounded piece of work.

1. **Real auth.** Replace `signInAsDemo` in `lib/services/supabase/index.ts`
   with Supabase email/OAuth signup and an onboarding flow that inserts the
   `profiles` row (a trigger on `auth.users` is the usual approach). The route
   guards in `app/member/layout.tsx` and `app/studio/layout.tsx` already key off
   `profiles.role`. Then remove the demo accounts from the seed.
2. **RLS hardening.** Today any signed-in user can read every `profiles` row,
   because the roster shows member names — narrow that to "owners may read
   profiles of members booked into their own sessions". Review the public
   catalog policies if any studio data should be private, and rate-limit the
   `SECURITY DEFINER` functions.
3. **Stripe.** Checkout for top-ups and subscriptions, Connect for studio
   payouts, driven from webhooks; see the payments seam above.
4. **Operational bits** not modelled here: email/SMS, receipts, refunds beyond
   credits, GDPR export/delete, and an admin surface for approving studios.

### Deployment

The frontend talks to Supabase directly, so hosting stays trivial: the app
builds to a static export (`output: "export"`) and runs on any static or edge
host — the Netlify config is already in `netlify.toml`. There is no server to
operate; Supabase is the backend. Set the `NEXT_PUBLIC_*` variables in the host
dashboard, and keep `SUPABASE_SERVICE_ROLE_KEY` out of it entirely — that key
belongs only to the seed script, run from a trusted machine.

### Where to plug in real geolocation persistence

Coordinates live only in the browser (`lib/stores/geo.ts`, persisted to
localStorage) and are never sent anywhere — distance is computed client-side
against catalog coordinates the app already has. If you want a member's last
known location server-side (e.g. to rank "near you" on the API):

1. Add `updateLastLocation(userId, coords)` to a service interface in
   `lib/services/types.ts`; the mock can no-op.
2. Call it from `useGeoStore.request()` right after a successful fix.
3. Move the ranking in `components/member/near-you.tsx` (`score()`) server-side
   and have `listStartingSoon` accept optional coords. Keep the client
   fallback so the feature still works when permission is denied.

Keep the primer contract intact: never call `getCurrentPosition` without an
explicit opt-in tap.

### Where to plug in real push

In-tab reminders are real; background delivery is deliberately not simulated.
`lib/reminders/index.ts` carries the full TODO at the top of the file:

1. Register a service worker (`public/sw.js`) and subscribe via
   `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
   with your VAPID public key.
2. Add `registerPushSubscription(userId, subscription)` to
   `NotificationService` in `lib/services/types.ts` and send it up.
3. Server-side, enqueue jobs at start−2 h and start−30 min when a booking is
   created; reschedule on cancellation and on waitlist promotion; deliver with
   `web-push`.
4. Leave `components/member/reminder-scheduler.tsx` mounted as the in-tab
   fallback.

Note that `lib/reminders` also fires `Notification` directly, which works only
while the tab is open — the service worker path replaces that in production.

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
- **New achievement** — add the id to the `AchievementId` union
  (`lib/types`), a row to `ACHIEVEMENTS` and a branch to
  `evaluateAchievements` (`lib/rules/engagement.ts`), an icon in
  `components/member/achievements.tsx`, and `achievements.<id>.title/body` in
  both dictionaries. Keep it about consistency or variety — nothing
  volume-extreme, intensity-glorifying or appearance-related.
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
  and on schema version bumps (`STORAGE_KEYS.db`, currently `pulse.db.v4` —
  the engagement layer bumped it from v3).
- The engagement layer is **client-side only**, like the rest of the demo. In-tab
  nudges reuse the reminder plumbing and therefore share its limitation: they
  cannot wake a closed tab. See
  [Where to plug in real push](#where-to-plug-in-real-push).
- Payments, auth and emails are intentionally stubbed behind the service
  layer; there are no secrets anywhere in the repo.
