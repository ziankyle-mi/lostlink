# LostLink

**DLSAU Web-based Lost and Found System**

LostLink is a web app where students, faculty, and staff of De La Salle Araneta University (DLSAU) report lost and found items. Admins from the security office approve reports, verify claims, and hand items back to their owners.

This is a school demo built by Group 3 for the Interface Progress Report.

## Team

Group 3, adviser: Engr. Melanie Alviento Asuncion

- Cruz, Andrew Kyle L. (Leader)
- Fonte, Brian Gabriel F.
- Piangco, Ziankyle
- Sison, Ysabelle
- Zapanta, Thirdy
- Robles, Jacob Robert

## The problem

Lost items on campus are hard to return. People post in group chats, ask around, or hand things to random offices. Nothing is tracked, and owners rarely find out where their item went.

## The solution

One place where:
- Someone who lost an item posts a report.
- Someone who found an item posts a report and drops the item at the security office.
- Everyone can search the approved listings.
- Owners claim items with proof, and the security office verifies the claim.

## Who uses it

| Group | What they do |
| --- | --- |
| Students | Report items, track report status, search listings, claim items |
| Faculty and staff | Report items found in classrooms, offices, and grounds. Look for their own lost items |
| Admins (security office) | Review reports, verify claims, hold found items, update statuses |

Only DLSAU email accounts can log in.

## How it works

1. A user logs in with a DLSAU Google account.
2. The user reports a lost or found item with a name, picture, location, date, and description.
3. For a found item, the finder drops it at the security office and writes the reference code (like `LL-4821`) on a tag.
4. An admin reviews the report and approves or rejects it.
5. Approved items appear on the dashboard. Users search and filter to find matches.
6. The owner submits a claim with proof. The admin checks it against the held item and marks it claimed.

## Status flow

- Found item: Pending, then Approved, then Claimed
- Lost item: Pending, then Approved, then Resolved
- Either one can be Rejected, with a reason shown to the user

## Interface

A clean web dashboard with:
- Item cards showing picture, name, category, location, and date
- A navbar with Dashboard, Lost Items, Found Items, and Profile (Admin for admins)
- Search and filter controls
- Consistent fonts, colors, icons, buttons, and spacing

The design screenshots live in the `context/` folder.

## Usability principles

The interface applies two sets of design rules from the Interface Progress Report.

**Prevent Errors (Shneiderman's Eight Golden Rules)**
- Required fields for item name, location, date, and description
- A confirmation summary before submitting
- Clear "Report Lost Item" and "Report Found Item" choices
- Incomplete reports are blocked with a message about what is missing
- A warning when a similar item was already reported

**Visibility of System Status (Nielsen's 10 Heuristics)**
- A success message after submitting a report
- Status badges: Pending, Approved, Claimed, Resolved, Rejected
- "Processing your request..." while the system works
- Search and filter results, or a "No matching items found" message
- Notifications when a status changes

## Extra features beyond the original idea

- Reference code on every found item for fast lookup at the security office
- Photos of IDs and cards are hidden from the public. Only admins see them
- No public contact details. Everything goes through the system
- Lost items end as "Resolved" because you cannot "claim" something you lost
- Admin audit log of every action
- Mobile-first layout

## Tech stack

| Part | Tool |
| --- | --- |
| Framework | Astro 5 (server mode) |
| Interactive parts | React islands |
| Forms and validation | Astro Actions and Zod |
| Styling | Tailwind CSS and shadcn/ui |
| Database, login, photo storage | Supabase (Postgres, Google sign-in, Storage, Row Level Security) |
| Hosting and bot protection | Cloudflare and Cloudflare Turnstile |

## Security

- Login limited to DLSAU emails, checked on the server
- Row Level Security so users only see what they are allowed to see
- Admin pages and actions are guarded on the server
- Every form is validated on the server
- Uploads are limited by type and size, and ID photos are private
- Security headers and bot protection on forms
- Secrets stay on the server and never go into git
- The full list is in `docs/security.md`

## Folder structure

```
README.md         this file
AGENTS.md         main instructions for the AI coding agent
PROGRESS.md       what is done, what is next
.env.example      names of the environment variables (no real values)
context/          UI screenshots
docs/
  steps.md        the 11 build steps and their "done" checks
  rules.md        use cases, status flow, claim rules, notifications
  security.md     security checklist and how to test it
  polish.md       UI and polish checklist
  schema.sql      database tables
src/              the app code (created by the agent)
```

## How this project is built

The code is written by an AI coding agent, one step at a time. You steer and check the results.

1. Put the UI screenshots in `context/`.
2. Open this folder as the project in your AI IDE.
3. Tell the agent: `Read PROGRESS.md and AGENTS.md, then do step 1 only.`
4. When the step passes its checks, tell it to continue with the next step.

`AGENTS.md` tells the agent which doc to read for each step. If your IDE loads a different file name for project instructions, rename `AGENTS.md` to match.

### Build steps

1. Setup, layout, navbar
2. Login spike (Google login with the domain check on Astro, Cloudflare, and Supabase)
3. Database and RLS
4. Report form
5. Dashboard
6. Item page and claims
7. Admin queue
8. Feedback and in-app notifications
9. Stretch features (optional)
10. Security and polish pass
11. Deploy and demo run

### Things to check yourself

AI agents get a few things wrong often. After the relevant steps, test these by hand:
- Log in as a normal user and try to open a pending report you do not own. It must fail.
- As a normal user, open `/admin`. It must fail.
- Try to log in with a non-DLSAU email. It must be refused.
- Search the built code for the Supabase service role key. It must not appear.
- Check that `.env` is not committed to git.

## Setup

You need:
- Node.js (current LTS)
- A Supabase project
- A Google OAuth client (for login)
- A Cloudflare account and a Turnstile site
- The DLSAU email domain

Steps:
1. Copy `.env.example` to `.env` and fill in the values.
2. Run `npm install`.
3. Run `npm run dev`.
4. Create the tables in Supabase with `docs/schema.sql`.

The agent sets up and wires these during steps 1 to 3. Check `PROGRESS.md` for the current state.

## Environment variables

| Name | What it is |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key. Never expose it |
| `ALLOWED_EMAIL_DOMAIN` | The DLSAU email domain |
| `DEMO_ALLOWED_EMAILS` | Extra test emails for the demo, comma separated |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | Cloudflare bot protection |
| `RESEND_API_KEY` | Email alerts (stretch only) |

## Demo data

The seed script creates 1 admin, 2 normal users, about 12 sample items in different statuses, one found ID card with a hidden photo, and two competing claims on one item.

## Scope

**In scope:** DLSAU-only login, lost and found reports, admin approval, dashboard with search and filters, item page, claims with proof, admin verification, status tracking, in-app notifications, user profile.

**Stretch:** match suggestions, live notifications, email alerts, admin stats card, stale items view.

**Out of scope:** chat, payments, native mobile app, AI image recognition, multi-campus support, public accounts.

## Still to decide

- The exact DLSAU email domain
- The category list and campus location list (from the screenshots)
- Who gets the first admin accounts
- Whether to keep Tailwind and shadcn/ui

## Status

Planning is done. Build has not started. See `PROGRESS.md`.
