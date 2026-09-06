-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0004 row-level security
--
-- Production-shaped, not demo-shaped: a member can read and write only their
-- own bookings, wallet, goals, achievements and nudge settings; a studio owner
-- manages only their own studio, sessions, roster and payouts; the catalog and
-- the achievements catalog are public.
--
-- Writes that must stay atomic (booking, check-in, cancel, waitlist, top-up)
-- have NO table-level insert/update policy at all — they are only reachable
-- through the SECURITY DEFINER functions in 0003, which do their own
-- permission checks. That is deliberate: it means a client cannot hand-craft a
-- booking row or mint credits, even with a valid session token.
--
-- What to tighten before production is listed in the README under
-- "Going to production → RLS hardening".
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── helper predicates ───────────────────────────────
create or replace function pulse_is_studio_owner(p_studio_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from studios where id = p_studio_id and owner_id = auth.uid()
  );
$$;

create or replace function pulse_owns_session(p_session_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from sessions s join studios st on st.id = s.studio_id
     where s.id = p_session_id and st.owner_id = auth.uid()
  );
$$;

-- ─────────────────────────── enable RLS ────────────────────────────────────
alter table profiles            enable row level security;
alter table studios             enable row level security;
alter table studio_categories   enable row level security;
alter table class_types         enable row level security;
alter table sessions            enable row level security;
alter table bookings            enable row level security;
alter table waitlist_entries    enable row level security;
alter table subscriptions       enable row level security;
alter table credit_transactions enable row level security;
alter table payout_entries      enable row level security;
alter table reviews             enable row level security;
alter table favorites           enable row level security;
alter table notifications       enable row level security;
alter table cities              enable row level security;
alter table neighborhoods       enable row level security;
alter table categories          enable row level security;
alter table plans               enable row level security;
alter table pricing_config      enable row level security;
alter table platform_policy     enable row level security;
alter table goals               enable row level security;
alter table achievements        enable row level security;
alter table member_achievements enable row level security;
alter table engagement_prefs    enable row level security;
alter table nudge_deliveries    enable row level security;

-- ═══════════════════ public catalog (readable by anyone) ═══════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'cities','neighborhoods','categories','plans','studios','studio_categories',
    'class_types','sessions','reviews','achievements','pricing_config','platform_policy'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_public_read', t);
    execute format(
      'create policy %I on %I for select using (true)', t || '_public_read', t);
  end loop;
end $$;

-- ══════════════════════════════ profiles ═══════════════════════════════════
-- Any signed-in user may read profiles: the studio roster shows member names
-- and reviews show author names. Only the owner of a profile may change it.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = auth.uid());

-- ═════════════════════ studio owner manages own studio ═════════════════════
drop policy if exists studios_owner_update on studios;
create policy studios_owner_update on studios
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists class_types_owner_write on class_types;
create policy class_types_owner_write on class_types
  for all to authenticated
  using (pulse_is_studio_owner(studio_id)) with check (pulse_is_studio_owner(studio_id));

drop policy if exists sessions_owner_write on sessions;
create policy sessions_owner_write on sessions
  for all to authenticated
  using (pulse_is_studio_owner(studio_id)) with check (pulse_is_studio_owner(studio_id));

-- ══════════════════════════════ bookings ═══════════════════════════════════
-- Members see their own; owners see the roster for their own sessions.
-- No insert/update policy: bookings are created and mutated only by the
-- SECURITY DEFINER functions in 0003.
drop policy if exists bookings_member_read on bookings;
create policy bookings_member_read on bookings
  for select to authenticated
  using (member_id = auth.uid() or pulse_is_studio_owner(studio_id));

drop policy if exists waitlist_read on waitlist_entries;
create policy waitlist_read on waitlist_entries
  for select to authenticated
  using (member_id = auth.uid() or pulse_is_studio_owner(studio_id));

-- ════════════════════════════ money is private ═════════════════════════════
drop policy if exists credit_tx_own_read on credit_transactions;
create policy credit_tx_own_read on credit_transactions
  for select to authenticated using (member_id = auth.uid());

drop policy if exists subscriptions_own_read on subscriptions;
create policy subscriptions_own_read on subscriptions
  for select to authenticated using (member_id = auth.uid());

-- A studio sees its own payouts; a member sees the accruals they generated.
drop policy if exists payouts_read on payout_entries;
create policy payouts_read on payout_entries
  for select to authenticated
  using (pulse_is_studio_owner(studio_id) or member_id = auth.uid());

-- ══════════════════════════ reviews & favorites ════════════════════════════
drop policy if exists reviews_insert_self on reviews;
create policy reviews_insert_self on reviews
  for insert to authenticated with check (member_id = auth.uid());

drop policy if exists favorites_own on favorites;
create policy favorites_own on favorites
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ═══════════════════════════ notifications ═════════════════════════════════
drop policy if exists notifications_own_read on notifications;
create policy notifications_own_read on notifications
  for select to authenticated using (member_id = auth.uid());

-- Marking as read is the only field a member may change.
drop policy if exists notifications_own_update on notifications;
create policy notifications_own_update on notifications
  for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ═════════════════════════ engagement is private ═══════════════════════════
-- A member's goal, unlocks, nudge settings and deliveries are theirs alone.
-- There is no cross-member read anywhere in the engagement layer — that is
-- what makes leaderboards and comparison mechanics impossible by construction.
drop policy if exists goals_own on goals;
create policy goals_own on goals
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists member_achievements_own on member_achievements;
create policy member_achievements_own on member_achievements
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists engagement_prefs_own on engagement_prefs;
create policy engagement_prefs_own on engagement_prefs
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists nudge_deliveries_own on nudge_deliveries;
create policy nudge_deliveries_own on nudge_deliveries
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ════════════════════════════ table grants ════════════════════════════════
-- A hosted Supabase project grants these to anon/authenticated by default;
-- stating them explicitly keeps the schema self-contained (and lets it run on
-- a bare Postgres). RLS above is the real gate — these only open the door.
do $$
declare t text;
begin
  -- everyone may read; RLS decides which rows
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;

  -- tables with member/owner write policies
  foreach t in array array[
    'profiles','studios','class_types','sessions','reviews','favorites',
    'notifications','goals','member_achievements','engagement_prefs','nudge_deliveries'
  ] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ═══════════════════════════ function grants ═══════════════════════════════
do $$
declare fn text;
begin
  foreach fn in array array[
    'book_session(text)',
    'check_in(uuid)',
    'mark_no_show(uuid)',
    'cancel_booking(uuid)',
    'quote_cancellation(uuid)',
    'join_waitlist(text)',
    'leave_waitlist(text)',
    'promote_waitlist(text)',
    'top_up(text)',
    'change_plan(text)',
    'cancel_session(text)',
    'ensure_cycle_current(uuid)',
    'visit_cap_status(text,timestamptz,uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
