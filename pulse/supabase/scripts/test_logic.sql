-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · business-logic tests for the Postgres layer
--
-- Exercises the RPCs the way the app does, and asserts the invariants that
-- matter: spot allocation, the 4-visits cap, ledger pending→confirmed, payout
-- accrual, cancellation fees, waitlist promotion (including the cap and
-- insufficient-credit skips) and row-level security.
--
--   createdb pulse_test
--   psql -d pulse_test -f supabase/scripts/local_auth_shim.sql
--   psql -d pulse_test -f supabase/migrations/0001_core.sql   (…0005)
--   psql -d pulse_test -v ON_ERROR_STOP=1 -f supabase/scripts/test_logic.sql
--
-- Any failed assertion aborts with ON_ERROR_STOP.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function assert(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if cond then
    raise notice '  ✓ %', msg;
  else
    raise exception '  ✗ FAILED: %', msg;
  end if;
end $$;

create or replace function become(p uuid)
returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false); select null::void;
$$;

-- ─────────────────────────────── fixture ───────────────────────────────────
truncate notifications, credit_transactions, payout_entries, waitlist_entries,
         bookings, subscriptions, sessions, class_types, studio_categories,
         studios, favorites, reviews, goals, member_achievements,
         engagement_prefs, nudge_deliveries, profiles cascade;
delete from auth.users;

insert into pricing_config (id, eur_per_credit, peak_multiplier, off_peak_multiplier,
                            fill_bands, min_credits, max_credits)
values (true, 2, 1.2, 0.8,
        '[{"minFill":0.75,"multiplier":1.15},{"minFill":0.4,"multiplier":1},{"minFill":0,"multiplier":0.9}]',
        3, 12)
on conflict (id) do update set eur_per_credit = excluded.eur_per_credit;

insert into platform_policy (id, visit_cap_per_studio_per_month, rolling_window_days,
                             default_cancellation_cutoff_hours, late_cancel_fee_credits,
                             no_show_fee_credits, top_up_packs)
values (true, 4, 30, 12, 2, 3,
        '[{"id":"pack_s","credits":5,"priceEUR":14},{"id":"pack_m","credits":12,"priceEUR":29}]')
on conflict (id) do update set visit_cap_per_studio_per_month = excluded.visit_cap_per_studio_per_month;

insert into cities (id, name_el, name_en, lat, lng) values
  ('thessaloniki','Θεσσαλονίκη','Thessaloniki',40.6264,22.9484) on conflict do nothing;
insert into neighborhoods (id, city_id, name_el, name_en) values
  ('kentro','thessaloniki','Κέντρο','City Center') on conflict do nothing;
insert into categories (id, name_el, name_en, palette) values
  ('crossfit','CrossFit','CrossFit',1) on conflict do nothing;
insert into plans (id, name_el, name_en, credits_per_cycle, price_eur, blurb_el, blurb_en) values
  ('plus','Plus','Plus',22,59,'','') on conflict do nothing;

-- one owner + three members
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa','owner@test'),
  ('00000000-0000-0000-0000-0000000000b1','m1@test'),
  ('00000000-0000-0000-0000-0000000000b2','m2@test'),
  ('00000000-0000-0000-0000-0000000000b3','m3@test');

insert into profiles (id, role, display_name, email) values
  ('00000000-0000-0000-0000-0000000000aa','studio_owner','Owner','owner@test'),
  ('00000000-0000-0000-0000-0000000000b1','member','Member One','m1@test'),
  ('00000000-0000-0000-0000-0000000000b2','member','Member Two','m2@test'),
  ('00000000-0000-0000-0000-0000000000b3','member','Member Three','m3@test');

insert into studios (id, owner_id, name, city_id, neighborhood_id, lat, lng,
                     default_floor_price_eur, cancellation_cutoff_hours)
values ('st_t','00000000-0000-0000-0000-0000000000aa','Test Box','thessaloniki','kentro',
        40.63,22.94,10,12);
insert into studio_categories values ('st_t','crossfit',0);

