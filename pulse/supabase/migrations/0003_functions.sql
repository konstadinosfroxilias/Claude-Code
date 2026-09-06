-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0003 business logic
--
-- Everything that must be ATOMIC lives here: spot allocation, the visit cap,
-- the credit ledger and waitlist promotion. Doing these in SQL is what makes
-- concurrent bookings safe — two members racing for the last spot serialize on
-- a row lock instead of both winning.
--
-- Error contract: these functions RAISE with a message that is exactly the
-- ServiceError code the UI already handles (full, insufficient_credits,
-- visit_cap, already_booked, in_past, not_full, already_waitlisted,
-- not_waitlisted, not_cancellable, not_checkinable, …). The Supabase service
-- implementation re-throws them as ServiceError verbatim, so error handling is
-- identical in both backends.
--
-- Rule provenance: the NUMBERS come from pricing_config / platform_policy,
-- which the seed populates from lib/rules/pricing.ts and lib/rules/policy.ts.
-- TypeScript stays the source of truth; SQL never hard-codes a threshold.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── pricing ─────────────────────────────────────
-- Mirror of computeCreditCost() in lib/rules/pricing.ts.
create or replace function pulse_credit_cost(
  p_floor_price_eur numeric,
  p_is_peak         boolean,
  p_fill_ratio      numeric
) returns integer
language plpgsql
stable
as $$
declare
  cfg        pricing_config;
  base       numeric;
  time_mult  numeric;
  band_mult  numeric := 1;
  band       jsonb;
  raw        numeric;
begin
  select * into cfg from pricing_config where id;
  if not found then
    raise exception 'pricing_config_missing';
  end if;

  base      := p_floor_price_eur / cfg.eur_per_credit;
  time_mult := case when p_is_peak then cfg.peak_multiplier else cfg.off_peak_multiplier end;

  -- fill bands are checked top-down, first match wins (same as the TS rule)
  for band in select * from jsonb_array_elements(cfg.fill_bands) loop
    if p_fill_ratio >= (band->>'minFill')::numeric then
      band_mult := (band->>'multiplier')::numeric;
      exit;
    end if;
  end loop;

  raw := base * time_mult * band_mult;
  return least(cfg.max_credits, greatest(cfg.min_credits, round(raw)::integer));
end;
$$;

-- ─────────────────────── session occupancy helpers ─────────────────────────
create or replace function pulse_session_booked(p_session_id text)
returns integer
language sql
stable
as $$
  select coalesce(s.seed_booked, 0) + (
    select count(*)::integer from bookings b
     where b.session_id = p_session_id
       and b.status in ('reserved','checked_in','completed')
  )
  from sessions s where s.id = p_session_id;
$$;

create or replace function pulse_session_spots_left(p_session_id text)
returns integer
language sql
stable
as $$
  select greatest(0, s.spots_released_to_platform - pulse_session_booked(p_session_id))
  from sessions s where s.id = p_session_id;
$$;

create or replace function pulse_session_credit_cost(p_session_id text)
returns integer
language sql
stable
as $$
  select pulse_credit_cost(
    s.floor_price_eur,
    s.is_peak,
    case when s.spots_released_to_platform > 0
         then least(1.0, pulse_session_booked(p_session_id)::numeric / s.spots_released_to_platform)
         else 1.0 end
  )
  from sessions s where s.id = p_session_id;
$$;

-- ───────────────────────────── wallet ──────────────────────────────────────
-- Balance is ALWAYS a fold over the ledger. There is no stored balance.
create or replace function pulse_balance(p_member_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(delta), 0)::integer
    from credit_transactions
   where member_id = p_member_id
     and status <> 'reversed';
$$;

