# Security

Part of LostLink. Main file: [../AGENTS.md](../AGENTS.md). Tables: [schema.sql](schema.sql). Behavior: [rules.md](rules.md).

This is a school demo, so there are two tiers.

**Must (always do):** server-side domain check, server-side admin guards, RLS tested for user, admin, and no login, Zod validation on every input, no raw HTML from user text, secrets server-side only, upload type and size checks, private bucket for hidden photos, Turnstile on login and report forms, security headers, generic error messages, `npm audit` before deploy, `admin_log`.

**Nice (only after the core works):** strict CSP tuning, Cloudflare rate limit rules, magic-byte file checks, privacy notice polish.

## Auth and access

- Verify the DLSAU email domain (`ALLOWED_EMAIL_DOMAIN`) on the server after every login. Never trust the client. `DEMO_ALLOWED_EMAILS` is the only exception.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Guard every admin page and every admin Action on the server. Hiding a button is not security.
- Keep the Supabase service role key server-side only. Never ship it to the browser. Never commit secrets. Use Cloudflare environment secrets.

## Input and output

- Validate every input with Zod on the server. Reject unknown fields.
- Never render user text as raw HTML. No `set:html` or `dangerouslySetInnerHTML` with user content.
- Use parameterized queries only. No string-built SQL.
- Keep Astro's origin check on for form posts (CSRF protection). Do not turn it off.
- Return generic error messages to users. Log details on the server only.

## Uploads

- Allow JPG, PNG, and WebP only. Max 5 MB.
- Rename files to random names. Never use the user's filename.
- Keep hidden-photo files in a private bucket and serve them with short-lived signed URLs, admins only.

## Headers and bots

- Set these in `middleware.ts`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `frame-ancestors 'none'`.
- Turnstile on login and report forms.

## Privacy (Philippine Data Privacy Act of 2012, RA 10173)

- Collect only what is needed: name, school email, and item details.
- Show a short privacy notice at first login and link it in the footer.
- Never show reporter contact details publicly.

## Row Level Security rules

Write these in step 3, before building features on top.

- `items`
  - Read: rows where `status = 'approved'`, or `reporter_id = auth.uid()`, or the user is an admin.
  - Insert: only with `reporter_id = auth.uid()` and `status = 'pending'`.
  - Update by owner: only while status is `pending` or `rejected`, and only content fields (not `status`, `reporter_id`, or `reference_code`).
  - Update of `status`: admins only.
  - Delete: owner only while `pending`.
- `claims`
  - Read and insert: the claimant's own rows. Insert only for approved found items the user did not report.
  - Update by claimant: only to set `withdrawn` while `pending`.
  - Admins read and update all.
- `notifications`: users read and update (mark read) only their own. Server code inserts them.
- `profiles`: users read their own. Admins read all. Role changes happen only in the database by hand.
- `admin_log`: admins read. Server code inserts.

## How to test (do this, do not assume)

Test every rule with three identities: a normal user, an admin, and no login.

1. As a normal user, try to read another user's pending report. It must fail.
2. As a normal user, open `/admin` and call an admin Action. Both must fail.
3. Without login, open `/profile`, `/report`, and `/admin`. All must redirect to `/login`.
4. Try to log in with a non-DLSAU email. It must be refused.
5. Submit a bad form with the browser dev tools (missing fields, future date, wrong file type, 6 MB file). The server must reject it.
6. Search the built client code for the service role key. It must not appear.
7. Confirm `.env` is in `.gitignore` and not in git history.

## Maintenance

- Run `npm audit` before each deploy. Pin dependency versions.
- Every admin action writes to `admin_log`.
