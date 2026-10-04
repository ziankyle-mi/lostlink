import { ActionError, defineAction } from "astro:actions";
import {
  DEV_SESSION_COOKIE,
  PKCE_VERIFIER_COOKIE,
  isAllowedEmail,
  safeNextPath,
  signDevSession,
} from "~/lib/auth";
import { hasSupabase } from "~/lib/env";
import {
  devLoginSchema,
  emptySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "~/lib/schemas";
import {
  requestPasswordRecovery,
  signInWithPassword,
  signUpWithPassword,
  updateUserPassword,
} from "~/lib/supabase";
import {
  clearSessionCookies,
  devBypassEnabled,
  policyFromEnv,
  sessionCookieOptions,
  setSessionCookies,
} from "~/lib/session";

function requireSupabase(locals: { env: import("~/lib/env").Env }): void {
  if (!hasSupabase(locals.env)) {
    throw new ActionError({
      code: "PRECONDITION_FAILED",
      message: "Sign-in is not set up yet. Add the Supabase keys to .env.",
    });
  }
}

function assertDomain(locals: { env: import("~/lib/env").Env }, email: string): void {
  const policy = policyFromEnv(locals.env);
  if (!isAllowedEmail(email, policy)) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: `Only @${policy.allowedDomain || "dlsau.edu.ph"} accounts can sign in.`,
    });
  }
}

export const server = {
  login: defineAction({
    accept: "form",
    input: loginSchema,
    handler: async ({ email, password, remember, next }, context) => {
      requireSupabase(context.locals);
      assertDomain(context.locals, email);

      const result = await signInWithPassword(context.locals.env, email, password);
      if ("error" in result) {
        throw new ActionError({ code: "UNAUTHORIZED", message: result.error });
      }

      setSessionCookies(context.cookies, result.session, remember);
      return { redirect: safeNextPath(next) };
    },
  }),

  register: defineAction({
    accept: "form",
    input: registerSchema,
    handler: async ({ name, email, password, agree }, context) => {
      requireSupabase(context.locals);
      assertDomain(context.locals, email);

      if (!agree) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Agree to the terms and conditions to register.",
        });
      }

      const result = await signUpWithPassword(context.locals.env, email, password, name);
      if (result.error) {
        throw new ActionError({ code: "BAD_REQUEST", message: result.error });
      }
      if (result.session) {
        setSessionCookies(context.cookies, result.session, false);
        return { redirect: "/" };
      }
      return { redirect: "/login?registered=1" };
    },
  }),

  forgotPassword: defineAction({
    accept: "form",
    input: forgotPasswordSchema,
    handler: async ({ email }, context) => {
      requireSupabase(context.locals);

      const redirectTo = new URL("/auth/recovery", context.url.origin).toString();
      const result = await requestPasswordRecovery(context.locals.env, email, redirectTo);
      if (!result.ok) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: result.error ?? "Could not send the reset email. Try again.",
        });
      }

      context.cookies.set(PKCE_VERIFIER_COOKIE, result.verifier, sessionCookieOptions(900));
      return { redirect: "/forgot-password?sent=1" };
    },
  }),

  resetPassword: defineAction({
    accept: "form",
    input: resetPasswordSchema,
    handler: async ({ password }, context) => {
      requireSupabase(context.locals);

      const accessToken = context.cookies.get("ll_access_token")?.value;
      if (!accessToken) {
        throw new ActionError({
          code: "PRECONDITION_FAILED",
          message: "That reset link expired. Request a new one.",
        });
      }

      const result = await updateUserPassword(context.locals.env, accessToken, password);
      if (!result.ok) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: result.error ?? "Could not save the new password. Try again.",
        });
      }

      clearSessionCookies(context.cookies);
      return { redirect: "/login?updated=1" };
    },
  }),

  /**
   * Local dev only. Small test button that signs a mock session in.
   * Never available in a build or deploy.
   */
  devLogin: defineAction({
    accept: "form",
    input: devLoginSchema,
    handler: async ({ email, next }, context) => {
      const env = context.locals.env;

      if (!devBypassEnabled(env)) {
        throw new ActionError({ code: "FORBIDDEN", message: "The test login is turned off." });
      }
      if (env.DEV_SESSION_SECRET.trim() === "") {
        throw new ActionError({
          code: "PRECONDITION_FAILED",
          message: "Set DEV_SESSION_SECRET in .env to use the test login.",
        });
      }

      const policy = policyFromEnv(env);
      if (policy.allowedDomain.trim() === "") {
        console.warn(
          "[auth] ALLOWED_EMAIL_DOMAIN is not set. Set the DLSAU domain in .env to test the real gate.",
        );
      } else if (!isAllowedEmail(email, policy)) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: `Only @${policy.allowedDomain.trim()} accounts can sign in.`,
        });
      }

      const token = await signDevSession(
        { email, role: "user", exp: Date.now() + 1000 * 60 * 60 * 8 },
        env.DEV_SESSION_SECRET,
      );
      context.cookies.set(DEV_SESSION_COOKIE, token, sessionCookieOptions(8 * 60 * 60));
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