-- ─────────────────────────── the visit cap ─────────────────────────────────
-- Mirror of countVisitsInWindow() in lib/rules/policy.ts.
--
-- The window opens `rolling_window_days` before the EARLIER of now and the
-- session being attempted, and stays open. Anchoring on the earlier of the two
-- is what stops a member holding a 5th visit by queuing an early class and
-- then booking four later ones, and it keeps the "x/4 this month" meter and
-- the actual enforcement identical.
create or replace function pulse_visits_in_window(
  p_member_id uuid,
  p_studio_id text,
  p_at        timestamptz default now()
) returns integer
language plpgsql
stable
as $$
declare
  window_days integer;
  opens_at    timestamptz;
begin
  select rolling_window_days into window_days from platform_policy where id;
  opens_at := least(now(), p_at) - make_interval(days => window_days);
  return (
    select count(*)::integer
      from bookings b
      join sessions s on s.id = b.session_id
     where b.member_id = p_member_id
       and b.studio_id = p_studio_id
       and b.status in ('reserved','checked_in','completed')
       and s.start_at > opens_at
  );
end;
$$;

create or replace function pulse_cap_reached(
  p_member_id uuid,
  p_studio_id text,
  p_at        timestamptz default now()
) returns boolean
language sql
stable
as $$
  select pulse_visits_in_window(p_member_id, p_studio_id, p_at)
         >= (select visit_cap_per_studio_per_month from platform_policy where id);
$$;

