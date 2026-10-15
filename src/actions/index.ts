import { ActionError, defineAction } from "astro:actions";
import { createClient } from "@supabase/supabase-js";
import { CUSTODY_EXTENSION_DAYS, extensionDeadline } from "~/lib/custody";
import {
  DEV_SESSION_COOKIE,
  PKCE_VERIFIER_COOKIE,
  isAllowedEmail,
  safeNextPath,
  signDevSession,
} from "~/lib/auth";
import { hasSupabase } from "~/lib/env";
import {
  custodyDecisionSchema,
  devLoginSchema,
  emptySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "~/lib/schemas";
import {
  ensureProfileRow,
  fetchUser,
  requestPasswordRecovery,
  signInWithPassword,
  signUpWithPassword,
  updateUserPassword,
} from "~/lib/supabase";
import {
  clearSessionCookies,
  devBypassEnabled,
  policyFromEnv,
  roleForEmail,
  sessionCookieOptions,
  setSessionCookies,
  touchActivityCookie,
} from "~/lib/session";
import {
  clearRateLimit,
  isRateLimited,
  recordFailedAttempt,
} from "~/lib/rateLimit";

function requireSupabase(locals: { env: import("~/lib/env").Env }): void {
  if (!hasSupabase(locals.env)) {
    throw new ActionError({
      code: "PRECONDITION_FAILED",
      message: "Sign-in is not set up yet. Add the Supabase keys to .env.",
    });
  }
}

/**
 * Server-side client that bypasses RLS. Only used by admin actions, always
 * after an explicit admin check.
 */
function serviceClient(env: import("~/lib/env").Env) {
  return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
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

      const clientIp =
        context.request.headers.get("cf-connecting-ip") ||
        context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        context.clientAddress ||
        "unknown-ip";

      const ipKey = `login:ip:${clientIp}`;
      const emailKey = `login:email:${email.toLowerCase().trim()}`;

      // Check IP lockout
      const ipLimit = isRateLimited(ipKey);
      if (ipLimit.isBlocked) {
        const mins = Math.max(1, Math.ceil(ipLimit.remainingSeconds / 60));
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many sign-in attempts from this network. Please wait ${mins} minute(s) before trying again.`,
        });
      }

      // Check Email lockout
      const emailLimit = isRateLimited(emailKey);
      if (emailLimit.isBlocked) {
        const mins = Math.max(1, Math.ceil(emailLimit.remainingSeconds / 60));
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many failed sign-in attempts for this account. Please wait ${mins} minute(s) before trying again.`,
        });
      }

      const result = await signInWithPassword(context.locals.env, email, password);
      if ("error" in result) {
        const ipFail = recordFailedAttempt(ipKey);
        const emailFail = recordFailedAttempt(emailKey);

        if (ipFail.isBlocked || emailFail.isBlocked) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many failed sign-in attempts. This account is temporarily locked for 5 minutes.",
          });
        }

        const remaining = Math.min(ipFail.attemptsLeft, emailFail.attemptsLeft);
        const warning =
          remaining <= 2
            ? ` (${remaining} attempt${remaining === 1 ? "" : "s"} left before temporary lockout)`
            : "";
        throw new ActionError({ code: "UNAUTHORIZED", message: `${result.error}${warning}` });
      }

      // Clear failed attempt tracking on successful login
      clearRateLimit(ipKey);
      clearRateLimit(emailKey);

      // Check if user account is suspended before creating session
      const supabase = serviceClient(context.locals.env);
      const { data: profile } = await supabase
        .from("profiles")
        .select("active")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (profile && profile.active === false) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "This account has been suspended by the Disciplinary Office. Access to campus services is restricted. Please contact Student Affairs.",
        });
      }

      setSessionCookies(context.cookies, result.session, remember);
      const defaultPath = roleForEmail(email) === "admin" ? "/admin" : "/";
      const targetPath = next && next !== "/" ? safeNextPath(next) : defaultPath;
      return { redirect: targetPath };
    },
  }),

  register: defineAction({
    accept: "form",
    input: registerSchema,
    // `role` is accepted by the schema for the form only and is never trusted
    // for privilege: the granted role comes from the server-side allowlist.
    handler: async ({ name, email, password, agree }, context) => {
      requireSupabase(context.locals);
      assertDomain(context.locals, email);

      if (!agree) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Agree to the terms and conditions to register.",
        });
      }

      // Block registration if account was suspended by Disciplinary Office
      const supabase = serviceClient(context.locals.env);
      const { data: existingProf } = await supabase
        .from("profiles")
        .select("active")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existingProf && existingProf.active === false) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "This account has been suspended by the Disciplinary Office. Access to campus services is restricted.",
        });
      }

      const result = await signUpWithPassword(context.locals.env, email, password, name);
      if (result.error) {
        throw new ActionError({ code: "BAD_REQUEST", message: result.error });
      }
      if (result.session) {
        // Sign-up only makes the auth user; the profiles row is what the
        // directory, notifications, and RLS policies read.
        const user = await fetchUser(context.locals.env, result.session.access_token);
        if (user?.id) {
          await ensureProfileRow(
            context.locals.env,
            user.id,
            user.email ?? email,
            name,
            roleForEmail(email) === "admin" ? "admin" : "user",
          );
        }
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

      if (hasSupabase(env)) {
        const supabase = serviceClient(env);
        const { data: prof } = await supabase
          .from("profiles")
          .select("active")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();
        if (prof && prof.active === false) {
          throw new ActionError({
            code: "FORBIDDEN",
            message: "This account has been suspended by the Disciplinary Office. Access to campus services is restricted.",
          });
        }
      }

      const token = await signDevSession(
        { email, role: "user", exp: Date.now() + 1000 * 60 * 60 * 8 },
        env.DEV_SESSION_SECRET,
      );
      context.cookies.set(DEV_SESSION_COOKIE, token, sessionCookieOptions(8 * 60 * 60));
      touchActivityCookie(context.cookies);
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

  /**
   * Disciplinary Office decision on an item that has been unclaimed past the
   * 30-day custody window: grant one grace extension, or mark it for donation
   * turnover. Writes the item, an admin_log entry, and a notification to the
   * reporter. Students can never reach this: the admin check is server-side.
   */
  custodyDecision: defineAction({
    accept: "form",
    input: custodyDecisionSchema,
    handler: async ({ itemId, decision }, context) => {
      requireSupabase(context.locals);
      const actor = context.locals.user;
      if (!actor) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "Sign in to continue." });
      }
      const actorEmail = actor.email.toLowerCase().trim();
      const isAdmin = actor.role === "admin" || roleForEmail(actorEmail) === "admin";
      if (!isAdmin) {
        throw new ActionError({ code: "FORBIDDEN", message: "Admin access required." });
      }

      const supabase = serviceClient(context.locals.env);

      const { data: item } = await supabase
        .from("items")
        .select("id, name, type, status, reporter_id, donation_turnover")
        .eq("id", itemId)
        .maybeSingle();

      if (!item || item.type !== "found" || item.status !== "approved") {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "That item is not held in office custody.",
        });
      }
      if (item.donation_turnover) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "That item was already marked for donation turnover.",
        });
      }

      const extending = decision === "extend_custody";
      const patch = extending
        ? { custody_extended_until: extensionDeadline() }
        : { donation_turnover: true };

      const { error: updateError } = await supabase.from("items").update(patch).eq("id", itemId);
      if (updateError) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save that decision. Try again.",
        });
      }

      // Audit trail for the office, best effort: a missing admin profile row
      // must not undo a decision that was already saved on the item.
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", actorEmail)
        .maybeSingle();
      if (adminProfile?.id) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfile.id,
          action: extending ? "custody_extended" : "marked_donation",
          item_id: itemId,
        });
      }

      // The reporter is the one who cares about the outcome.
      await supabase.from("notifications").insert({
        user_id: item.reporter_id,
        message: extending
          ? `Custody for "${item.name}" was extended by ${CUSTODY_EXTENSION_DAYS} days.`
          : `"${item.name}" was marked for donation turnover.`,
        link: `/item/${itemId}`,
      });

      return {
        ok: true,
        itemId,
        decision,
        message: extending
          ? `Custody for "${item.name}" extended by ${CUSTODY_EXTENSION_DAYS} days.`
          : `"${item.name}" marked for donation turnover.`,
      };
    },
  }),
};