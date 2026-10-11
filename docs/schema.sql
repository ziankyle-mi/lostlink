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
  created_at timestamptz default now()
);

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
  created_at timestamptz default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  claimant_id uuid not null references profiles(id),
  proof_description text not null check (char_length(proof_description) >= 20),
  status claim_status not null default 'pending',
  created_at timestamptz default now()
);

-- one pending claim per user per item
create unique index claims_one_pending_per_user
  on claims (item_id, claimant_id) where status = 'pending';

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
  action text not null,   -- approved, rejected, claim_verified, claim_denied, marked_claimed
  item_id uuid references items(id),
  claim_id uuid references claims(id),
  created_at timestamptz default now()
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

alter table profiles force row level security;
alter table items force row level security;
alter table claims force row level security;
alter table notifications force row level security;
alter table admin_log force row level security;

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

