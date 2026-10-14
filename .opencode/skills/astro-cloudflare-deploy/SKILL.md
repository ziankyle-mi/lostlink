---
name: Astro Cloudflare Deploy
description: Configure, build, or deploy LostLink to Cloudflare. Use for wrangler config, KV bindings, environment secrets, env vars vs .dev.vars, the build output, preview deployments, and deploy-day checks.
---

# Cloudflare deploy for LostLink

Stack: Astro 5 SSR with `@astrojs/cloudflare`. The app hosts on Cloudflare;
Supabase stays the database, storage, and auth provider. Cloudflare does not
replace it.

Check the current Astro and Cloudflare docs before changing adapter config;
this skill captures the project's decisions, not the full upstream docs.

## Build output

```sh
npm run build     # produces dist/ with the Cloudflare worker
npm run preview   # local preview of the built worker
```

The adapter emits `dist/_worker.js/`. Do not edit `dist/`; it is generated and
in `.gitignore` territory. Commit source only.

## Env vars and secrets

- Local dev reads `.env` plus `.dev.vars` (the dev server logs
  "Using vars defined in .dev.vars"). Keep `.dev.vars` out of git.
- Required names (see `.env.example` for the list, no values):
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ALLOWED_EMAIL_DOMAIN`, `SESSION_SECRET`, `DEV_SESSION_SECRET`,
  `DEV_LOGIN_BYPASS`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
- Set production values in the Cloudflare dashboard (or `wrangler secret put`).
  Never commit values. `.env` stays in `.gitignore`; keep `.env.example` to
  names only.
- Code reads env through `src/lib/env.ts` (`readEnv(context.locals.runtime.env)`).
  `process.env` does not exist on the worker and will throw at runtime.

## KV bindings

The adapter enables sessions with a Cloudflare KV namespace bound as
`SESSION`. On `npm run dev` you see:

```
[@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
If you see the error "Invalid binding `SESSION" in your build output,
you need to add the binding to your wrangler config file.
```

Before the first deploy:

1. `npx wrangler kv namespace create SESSION` (or via the dashboard).
2. Put the returned id into `wrangler.jsonc` under
   `kv_namespaces = [{ binding = "SESSION", id = "..." }]`.
3. Redeploy. A missing binding is a build-time failure, not a runtime one.

## Images

The adapter warns that Cloudflare does not support sharp at runtime. Either
accept it or set `imageService: "compile"` in `astro.config.mjs` to optimize at
build time on prerendered pages. Item photos come from Supabase storage, so
this mostly affects logos and illustrations.

## Deploy checklist (step 11)

1. `npm run check` 0 errors, `npm test` green, `npm run build` success.
2. `npm audit` clean or with a written-off list.
3. Wrangler config committed with the KV binding id (id, not the secret key).
4. Production secrets set in Cloudflare. Confirm the anon key is the only key
   reachable from the browser.
5. `ALLOWED_EMAIL_DOMAIN` set to the real DLSAU domain. `DEV_LOGIN_BYPASS`
   unset or `false` in production. `DEMO_ALLOWED_EMAILS` empty.
6. Deploy a preview first: `npx wrangler versions upload` or the dashboard
   preview. Walk the demo-run smoke checks on the preview URL.
7. Verify on the live URL:
   - Security headers present (`curl -I`): CSP, HSTS, nosniff,
     `frame-ancestors 'none'`.
   - `/` redirects logged-out users to `/login`.
   - A real DLSAU login works end to end.
   - A non-DLSAU login is refused.
   - `devLogin` returns 403.
   - Photo upload works from a phone (5 MB path, compression).
   - No service role key in the client bundle (view source, search the key).
8. Update `PROGRESS.md` step 11 and write the demo report.

## Rollback

Cloudflare keeps versions. Promote the previous version from the dashboard or
`wrangler rollback`. Supabase schema changes are forward-only: write the
inverses by hand before running a destructive migration during a deploy.