insert into class_types (id, studio_id, category_id, name, duration_min, level)
values ('ct_t','st_t','crossfit','WOD 60',60,'all');

-- sessions: s1 (2 spots, tomorrow), s2..s5 for the cap test, s_soon (inside cutoff)
insert into sessions (id, studio_id, class_type_id, start_at, duration_min, capacity,
                      spots_released_to_platform, floor_price_eur, is_peak)
values
  ('s1','st_t','ct_t', now() + interval '2 days',  60, 10, 2, 10, false),
  ('s2','st_t','ct_t', now() + interval '3 days',  60, 10, 5, 10, false),
  ('s3','st_t','ct_t', now() + interval '4 days',  60, 10, 5, 10, false),
  ('s4','st_t','ct_t', now() + interval '5 days',  60, 10, 5, 10, false),
  ('s5','st_t','ct_t', now() + interval '6 days',  60, 10, 5, 10, false),
  ('s_soon','st_t','ct_t', now() + interval '3 hours', 60, 10, 5, 10, false);

-- give each member a wallet
insert into credit_transactions (member_id, type, status, reason, delta, settled_at)
select id, 'topup', 'confirmed', 'cycle_grant', 40, now() from profiles where role = 'member';

\echo '\n── pricing + occupancy'
do $$
begin
  -- floor 10 / €2 per credit = 5 base, off-peak ×0.8 = 4, empty band ×0.9 = 3.6 → 4
  perform assert(pulse_session_credit_cost('s1') = 4, 'credit cost derives from config (4)');
  perform assert(pulse_session_spots_left('s1') = 2, 's1 starts with 2 free spots');
  perform assert(pulse_balance('00000000-0000-0000-0000-0000000000b1') = 40, 'balance folds the ledger');
end $$;

\echo '\n── book_session'
do $$
declare bk uuid; cost integer;
begin
  perform become('00000000-0000-0000-0000-0000000000b1');
  bk := book_session('s1');
  cost := (select credit_cost from bookings where id = bk);

  perform assert((select status from bookings where id = bk) = 'reserved', 'booking is reserved');
  perform assert(pulse_session_spots_left('s1') = 1, 'a spot was consumed');
  perform assert(exists (select 1 from credit_transactions
                          where booking_id = bk and type='spend' and status='pending'
                            and delta = -cost), 'PENDING credit spend written');
  perform assert(exists (select 1 from payout_entries
                          where booking_id = bk and status='pending' and amount_eur = 10),
                 'PENDING payout accrual written');
  perform assert(pulse_balance('00000000-0000-0000-0000-0000000000b1') = 40 - cost,
                 'pending spend already reduces the balance');
  perform assert(exists (select 1 from notifications
                          where member_id='00000000-0000-0000-0000-0000000000aa'
                            and kind='booking'), 'studio owner notified');
end $$;

\echo '\n── guards'
do $$
declare msg text;
begin
  perform become('00000000-0000-0000-0000-0000000000b1');
  begin
    perform book_session('s1');
    perform assert(false, 'double booking rejected');
  exception when others then
    perform assert(sqlerrm = 'already_booked', 'double booking rejected → already_booked');
  end;

  -- fill the last spot with m2, then m3 must be told it is full
  perform become('00000000-0000-0000-0000-0000000000b2');
  perform book_session('s1');
  perform assert(pulse_session_spots_left('s1') = 0, 's1 is now full');

  perform become('00000000-0000-0000-0000-0000000000b3');
  begin
    perform book_session('s1');
    perform assert(false, 'overbooking rejected');
  exception when others then
    perform assert(sqlerrm = 'full', 'overbooking rejected → full');
  end;

  -- a session in the past
  perform become('00000000-0000-0000-0000-0000000000b3');
  update sessions set start_at = now() - interval '1 hour' where id = 's5';
  begin
    perform book_session('s5');
    perform assert(false, 'past session rejected');
  exception when others then
    perform assert(sqlerrm = 'in_past', 'past session rejected → in_past');
  end;
  update sessions set start_at = now() + interval '6 days' where id = 's5';
