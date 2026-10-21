# LostLink

A lost and found system for De La Salle Araneta University designed to streamline item reporting, tracking, and claims verification.

## Tech Stack

- **Frontend:** Astro 7 (SSR), React 19, Tailwind CSS v4
- **Backend & Database:** Supabase (Auth, PostgreSQL, Storage)
- **Hosting:** Cloudflare Workers
- **Bot protection:** Cloudflare Turnstile

## Run locally

```bash
npm ci
cp .env.example .env
# fill in the Supabase values, then:
npm run dev
```

`npm run check`, `npm test`, and `npm run build` must pass before a change ships.

## Deploy

Follow [`docs/deployment-checklist.md`](docs/deployment-checklist.md). It covers
database migrations, secret rotation, Turnstile, the smoke test, and owner-only
steps that the code cannot perform. Read it before inviting real users.

## Team (Group 3)

- **Leader:** Cruz, Andrew Kyle L.
- Fonte, Brian Gabriel F.
- Piangco, Ziankyle
- Sison, Ysabelle
- Zapanta, Thirdy
- Robles, Jacob Robert

**Adviser:** Engr. Melanie Alviento Asuncion
