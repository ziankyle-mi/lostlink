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
-- Verify with:
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'items'
--     and column_name in ('custody_extended_until', 'donation_turnover');
-- ==============================================================================