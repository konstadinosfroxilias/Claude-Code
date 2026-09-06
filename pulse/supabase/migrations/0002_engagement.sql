-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0002 engagement layer
--
-- The habit layer: weekly goal, week-based streak, achievements, nudges.
--
-- ONLY FOUR THINGS ARE STORED. Everything a member sees (weekly progress,
-- streak, insights, recap, routine, nudge choice) is DERIVED on read from
-- bookings by the pure rules in lib/rules/engagement.ts — the very same module
-- the mock uses, so the two backends cannot drift. Do not add counter columns
-- here; if you ever cache a stat, keep it recomputable from bookings.
--
-- ── HEALTHY BY DESIGN — constraints a future migration MUST preserve ───────
--   • NO weight, body-measurement, body-fat or calorie column. Ever. Progress
--     is classes attended and minutes moved. The model simply has no place to
--     put a body metric, and that is deliberate.
--   • Goals and streaks are WEEK-based, never daily. weekly_target is CHECKed
--     to 1..5 at the database level so no client (or future service) can set
--     an escalating target.
--   • Rest tolerance lives in the streak rule, not in data: one quiet week
--     never breaks a run. See computeStreak in lib/rules/engagement.ts.
--   • Nudges are opt-in: nudges_enabled DEFAULTS FALSE. Do not flip it.
--   • Achievements reward consistency and variety only — nothing
--     volume-extreme, intensity-glorifying or appearance-related.
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per member. weekly_target mirrors GOAL_MIN/GOAL_MAX in
-- lib/rules/engagement.ts; the CHECK is the backstop that makes an escalating
-- target impossible even if a caller misbehaves.
create table if not exists goals (
  member_id     uuid primary key references profiles(id) on delete cascade,
  weekly_target integer not null default 2 check (weekly_target between 1 and 5),
  updated_at    timestamptz not null default now()
);
drop trigger if exists goals_touch on goals;
create trigger goals_touch before update on goals
  for each row execute function pulse_touch_updated_at();

-- Catalog. Titles and bodies are NOT stored: the key maps to the i18n
-- dictionaries (achievements.<key>.title / .body) so both languages stay in
-- one place. `target` is the countable threshold, null for one-off moments.
create table if not exists achievements (
  key        text primary key,
  group_key  text not null check (group_key in ('start','consistency','variety','moments')),
  sort_order integer not null default 0,
  target     integer,
  created_at timestamptz not null default now()
);

create table if not exists member_achievements (
  member_id      uuid not null references profiles(id) on delete cascade,
  achievement_key text not null references achievements(key) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (member_id, achievement_key)
);
create index if not exists member_achievements_member_idx
  on member_achievements(member_id, unlocked_at desc);

-- Opt-in nudge settings. Off by default, on purpose.
create table if not exists engagement_prefs (
  member_id          uuid primary key references profiles(id) on delete cascade,
  nudges_enabled     boolean not null default false,
  nudges_muted_until timestamptz,
  updated_at         timestamptz not null default now()
);
drop trigger if exists engagement_prefs_touch on engagement_prefs;
create trigger engagement_prefs_touch before update on engagement_prefs
  for each row execute function pulse_touch_updated_at();

-- "Already shown" markers so a nudge is delivered at most once. nudge_id is
-- the rule module's stable "<kind>:<iso week>" key.
create table if not exists nudge_deliveries (
  member_id    uuid not null references profiles(id) on delete cascade,
  nudge_id     text not null,
  delivered_at timestamptz not null default now(),
  primary key (member_id, nudge_id)
);

-- Catalog rows. Keys and thresholds mirror ACHIEVEMENTS in
-- lib/rules/engagement.ts; the seed re-pushes them from TypeScript so the two
-- cannot drift. Inserted here too so a bare migration run is already usable.
insert into achievements (key, group_key, sort_order, target) values
  ('first_booking',     'start',        1,  null),
  ('first_checkin',     'start',        2,  null),
  ('classes_5',         'consistency', 10,  5),
  ('classes_10',        'consistency', 11,  10),
  ('classes_25',        'consistency', 12,  25),
  ('classes_50',        'consistency', 13,  50),
  ('goal_week',         'consistency', 14,  null),
  ('goal_month',        'consistency', 15,  4),
  ('three_categories',  'variety',     20,  3),
  ('new_neighborhood',  'variety',     21,  2),
  ('explorer_5',        'variety',     22,  5),
  ('early_bird',        'moments',     30,  null),
  ('comeback',          'moments',     31,  null)
on conflict (key) do update
  set group_key  = excluded.group_key,
      sort_order = excluded.sort_order,
      target     = excluded.target;
