-- ═══════════════════════════════════════════════════════════════════════════
-- PULSE · 0005 realtime
--
-- Publishes the tables whose changes should reach other devices live:
--   bookings            → a spot is taken/freed, roster updates on check-in
--   waitlist_entries    → queue moves, auto-book promotion
--   notifications       → the bell, including waitlist and payout messages
--   sessions            → schedule edits, cancellations, spots released
--   credit_transactions → the wallet after a booking or check-in
--   member_achievements → an unlock earned on another device
--
-- RLS still applies to realtime, so a member only ever receives rows they are
-- allowed to read. The client subscribes in lib/services/supabase/realtime.ts
-- and DEGRADES GRACEFULLY: if the publication or the socket is unavailable the
-- app keeps working on ordinary fetches (useLiveQuery refetches after writes).
--
-- Safe to re-run: each table is added only if it is not already published.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  -- supabase_realtime is created by the platform; on a bare Postgres (local
  -- verification) it may not exist, so create it rather than fail.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'bookings', 'waitlist_entries', 'notifications',
    'sessions', 'credit_transactions', 'member_achievements'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Realtime sends the full old row on update/delete only when REPLICA IDENTITY
-- is FULL. Needed so a client can tell WHICH session lost a spot.
alter table bookings         replica identity full;
alter table waitlist_entries replica identity full;
alter table sessions         replica identity full;
