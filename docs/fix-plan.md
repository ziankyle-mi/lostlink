# Fix Plan — Audit findings (generated from code review)

Part of LostLink. Main file: [../AGENTS.md](../../AGENTS.md).
Security rules: [security.md](security.md). Behavior: [rules.md](rules.md).
UI rules: [polish.md](polish.md).

This is an **execution checklist** produced by a full design + functional/security
audit. Work top to bottom: Critical → Bugs → Design. Check off each item as you
finish it, then run the verification block at the bottom before moving on.

> Line numbers are anchors captured at audit time. They may drift a few lines as
> you edit — match on the surrounding code, not the exact number.
>
> Do one logical group at a time. Run `npm run check` + `npm test` after each
> group. Do not start the next group until the current one is green.

---

## Priority 0 — Critical security (fix before any demo or deploy)

- [ ] **C1. Admin escalation by email prefix** — `src/lib/session.ts:54-67`
  - `roleForEmail()` returns `"admin"` for any address starting `admin.` or
    containing `lostlink@`. Anyone can register such an address → full admin.
  - The hardcoded `ADMIN_EMAILS` set is also a backdoor.
  - **Fix:** delete the heuristic + `ADMIN_EMAILS`. Load role from
    `profiles.role` server-side (fall back to `"user"`). Role changes only in
    the DB by hand (per security.md:58).
  - Touches: `session.ts` `roleForEmail`, `resolveUser`, and every caller that
    does `user.role === "admin" || roleForEmail(...)`.

- [ ] **C2. RLS bypassed — pending/other users' reports are public**
  - `src/pages/index.astro:36-43`, `src/pages/item/[id].astro:27-31`,
    `src/pages/api/items.ts:22-43`.
  - All queries use the service-role key. Feed only filters
    `rejected`/`archived`, so every `pending` report is public; `/item/[id]`
    serves any row; `/api/items` GET returns `select("*")` (incl.
    `reporter_id`) to any authenticated non-admin.
  - **Fix:** add `status='approved' OR reporter_id = <me> OR is_admin(<me>)`
    to every read, or use a per-request client with the user's JWT.
  - Violates AGENTS hard rule 4 + security.md:48.

- [ ] **C3. Reports skip admin approval** — `src/pages/api/items.ts:171`
  - Insert uses `status: "approved"`, so new posts go straight public and the
    admin intake queue (pending) is dead code.
  - **Fix:** insert `status: "pending"`. Approve only via an admin endpoint.

- [ ] **C4. Hidden photos unprotected + public bucket**
  - `src/lib/storage.ts:6,72-79`; `hide_photo` written at
    `src/pages/api/items.ts:152,169` but **never read** by any page.
  - ID-card photos render publicly via `getPublicUrl`.
  - **Fix:** private bucket + short-lived `createSignedUrl`; branch on
    `hide_photo` in `ItemCard.astro`, `item/[id].astro`, `profile.astro`.
  - Violates security.md:30 + rules.md:38.

- [ ] **C5. Stored XSS via photo URL in inline handler**
  - `src/pages/item/[id].astro:180` interpolates `photo` into an inline
    `onclick` JS string; `api/items.ts:111,154` doesn't validate `photoUrls`.
  - **Fix:** validate `photoUrls` with Zod (must match the Supabase
    `items-photos` public/signed URL shape or a relative path); replace the
    inline `onclick` with `addEventListener` + property assignment.

- [ ] **C6. Live secrets shipped in `.env`**
  - Real `SUPABASE_SERVICE_ROLE_KEY`, anon key, `DEV_SESSION_SECRET`, and
    `DEV_LOGIN_BYPASS=true` in the distributed `.env`.
  - **Fix:** rotate the service-role key now; strip `.env` from any shared
    copy; deploy values as Cloudflare secrets. Keep `.env.example` names-only.

---

## Priority 1 — Real bugs (behavioral, not cosmetic)

