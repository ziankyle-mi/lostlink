# Build steps

Part of LostLink. Main file: [../AGENTS.md](../AGENTS.md). Do one step at a time. Do not start the next step until every check in the current one passes. After each step: run the app and tests, report results, commit, and update [../PROGRESS.md](../PROGRESS.md).

## 1. Setup, layout, navbar

Read first: [polish.md](polish.md).

Done when:
- The app runs locally.
- The base layout and navbar match the screenshots in `context/`.
- Tailwind and the design tokens work.
- `.gitignore` covers `.env`. `.env.example` exists.

## 2. Login spike

Read first: [security.md](security.md).

Build only Google login with the DLSAU domain check on Astro, Cloudflare, and Supabase. Nothing else. This proves the stack works before anything depends on it. If it fails, stop and report the problem so the owner can change the stack.

Done when:
- A DLSAU email logs in and lands on the dashboard.
- A non-DLSAU email is refused with a clear message.
- A logged-out visitor is redirected to `/login` from protected pages.
- It works in a Cloudflare preview deploy, not only locally.

## 3. Database and RLS

Read first: [schema.sql](schema.sql) and [security.md](security.md).

Done when:
- Tables exist as in `schema.sql`.
- RLS policies are written and match the RLS rules in `security.md`.
- A profile row is created on first login. New users get role `user`.
- The RLS tests in `security.md` pass for normal user, admin, and no login.

## 4. Report form

Read first: [rules.md](rules.md).

Done when:
- The Lost or Found choice comes first.
- Missing fields block submit with inline messages. The server also rejects them.
- A similar existing item triggers the duplicate warning, and the user can still continue.
- The confirm summary shows before submit.
- A photo over 5 MB or a wrong file type is rejected.
- Found reports get a reference code. IDs and Cards set `hide_photo`.
- The new report is `pending` and appears on the reporter's `/profile`.
- A pending or rejected report can be edited. A pending report can be deleted.

## 5. Dashboard

Read first: [polish.md](polish.md).

Done when:
- `/`, `/lost`, and `/found` show approved items only.
- Search and filters work together and show a result count.
- Zero results show the empty state with a clear-filters button.
- Hidden photos show a placeholder.
- The layout matches the screenshots.

## 6. Item page and claims

Read first: [rules.md](rules.md).

Done when:
- Every claim rule in `rules.md` holds.
- A reporter cannot claim their own found report.
- A claimed item shows no claim button and the server rejects a new claim.
- A user can withdraw a pending claim.
- The lost item page shows "Did you find this? Report it as found."

## 7. Admin queue

Read first: [security.md](security.md) and [rules.md](rules.md).

Done when:
- Admins can approve, reject with a reason, verify a claim, deny a claim, and mark handover.
- Verifying one claim auto-denies the other pending claims on that item.
- Every action writes to `admin_log`.
- A normal user cannot reach `/admin` or any admin Action.

## 8. Feedback and in-app notifications

Read first: [rules.md](rules.md).

Done when:
- Toasts, loading text, and status badges appear as listed in `rules.md`.
- Every row in the notifications table is created for its event and shown to the right user.
- Marking a notification read works.

## 9. Stretch features (only if steps 1 to 8 pass)

See the stretch list in [rules.md](rules.md). Ask the owner which ones to build.

## 10. Security and polish pass

Read first: [security.md](security.md) and [polish.md](polish.md).

Done when:
- Every Must item in `security.md` passes, and every test in "How to test" passes.
- Keyboard-only navigation works on login, report, claim, and admin flows.
- Lighthouse is 90+ on a phone profile.
- Playwright tests pass for login, report, approve, claim, and resolve.

## 11. Deploy and demo run

Done when:
- The Cloudflare deploy works with secrets set in Cloudflare, not in git.
- Seed data is loaded (see below).
- A full demo run passes end to end: report, approve, claim, competing claim, verify, claimed.

## Demo data

The seed script creates:
- 1 admin and 2 normal users (test emails from `DEMO_ALLOWED_EMAILS`)
- About 12 sample items across categories and statuses (pending, approved, claimed, resolved, rejected), with placeholder photos
- 1 found ID card with `hide_photo = true`
- 2 pending claims on one item, to demo competing claims

## Environment variables

Keep `.env.example` with names only, no real values:

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, never in the browser
ALLOWED_EMAIL_DOMAIN=           # the DLSAU domain
DEMO_ALLOWED_EMAILS=            # comma separated, demo only
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
RESEND_API_KEY=                 # stretch only
```