end $$;

\echo '\n── the 4-visits-per-studio cap'
do $$
declare msg text;
begin
  perform become('00000000-0000-0000-0000-0000000000b2');
  -- m2 already holds s1; add s2, s3, s4 → 4 visits at st_t
  perform book_session('s2');
  perform book_session('s3');
  perform book_session('s4');
  perform assert(pulse_visits_in_window('00000000-0000-0000-0000-0000000000b2','st_t', now()) = 4,
                 'four active bookings counted in the window');
  perform assert(pulse_cap_reached('00000000-0000-0000-0000-0000000000b2','st_t', now()),
                 'cap reported as reached');
  begin
    perform book_session('s5');
    perform assert(false, 'fifth booking rejected');
  exception when others then
    perform assert(sqlerrm = 'visit_cap', 'fifth booking rejected → visit_cap');
  end;
end $$;

\echo '\n── insufficient credits'
do $$
begin
  perform become('00000000-0000-0000-0000-0000000000b3');
  -- drain m3's wallet
  insert into credit_transactions (member_id, type, status, reason, delta, settled_at)
  values ('00000000-0000-0000-0000-0000000000b3','fee','confirmed','no_show_fee',-39, now());
  perform assert(pulse_balance('00000000-0000-0000-0000-0000000000b3') = 1, 'm3 has 1 credit');
  begin
    perform book_session('s5');
    perform assert(false, 'broke member rejected');
  exception when others then
    perform assert(sqlerrm = 'insufficient_credits', 'broke member rejected → insufficient_credits');
  end;
  -- refund for later tests
  insert into credit_transactions (member_id, type, status, reason, delta, settled_at)
  values ('00000000-0000-0000-0000-0000000000b3','topup','confirmed','topup_pack',39, now());
end $$;

\echo '\n── check_in flips BOTH ledger sides'
do $$
declare bk uuid;
begin
  select id into bk from bookings
   where member_id='00000000-0000-0000-0000-0000000000b1' and session_id='s1';
  perform become('00000000-0000-0000-0000-0000000000aa');   -- studio owner checks them in
  perform check_in(bk);

  perform assert((select status from bookings where id=bk) = 'checked_in', 'booking checked in');
  perform assert((select status from credit_transactions
                   where booking_id=bk and type='spend') = 'confirmed', 'spend confirmed');
  perform assert((select status from payout_entries where booking_id=bk) = 'confirmed',
                 'payout confirmed');
  perform assert((select confirmed_at is not null from payout_entries where booking_id=bk),
                 'payout carries a confirmation time');
end $$;

\echo '\n── cancellation: before vs after the cutoff'
do $$
declare bk uuid; q record; before_balance integer;
begin
  -- BEFORE cutoff (s2 is 3 days out, cutoff 12h) → full refund, no fee
  perform become('00000000-0000-0000-0000-0000000000b2');
  select id into bk from bookings where member_id='00000000-0000-0000-0000-0000000000b2' and session_id='s2';
  before_balance := pulse_balance('00000000-0000-0000-0000-0000000000b2');
  select * into q from cancel_booking(bk);
  perform assert(not q.late, 'early cancellation is not late');
  perform assert(q.fee_credits = 0, 'no fee before the cutoff');
  perform assert((select status from credit_transactions where booking_id=bk and type='spend') = 'reversed',
                 'held spend reversed');
  perform assert((select status from payout_entries where booking_id=bk) = 'reversed',
                 'payout accrual reversed');
  perform assert(pulse_balance('00000000-0000-0000-0000-0000000000b2') > before_balance,
                 'credits came back');

  -- AFTER cutoff → fee charged
  perform become('00000000-0000-0000-0000-0000000000b3');
  perform book_session('s_soon');
  select id into bk from bookings where member_id='00000000-0000-0000-0000-0000000000b3' and session_id='s_soon';
  select * into q from cancel_booking(bk);
  perform assert(q.late, 'late cancellation detected inside the cutoff');
  perform assert(q.fee_credits = 2, 'late fee charged (2)');
  perform assert(exists (select 1 from credit_transactions
                          where booking_id=bk and reason='late_cancel_fee' and delta=-2),
                 'late fee is a ledger row');
