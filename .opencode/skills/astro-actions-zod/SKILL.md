---
name: Astro Actions and Zod
description: Add or change any form submission, mutation, or server mutation in LostLink. Use when creating a new action, a new form, a new API route, or when validation behavior needs to change.
---

# Astro Actions + Zod for LostLink

Every form and every mutation goes through an Astro Action with Zod validation
on the server. No `fetch()` to API routes from client code for mutations, no
client-side-only validation, no exceptions.

## Where things live

| Piece | File |
| --- | --- |
| Actions | `src/actions/index.ts` (single `server` export) |
| Zod schemas | `src/lib/schemas.ts` |
| Supabase calls | `src/lib/supabase.ts` |
| Session helpers | `src/lib/session.ts`, `src/lib/auth.ts` |
| Env access | `src/lib/env.ts` (`readEnv`, `hasSupabase`) |
| Rate limiting | `src/lib/rateLimit.ts` |
| API routes (rare) | `src/pages/api/*.ts` for JSON endpoints the client polls |

## The action pattern (copy it)

```ts
import { ActionError, defineAction } from "astro:actions";
import { mySchema } from "~/lib/schemas";

export const server = {
  myAction: defineAction({
    accept: "form",
    input: mySchema,
    handler: async (input, context) => {
      const env = context.locals.env;          // never process.env directly
      const user = context.locals.user;        // set by middleware
      // 1. auth check      -> throw ActionError UNAUTHORIZED
      // 2. role check      -> throw ActionError FORBIDDEN
      // 3. business rules  -> throw ActionError BAD_REQUEST with a plain message
      // 4. write to Supabase, insert notifications / admin_log
      return { ok: true };
    },
  }),
};
```

Rules:

- `accept: "form"` for every form. Zod `input` is the server-side validation.
- Read env only via `context.locals.env` (typed by `readEnv`). `process.env`
  does not exist on Cloudflare and will break the deploy.
- Auth is middleware's job for pages, but re-check inside every action. An
  action is a public endpoint; middleware only guards `/api/` and pages.
- Admin actions must re-verify the admin role in the handler:
  `user.role === "admin" || roleForEmail(user.email) === "admin"`.
  Hiding the button in the UI is not a check.
- Throw `ActionError` with a code and a short, plain, user-facing message. Log
  detail server-side only. No emojis in the message.
- Return early. One guard per throw, no nested pyramids.

## Zod schema rules

- Define every schema in `src/lib/schemas.ts` and export it.
- Reject unknown fields: `.strict()` on objects.
- Text: `.trim()` first, then `.min()`. Never trust the browser's `required`.
- Dates: no future dates. Parse and compare against `today`.
- Enums for closed lists (category, location, type). The list comes from the
  screenshots in `context/`; do not invent values.
- File upload: JPG/PNG/WebP only, max 5 MB, 1–3 files. Found reports require at
  least one photo; lost reports allow zero.
- Keep the client form and the schema in sync, but treat the schema as the
  source of truth. The form's job is to show the same messages inline.

## Client side of a form

- Use `actions.<name>(formData)` from `astro:actions`, or the form's
  `action={actions.myAction}`.
- Every submit button gets a loading state: disable it, swap the label
  (see `SubmitButton.astro`), set `aria-busy="true"`.
- Show inline errors next to the field (`.field-error`) and keep typed values.
- Success: toast via the `.ll-toast` system plus a redirect or inline state.
- Empty state and error state on every list and every async surface.

## When you need JSON instead of an action

API routes exist for things actions do not fit: file upload
(`/api/upload`), the notifications poll (`/api/notifications`), and admin
JSON endpoints (`/api/admin/actions`, `DELETE /api/items`). For those:

- Re-check the session and role at the top of the handler.
- Return `{ ok: false, error }` with a 4xx status, never a stack trace.
- Validate the body with the same Zod schemas.
- Write `admin_log` for every admin mutation.

## Checklist before you call it done

1. Schema in `src/lib/schemas.ts`, `.strict()`, server-side.
2. Action reads env from `context.locals.env`.
3. Admin/owner re-checked inside the handler.
4. Loading, success, and error states on the form.
5. `astro check` clean, `npm test` green.
6. A notification row for the user-facing events in `docs/rules.md`.