- [ ] **B1. Broken Tailwind classes silently no-op** — `src/styles/global.css`
  - `forest-800`, `forest-50`, `forest-200`, `lime-50/200/600` are used but not
    defined in `@theme`, so those styles emit nothing. Affected:
    `item/[id].astro:128,247,279,301`, `AdminMetrics.astro:80`,
    `profile.astro:221,348,452`.
  - Also `border-lime-600/30` (ItemCard, FilterBar) falls back to Tailwind's
    default lime, not brand lime.
  - **Fix:** add `--color-forest-800/50/200` (+ any lime shades) to `@theme`,
    or replace usages with `forest-700` / `bg-canvas` / `border-line`.

- [ ] **B2. False success / swallowed errors on async surfaces**
  - `index.astro:982-1005` — report save failure only `console.warn`s but still
    shows a fake card + fake `LL-…` code (user's report silently lost).
  - `index.astro:636-656` — claim submit ignores the response, always toasts
    success.
  - `admin.astro:392-393,434-435,473-477` — success toast fires inside `catch`.
  - **Fix:** read the response; show error state + real message on failure; only
    show success after a confirmed ok. (AGENTS hard rule 5, rules.md:73-76.)

- [ ] **B3. Claim rules not enforced server-side** — `src/pages/api/claims.ts:188-251`
  - No check that the item is `approved` + `found` + not already `claimed` +
    not the caller's own report. Non-UUID `itemId` attaches the claim to the
    **first item in the table** (`:227-233`).
  - **Fix:** load the item, enforce all four rules, 409 on duplicate pending,
    reject non-UUID ids. (rules.md:43-49.)

- [ ] **B4. No Zod on any API route**
  - `api/{items,claims,notifications,upload}.ts`, `api/admin/actions.ts` all
    `await request.json()` and hand-check fields. Unknown fields accepted.
  - **Fix:** one `z.object({...}).strict()` schema per endpoint, or migrate to
    `defineAction`. (AGENTS hard rule 2, security.md:20.)

- [ ] **B5. Identity fallbacks attribute to random users**
  - `api/items.ts:139-142`, `api/claims.ts:211-214`,
    `api/admin/actions.ts:41-43` use `select id limit 1` when no profile matches
    → writes land under another user's profile. Nothing ever inserts into
    `profiles` (no signup trigger), so this fires for every new registrant.
  - **Fix:** resolve by authenticated `user.id` only, fail closed. Add a
    `handle_new_user` trigger to create the profile row.

- [ ] **B6. Status transitions unguarded / race-prone**
  - `api/admin/actions.ts:76,131-148` — `confirm_intake` sets `approved` with no
    current-status check; `verify_claim` never checks `claim.status==='pending'`
    or item status; verify→claim→deny-others has no transaction (double-claim
    race).
  - **Fix:** conditional updates (`… where status='pending'`) or a Postgres
    function/transaction; verify item `status='approved'`.

- [ ] **B7. Admin metrics filter on a `returned` status that doesn't exist**
  - `admin.astro:63-78` uses `.neq("status","returned")` /
    `.in("status",["claimed","returned"])`, but `item_status` has no `returned`.
  - **Fix:** use the real statuses (`claimed` for returned-this-month; exclude
    only `resolved` for active lost). Sync with schema.sql:5.

- [ ] **B8. Missing admin/user mutations**
  - No reject-with-reason, no approve of lost items (lost can never leave
    pending), no mark-resolved/handover, no edit/delete-while-pending, no
    rejected-resubmit, no claim withdraw. (rules.md:30-35,46,52-56.)
  - **Fix:** add the missing endpoints + wire the UI.

- [ ] **B9. Audit trail destroyed** — `api/admin/actions.ts:277`, `api/items.ts:275`
  - `admin_log.delete().eq("item_id", …)` erases audit rows to dodge FK errors;
    claims hard-deleted.
  - **Fix:** null out / soft-delete FKs; never delete `admin_log` (append-only).

---

## Priority 2 — Design consistency (make it airtight)

### Tokens & color
- [ ] **D1. Replace ~150 raw hexes with tokens.** Worst: `ReportModal.astro`
  (~52 lines), `profile.astro`, `StudentNavbar.astro`, `admin.astro`, and all
  `components/admin/*`. Map: `#164f38`→`forest-700`, `#082e1a`→`ink`/`forest-900`,
  `#d8ef8c`→`lime`, `#9b2c1f`→`danger`, `#ffffff`→`white`.
  Sanctioned (leave as-is): `#ece5d6`, `#134631`/`#2d6e4f`, `#dcecd2`.
  Non-token hover greens (`#123e2c`, `#0d3b28`, `#c9e376`, `#cbe675`,
  `#cde97b`) → `hover:bg-forest-900` or `hover:opacity-90`.
- [ ] **D2. Page wrappers use tokens.** `profile.astro:114`,
  `item/[id].astro:97`, `admin.astro:139` use `bg-[#f5f1e6] text-[#082e1a]
  selection:bg-[#d8ef8c]` → `bg-canvas text-forest-900 selection:bg-lime`
  (match `index.astro:103`).
- [ ] **D3. Brand art near-miss tokens.** `BrandMark.astro:18-24`
  (`#16503a`,`#f3efe4`,`#daef8a`) and `ItemIllustration.astro` (`#17503a` ×~30)
  → use `currentColor` / `var(--color-…)`.

### Badges & status
- [ ] **D4. One badge recipe.** FOUND/LOST type badge is 3 different sizes
  (`ItemCard.astro:34` ✅ canonical `px-3.5 py-1 text-xs`; `profile.astro:315`,
  `item/[id].astro:140`; `index.astro:481,490` JS override `px-2.5 py-0.5
  text-[10px]` resizes at runtime). Standardize on one string everywhere.
- [ ] **D5. Unify status colors.** Currently inverted: profile approved =
  dark bg/lime text; admin verified = lime bg/dark text. Pick one (lime bg +
  `text-forest-900`). Also unify "pending" (`bg-[#ece5d6]` vs `bg-stone-200`)
  and "denied" (`bg-red-100` vs `bg-[#9b2c1f]/10`).
- [ ] **D6. Remove off-palette status colors.** `item/[id].astro:147-150` uses
  emerald/blue/amber; success boxes use emerald (`ReportModal.astro:332`,
  `item/[id].astro:285,294`) → forest/lime/danger tokens.
- [ ] **D7. Destructive red.** Buttons use `rose-600` (AdminRemoveModal,
  ItemClaimModal, IntakeQueue, ItemCard, ReportModal) → `bg-danger
  hover:bg-danger/90`.

### Shape, shadow, spacing
- [ ] **D8. One radius for the big white section card.** Currently `rounded-card`
  (auth), `rounded-3xl` (profile/admin KPI), `rounded-[2rem]` (admin panels),
  `rounded-2xl`. → all large section cards `rounded-card`; nested `rounded-2xl`.
  Same for modal shells (`ItemClaimModal` vs `ReportModal` vs
  `AdminRemoveModal`) and the scrim (`bg-ink/60 backdrop-blur-xs`).
- [ ] **D9. Profile item card must match `ItemCard`.** `profile.astro:312` uses
  `rounded-2xl border-stone-200/90` vs `ItemCard.astro:14` `rounded-card
  border-line/80`.
- [ ] **D10. Shadows.** Resting cards drift (`shadow-card` auth vs `shadow-2xs`
  dashboard vs `shadow-xs` profile/admin). `AdminSidebar.astro:36` has
  `shadow-xl` on a static panel → `shadow-card`.
- [ ] **D11. Gutters & padding.** `DashboardFooter.astro:6` uses `px-5` (off by
  4px) → `px-4`. Align KPI vs section card padding (`p-6 sm:p-7` vs `p-6 sm:p-8`).
- [ ] **D12. One EmptyState recipe.** 3 variants (DashboardGrid, profile ×2,
  item page) with different radius/bg/dashed. Pick one.

### Type & copy
- [ ] **D13. One h1 scale.** 5 different page-heading scales (profile, admin,
  item, AuthShell, InfoPage). Define one. Use `.eyebrow` (currently unused) for
  all eyebrows instead of 4 ad-hoc ones.
- [ ] **D14. Body text minimum 0.9375rem.** `text-xs` paragraphs at
  `item/[id].astro:247,255,294,301`, `profile.astro:366,372` → `text-sm`.
- [ ] **D15. Muted-text ramp.** Two ramps (`stone-*` and `sage-*`) used for the
  same role. Pick `text-forest-900/75` (secondary on canvas) + `text-stone-500`
  (meta); kill the rest.
- [ ] **D16. Standardize action copy.**
  - Post action is 4 ways: "Post an item" / "Log a found item" / "Submit Report"
    / "Post an Item to Campus Feed" → **"Post an item"** (sentence case).
  - Claim action is 4 ways → **"Submit claim"**.
  - Buttons: `LOGIN` (all-caps) vs Title Case elsewhere → sentence/Title Case.
  - "Forget Password?" → "Forgot password?".
  - Back links ("Back to Sign in" vs "Back to sign in" vs "Back to Campus Feed")
    and footer link labels ("Campus feed" vs "Browse Campus Feed").
  - "Clear all filters" vs "Reset filters" → one.
- [ ] **D17. One footer.** 3 footers exist (`SiteFooter`, `DashboardFooter`,
  inline admin/item footers) with different links + hardcoded `© 2026`. Consolidate.
- [ ] **D18. Ticker separator.** `StudentNavbar` uses `▼`, `AdminTicker` uses `*`
  for the identical bar → one glyph (inline SVG dot preferred).

---

## Priority 3 — Hardening (nice-to-have, after core)

- [ ] **H1. Turnstile on login + report forms** (security.md "Must"; currently
  absent, keys empty).
- [ ] **H2. Rate limiter is in-memory** (`src/lib/rateLimit.ts:12`) — lost on
  Cloudflare cold start. Move to KV/Upstash; add limits to register, forgot,
  report, claim, upload.
- [ ] **H3. Return generic errors** — raw `err.message` returned from
  `items.ts:178,206`, `claims.ts:50,247`, `admin/actions.ts:329`,
  `upload.ts:147`. Log server-side only (security.md:24).
- [ ] **H4. Check Supabase write results** — many `await …update/insert` ignore
  `error`, and `getAdminClient()` falls back to the **anon key** silently →
  RLS blocks the write but API returns `ok:true` (silent data loss).
- [ ] **H5. CSP `script-src 'unsafe-inline'`** (`middleware.ts:14`) → nonce-based.
- [ ] **H6. Upload hardening** — magic-byte check, size check before base64
  decode (memory DoS), per-user quota (security.md:9).
- [ ] **H7. Remove reporter PII from the page model** — `item/[id].astro:29,59`
  pulls `reporterEmail` (unused) — delete before someone renders it.
- [ ] **H8. `devLogin` defense-in-depth** — add `import.meta.env.DEV` gate in
  `middleware.ts:42` (already re-checked in the handler).
- [ ] **H9. `PUBLIC_PREFIXES` loose `startsWith`** (`middleware.ts:29-38`) —
  `/itemsAnything` is public; tighten.
- [ ] **H10. Duplicate warning (pg_trgm similarity)** missing (rules.md:67).
- [ ] **H11. Notification matrix incomplete** — no rejected/resolved events;
  claim-submitted notifies `.limit(3)` admins; competing-claim links to `/`.

---

## Verification (run after each priority group)

```sh
npm run check    # 0 errors, 0 warnings
npm test         # all green
npm run build    # succeeds
```

Then walk the [demo-run skill](../.opencode/skills/demo-run/SKILL.md) flow:

- [ ] Logged-out: `/` → `/login`; `/privacy`,`/terms`,`/help` → 200; protected
      routes redirect.
- [ ] **Security checks (C1-C5):** a non-admin email cannot reach `/admin`;
      another user's `pending` report is NOT visible; a self-submitted report
      starts `pending` (not public); a hidden-photo (IDs) item shows a
      placeholder to non-admins; a malicious `photoUrls` value is rejected.
- [ ] **Bug checks (B1-B3):** item-page hover states render (forest-800 fixed);
      a failed report save shows an error (no fake card/code); claiming with a
      bad `itemId` is rejected, not attached to the first item.
- [ ] **Design checks (D1-D18):** no raw `#164f38`/`#d8ef8c` in the changed
      files; one badge recipe; one section-card radius; consistent action copy;
      screenshots in `context/` still match.
- [ ] Keyboard pass, 375/768/1280 viewports, every async surface has
      loading/empty/error/success states.

Update [PROGRESS.md](../PROGRESS.md) after each group. Commit per group with
`step N: short name` (or a descriptive message since this repo is not a git repo
yet).