end $$;

\echo '\n── waitlist: join, auto-book on a freed spot'
do $$
declare wl uuid; freed uuid; bk_m1 uuid;
begin
  -- s1 is full (m1 checked in, m2 reserved). m3 queues.
  perform become('00000000-0000-0000-0000-0000000000b3');
  wl := join_waitlist('s1');
  perform assert((select position from waitlist_entries where id=wl) = 1, 'm3 is #1 in the queue');
  perform assert((select hold_credits from waitlist_entries where id=wl) > 0, 'soft hold recorded');
  perform assert(not exists (select 1 from credit_transactions
                              where member_id='00000000-0000-0000-0000-0000000000b3'
                                and reason='booking' and status='pending'),
                 'joining charges nothing');

  -- m2 cancels → a spot frees → m3 is auto-booked
  perform become('00000000-0000-0000-0000-0000000000b2');
  select id into bk_m1 from bookings where member_id='00000000-0000-0000-0000-0000000000b2' and session_id='s1';
  perform cancel_booking(bk_m1);

  perform assert(not exists (select 1 from waitlist_entries where session_id='s1'
                              and member_id='00000000-0000-0000-0000-0000000000b3'),
                 'm3 left the queue');
  select id into freed from bookings
   where member_id='00000000-0000-0000-0000-0000000000b3' and session_id='s1';
  perform assert(freed is not null, 'm3 was auto-booked');
  perform assert((select from_waitlist from bookings where id=freed), 'marked as a waitlist promotion');
  perform assert(exists (select 1 from credit_transactions
                          where booking_id=freed and type='spend' and status='pending'),
                 'soft hold became a real pending spend');
  perform assert(exists (select 1 from payout_entries where booking_id=freed and status='pending'),
                 'payout accrual created on promotion');
  perform assert(exists (select 1 from notifications
                          where member_id='00000000-0000-0000-0000-0000000000b3'
                            and title_en like 'You%auto-booked%'),
                 'member told they got in');
end $$;

\echo '\n── waitlist promotion respects the cap'
do $$
declare bk uuid;
begin
  -- m2 is back to 2 visits (s3, s4). Push m2 to the cap, then queue them.
  perform become('00000000-0000-0000-0000-0000000000b2');
  perform book_session('s5');
  perform book_session('s2');
  perform assert(pulse_visits_in_window('00000000-0000-0000-0000-0000000000b2','st_t', now()) = 4,
                 'm2 is at 4/4 again');

  -- free a spot on s1 while m2 sits in its queue
  perform become('00000000-0000-0000-0000-0000000000b2');
  -- m2 cannot even join at the cap
  begin
    perform join_waitlist('s1');
    perform assert(false, 'capped member cannot join');
  exception when others then
    perform assert(sqlerrm = 'visit_cap', 'capped member blocked from the queue → visit_cap');
  end;
end $$;

\echo '\n── promotion skips a member who no longer qualifies'
do $$
declare bk uuid; skipped integer;
begin
  -- m2 queues for s1 legitimately (drop one booking first), then hits the cap
  -- again before the spot frees: promotion must skip them and say why.
  perform become('00000000-0000-0000-0000-0000000000b2');
  select id into bk from bookings where member_id='00000000-0000-0000-0000-0000000000b2' and session_id='s5';
  perform cancel_booking(bk);                 -- back to 3/4
  perform join_waitlist('s1');                -- allowed now
  perform book_session('s5');                 -- 4/4 again, still queued for s1

  -- free a spot on s1: m3 holds one, cancel it
  perform become('00000000-0000-0000-0000-0000000000b3');
  select id into bk from bookings where member_id='00000000-0000-0000-0000-0000000000b3' and session_id='s1';
  perform cancel_booking(bk);

  perform assert(not exists (select 1 from bookings
                              where member_id='00000000-0000-0000-0000-0000000000b2'
                                and session_id='s1'
                                and status in ('reserved','checked_in','completed')),
                 'capped member was NOT auto-booked');
  select count(*) into skipped from notifications
   where member_id='00000000-0000-0000-0000-0000000000b2' and title_en like 'You missed a spot%';
  perform assert(skipped >= 1, 'capped member told they missed the spot');
  perform assert(not exists (select 1 from waitlist_entries where session_id='s1'
                              and member_id='00000000-0000-0000-0000-0000000000b2'),
                 'skipped member removed from the queue');
