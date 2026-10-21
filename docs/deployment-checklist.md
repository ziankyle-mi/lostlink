# LostLink Production Deployment Checklist

Owner-level steps that code cannot do for you. Run them in order on the real
DLSAU deployment. Do not invite users until every box is checked.

## 0. Treat the repository as compromised

The old `database/ACCOUNTS_CREDENTIALS.md`, login `.xlsx` sheets, and scripts
were committed with live credentials. Deleting them in a later commit does not
remove them from git history.

- [ ] Rotate the Supabase **service role** key (Project Settings → API → Reset).
- [ ] Rotate any admin/demo account passwords that were in the old docs.
- [ ] Delete unused demo accounts.
- [ ] Purge history (`git filter-repo` or BFG) **or** create a fresh repository
      from the current tree and archive the old one. Force-push only if every
      collaborator agrees.
- [ ] Invalidate old deploy tokens and Cloudflare API tokens.

## 1. Database

Use the production Supabase project (never the demo project).

- [ ] Back up the current database (Database → Backups) or export the schema.
- [ ] Run `docs/schema.sql` on a fresh project.
- [ ] Run `docs/migrations-production.sql` in the SQL editor.

Verify:

```sql
-- rate limit functions exist and are service-role only
select proname from pg_proc
where proname like 'll_%rate_limit%';

-- private photo bucket
select id, public from storage.buckets where id = 'items-photos'; -- false

-- status and claim triggers
select tgname from pg_trigger where not tgisinternal;

-- required columns
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'items'
  and column_name in ('reject_reason','custody_extended_until','donation_turnover','updated_at');
```

- [ ] Create the `items-photos` bucket if it does not exist (Storage → New bucket, **private**).
- [ ] Enable Point-in-Time Recovery if the plan supports it.
- [ ] Create the first admin profile: register normally, then
      `update profiles set role = 'admin' where email = '...';`
- [ ] Confirm `profiles.active = true` for every intended account.

## 2. Cloudflare secrets and vars

Set these with `npx wrangler secret put NAME` (or the dashboard). Never commit
them.

| Name | Value |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Production project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Rotated service role key |
| `ALLOWED_EMAIL_DOMAIN` | `dlsau.edu.ph` (also in `wrangler.jsonc` vars) |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `DEV_LOGIN_BYPASS` | `false` |
| `DEV_SESSION_SECRET` | Random 32+ byte hex, even though bypass is off |
| `DEMO_ALLOWED_EMAILS` | Empty. Ignored in production builds, but clear it anyway |

- [ ] Create a Turnstile widget for the production domain, then set both keys.
      With no secret key, bot verification is skipped and logs a warning.
- [ ] Confirm `wrangler.jsonc` has the `SESSION` KV binding and `IMAGES` binding
      after the first deploy. Create the KV namespace if Wrangler asks for an id.
- [ ] Set the Worker's compatibility date and `nodejs_compat` (already in
      `wrangler.jsonc`).
- [ ] Add the custom domain and confirm HTTPS.

## 3. Build and deploy

```bash
npm ci
npm run check     # 0 errors expected
npm test          # 93 passed, 2 skipped expected
npm run build
npx wrangler deploy
```

- [ ] Run the four commands above on a clean checkout.
- [ ] Confirm the deploy log shows the correct Supabase URL and bindings.
- [ ] Confirm `/login` loads with the Turnstile widget.
- [ ] Confirm an unauthenticated visit to `/` redirects to `/login`.

## 4. Smoke test with real accounts

Use one student test account and one admin account.

- [ ] Register a DLSAU email; reject a non-DLSAU email.
- [ ] Submit a found report with 1–3 photos; confirm it appears in `/admin` as pending.
- [ ] Confirm the found item; confirm it appears on `/`.
- [ ] Submit a lost report; approve it from `/admin`; confirm it appears on `/`.
- [ ] Reject a report with a reason; confirm the reason shows on `/profile`.
- [ ] Claim a found item with 20+ characters of proof.
- [ ] Withdraw that claim from `/profile`.
- [ ] Claim again, then verify it as admin; confirm the item becomes `claimed`.
- [ ] Confirm the losing claim (if any) is denied and notified.
- [ ] Mark the lost report resolved from `/item/[id]` as its reporter.
- [ ] Confirm notifications arrive and mark-read works.
- [ ] Confirm uploaded photos render through signed URLs and the bucket is private.
- [ ] Try 11 reports in an hour; the 11th should be rate-limited.
- [ ] Try a wrong password 6 times; the account should lock temporarily.

## 5. Operations

- [ ] Turn on Cloudflare observability/logs (already enabled in `wrangler.jsonc`).
- [ ] Add an uptime check for `/login`.
- [ ] Schedule weekly database backups or confirm PITR.
- [ ] Give the Security Office a written runbook for: reject a report, verify a
      claim, reset a password, suspend an account.
- [ ] Keep the repo private and enable branch protection with the CI check.

## Residual risks to accept explicitly

- All server routes use the service-role key, so authorization is enforced in
  application code rather than by RLS. The routes were audited, but this is a
  weaker boundary than anon-key + RLS.
- There is no email delivery for password reset. Recovery is office-assisted by
  design (`reset_user_password`).
- EXIF metadata is not stripped from uploaded photos. Ask users not to upload
  photos containing IDs or addresses.
- The 500-account admin directory cap is fine for ~130 users; revisit before
  scaling past 500.
- `tests/live-features.test.ts` mutates a real database and is excluded from CI.
  Never point it at production.
