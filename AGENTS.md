# LostLink: DLSAU Lost and Found System

School demo for Group 3. DLSAU students, faculty, and staff report lost or found items. Admins (security office) approve reports, verify claims, and mark items claimed. Found items are physically dropped at the security office.

Build it solid and secure, but do not over-engineer it. It is a demo.

## Start of every session

1. Read `PROGRESS.md` to see what is done and what is next.
2. Read this file.
3. Open the doc that matches the current step (see the file map).

## File map (read only what the current step needs)

| File | What it holds | Read it |
| --- | --- | --- |
| [PROGRESS.md](PROGRESS.md) | Step status, decisions, blockers | Every session. Update after every step |
| [docs/steps.md](docs/steps.md) | Each build step with its "done" checks, demo data, env variables | Before starting any step |
| [docs/rules.md](docs/rules.md) | Use cases, status flow, claim rules, notifications, feature rules | Before any behavior work |
| [docs/schema.sql](docs/schema.sql) | Database tables | Steps 3 and later |
| [docs/security.md](docs/security.md) | Security checklist, RLS rules, how to test them | Steps 2, 3, 7, and 10 |
| [docs/polish.md](docs/polish.md) | UI reference rules, polish and accessibility checklist | Steps 1, 5, and 10 |
| `context/` | Screenshots of the UI | Any UI work. Copy them |

## Scope (follow it)

**Core:** DLSAU-only login, report lost or found item, admin approval, dashboard with search and filters, item page, claim with proof, admin verification, status tracking, in-app notifications, user profile.

**Stretch (only after core passes):** match suggestions, Realtime notifications, email alerts, admin stats card, stale items view, Cloudflare rate limit rules.

**Out of scope:** chat or messaging, payments, native mobile app, AI image recognition, multi-campus, public (non-DLSAU) accounts, social features, anything not listed in these files.

## How you must work

1. Do one build step at a time. Stop when its checks pass. Do not start the next step until told.
2. Build only what these files list. Do not add features, pages, tables, or libraries that are not listed.
3. If something is missing or unclear, ask. Do not guess.
4. If a request conflicts with these files, stop and say so.
5. After each step, run the app and the tests. Report what passed and what failed. Never say "done" without that report.
6. Make a git commit after each passing step. Use the message `step N: short name`.
7. Never commit secrets. `.env` stays in `.gitignore`. Keep `.env.example` up to date with names only.
8. Keep changes small. Do not refactor unrelated code.
9. Update `PROGRESS.md` after every step.

## Hard rules

1. Astro 5 in server mode. Pages are `.astro` files. Use React only for interactive islands.
2. Every form and mutation goes through an Astro Action with Zod validation on the server.
3. Only DLSAU email accounts can log in. Check the domain on the server after login. Do not rely on the Google `hd` hint alone.
4. Normal users must never read other people's unapproved reports. Enforce it with Row Level Security, not only in UI code.
5. Every list has an empty state. Every async action has a loading state and a success or error message.
6. Copy the UI screenshots in `context/`. Do not redesign.
7. Keep copy short and plain. No emojis in the UI.

## Stack

- Astro 5 (SSR) with the Cloudflare adapter `@astrojs/cloudflare`. Check the current Astro and Cloudflare docs for deploy setup before configuring.
- Astro Actions and Zod
- React islands for the report form, filters, notification bell, and claim form
- Tailwind CSS and shadcn/ui (unless the owner says otherwise)
- Supabase for Postgres, Google sign-in, photo storage, and Row Level Security. Call it from server code. Cloudflare hosts the app and does not replace the database.
- Cloudflare Turnstile on login and report forms
- Hosting on Cloudflare

## Roles

- `user`: any DLSAU student, faculty, or staff member. Reports items, browses approved items, submits claims, sees own reports.
- `admin`: security office staff. Approves or rejects reports, verifies claims, marks items claimed.

## Status flow

- Found item: `pending` -> `approved` -> `claimed`
- Lost item: `pending` -> `approved` -> `resolved`
- Either: `rejected` with a reason

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard with item cards, search, filters |
| `/lost` | Approved lost items |
| `/found` | Approved found items |
| `/report` | Report form: Lost or Found choice, required fields, duplicate warning, confirm summary |
| `/item/[id]` | Item details and claim button |
| `/profile` | The user's reports, claims, statuses, notifications |
| `/admin` | Pending reports and pending claims |
| `/login` | Google sign-in |

Navbar: Dashboard, Lost Items, Found Items, Profile (plus Admin for admins).

## Folder structure

```
AGENTS.md
PROGRESS.md
.env.example
context/                UI screenshots
docs/                   steps.md, rules.md, security.md, polish.md, schema.sql
src/
  actions/              report.ts, claim.ts, admin.ts
  components/ui/        shadcn components
  components/islands/   ReportForm, Filters, NotificationBell, ClaimForm
  components/           ItemCard.astro, StatusBadge.astro, EmptyState.astro
  layouts/              Base.astro
  lib/                  supabase.ts, auth.ts, schemas.ts
  middleware.ts         session check, domain check, admin guard, security headers
  pages/                index, lost, found, report, profile, login, item/[id], admin/
```

## Build order

Details and "done" checks are in [docs/steps.md](docs/steps.md).

1. Setup, layout, navbar
2. Login spike: Google login with the domain check on Astro, Cloudflare, and Supabase
3. Database and RLS
4. Report form
5. Dashboard
6. Item page and claims
7. Admin queue
8. Feedback: toasts, loading states, badges, in-app notifications
9. Stretch features (only if steps 1 to 8 pass)
10. Security and polish pass
11. Deploy and demo run

## Skills to apply

1. Secure web development. Use the OWASP Top 10 as the review list. See [docs/security.md](docs/security.md).
2. Supabase and RLS. Write policies first, test them, then build on top.
3. Frontend design. Match the screenshots. See [docs/polish.md](docs/polish.md).
4. Accessibility. WCAG 2.2 AA.
5. Astro Actions and Zod for all mutations.
6. Testing. Vitest for Zod schemas and helpers. Playwright for login, report, approve, claim, and resolve. One test per RLS rule.
7. Code review. Before marking a step done, review it against these files for scope, security, polish, and accessibility.

## Open items (ask the owner, do not guess)

- The exact DLSAU email domain (`ALLOWED_EMAIL_DOMAIN`)
- The category list and campus location list (take them from the screenshots if shown, otherwise ask)
- Who gets the first admin accounts
- Whether to keep Tailwind and shadcn/ui or switch to scoped Astro styles