end $$;

\echo '\n── wallet: mock top-up writes the ledger'
do $$
declare before_balance integer;
begin
  perform become('00000000-0000-0000-0000-0000000000b1');
  before_balance := pulse_balance('00000000-0000-0000-0000-0000000000b1');
  perform top_up('pack_m');
  perform assert(pulse_balance('00000000-0000-0000-0000-0000000000b1') = before_balance + 12,
                 'top-up pack credited (+12)');
  perform assert(exists (select 1 from credit_transactions
                          where member_id='00000000-0000-0000-0000-0000000000b1'
                            and reason='topup_pack' and status='confirmed'),
                 'top-up is a confirmed ledger row');
  begin
    perform top_up('nope');
    perform assert(false, 'unknown pack rejected');
  exception when others then
    perform assert(sqlerrm = 'pack_not_found', 'unknown pack rejected → pack_not_found');
  end;
end $$;

\echo '\n── subscription cycle roll-forward'
do $$
begin
  insert into subscriptions (member_id, plan_id, status, credits_per_cycle, price_eur,
                             cycle_start, cycle_end)
  values ('00000000-0000-0000-0000-0000000000b1','plus','active',22,59,
          now() - interval '60 days', now() - interval '30 days');
  perform ensure_cycle_current('00000000-0000-0000-0000-0000000000b1');
  perform assert((select cycle_end from subscriptions
                   where member_id='00000000-0000-0000-0000-0000000000b1') > now(),
                 'lapsed cycles rolled forward');
  perform assert((select count(*) from credit_transactions
                   where member_id='00000000-0000-0000-0000-0000000000b1'
                     and reason='cycle_grant') >= 2,
                 'each lapsed cycle granted credits');
end $$;

\echo '\n── row-level security'
do $$
declare visible integer;
begin
  -- as m1, m2's ledger must be invisible
  perform become('00000000-0000-0000-0000-0000000000b1');
  set local role authenticated;
  select count(*) into visible from credit_transactions
   where member_id = '00000000-0000-0000-0000-0000000000b2';
  perform assert(visible = 0, 'a member cannot read another member''s ledger');

  select count(*) into visible from credit_transactions
   where member_id = '00000000-0000-0000-0000-0000000000b1';
  perform assert(visible > 0, 'a member CAN read their own ledger');

  select count(*) into visible from studios;
  perform assert(visible = 1, 'the catalog stays publicly readable');

  select count(*) into visible from goals where member_id <> '00000000-0000-0000-0000-0000000000b1';
  perform assert(visible = 0, 'engagement data of others is invisible (no leaderboards possible)');
  reset role;
end $$;

\echo '\n── owner scoping'
do $$
declare visible integer;
begin
  perform become('00000000-0000-0000-0000-0000000000aa');
  set local role authenticated;
  select count(*) into visible from bookings;
  perform assert(visible > 0, 'owner sees the roster for their own studio');
  select count(*) into visible from payout_entries;
  perform assert(visible > 0, 'owner sees their payouts');
  reset role;

  -- a member must NOT see the studio's payout rows they did not generate
  perform become('00000000-0000-0000-0000-0000000000b1');
  set local role authenticated;
  select count(*) into visible from payout_entries
   where member_id <> '00000000-0000-0000-0000-0000000000b1';
  perform assert(visible = 0, 'members only see accruals they generated');
  reset role;
end $$;

\echo '\n════════ ALL BUSINESS-LOGIC TESTS PASSED ════════'
