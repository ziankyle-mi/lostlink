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
