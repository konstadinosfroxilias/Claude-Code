-- ═══════════════════════════════════════════════════════════════════════════
-- LOCAL VERIFICATION ONLY — never run against a real Supabase project.
--
-- A hosted Supabase project already provides the `auth` schema (auth.users,
-- auth.uid(), the anon/authenticated roles). This shim recreates just enough
-- of it on a bare Postgres so the real migrations run UNMODIFIED and the RLS
-- policies and SECURITY DEFINER functions can be exercised for real.
--
-- auth.uid() reads a session GUC, so a test can "become" a user with
--     select set_config('request.jwt.claim.sub', '<uuid>', false);
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
grant select on auth.users   to authenticated, service_role;
