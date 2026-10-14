---
name: Demo Run
description: Run the full LostLink demo flow or a smoke test after a change. Use before calling a step done, before a deploy, when verifying a bug fix, or when the user asks to "run the system" or "test the app".
---

# Demo run for LostLink

Run this every time a step is marked done, before a deploy, and after any
change to auth, reports, claims, or admin actions. Report what passed and what
failed. Never say "done" without this report.

## 1. Automated checks (run first, always)

```sh
npm run check     # astro check: 0 errors, 0 warnings expected
npm test          # vitest: all tests must pass
npm run build     # production build must succeed
```

All three must pass before touching the browser. If any fails, fix it and
rerun; do not proceed on a red build.

## 2. Start the dev server

```sh
npm run dev       # http://localhost:4321
```

Wait for `astro vX ready`. Watch for the Cloudflare adapter warnings: a
`SESSION` KV binding note and a sharp runtime note are expected in dev. Any
esbuild or Vite error on startup (duplicate symbol, bad import) must be fixed
before continuing; the app is not running until the log is clean.

## 3. Logged-out checks

| Route | Expect |
| --- | --- |
| `/` | 302 to `/login?next=%2F` |
| `/privacy`, `/terms`, `/help` | 200, readable logged out |
| `/profile`, `/report`, `/admin` | 302 to `/login` |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | 200 |
| `/nope` | friendly 404 |

## 4. Sign in

- Dev bypass (when `DEV_LOGIN_BYPASS=true`): use the "Test login (dev)" link on
  `/login`. It signs in `firstname.lastname@dlsau.edu.ph`.
- Real Supabase: sign in with a DLSAU account. A non-DLSAU email must be
  refused with the domain message.
- Too many wrong passwords: expect the rate-limit lock message after 5 failed
  attempts (5-minute window per IP and per email).

## 5. Core user flow (one pass, no shortcuts)

1. Land on `/` as a student. Expect the dashboard: hero with the claimable and
   lost counts, filter bar, item grid, "Showing N of M" counter.
2. Search for a term and apply a category and location filter. Result count
   updates. Clear filters restores the full list. No matches shows the empty
   state with a clear-filters button.
3. Open `/report`, choose Report Found Item, fill every required field, add one
   photo (required for found), pass the duplicate warning, review the confirm
   summary, submit. Expect the success toast and a reference code like
   `LL-4821`.
4. Report a lost item too. Photos optional. Same submit path.
5. Open the item page `/item/[id]` from the card link. Photo gallery, location,
   date, reference code, description all present.
6. As a second user (or after the admin approves), claim the found item.
   Proof description needs at least 20 characters. Expect the pending claim
   status on `/profile`.
7. Sign in as an admin on `/admin`. The pending report is in the queue.
   Approve it. Check `admin_log` got a row and the reporter got a
   notification.
8. Verify the claim. Expect: item becomes `claimed`, competing pending claims
   become `denied`, those users are notified, claimant sees the
   "visit the security office with code" message.
9. Admin rejects another report with a reason. Reporter sees the reason on
   `/profile`, can edit and resubmit (back to `pending`).
10. Admin removes a post with the remove control. Card leaves the grid, the
    reporter is notified, `admin_log` records it.
11. Sign out. Back button must NOT restore the signed-in page (bfcache check).

## 6. Cross-cutting checks

- Every list has an empty state; every async action has a loading state.
- Toasts announce via `aria-live`. Keyboard: tab through a form, Escape closes
  modals, focus returns to the trigger.
- Mobile width (375px): one-column grid, no horizontal scroll, modals fit in
  `max-h-[90dvh]`.
- No reporter email or phone number is visible to other users anywhere.
- Browser console: no errors on `/`, `/item/[id]`, `/profile`, `/admin`.

## Report format

End with a short table: check name, pass/fail, one-line evidence. List every
failure and the file that caused it. Then update `PROGRESS.md`.
