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

Done: setup + login screens (owner's phase 1). Next: step 3, Database and RLS.
Blocked on the owner for: Supabase keys (URL, anon key) and Google OAuth client.

## Decisions made

- `context/dashboard.jpg` plus the owner's mockup decide the login UI: Email,
  Password, Remember me, Forget Password, LOGIN, "Register Here". Mockup wins
  over the old Google-only note.
- Auth is Supabase email/password with a server-side `dlsau.edu.ph` check.
  Register and Forget Password are built (owner chose "build both").
- Logos come from `public/dlsau-logo.svg` and `public/lostlink-logo.jpg`,
  placed there by the owner; the header shows seal | divider | mark | wordmark.
- The dev button is a small "Test login (dev)" link under the card, only when
  `DEV_LOGIN_BYPASS=true` in dev. It signs in `firstname.lastname@dlsau.edu.ph`.
- Google OAuth code was removed with the password switch (can be re-added).
- Design tokens live once in `src/styles/global.css`.
- Astro 5.18 + @astrojs/cloudflare 12.6 (docs specify Astro 5).
- 404 page and navbar removed: they belong to steps 10 and 5, not phase 1.
- Badge icons are inlined Lucide SVGs (ISC license): shield-check, key-round,
  map-pin. Hand-drawn paths removed; matches the shadcn/ui stack.
- Loading treatment is an in-button spinner: `SubmitButton.astro` disables the
  button and swaps the label on submit (login, register, forgot, reset).
- "Web-based" removed from all copy: title is "DLSAU Lost and Found System".
- Brand lockup refined to the mockup: seal larger than tile, flat images,
  wordmark `forest-900`, tight wordmark/subtitle stack, taller divider.
- Button hover is a flat darken (`forest-700` -> `forest-900`) with a press
  scale; no sheen sweep or float-up (owner flagged it as AI-ish).
- The DLSAU seal links to `https://www.dlsau.edu.ph/#gsc.tab=0` in a new tab
  (owner's URL); the LostLink badge/wordmark is not a link.

## Blockers and questions for the owner

- Supabase URL + anon key, and the Google OAuth client, are still empty in `.env`.
  Needed before the Google button can be tested for real and before step 3.

## Last test report

- `npm test`: 42 passed, 0 failed (auth + schema tests).
- `astro check`: 0 errors, 0 warnings.
- Manual check on `npm run dev` (port 4321), latest round:
  - `/login`, `/register`, `/forgot-password`, `/reset-password` all render
    `data-busy-label` + spinner markup (loading state wired)
  - `/login` header shows "DLSAU Lost and Found System" (no "Web-based"),
    Lucide badge icons present
- `npm run build`: success.
- Manual flow on `npm run dev` (port 4321):
  - `/login` shows seal, mark, wordmark, Email/Password, Remember me,
    Forget Password, LOGIN, Register Here, three badges (mockup match)
  - `/register`, `/forgot-password`, `/reset-password` render
  - logos load: `/dlsau-logo.svg` 200, `/lostlink-logo.jpg` 200
  - "Test login (dev)" -> `/` signed in; signed-in `/login` -> `/`
  - logout -> `/` redirects to `/login?next=%2F`
  - non-DLSAU email -> 403; real login/forgot -> clear "not configured"
    message until Supabase keys exist
