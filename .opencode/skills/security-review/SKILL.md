---
name: Security Review
description: Review LostLink changes for security before marking a step done, before deploy, or when auth, uploads, headers, or admin actions change. Use as the pre-merge security checklist mapped to this codebase.
---

# Security review for LostLink

Reference: `docs/security.md`. Source of truth for policy text. This skill maps
those rules to the actual files so the review is fast and complete.

Review every changed file against the OWASP Top 10 checklist below. A finding
is a blocker for "done". Fix it or report it; do not note-and-move-on.

## Fast file map

| Concern | File |
| --- | --- |
| Security headers, CSP, HSTS, path guards | `src/middleware.ts` |
| Login, register, password reset, rate limit | `src/actions/index.ts`, `src/lib/rateLimit.ts` |
| Session cookies, roles, dev bypass | `src/lib/session.ts`, `src/lib/auth.ts` |
| Env access, key presence | `src/lib/env.ts` |
| Supabase clients, storage upload | `src/lib/supabase.ts`, `src/lib/storage.ts` |
| Zod validation | `src/lib/schemas.ts` |
| Admin mutations, audit log | `src/pages/api/admin/actions.ts`, `src/pages/api/items.ts` |
| RLS policies | `docs/schema.sql` |

## OWASP Top 10 checklist (mapped to this app)

**A01 Broken access control**
- Every admin page and admin action re-checks the role in the handler, not just
  in the UI. Check `roleForEmail` and `user.role === "admin"` on every path.
- Users can only read their own unapproved reports. Verify via RLS, not a
  `.filter()` in Astro.
- `PUBLIC_PATHS` and `PUBLIC_PREFIXES` in middleware are minimal. A new route
  must not be added to them without a reason.
- `/_actions` endpoints other than `login`, `register`, `forgotPassword`,
  `devLogin` must 401 without a session.

**A02 Cryptographic failures**
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (see
  `sessionCookieOptions`).
- No secrets in `src/`, `dist/`, or git history. `.env` stays ignored.

**A03 Injection**
- Every input passes a Zod schema with `.strict()`. No unvalidated body reads.
- User text renders through `textContent` / `replaceChildren`, never
  `innerHTML` or `set:html`. Check `index.astro`, `ReportModal.astro`, and
  `ItemClaimModal.astro` for new DOM writes.
- Queries are parameterized through supabase-js. No string-built SQL anywhere.

**A04 Insecure design**
- Status transitions are enforced server-side (pending -> approved -> claimed
  or resolved; rejected with reason). A client cannot jump a status.
- Claim rules: only approved found items, not your own report, one pending
  claim per user (unique index), proof >= 20 chars.

**A05 Security misconfiguration**
- `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'` all present
  in `SECURITY_HEADERS`. If a new external origin is needed (fonts, images),
  add it to the right directive, not to `default-src`.
- Astro's form origin check (CSRF) stays on.
- `devLogin` action refuses to run unless `DEV_LOGIN_BYPASS` is on; verify it
  403s in a build.

**A06 Vulnerable components**
- `npm audit` before every deploy. Pin versions. No new dependency without
  asking the owner.

**A07 Identification and authentication failures**
- Domain check (`ALLOWED_EMAIL_DOMAIN`) runs on the server after every login
  and registration. Never trust a client hint.
- Rate limiter active on login: max 5 failed attempts per 5 minutes per IP and
  per email. Cleared on success.
- Password reset uses a PKCE verifier cookie with a short TTL.

**A08 Software and data integrity**
- No `dangerouslySetInnerHTML`. No `eval`. Client code does not assemble SQL
  or URLs from user input without encoding.

**A09 Logging and monitoring failures**
- Every admin action writes `admin_log` (approved, rejected, claim_verified,
  claim_denied, marked_claimed, remove_post).
- Error details log server-side; users get generic messages.

**A10 SSRF (low risk here)**
- No server-side fetch of user-supplied URLs. Photo uploads come through
  `/api/upload` with type and size checks, renamed to random names.

## Uploads (check on every photo feature)

- JPG, PNG, WebP only. Max 5 MB. 1–3 files.
- Random filenames. Never the user's filename.
- Hidden-photo items (`hide_photo`) live in a private bucket, served with
  short-lived signed URLs, admins only.
- Found reports require at least one photo; lost reports allow zero.

## Privacy (RA 10173)

- Collect only name, school email, item details.
- Reporter contact details never appear on public listings or to other users.

## Review output

List findings as: file, line, severity (blocker / warn / nit), one-line fix.
Run `npm audit` and paste the summary. If there are no blockers, say so
explicitly. Then run the demo-run smoke checks.
