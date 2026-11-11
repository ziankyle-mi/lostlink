-- LostLink migrations
-- Run these in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every statement is idempotent, so it is safe to run more than once.

-- ==============================================================================
-- 2026-10-15: Unclaimed Items Review (admin custody decisions)
--
-- Adds the two columns the Disciplinary Office needs to record a decision on an
-- item that has been unclaimed for 30+ days: one grace extension, or donation
-- turnover. `items.created_at` stays the start of the custody clock.
-- ==============================================================================

alter table items add column if not exists custody_extended_until timestamptz;
alter table items add column if not exists donation_turnover boolean not null default false;

-- Speeds up the overdue scan the admin console runs on every page load.
create index if not exists items_unclaimed_review
  on items (created_at)
  where type = 'found' and status = 'approved' and donation_turnover = false;

-- Optional: make existing old items show up as overdue so the feature can be
-- demoed immediately. Comment this out in production.
-- update items set created_at = now() - interval '48 days'
--   where type = 'found' and status = 'approved' and created_at > now() - interval '48 days';

-- ==============================================================================
-- 2026-10-23: Campus Announcements
-- ==============================================================================
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text not null default 'normal', -- 'urgent' | 'important' | 'normal'
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;
drop policy if exists "Anyone can read active announcements" on announcements;
drop policy if exists "announcements_read_active" on announcements;
create policy "announcements_read_active" on announcements for select
  using (active = true or public.is_admin(auth.uid()));

drop policy if exists "Admins can manage announcements" on announcements;
drop policy if exists "announcements_admin_all" on announcements;
create policy "announcements_admin_all" on announcements for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ==============================================================================
-- 2026-11-11: Faculty affiliation flag
-- ==============================================================================
alter table profiles add column if not exists is_faculty boolean not null default false;

-- ==============================================================================
-- 2026-11-11: One open claim per user per item
-- ==============================================================================
drop index if exists claims_one_pending_per_user;
create unique index claims_one_pending_per_user
  on claims (item_id, claimant_id) where status in ('pending', 'verified');

-- ==============================================================================
-- 2026-11-11: Durable rate limiting
-- ==============================================================================
create table if not exists rate_limit_attempts (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_attempt timestamptz not null default now()
);

alter table rate_limit_attempts enable row level security;

create or replace function public.ll_check_rate_limit(p_key text)
returns table (is_blocked boolean, remaining_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_locked timestamptz;
begin
  select locked_until into v_locked
  from public.rate_limit_attempts
  where key = p_key;

  if not found or v_locked is null or v_locked <= now() then
    return query select false, 0;
    return;
  end if;

  return query
    select true, greatest(1, ceil(extract(epoch from (v_locked - now())))::integer);
end;
$$;

create or replace function public.ll_record_failed_attempt(
  p_key text,
  p_max_failures integer default 5,
  p_lock_seconds integer default 300
)
returns table (is_blocked boolean, remaining_seconds integer, attempts_left integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_failures integer;
  v_locked timestamptz;
begin
  insert into public.rate_limit_attempts (key, failures, locked_until, last_attempt)
  values (p_key, 0, null, now())
  on conflict (key) do nothing;

  select failures, locked_until into v_failures, v_locked
  from public.rate_limit_attempts
  where key = p_key
  for update;

  if v_locked is not null and v_locked <= now() then
    v_failures := 0;
  end if;

  v_failures := v_failures + 1;

  if v_failures >= greatest(p_max_failures, 1) then
    v_locked := now() + make_interval(secs => greatest(p_lock_seconds, 1));
  else
    v_locked := null;
  end if;

  update public.rate_limit_attempts
  set failures = v_failures,
      locked_until = v_locked,
      last_attempt = now()
  where key = p_key;

  delete from public.rate_limit_attempts
  where last_attempt < now() - interval '2 days';

  return query
    select (v_failures >= greatest(p_max_failures, 1)),
           case when v_failures >= greatest(p_max_failures, 1) then greatest(p_lock_seconds, 1) else 0 end,
           greatest(greatest(p_max_failures, 1) - v_failures, 0);
end;
$$;

create or replace function public.ll_clear_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.rate_limit_attempts where key = p_key;
$$;

revoke all on function public.ll_check_rate_limit(text) from public, anon, authenticated;
revoke all on function public.ll_record_failed_attempt(text, integer, integer) from public, anon, authenticated;
revoke all on function public.ll_clear_rate_limit(text) from public, anon, authenticated;
grant execute on function public.ll_check_rate_limit(text) to service_role;
grant execute on function public.ll_record_failed_attempt(text, integer, integer) to service_role;
grant execute on function public.ll_clear_rate_limit(text) to service_role;

-- ==============================================================================
-- Verify with:
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'items'
--     and column_name in ('custody_extended_until', 'donation_turnover');
-- ==============================================================================