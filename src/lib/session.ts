import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import {
  ACCESS_COOKIE,
  DEV_SESSION_COOKIE,
  LAST_ACTIVE_COOKIE,
  REFRESH_COOKIE,
  type DomainPolicy,
  type SessionUser,
  isAllowedEmail,
  verifyDevSession,
} from "./auth";
import { fetchUser, refreshSession } from "./supabase";

export function policyFromEnv(env: Env): DomainPolicy {
  return {
    allowedDomain: env.ALLOWED_EMAIL_DOMAIN,
    // The demo allowlist is a local-development convenience. Never honor it in
    // a production build, even if the variable is copied to the host.
    demoEmails: import.meta.env.DEV ? env.DEMO_ALLOWED_EMAILS : "",
  };
}

/** The mock login screen only exists in local dev, never in a deploy. */
export function devBypassEnabled(env: Env): boolean {
  return import.meta.env.DEV && env.DEV_LOGIN_BYPASS.trim().toLowerCase() === "true";
}

export function sessionCookieOptions(maxAge = 60 * 60) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.env.DEV,
    maxAge,
  } as const;
}

export function touchActivityCookie(cookies: AstroCookies): void {
  cookies.set(LAST_ACTIVE_COOKIE, Date.now().toString(), sessionCookieOptions());
}

export function setSessionCookies(
  cookies: AstroCookies,
  session: { access_token: string; refresh_token: string },
  remember = false,
): void {
  const accessMaxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60;
  cookies.set(ACCESS_COOKIE, session.access_token, sessionCookieOptions(accessMaxAge));
  cookies.set(REFRESH_COOKIE, session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
  touchActivityCookie(cookies);
}

export function setAccessCookie(cookies: AstroCookies, accessToken: string): void {
  cookies.set(ACCESS_COOKIE, accessToken, sessionCookieOptions());
}

export function clearSessionCookies(cookies: AstroCookies): void {
  const options = sessionCookieOptions();
  cookies.delete(ACCESS_COOKIE, options);
  cookies.delete(REFRESH_COOKIE, options);
  cookies.delete(DEV_SESSION_COOKIE, options);
  cookies.delete(LAST_ACTIVE_COOKIE, options);
}

interface ProfileState {
  role: "admin" | "user";
  active: boolean;
}

/**
 * Role and account state come from the database, never from the email string.
 * Returns null when there is no profile row or the account is suspended, which
 * makes the caller unauthenticated (fail closed).
 */
async function resolveProfileState(
  env: Env,
  userId: string,
  email: string,
): Promise<ProfileState | null> {
  if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[session] Supabase service credentials are not configured.");
    return null;
  }

  try {
    const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let { data } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", userId)
      .maybeSingle();

    // Legacy rows may have been created before ids were aligned with auth.users.
    if (!data) {
      const fallback = await supabase
        .from("profiles")
        .select("role, active")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      data = fallback.data;
    }

    if (!data) {
      console.warn("[session] no profile row for authenticated user");
      return null;
    }

    if (data.active === false) return null;

    return {
      role: data.role === "admin" ? "admin" : "user",
      active: true,
    };
  } catch (err) {
    console.warn("[session] profile state resolution failed:", err);
    return null;
  }
}

/**
 * Resolves the caller from request cookies: dev mock cookie first (only when
 * the bypass is on), then the Supabase access token, then a refresh.
 */
export async function resolveUser(
  cookies: AstroCookies,
  env: Env,
): Promise<SessionUser | null> {
  const policy = policyFromEnv(env);

  if (devBypassEnabled(env)) {
    const dev = await verifyDevSession(
      cookies.get(DEV_SESSION_COOKIE)?.value,
      env.DEV_SESSION_SECRET,
    );
    // The action already enforced the domain policy when it signed this token;
    // an unset ALLOWED_EMAIL_DOMAIN only happens in local setup.
    if (dev && (isAllowedEmail(dev.email, policy) || policy.allowedDomain.trim() === "")) {
      return { id: `dev:${dev.email}`, email: dev.email, role: dev.role };
    }
  }

  const accessToken = cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const user = await fetchUser(env, accessToken);
    if (user?.email && isAllowedEmail(user.email, policy) && user.email_confirmed_at) {
      const profile = await resolveProfileState(env, user.id, user.email);
      if (!profile) return null;
      return { id: user.id, email: user.email, role: profile.role };
    }
    return null;
  }

  if (refreshToken) {
    const refreshed = await refreshSession(env, refreshToken);
    if (refreshed) {
      // Supabase rotates refresh tokens; persist the new pair immediately or the
      // next request will present an already-consumed token.
      setSessionCookies(cookies, {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || refreshToken,
      });
      const user = await fetchUser(env, refreshed.access_token);
      if (user?.email && isAllowedEmail(user.email, policy) && user.email_confirmed_at) {
        const profile = await resolveProfileState(env, user.id, user.email);
        if (!profile) return null;
        return { id: user.id, email: user.email, role: profile.role };
      }
    }
  }

  return null;
}