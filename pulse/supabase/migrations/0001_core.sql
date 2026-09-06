-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0001 core schema
--
-- Relational model of lib/types. Field names are the snake_case twins of the
-- TypeScript domain model; lib/services/supabase/mappers.ts is the only place
-- that translates between the two.
--
-- Idempotent: safe to re-run. Enums are created via DO blocks, everything else
-- uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- HEALTHY-BY-DESIGN (load-bearing, do not violate in later migrations):
-- there is deliberately NO weight, body-measurement or calorie column anywhere
-- in this schema, and there never should be. Progress is counted in classes
-- attended and minutes moved. See 0002_engagement.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────────── enums ────────────────────────────────────
do $$ begin
  create type pulse_role as enum ('member', 'studio_owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_session_status as enum ('scheduled', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_booking_status as enum (
    'reserved', 'checked_in', 'completed', 'cancelled', 'late_cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_credit_tx_type as enum ('spend', 'refund', 'topup', 'fee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_credit_tx_status as enum ('pending', 'confirmed', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_credit_tx_reason as enum (
    'booking', 'late_cancel_fee', 'no_show_fee', 'cancel_refund', 'cycle_grant', 'topup_pack'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_payout_status as enum ('pending', 'confirmed', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_subscription_status as enum ('active', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_notification_kind as enum ('booking', 'wallet', 'payout', 'system', 'habit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pulse_class_level as enum ('all', 'beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- ───────────────────────── updated_at trigger helper ───────────────────────
create or replace function pulse_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ═══════════════════════════ configuration ═════════════════════════════════
-- The pricing formula and platform policy live in TypeScript
-- (lib/rules/pricing.ts, lib/rules/policy.ts). They are pushed into these
-- tables by the seed so the atomic SQL paths read the SAME numbers instead of
-- a second hand-maintained copy. Change the TS constants, re-run the seed.

create table if not exists pricing_config (
  id                  boolean primary key default true check (id),
  eur_per_credit      numeric  not null,
  peak_multiplier     numeric  not null,
  off_peak_multiplier numeric  not null,
  fill_bands          jsonb    not null,  -- [{minFill, multiplier}], first match wins
  min_credits         integer  not null,
  max_credits         integer  not null,
  updated_at          timestamptz not null default now()
);

create table if not exists platform_policy (
  id                              boolean primary key default true check (id),
  visit_cap_per_studio_per_month  integer not null,
  rolling_window_days             integer not null,
  default_cancellation_cutoff_hours integer not null,
  late_cancel_fee_credits         integer not null,
  no_show_fee_credits             integer not null,
  top_up_packs                    jsonb   not null,  -- [{id, credits, priceEUR}]
  updated_at                      timestamptz not null default now()
);

-- ════════════════════════════ lookup tables ════════════════════════════════

create table if not exists cities (
  id      text primary key,
  name_el text not null,
  name_en text not null,
  lat     double precision not null,
  lng     double precision not null,
  zoom    integer not null default 13
);

create table if not exists neighborhoods (
  id      text primary key,
  city_id text not null references cities(id) on delete cascade,
  name_el text not null,
  name_en text not null
);
create index if not exists neighborhoods_city_idx on neighborhoods(city_id);

create table if not exists categories (
  id      text primary key,
  name_el text not null,
  name_en text not null,
  palette integer not null default 0
);

create table if not exists plans (
  id                text primary key,
  name_el           text not null,
  name_en           text not null,
  credits_per_cycle integer not null,
  price_eur         numeric not null,
  blurb_el          text not null,
  blurb_en          text not null,
  highlight         boolean not null default false,
  sort_order        integer not null default 0
);

-- ══════════════════════════════ identity ═══════════════════════════════════
-- profiles is 1:1 with auth.users. On a real Supabase project auth.users is
-- provided by GoTrue; locally the test harness creates a compatible shim so
-- these migrations run unmodified (see supabase/scripts/local_auth_shim.sql).

create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            pulse_role not null default 'member',
  display_name    text not null,
  email           text,
  avatar_url      text,
  member_since    timestamptz not null default now(),
  home_city_id    text references cities(id),
  home_neighborhood_id text references neighborhoods(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function pulse_touch_updated_at();

-- ═══════════════════════════════ catalog ═══════════════════════════════════

create table if not exists studios (
  id                          text primary key,
  owner_id                    uuid references profiles(id) on delete set null,
  name                        text not null,
  city_id                     text not null references cities(id),
  neighborhood_id             text not null references neighborhoods(id),
  description_el              text not null default '',
  description_en              text not null default '',
  address                     text not null default '',
  lat                         double precision not null,
  lng                         double precision not null,
  rating                      numeric not null default 0,
  review_count                integer not null default 0,
  amenities                   text[] not null default '{}',
  photos                      text[] not null default '{}',
  featured                    boolean not null default false,
  art_seed                    integer not null default 0,
  default_floor_price_eur     numeric not null,
  cancellation_cutoff_hours   integer not null default 12,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists studios_city_idx on studios(city_id);
create index if not exists studios_owner_idx on studios(owner_id);
drop trigger if exists studios_touch on studios;
create trigger studios_touch before update on studios
  for each row execute function pulse_touch_updated_at();

-- A studio offers N categories (the TS model carries categoryIds[]).
create table if not exists studio_categories (
  studio_id   text not null references studios(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  sort_order  integer not null default 0,
  primary key (studio_id, category_id)
);

create table if not exists class_types (
  id             text primary key,
  studio_id      text not null references studios(id) on delete cascade,
  category_id    text not null references categories(id),
  name           text not null,
  duration_min   integer not null check (duration_min > 0),
  level          pulse_class_level not null default 'all',
  description_el text not null default '',
  description_en text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists class_types_studio_idx on class_types(studio_id);

create table if not exists sessions (
  id                          text primary key,
  studio_id                   text not null references studios(id) on delete cascade,
  class_type_id               text not null references class_types(id) on delete cascade,
  start_at                    timestamptz not null,
  -- Kept in sync by a trigger rather than GENERATED: adding an interval to a
  -- timestamptz is only STABLE (timezone/DST dependent), and a generated
  -- column requires an IMMUTABLE expression.
  end_at                      timestamptz,
  duration_min                integer not null check (duration_min > 0),
  instructor                  text not null default '',
  capacity                    integer not null check (capacity > 0),
  spots_released_to_platform  integer not null check (spots_released_to_platform >= 0),
  floor_price_eur             numeric not null,
  is_peak                     boolean not null default false,
  status                      pulse_session_status not null default 'scheduled',
  -- DEMO ONLY: baseline spots taken by "other members" that are not
  -- materialized as booking rows, mirroring the mock so both modes look
  -- identical. A production deployment leaves this 0 and counts real rows.
  seed_booked                 integer not null default 0 check (seed_booked >= 0),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint sessions_released_within_capacity
    check (spots_released_to_platform <= capacity)
);
create or replace function pulse_set_session_end_at()
returns trigger
language plpgsql
as $$
begin
  new.end_at := new.start_at + make_interval(mins => new.duration_min);
  return new;
end;
$$;
drop trigger if exists sessions_end_at on sessions;
create trigger sessions_end_at before insert or update of start_at, duration_min on sessions
  for each row execute function pulse_set_session_end_at();

create index if not exists sessions_start_idx   on sessions(start_at);
create index if not exists sessions_studio_idx  on sessions(studio_id, start_at);
create index if not exists sessions_status_idx  on sessions(status, start_at);
drop trigger if exists sessions_touch on sessions;
create trigger sessions_touch before update on sessions
  for each row execute function pulse_touch_updated_at();

-- ═════════════════════════════ bookings ════════════════════════════════════

create table if not exists bookings (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null references sessions(id) on delete cascade,
  member_id     uuid not null references profiles(id) on delete cascade,
  studio_id     text not null references studios(id) on delete cascade,
  status        pulse_booking_status not null default 'reserved',
  credit_cost   integer not null check (credit_cost >= 0),
  payout_eur    numeric not null default 0,
  qr_token      text not null default encode(gen_random_bytes(9), 'hex'),
  from_waitlist boolean not null default false,
  created_at    timestamptz not null default now(),
  checked_in_at timestamptz,
  cancelled_at  timestamptz
);
-- One ACTIVE booking per member per session. Partial unique index: cancelled
-- bookings don't block re-booking the same class later.
create unique index if not exists bookings_one_active_per_session
  on bookings(session_id, member_id)
  where status in ('reserved', 'checked_in', 'completed');
create index if not exists bookings_session_idx on bookings(session_id);
create index if not exists bookings_member_idx  on bookings(member_id, created_at desc);
create index if not exists bookings_studio_idx  on bookings(studio_id);

create table if not exists waitlist_entries (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null references sessions(id) on delete cascade,
  studio_id    text not null references studios(id) on delete cascade,
  member_id    uuid not null references profiles(id) on delete cascade,
  position     integer not null,
  hold_credits integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (session_id, member_id)
);
create index if not exists waitlist_session_idx on waitlist_entries(session_id, position);
create index if not exists waitlist_member_idx  on waitlist_entries(member_id);

-- ═══════════════════════ money: ledger + payouts ═══════════════════════════

create table if not exists subscriptions (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references profiles(id) on delete cascade,
  plan_id           text not null references plans(id),
  status            pulse_subscription_status not null default 'active',
  credits_per_cycle integer not null,
  price_eur         numeric not null,
  cycle_start       timestamptz not null,
  cycle_end         timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- At most one active subscription per member.
create unique index if not exists subscriptions_one_active
  on subscriptions(member_id) where status = 'active';
drop trigger if exists subscriptions_touch on subscriptions;
create trigger subscriptions_touch before update on subscriptions
  for each row execute function pulse_touch_updated_at();

-- The credit ledger. Balance is ALWAYS a fold over these rows — there is no
-- stored balance column anywhere, by design. `delta` is signed.
create table if not exists credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references profiles(id) on delete cascade,
  type       pulse_credit_tx_type not null,
  status     pulse_credit_tx_status not null default 'pending',
  reason     pulse_credit_tx_reason not null,
  delta      integer not null,
  booking_id uuid references bookings(id) on delete set null,
  studio_id  text references studios(id) on delete set null,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists credit_tx_member_idx  on credit_transactions(member_id, created_at desc);
create index if not exists credit_tx_booking_idx on credit_transactions(booking_id);

create table if not exists payout_entries (
  id           uuid primary key default gen_random_uuid(),
  studio_id    text not null references studios(id) on delete cascade,
  booking_id   uuid not null references bookings(id) on delete cascade,
  session_id   text not null references sessions(id) on delete cascade,
  member_id    uuid not null references profiles(id) on delete cascade,
  amount_eur   numeric not null,
  status       pulse_payout_status not null default 'pending',
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (booking_id)
);
create index if not exists payout_studio_idx on payout_entries(studio_id, created_at desc);
create index if not exists payout_status_idx on payout_entries(studio_id, status);

-- ═════════════════════════ social & comms ══════════════════════════════════

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  studio_id   text not null references studios(id) on delete cascade,
  member_id   uuid references profiles(id) on delete set null,
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  body        text not null,
  lang        text not null default 'el' check (lang in ('el','en')),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_studio_idx on reviews(studio_id, created_at desc);

create table if not exists favorites (
  member_id  uuid not null references profiles(id) on delete cascade,
  studio_id  text not null references studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, studio_id)
);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references profiles(id) on delete cascade,
  kind       pulse_notification_kind not null,
  title_el   text not null,
  title_en   text not null,
  body_el    text not null default '',
  body_en    text not null default '',
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_member_idx on notifications(member_id, created_at desc);
create index if not exists notifications_unread_idx on notifications(member_id) where not read;
