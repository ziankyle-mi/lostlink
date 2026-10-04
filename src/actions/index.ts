import { ActionError, defineAction } from "astro:actions";
import {
  DEV_SESSION_COOKIE,
  NEXT_PATH_COOKIE,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  isAllowedEmail,
  safeNextPath,
  signDevSession,
} from "~/lib/auth";
import { hasSupabase } from "~/lib/env";
import { devLoginSchema, emptySchema, googleSignInSchema } from "~/lib/schemas";
import { buildGoogleAuthorizeUrl } from "~/lib/supabase";
import {
  clearSessionCookies,
  devBypassEnabled,
  policyFromEnv,
  sessionCookieOptions,
} from "~/lib/session";

export const server = {
  /** Step 1 of the PKCE flow. Only sends the browser to Google. */
  googleSignIn: defineAction({
    accept: "form",
    input: googleSignInSchema,
    handler: async ({ next }, context) => {
      const env = context.locals.env;
      if (!hasSupabase(env)) {
        throw new ActionError({
          code: "PRECONDITION_FAILED",
          message:
            "Sign-in is not set up yet. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to .env.",
        });
      }

      const redirectTo = new URL("/auth/callback", context.url.origin).toString();
      const { url, state, verifier } = await buildGoogleAuthorizeUrl(env, redirectTo);

      const cookieOptions = sessionCookieOptions(600);
      context.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
      context.cookies.set(PKCE_VERIFIER_COOKIE, verifier, cookieOptions);
      context.cookies.set(NEXT_PATH_COOKIE, safeNextPath(next), cookieOptions);

      return { redirect: url };
    },
  }),

  /**
   * Local dev only. Signs a mock session so the flow can be walked without
   * Supabase or Google credentials. Never available in a build or deploy.
   */
  devLogin: defineAction({
    accept: "form",
    input: devLoginSchema,
    handler: async ({ email, next }, context) => {
      const env = context.locals.env;

      if (!devBypassEnabled(env)) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "The dev login is turned off.",
        });
      }
      if (env.DEV_SESSION_SECRET.trim() === "") {
        throw new ActionError({
          code: "PRECONDITION_FAILED",
          message: "Set DEV_SESSION_SECRET in .env to use the dev login.",
        });
      }

      const policy = policyFromEnv(env);
      if (policy.allowedDomain.trim() === "") {
        console.warn(
          "[auth] ALLOWED_EMAIL_DOMAIN is not set. Every valid email passes the dev login. Set the DLSAU domain in .env to test the real gate.",
        );
      } else if (!isAllowedEmail(email, policy)) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: `Only ${policy.allowedDomain.trim()} accounts can sign in.`,
        });
      }

      const token = await signDevSession(
        { email, role: "user", exp: Date.now() + 1000 * 60 * 60 * 8 },
        env.DEV_SESSION_SECRET,
      );
      context.cookies.set(DEV_SESSION_COOKIE, token, sessionCookieOptions());

      return { redirect: safeNextPath(next) };
    },
  }),

  logout: defineAction({
    accept: "form",
    input: emptySchema,
    handler: async (_input, context) => {
      clearSessionCookies(context.cookies);
      return { redirect: "/login" };
    },
  }),
};