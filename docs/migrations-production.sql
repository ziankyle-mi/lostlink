-- ============================================================================
-- LostLink production hardening migration
--
-- Apply once in the Supabase SQL editor (or via `supabase db push`) against a
-- staging project first, then production. Every statement is idempotent.
--
-- This migration is REQUIRED before deploying the hardened application code:
--   * photo_path now stores storage object paths, not public URLs
--   * the items-photos bucket must be private (signed URLs are generated
--     server-side by src/lib/storage.ts)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Timestamps and lifecycle columns
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists updated_at timestamptz not null default now();
alter table items    add column if not exists updated_at timestamptz not null default now();
alter table items    add column if not exists approved_at timestamptz;
alter table items    add column if not exists rejected_at timestamptz;
alter table items    add column if not exists claimed_at timestamptz;
alter table items    add column if not exists resolved_at timestamptz;
alter table claims   add column if not exists updated_at timestamptz not null default now();
alter table notifications add column if not exists read_at timestamptz;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on profiles;
create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists items_touch_updated_at on items;
create trigger items_touch_updated_at
  before update on items
  for each row execute function public.touch_updated_at();

drop trigger if exists claims_touch_updated_at on claims;
create trigger claims_touch_updated_at
  before update on claims
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Claim uniqueness: one active claim per user per item
-- ---------------------------------------------------------------------------
drop index if exists claims_one_pending_per_user;
create unique index if not exists claims_one_active_per_user
  on claims (item_id, claimant_id)
  where status in ('pending', 'verified');

-- ---------------------------------------------------------------------------
-- 3. Indexes for the hot paths
-- ---------------------------------------------------------------------------
create index if not exists items_status_created_idx
  on items (status, created_at desc);
create index if not exists items_type_status_created_idx
  on items (type, status, created_at desc);
create index if not exists items_reporter_created_idx
  on items (reporter_id, created_at desc);
create index if not exists claims_claimant_status_idx
  on claims (claimant_id, status, created_at desc);
create index if not exists claims_item_status_idx
  on claims (item_id, status);
create index if not exists notifications_user_read_created_idx
  on notifications (user_id, read, created_at desc);
create index if not exists admin_log_created_idx
  on admin_log (created_at desc);
create index if not exists admin_log_item_idx
  on admin_log (item_id);

-- ---------------------------------------------------------------------------
-- 4. State-machine guard for items
-- ---------------------------------------------------------------------------
create or replace function public.enforce_item_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'  and new.status in ('approved', 'rejected')) or
      (old.status = 'approved' and new.status in ('claimed', 'resolved', 'rejected')) or
      (old.status = 'rejected' and new.status = 'pending')          -- resubmission
    ) then
      raise exception 'Invalid item status transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'approved' then new.approved_at = coalesce(new.approved_at, now()); end if;
    if new.status = 'rejected' then new.rejected_at = coalesce(new.rejected_at, now()); end if;
    if new.status = 'claimed'  then new.claimed_at  = coalesce(new.claimed_at, now());  end if;
    if new.status = 'resolved' then new.resolved_at = coalesce(new.resolved_at, now()); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists items_status_transition on items;
create trigger items_status_transition
  before update of status on items
  for each row execute function public.enforce_item_status_transition();

-- ---------------------------------------------------------------------------
-- 5. Claim rules at the database level (defense in depth)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_claim_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_item items%rowtype;
  claimant profiles%rowtype;
begin
  select * into target_item from items where id = new.item_id;
  if not found then
    raise exception 'Item does not exist';
  end if;
  if target_item.type <> 'found' then
    raise exception 'Only found items can be claimed';
  end if;
  if target_item.status <> 'approved' then
    raise exception 'Item is not available to claim';
  end if;

  select * into claimant from profiles where id = new.claimant_id;
  if not found or claimant.active = false then
    raise exception 'Claimant account is not active';
  end if;
  if claimant.role = 'admin' then
    raise exception 'Administrators cannot submit claims';
  end if;
  if target_item.reporter_id = new.claimant_id then
    raise exception 'You cannot claim an item you reported';
  end if;

  if new.status = 'pending' and exists (
    select 1 from claims
    where item_id = new.item_id
      and claimant_id = new.claimant_id
      and status in ('pending', 'verified')
  ) then
    raise exception 'An active claim already exists for this item';
  end if;

  return new;
end;
$$;

drop trigger if exists claims_enforce_rules on claims;
create trigger claims_enforce_rules
  before insert on claims
  for each row execute function public.enforce_claim_rules();

create or replace function public.enforce_claim_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('verified', 'denied', 'withdrawn'))
    ) then
      raise exception 'Invalid claim status transition: % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists claims_status_transition on claims;
create trigger claims_status_transition
  before update of status on claims
  for each row execute function public.enforce_claim_status_transition();

-- ---------------------------------------------------------------------------
-- 6. Profiles: users cannot grant themselves a role
-- ---------------------------------------------------------------------------
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is null for the service role; server-side admin actions are
    -- still validated in the route before they reach this trigger.
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Only administrators can change roles';
    end if;
  end if;

  if new.active is distinct from old.active then
    if auth.uid() = old.id then
      raise exception 'You cannot change your own account status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on profiles;
create trigger profiles_guard_role
  before update on profiles
  for each row execute function public.prevent_self_role_change();

-- ---------------------------------------------------------------------------
-- 7. Audit log is append-only
-- ---------------------------------------------------------------------------
revoke update, delete on table admin_log from anon, authenticated;
-- RLS already has no update/delete policy, so clients cannot rewrite history.

-- ---------------------------------------------------------------------------
-- 8. Private photo bucket
--    Run the storage block as the project owner. `items-photos` must already
--    exist (Supabase → Storage).
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id = 'items-photos';

-- No client-side object access: the server signs URLs with the service role.
drop policy if exists "items_photos_public_read" on storage.objects;
drop policy if exists "items_photos_authenticated_read" on storage.objects;
drop policy if exists "items_photos_authenticated_write" on storage.objects;

-- ---------------------------------------------------------------------------
-- 9. Verification queries (run after applying)
-- ---------------------------------------------------------------------------
-- select id, public from storage.buckets where id = 'items-photos';        -- false
-- select indexname from pg_indexes where tablename in ('items','claims','notifications','admin_log');
-- select tgname from pg_trigger where not tgisinternal;

-- ---------------------------------------------------------------------------
-- 10. Durable login rate limiting
--     Cloudflare runs many isolates, so the in-memory limiter must be backed
--     by a shared table. Only the service role can execute these functions.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_attempts (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_attempt timestamptz not null default now()
);

alter table public.rate_limit_attempts enable row level security;
-- No policies: the service role bypasses RLS; anon/authenticated cannot read.

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

  -- Opportunistic retention: auth abuse is low volume; keep two days.
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

