-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0006 read views
--
-- SessionView in lib/types needs occupancy and the derived credit cost on
-- every row. Computing those client-side would mean an extra query per
-- session, so they are exposed here instead — one round trip for a whole day's
-- schedule, and the cost is derived by the same pulse_credit_cost() the
-- booking path uses, so what the member is quoted is what they are charged.
--
-- The view intentionally runs with the DEFINER's rights (the Postgres default)
-- rather than security_invoker: the counts must reflect ALL bookings and
-- waitlist entries, not just the caller's own rows, which RLS would otherwise
-- hide. Only aggregate counts are exposed — no member identities.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view session_view as
select
  s.id,
  s.studio_id,
  s.class_type_id,
  s.start_at,
  s.end_at,
  s.duration_min,
  s.instructor,
  s.capacity,
  s.spots_released_to_platform,
  s.floor_price_eur,
  s.is_peak,
  s.status,
  s.seed_booked,
  pulse_session_booked(s.id)      as booked,
  pulse_session_spots_left(s.id)  as spots_left,
  pulse_session_credit_cost(s.id) as credit_cost,
  (select count(*)::integer from waitlist_entries w where w.session_id = s.id)
                                  as waitlist_count
from sessions s;

grant select on session_view to anon, authenticated;
