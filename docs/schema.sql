-- LostLink database schema (Supabase Postgres)
-- Row Level Security rules are in docs/security.md. Write the policies in step 3.

create type item_type as enum ('lost', 'found');
create type item_status as enum ('pending', 'approved', 'claimed', 'resolved', 'rejected');
create type claim_status as enum ('pending', 'verified', 'denied', 'withdrawn');
create type user_role as enum ('user', 'admin');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'user',
  active boolean not null default true,
  -- Degree program code chosen at registration (e.g. 'BSCS', 'DVM').
  -- Nullable: admins, staff, and accounts created before this column have NULL.
  program text,
  -- Student-specific fields: Student ID and Year Level (null for faculty and admin)
  student_id text,
  year_level text,
  -- True when the account belongs to a faculty member. Set from the
  -- registration affiliation choice; never grants admin privileges.
  is_faculty boolean not null default false,
  -- Set when the Security Office issues a temporary password. The student is
  -- forced to /reset-password until they choose a new one.
  must_change_password boolean not null default false,
  created_at timestamptz default now()
);

-- Migrations for databases created before these columns existed:
alter table profiles add column if not exists must_change_password boolean not null default false;
alter table profiles add column if not exists program text;
alter table profiles add column if not exists student_id text;
alter table profiles add column if not exists year_level text;
alter table profiles add column if not exists is_faculty boolean not null default false;

-- Enforce strict unique constraint and official DLSAU format for Student IDs
create unique index if not exists profiles_student_id_unique on profiles (student_id) where student_id is not null;
alter table profiles drop constraint if exists profiles_student_id_format_check;
alter table profiles add constraint profiles_student_id_format_check check (student_id is null or student_id ~ '^[0-9]{4}-00-[0-9]{6}$');

create table items (
  id uuid primary key default gen_random_uuid(),
  type item_type not null,
  name text not null,
  category text not null,
  location text not null,
  event_date date not null check (event_date <= current_date),
  description text not null check (char_length(description) >= 10),
  photo_path text,
  status item_status not null default 'pending',
  reject_reason text,
  reference_code text unique,                  -- short tag code, found items only
  hide_photo boolean not null default false,   -- true for the "IDs and Cards" category
  reporter_id uuid not null references profiles(id),
  created_at timestamptz default now(),
  -- Unclaimed Items Review: the custody clock runs from created_at. A grace
  -- extension pushes the deadline out, donation turnover closes the case.
  custody_extended_until timestamptz,
  donation_turnover boolean not null default false
);

create index items_unclaimed_review
  on items (created_at)
  where type = 'found' and status = 'approved' and donation_turnover = false;

create table claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  claimant_id uuid not null references profiles(id),
  proof_description text not null check (char_length(proof_description) >= 20),
  status claim_status not null default 'pending',
  created_at timestamptz default now()
);

-- one open claim per user per item (pending, or already verified and awaiting pickup)
create unique index claims_one_pending_per_user
  on claims (item_id, claimant_id) where status in ('pending', 'verified');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz default now()
);

create table admin_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,   -- approved, rejected, claim_verified, claim_denied, marked_claimed, user_login
  item_id uuid references items(id),
  claim_id uuid references claims(id),
  created_at timestamptz default now()
);

-- User Login Activity Logging
create table if not exists login_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ip_address text,
  user_agent text,
  device_summary text,
  auth_method text not null default 'password',
  created_at timestamptz default now()
);

create index if not exists login_activity_user_idx on login_activity (user_id, created_at desc);
create index if not exists login_activity_created_idx on login_activity (created_at desc);

-- Campus announcements broadcast by the Security Office.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('urgent', 'important', 'normal')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Shared durable rate-limit store (see the RPCs at the end of this file).
create table if not exists rate_limit_attempts (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_attempt timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index items_name_trgm on items using gin (name gin_trgm_ops);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable and Force RLS on all tables
alter table profiles enable row level security;
alter table items enable row level security;
alter table claims enable row level security;
alter table notifications enable row level security;
alter table admin_log enable row level security;
alter table login_activity enable row level security;
alter table announcements enable row level security;
alter table rate_limit_attempts enable row level security;

alter table profiles force row level security;
alter table items force row level security;
alter table claims force row level security;
alter table notifications force row level security;
alter table admin_log force row level security;
alter table login_activity force row level security;

-- Admin helper function with isolated search_path
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin' and active = true
  );
$$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- PROFILES
-- Read: users read own profile; admins read all
create policy "profiles_read"
  on profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

-- Update: users update own profile, but cannot change role or id
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- ITEMS
-- Read: approved items (public/authenticated), reporter reads own, or admins read all
create policy "items_read"
  on items for select
  to authenticated, anon
  using (
    status = 'approved' or
    (auth.uid() is not null and reporter_id = auth.uid()) or
    public.is_admin(auth.uid())
  );

-- Insert: authenticated users can insert own report with status 'pending'
create policy "items_insert"
  on items for insert
  to authenticated
  with check (
    reporter_id = auth.uid() and
    status = 'pending'
  );

-- Update: owner can update content while pending or rejected (not status/reporter_id/reference_code)
create policy "items_update_owner"
  on items for update
  to authenticated
  using (
    reporter_id = auth.uid() and
    status in ('pending', 'rejected')
  )
  with check (
    reporter_id = auth.uid() and
    status in ('pending', 'rejected')
  );

-- Update status: admins only
create policy "items_admin_update"
  on items for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Delete: owner only while pending
create policy "items_delete_owner"
  on items for delete
  to authenticated
  using (
    reporter_id = auth.uid() and
    status = 'pending'
  );

-- CLAIMS
-- Read: claimant reads own; admins read all
create policy "claims_read"
  on claims for select
  to authenticated
  using (
    claimant_id = auth.uid() or
    public.is_admin(auth.uid())
  );

-- Insert: claimant can insert for approved found items they did not report
create policy "claims_insert"
  on claims for insert
  to authenticated
  with check (
    claimant_id = auth.uid() and
    status = 'pending' and
    exists (
      select 1 from items
      where id = item_id and status = 'approved' and type = 'found' and reporter_id <> auth.uid()
    )
  );

-- Update by claimant: only to set status 'withdrawn' while pending
create policy "claims_withdraw_claimant"
  on claims for update
  to authenticated
  using (
    claimant_id = auth.uid() and
    status = 'pending'
  )
  with check (
    claimant_id = auth.uid() and
    status = 'withdrawn'
  );

-- Admin update: admins update claims (verify/deny)
create policy "claims_admin_update"
  on claims for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- NOTIFICATIONS
-- Read & Update (mark read): users only for their own notifications
create policy "notifications_read"
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_read"
  on notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ADMIN_LOG
-- Read: admins only. (Inserts occur via server/service-role)
create policy "admin_log_read"
  on admin_log for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- LOGIN_ACTIVITY
-- Read: users read their own login activity; admins read all
create policy "login_activity_read_own"
  on login_activity for select
  to authenticated
  using (
    user_id = auth.uid() or
    public.is_admin(auth.uid())
  );

-- ANNOUNCEMENTS
-- Read: everyone sees active notices; admins manage all.
create policy "announcements_read_active"
  on announcements for select
  to authenticated, anon
  using (active = true or public.is_admin(auth.uid()));

create policy "announcements_admin_all"
  on announcements for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- RATE_LIMIT_ATTEMPTS
-- No policies on purpose: only the service role (which bypasses RLS) touches
-- this table through the SECURITY DEFINER functions below.

-- ==============================================================================
-- DURABLE RATE LIMITING (shared across Cloudflare isolates)
-- ==============================================================================
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


