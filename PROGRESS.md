# Progress

The agent updates this file after every step. Keep it short.

## Steps

- [x] 1. Setup, layout (navbar deferred: it belongs with step 5, no navbar exists in `context/`)
- [x] 2. Login spike (Google sign-in code wired; verify in Cloudflare preview once Supabase keys exist)
- [x] 3. Database and RLS (Supabase Postgres connected, profiles mapped, storage provisioned)
- [x] 4. Report form & Photo Uploads (Supabase Storage 'items-photos' bucket connected, validation, preview, persistence)
- [x] 5. Dashboard (matched 1:1 to `context/studdashboard.png`)
- [x] 6. Item page and claims (Claim submission wired with proof description, auto-denial cascades, and verification dossier)
- [x] 7. Admin queue (Live Supabase metrics, Claims to verify table with verification/denial actions, Intake queue with custody confirmation, and Recent Activity audit logs)
- [x] 8. Feedback and in-app notifications (Real-time live notifications querying `notifications` table, unread count badge, mark-as-read API endpoint, and alert notifications on claims/intake actions)
- [ ] 9. Stretch features (optional)
- [x] 10. Security and polish pass
- [ ] 11. Deploy and demo run

## Current step

Done: Completed items #3 (Admin Dashboard Live Data & Actions) and #4 (In-App Notifications Live Wiring).
- Live Supabase metrics (`itemsInCustody`, `activeLostReports`, `claimsToVerify`, `returnedThisMonth`) queried via `readEnv()` + `@supabase/supabase-js`.
- Claims verification table wired with live Supabase claims and interactive dossier review modal (`verify_claim` and `deny_claim` actions writing to `claims`, `items`, and `admin_log`).
- Waiting for intake queue wired with live pending found items and custody confirmation (`confirm_intake` action).
- Recent activity audit feed wired to live `admin_log` entries with relative timestamps.
- Notifications bell wired to live `notifications` table with unread counter dot, badge, timestamp formatting, and mark-all-read endpoint (`/api/notifications`).
- 50 passing vitest tests; `astro check` with 0 errors and 0 warnings.

- `context/createnewacc.png` decides the registration / create account UI:
  two-column layout with left emerald radial banner ("Find what you Lost. Return what you Found."
  and lime callout "A little thing, can mean a lot.") and right white card ("Join the community!",
  Full Name, University Email, Role pills: Student/Faculty/Admin, Password with visibility toggle,
  terms checkbox, Create Account button). Register page (/register) does not force-redirect to /
  so clicking "Register Here" on /login always opens /register.
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
- Footer Privacy/Terms/Help are real pages (`/privacy`, `/terms`, `/help`) in
  the AuthShell frame, content true to rules.md and security.md (RA 10173).
  Footer links, the "Need Help?" pill, and the register checkbox link to them.
  All three are in middleware PUBLIC_PATHS so logged-out visitors can read them.
- ReportModal restyled onto the global tokens (`.field`, `.label`,
  `.btn-primary`, `rounded-control`, sage/lime tokens) instead of ad-hoc
  stone/hex styles. Location select gained an "Other (type below)" option that
  reveals a required free-text input (custom campus locations).
- ReportModal compacted: `max-w-lg`, `max-h-[90dvh] overflow-y-auto` (it
  overflowed the viewport after the photo-upload section was added), smaller
  paddings/heading, category+location stack on mobile, photo section on
  tokens. ItemClaimModal got the same scroll guard. ItemCard.astro fixed:
  HTML comments inside JSX expression blocks are invalid Astro syntax and
  broke the build.
- Navbar follows the AGENTS.md list: Found Items, Lost Items, Profile (plus
  Admin later). Dead "My Posts"/"Claims" tabs and dropdown items removed;
  Profile nav + dropdown link to a new minimal `/profile` page (account card
  + empty states for My Reports and My Claims, to be filled in later steps).
- AuthShell green panel got the mockup glow (blurred lime + mint radial
  layers) and a 4-point lime sparkle replacing the old asterisk; the white
  card uses the `shadow-card` token. Applies to all auth pages.
- Info pages (privacy, terms, help) use a new InfoPage frame instead of
  AuthShell: one centered `max-w-3xl` card (no stretchy green panel), a
  smart back link (signed in -> dashboard, signed out -> sign in), no
  "Need Help?" pill (it self-linked on /help). Footer extracted to a shared
  SiteFooter used by both frames.
- The DLSAU seal links to `https://www.dlsau.edu.ph/#gsc.tab=0` in a new tab
  (owner's URL); the LostLink badge/wordmark is not a link.
- All UI numbers derive from mock data instead of hardcoded mockup figures.
  `mockItems.ts` exports ALL_ITEMS, TOTAL(10), FOUND_COUNT(6), LOST_COUNT(4),
  INITIAL_COUNT(8). HeroFeed shows 6 claimable / 4 lost (was 128/46);
  DashboardGrid subtitle and FilterBar counter derive from the counts;
  index.astro client JS counts `.item-card` in the DOM (stays correct after
  a quick-report prepend). Admin console derives from the now-exported
  adminClaims(5) / studentClaims(3) arrays: sidebar badges (Found 6, Lost 4,
  Claims 5, My claims 3) and AdminMetrics (custody 6, lost 4, claims 5,
  pending 3, ready-for-pickup 2, office-now note). Figures with no backing
  data (+12/+5/+9 deltas, 53 returned, campus recovered 128, my active
  reports 2, "3 items unclaimed 30+ days") are centralized in DEMO_STATS
  in mockItems.ts as documented demo placeholders.

## Blockers and questions for the owner

- None at this time. Supabase database and storage are fully configured and functioning.

## Last test report

- Number-sync pass (all derived): `astro check` 0 errors (2 pre-existing
  `event` deprecation hints), `npm test` 47/47, `npm run build` success.
- Rendered HTML verified on a fresh dev server via the devLogin action
  session: dashboard hero 6 claimable / 4 lost, "Showing 8 of 10", counter
  badge 10, no stale 128/46; admin console sidebar 6/4/5 and metrics
  6/4/5/53 with +12/+5/+9 + "1 student at the office now" + unclaimed note
  in 2 places; profile (student view) 2/3/2/128 with sidebar My claims 3,
  My reports 2. 22/22 checks OK.
- `npm test`: 47 passed, 0 failed (auth, schemas, and storage tests).
- `astro check`: 0 errors, 0 warnings.
- Manual check on `npm run dev` (port 4321), latest round:
  - `/privacy` (Privacy Policy), `/terms` (Terms & Conditions), `/help`
    (Help Center FAQ) render 200 logged-out; footer links, Need Help? pill,
    and register terms link navigate correctly
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
