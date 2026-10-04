import type { AstroCookies } from "astro";
import type { Env } from "./env";
import {
  ACCESS_COOKIE,
  DEV_SESSION_COOKIE,
  REFRESH_COOKIE,
  type DomainPolicy,
  type SessionUser,
  isAllowedEmail,
  verifyDevSession,
} from "./auth";
import { fetchUser, refreshSession } from "./supabase";

export function policyFromEnv(env: Env): DomainPolicy {
  return { allowedDomain: env.ALLOWED_EMAIL_DOMAIN, demoEmails: env.DEMO_ALLOWED_EMAILS };
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

export function setSessionCookies(
  cookies: AstroCookies,
  session: { access_token: string; refresh_token: string },
  remember = false,
): void {
  const accessMaxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60;
  cookies.set(ACCESS_COOKIE, session.access_token, sessionCookieOptions(accessMaxAge));
  cookies.set(REFRESH_COOKIE, session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
}

export function setAccessCookie(cookies: AstroCookies, accessToken: string): void {
  cookies.set(ACCESS_COOKIE, accessToken, sessionCookieOptions());
}

export function clearSessionCookies(cookies: AstroCookies): void {
  const options = sessionCookieOptions();
  cookies.delete(ACCESS_COOKIE, options);
  cookies.delete(REFRESH_COOKIE, options);
  cookies.delete(DEV_SESSION_COOKIE, options);
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
    if (user?.email && isAllowedEmail(user.email, policy)) {
      return { id: user.id, email: user.email, role: "user" };
    }
    return null;
  }

  if (refreshToken) {
    const refreshed = await refreshSession(env, refreshToken);
    if (refreshed) {
      setAccessCookie(cookies, refreshed.access_token);
      const user = await fetchUser(env, refreshed.access_token);
      if (user?.email && isAllowedEmail(user.email, policy)) {
        return { id: user.id, email: user.email, role: "user" };
      }
    }
  }

  return null;
}