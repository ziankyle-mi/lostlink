---
name: Supabase RLS
description: Write, change, or test Row Level Security policies for the LostLink Supabase database. Use when touching docs/schema.sql, adding tables/columns, writing queries that cross user boundaries, or when a feature needs a new access rule.
---

# Supabase RLS for LostLink

Policies live in `docs/schema.sql`. Behavior rules live in `docs/security.md`.
Write the policy first, test it with three identities, then build the feature on
top. Never rely on hidden UI buttons as access control.

## The three identities (test every rule with all three)

1. Normal user (authenticated, `role = 'user'`)
2. Admin (authenticated, `role = 'admin'`)
3. No login (anon)

A rule passes only if the allowed action works AND the disallowed actions fail
for each identity. Do not assume; run the queries.

## Current tables and rules

| Table | Read | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `profiles` | own row; admins read all | server only | own row, but never `role` or `id` | none |
| `items` | `status='approved'`, own reports, admins | own, `status='pending'` forced | owner while `pending`/`rejected` (content only); `status` change is admin only | owner while `pending` |
| `claims` | own; admins all | own, for approved found items the user did not report | claimant: only `pending` -> `withdrawn`; admin: all | none (cascade on item) |
| `notifications` | own | server code only | own, mark read only | none (cascade on profile) |
| `admin_log` | admins | server code only | none | none |

## Non-negotiables

- Every table: `enable row level security` AND `force row level security`.
  Owner is not the table owner here, but force it anyway; it is one line.
- Admin checks go through `public.is_admin(auth.uid())` only. It is a
  `security definer` function with `set search_path = public, auth, pg_temp`.
  Never inline a `select ... from profiles` check inside a policy.
- `is_admin` must stay `stable`, must check `active = true`, and its execute
  grant stays revoked from `public` and granted only to `authenticated`.
- Insert policies must pin `status` to the starting value (`'pending'`). A user
  must not insert an already-`approved` row.
- Owner update policies need BOTH `using` and `with check`, and they must match.
  A missing `with check` lets an owner escalate the row's status.
- Content update vs status update are separate policies:
  `items_update_owner` (content, restricted status) and `items_admin_update`
  (status, admin only). Keep that split for any new table.

## Adding a column or table (checklist)

1. Add the table to `docs/schema.sql` with the enum types at the top.
2. Add `enable` + `force` RLS immediately, before any code reads it.
3. Add the read policy first, then insert, then update, then delete. Skip none:
   a missing policy denies everything, which is safe but breaks the feature.
4. If the table references `profiles(id)`, add `on delete cascade` only where
   rows are meaningless without the owner (`claims`, `notifications`).
5. Test the three identities against the new policies with real SQL in the
   Supabase SQL editor or a service-role test script.
6. Update the rule table in `docs/security.md`.

## How to test (run, do not assume)

Use the Supabase SQL editor as each identity, or a script that sets the JWT
role. For each policy:

```sql
-- as anon
set local role anon;
select count(*) from items;          -- only approved rows

-- as a normal authenticated user (set request.jwt.claims)
set local role authenticated;
select count(*) from items;          -- approved + own rows, nothing else
```

Concrete checks that must pass:

1. User A cannot `select` user B's `pending` item, even by guessing the id.
2. User A cannot update `status` on their own item (only `items_admin_update`
   can, and they are not admin).
3. User A cannot insert an `items` row with `status = 'approved'`.
4. User A cannot insert a `claims` row for their own found item.
5. User A cannot mark user B's notification read.
6. An admin can do all of the above successfully.
7. Anon gets an empty `items` result (only approved) and errors on `claims`.

## Common mistakes to reject

- A policy that selects from `profiles` directly instead of calling `is_admin`.
  That leaks profile rows and breaks `search_path` hygiene.
- `with check` missing on an update policy.
- Forgetting `force row level security` after `enable`.
- Trusting the browser: a Supabase client in the browser is still bound by RLS,
  but the anon key plus a readable table is an attack surface. Call Supabase
  from server code (`src/lib/supabase.ts`) with the service role key only
  server-side.
- Storing the service role key anywhere the client can read it.
