# Progress

The agent updates this file after every step. Keep it short.

## Steps

- [x] 1. Setup, layout (navbar deferred: it belongs with step 5, no navbar exists in `context/`)
- [x] 2. Login spike (Google sign-in code wired; verify in Cloudflare preview once Supabase keys exist)
- [ ] 3. Database and RLS
- [ ] 4. Report form
- [ ] 5. Dashboard
- [ ] 6. Item page and claims
- [ ] 7. Admin queue
- [ ] 8. Feedback and in-app notifications
- [ ] 9. Stretch features (optional)
- [ ] 10. Security and polish pass
- [ ] 11. Deploy and demo run

## Current step

Done: setup + login (the owner's phase 1 request). Next: step 3, Database and RLS.
Blocked on the owner for: `ALLOWED_EMAIL_DOMAIN`, Supabase keys.

## Decisions made

- Login is Google sign-in only (owner confirmed), not the email/password form drawn
  in `context/dashboard.jpg`. Register and Forgot Password are not built (public
  accounts are out of scope).
- The mock `Continue without Google` button exists only behind `DEV_LOGIN_BYPASS=true`
  in dev; the real Google flow is refused when `ALLOWED_EMAIL_DOMAIN` is empty.
- Design tokens live once in `src/styles/global.css`, taken from `context/dashboard.jpg`.
- Astro 5.18 + @astrojs/cloudflare 12.6 (docs specify Astro 5; Astro 7 is out of scope).
- 404 page removed: it belongs to step 10, not phase 1.

## Blockers and questions for the owner

- What is the exact DLSAU email domain for `ALLOWED_EMAIL_DOMAIN`?
- Supabase URL + anon key, and the Google OAuth client, are still empty in `.env`.
  Needed before the Google button can be tested for real and before step 3.

## Last test report

- `npm test`: 29 passed, 0 failed (auth + schema tests).
- `astro check`: 0 errors, 0 warnings.
- `npm run build`: success.
- Manual flow on `npm run dev` (port 4322):
  - logged out `/` -> redirect `/login?next=%2F`
  - `/login` renders brand, quote, card, badges from `context/dashboard.jpg`
  - `devLogin` action -> 303, cookie set, `/` shows the signed-in landing
  - logged in `/login` -> redirect `/`
  - `logout` -> cookie cleared, `/` -> redirect `/login`
  - `/profile`, `/admin`, unknown path -> redirect `/login` (no bypass)