-- Cap status for the UI meter (used, cap, reached).
create or replace function visit_cap_status(
  p_studio_id text,
  p_at        timestamptz default now(),
  p_member_id uuid default null
) returns table (used integer, cap integer, reached boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  member uuid := coalesce(p_member_id, auth.uid());
  v_cap  integer;
  v_used integer;
begin
  select visit_cap_per_studio_per_month into v_cap from platform_policy where id;
  v_used := pulse_visits_in_window(member, p_studio_id, p_at);
  return query select least(v_used, v_cap), v_cap, v_used >= v_cap;
end;
$$;

-- ──────────────────────────── notifications ────────────────────────────────
create or replace function pulse_notify(
  p_member_id uuid,
  p_kind      pulse_notification_kind,
  p_title_el  text,
  p_title_en  text,
  p_body_el   text,
  p_body_en   text,
  p_href      text default null
) returns void
language sql
as $$
  insert into notifications (member_id, kind, title_el, title_en, body_el, body_en, href)
  values (p_member_id, p_kind, p_title_el, p_title_en, p_body_el, p_body_en, p_href);
$$;

-- ───────────────────── subscription cycle roll-forward ─────────────────────
-- Grants credits for every cycle that has lapsed since the last read.
create or replace function ensure_cycle_current(p_member_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member uuid := coalesce(p_member_id, auth.uid());
  sub    subscriptions;
begin
  select * into sub from subscriptions
   where member_id = member and status = 'active'
   for update;
  if not found then return; end if;

  while sub.cycle_end <= now() loop
    update subscriptions
       set cycle_start = cycle_end,
           cycle_end   = cycle_end + interval '30 days'
     where id = sub.id
     returning * into sub;

    insert into credit_transactions (member_id, type, status, reason, delta, created_at, settled_at)
    values (member, 'topup', 'confirmed', 'cycle_grant', sub.credits_per_cycle,
            sub.cycle_start, sub.cycle_start);
  end loop;
end;
$$;

-- ═══════════════════════════ waitlist promotion ════════════════════════════
-- A spot just freed up. Walk the queue in order and book the first member who
-- still qualifies. Anyone who would breach the cap, or can no longer afford
-- it, is dropped from the queue and told why — then the next is tried.
create or replace function promote_waitlist(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sess        sessions;
  studio      studios;
  ct          class_types;
  entry       waitlist_entries;
  cost        integer;
  new_booking uuid;
  when_label  text;
begin
  select * into sess from sessions where id = p_session_id for update;
  if not found or sess.status <> 'scheduled' or sess.start_at <= now() then
    return null;
  end if;
  if pulse_session_spots_left(p_session_id) <= 0 then
    return null;
  end if;

  select * into studio from studios where id = sess.studio_id;
  select * into ct     from class_types where id = sess.class_type_id;
  cost := pulse_session_credit_cost(p_session_id);
  when_label := to_char(sess.start_at, 'Dy HH24:MI');

  for entry in
    select * from waitlist_entries
     where session_id = p_session_id
     order by position asc
  loop
    -- Cap check at PROMOTION time, not at join time.
    if pulse_cap_reached(entry.member_id, sess.studio_id, sess.start_at) then
      delete from waitlist_entries where id = entry.id;
      perform pulse_notify(entry.member_id, 'booking',
        'Έχασες μια θέση που ελευθερώθηκε', 'You missed a spot that opened up',
        'Έχεις πιάσει το όριο επισκέψεων στο ' || studio.name || ' αυτόν τον μήνα.',
        'You''ve reached this month''s visit limit at ' || studio.name || '.',
        '/member/bookings');
      continue;
    end if;

    if pulse_balance(entry.member_id) < cost then
      delete from waitlist_entries where id = entry.id;
      perform pulse_notify(entry.member_id, 'booking',
        'Έχασες μια θέση που ελευθερώθηκε', 'You missed a spot that opened up',
        'Δεν είχες αρκετά credits για το ' || ct.name || ' στο ' || studio.name || '.',
        'You didn''t have enough credits for ' || ct.name || ' at ' || studio.name || '.',
        '/member/bookings');
      continue;
    end if;

    -- Promote: the soft hold becomes a real reservation + pending spend.
    insert into bookings (session_id, member_id, studio_id, status, credit_cost,
                          payout_eur, from_waitlist)
    values (p_session_id, entry.member_id, sess.studio_id, 'reserved', cost,
            sess.floor_price_eur, true)
    returning id into new_booking;

    insert into credit_transactions (member_id, type, status, reason, delta, booking_id, studio_id)
    values (entry.member_id, 'spend', 'pending', 'booking', -cost, new_booking, sess.studio_id);

    insert into payout_entries (studio_id, booking_id, session_id, member_id, amount_eur, status)
    values (sess.studio_id, new_booking, p_session_id, entry.member_id,
            sess.floor_price_eur, 'pending');

    delete from waitlist_entries where id = entry.id;

    perform pulse_notify(entry.member_id, 'booking',
      'Μπήκες! Αυτόματη κράτηση από τη λίστα', 'You''re in — auto-booked from the waitlist',
      ct.name || ' στο ' || studio.name || ' — ' || when_label || '. Το QR σου είναι έτοιμο.',
      ct.name || ' at ' || studio.name || ' — ' || when_label || '. Your QR is ready.',
      '/member/bookings');

    if studio.owner_id is not null then
      perform pulse_notify(studio.owner_id, 'booking',
        'Κράτηση από λίστα αναμονής', 'Booking filled from the waitlist',
        ct.name || ' — μια θέση ξαναγέμισε αυτόματα.',
        ct.name || ' — a freed spot was filled automatically.',
        '/studio/roster');
    end if;

    perform pulse_renumber_waitlist(p_session_id);
    return new_booking;  -- exactly one spot was freed
  end loop;

  perform pulse_renumber_waitlist(p_session_id);
  return null;
end;
$$;

create or replace function pulse_renumber_waitlist(p_session_id text)
returns void
language sql
as $$
  update waitlist_entries w
     set position = ranked.rn
    from (
      select id, row_number() over (order by created_at asc) as rn
        from waitlist_entries where session_id = p_session_id
    ) ranked
   where w.id = ranked.id and w.position is distinct from ranked.rn;
$$;

-- ═══════════════════════════════ booking ═══════════════════════════════════
create or replace function book_session(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member      uuid := auth.uid();
  sess        sessions;
  studio      studios;
  cost        integer;
  new_booking uuid;
  member_name text;
begin
  if member is null then raise exception 'not_authenticated'; end if;

  -- Lock the session row: concurrent bookings for the last spot serialize here.
  select * into sess from sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if sess.status <> 'scheduled' or sess.start_at <= now() then
    raise exception 'in_past';
  end if;

  if exists (
    select 1 from bookings
     where session_id = p_session_id and member_id = member
       and status in ('reserved','checked_in','completed')
  ) then
    raise exception 'already_booked';
  end if;

  if pulse_session_spots_left(p_session_id) <= 0 then
    raise exception 'full';
  end if;

  if pulse_cap_reached(member, sess.studio_id, sess.start_at) then
    raise exception 'visit_cap';
  end if;

  cost := pulse_session_credit_cost(p_session_id);
  if pulse_balance(member) < cost then
    raise exception 'insufficient_credits';
  end if;

  insert into bookings (session_id, member_id, studio_id, status, credit_cost, payout_eur)
  values (p_session_id, member, sess.studio_id, 'reserved', cost, sess.floor_price_eur)
  returning id into new_booking;

  -- PENDING credit spend …
  insert into credit_transactions (member_id, type, status, reason, delta, booking_id, studio_id)
  values (member, 'spend', 'pending', 'booking', -cost, new_booking, sess.studio_id);

  -- … and PENDING studio payout accrual.
  insert into payout_entries (studio_id, booking_id, session_id, member_id, amount_eur, status)
  values (sess.studio_id, new_booking, p_session_id, member, sess.floor_price_eur, 'pending');

  select * into studio from studios where id = sess.studio_id;
  select display_name into member_name from profiles where id = member;
  if studio.owner_id is not null then
    perform pulse_notify(studio.owner_id, 'booking',
      'Νέα κράτηση μέσω PULSE', 'New PULSE booking',
      coalesce(member_name, 'Μέλος') || ' — ' || studio.name,
      coalesce(member_name, 'Member') || ' — ' || studio.name,
      '/studio/roster');
  end if;

  return new_booking;
end;
$$;

-- ═══════════════════════════════ check-in ══════════════════════════════════
-- Flips the member's spend AND the studio's payout from pending to confirmed.
-- Callable by the member (QR) or the studio owner (roster).
create or replace function check_in(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bk     bookings;
  studio studios;
  caller uuid := auth.uid();
begin
  select * into bk from bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;

  select * into studio from studios where id = bk.studio_id;
  if caller is null or (caller <> bk.member_id and caller is distinct from studio.owner_id) then
    raise exception 'not_permitted';
  end if;

  if bk.status <> 'reserved' then raise exception 'not_checkinable'; end if;

  update bookings
     set status = 'checked_in', checked_in_at = now()
   where id = p_booking_id;

  update credit_transactions
     set status = 'confirmed', settled_at = now()
   where booking_id = p_booking_id and type = 'spend' and status = 'pending';

  update payout_entries
     set status = 'confirmed', confirmed_at = now()
   where booking_id = p_booking_id and status = 'pending';

  if studio.owner_id is not null then
    perform pulse_notify(studio.owner_id, 'payout',
      'Check-in ✓ — πληρωμή κατοχυρώθηκε', 'Check-in ✓ — payout locked in',
      '+' || bk.payout_eur || '€ από επιβεβαιωμένη παρουσία',
      '+€' || bk.payout_eur || ' from a confirmed attendance',
      '/studio/payouts');
  end if;
end;
$$;

-- ══════════════════════════════ no-show ════════════════════════════════════
create or replace function mark_no_show(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bk     bookings;
  studio studios;
  fee    integer;
begin
  select * into bk from bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if bk.status <> 'reserved' then raise exception 'not_checkinable'; end if;

  select * into studio from studios where id = bk.studio_id;
  if auth.uid() is distinct from studio.owner_id then
    raise exception 'not_permitted';
  end if;

  select no_show_fee_credits into fee from platform_policy where id;

  update bookings set status = 'no_show' where id = p_booking_id;

  -- The held spend is released, but a no-show fee is charged.
  update credit_transactions
     set status = 'reversed', settled_at = now()
   where booking_id = p_booking_id and type = 'spend' and status = 'pending';

  insert into credit_transactions (member_id, type, status, reason, delta, booking_id, studio_id, settled_at)
  values (bk.member_id, 'fee', 'confirmed', 'no_show_fee', -fee, p_booking_id, bk.studio_id, now());

  update payout_entries set status = 'reversed'
   where booking_id = p_booking_id and status = 'pending';

  perform promote_waitlist(bk.session_id);
end;
$$;

-- ════════════════════════════ cancellation ═════════════════════════════════
create or replace function quote_cancellation(p_booking_id uuid)
returns table (late boolean, fee_credits integer, refund_credits integer, cutoff_hours integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  bk      bookings;
  sess    sessions;
  studio  studios;
  cutoff  integer;
  is_late boolean;
  fee     integer;
begin
  select * into bk from bookings where id = p_booking_id;
  if not found then raise exception 'booking_not_found'; end if;
  select * into sess   from sessions where id = bk.session_id;
  select * into studio from studios  where id = bk.studio_id;

  select coalesce(studio.cancellation_cutoff_hours, default_cancellation_cutoff_hours),
         late_cancel_fee_credits
    into cutoff, fee
    from platform_policy where id;

  is_late := sess.start_at - now() < make_interval(hours => cutoff);
  return query select is_late,
                      case when is_late then fee else 0 end,
                      bk.credit_cost,
                      cutoff;
end;
$$;

create or replace function cancel_booking(p_booking_id uuid)
returns table (late boolean, fee_credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  bk      bookings;
  q       record;
begin
  select * into bk from bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if auth.uid() is distinct from bk.member_id then raise exception 'not_permitted'; end if;
  if bk.status <> 'reserved' then raise exception 'not_cancellable'; end if;

  select * into q from quote_cancellation(p_booking_id);

  update bookings
     set status = case when q.late then 'late_cancelled'::pulse_booking_status
                       else 'cancelled'::pulse_booking_status end,
         cancelled_at = now()
   where id = p_booking_id;

  -- Release the held spend.
  update credit_transactions
     set status = 'reversed', settled_at = now()
   where booking_id = p_booking_id and type = 'spend' and status = 'pending';

  -- Late fee, if past the cutoff.
  if q.late then
    insert into credit_transactions (member_id, type, status, reason, delta, booking_id, studio_id, settled_at)
    values (bk.member_id, 'fee', 'confirmed', 'late_cancel_fee', -q.fee_credits,
            p_booking_id, bk.studio_id, now());
  end if;

  -- The studio accrual never materializes.
  update payout_entries set status = 'reversed'
   where booking_id = p_booking_id and status = 'pending';

  -- A spot just freed up — auto-book the next person in the queue.
  perform promote_waitlist(bk.session_id);

  return query select q.late, q.fee_credits;
end;
$$;

-- ═══════════════════════════════ waitlist ══════════════════════════════════
create or replace function join_waitlist(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member   uuid := auth.uid();
  sess     sessions;
  cost     integer;
  entry_id uuid;
begin
  if member is null then raise exception 'not_authenticated'; end if;

  select * into sess from sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;
  if sess.status <> 'scheduled' or sess.start_at <= now() then raise exception 'in_past'; end if;

  if exists (
    select 1 from bookings
     where session_id = p_session_id and member_id = member
       and status in ('reserved','checked_in','completed')
  ) then
    raise exception 'already_booked';
  end if;

  -- Only a FULL session has a queue to join.
  if pulse_session_spots_left(p_session_id) > 0 then raise exception 'not_full'; end if;

  if exists (select 1 from waitlist_entries where session_id = p_session_id and member_id = member) then
    raise exception 'already_waitlisted';
  end if;

  if pulse_cap_reached(member, sess.studio_id, sess.start_at) then raise exception 'visit_cap'; end if;

  cost := pulse_session_credit_cost(p_session_id);
  -- A SOFT hold: verified against the balance, never deducted.
  if pulse_balance(member) < cost then raise exception 'insufficient_credits'; end if;

  insert into waitlist_entries (session_id, studio_id, member_id, position, hold_credits)
  values (p_session_id, sess.studio_id, member,
          (select count(*) + 1 from waitlist_entries where session_id = p_session_id), cost)
  returning id into entry_id;

  perform pulse_renumber_waitlist(p_session_id);
  return entry_id;
end;
$$;

create or replace function leave_waitlist(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from waitlist_entries
   where session_id = p_session_id and member_id = auth.uid();
  get diagnostics removed = row_count;
  if removed = 0 then raise exception 'not_waitlisted'; end if;
  perform pulse_renumber_waitlist(p_session_id);
end;
$$;

-- ═════════════════════ wallet & subscription (mock payments) ═══════════════
-- PAYMENTS SEAM: these write the correct ledger rows and nothing else — no
-- charge is made. When Stripe arrives, the payment intent is confirmed BEFORE
-- calling these, and the rest of the model is unchanged. See the README,
-- "Going to production → Stripe".
create or replace function top_up(p_pack_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member  uuid := auth.uid();
  pack    jsonb;
  credits integer;
  tx_id   uuid;
begin
  if member is null then raise exception 'not_authenticated'; end if;

  select p into pack
    from platform_policy, jsonb_array_elements(top_up_packs) p
   where id and p->>'id' = p_pack_id;
  if pack is null then raise exception 'pack_not_found'; end if;

  credits := (pack->>'credits')::integer;

  insert into credit_transactions (member_id, type, status, reason, delta, settled_at)
  values (member, 'topup', 'confirmed', 'topup_pack', credits, now())
  returning id into tx_id;

  perform pulse_notify(member, 'wallet',
    '+' || credits || ' credits προστέθηκαν', '+' || credits || ' credits added',
    'Το top-up πακέτο σου ολοκληρώθηκε.', 'Your top-up pack was processed.',
    '/member/wallet');

  return tx_id;
end;
$$;

create or replace function change_plan(p_plan_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member uuid := auth.uid();
  pl     plans;
  sub_id uuid;
begin
  if member is null then raise exception 'not_authenticated'; end if;
  select * into pl from plans where id = p_plan_id;
  if not found then raise exception 'plan_not_found'; end if;

  update subscriptions
     set plan_id = pl.id, credits_per_cycle = pl.credits_per_cycle, price_eur = pl.price_eur
   where member_id = member and status = 'active'
   returning id into sub_id;

  if sub_id is null then raise exception 'plan_not_found'; end if;
  return sub_id;
end;
$$;

-- ═══════════════════════ studio: cancel a session ══════════════════════════
create or replace function cancel_session(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sess   sessions;
  studio studios;
  bk     bookings;
  w      waitlist_entries;
begin
  select * into sess from sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;
  select * into studio from studios where id = sess.studio_id;
  if auth.uid() is distinct from studio.owner_id then raise exception 'not_permitted'; end if;

  update sessions set status = 'cancelled' where id = p_session_id;

  for bk in select * from bookings where session_id = p_session_id and status = 'reserved' loop
    update bookings set status = 'cancelled', cancelled_at = now() where id = bk.id;
    -- Full refund — the studio cancelled, never the member's fault.
    update credit_transactions
       set status = 'reversed', settled_at = now()
     where booking_id = bk.id and type = 'spend' and status = 'pending';
    update payout_entries set status = 'reversed' where booking_id = bk.id and status = 'pending';
    perform pulse_notify(bk.member_id, 'booking',
      'Μάθημα ακυρώθηκε', 'Class cancelled',
      studio.name || ' — τα credits σου επιστράφηκαν.',
      studio.name || ' — your credits were refunded.',
      '/member/bookings');
  end loop;

  for w in select * from waitlist_entries where session_id = p_session_id loop
    perform pulse_notify(w.member_id, 'booking',
      'Μάθημα ακυρώθηκε', 'Class cancelled',
      studio.name || ' — βγήκες από τη λίστα αναμονής.',
      studio.name || ' — you were removed from the waitlist.',
      '/member/bookings');
  end loop;
  delete from waitlist_entries where session_id = p_session_id;
end;
$$;
