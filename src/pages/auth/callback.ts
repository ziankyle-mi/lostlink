import type { APIRoute } from "astro";
import {
  NEXT_PATH_COOKIE,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  isAllowedEmail,
  safeNextPath,
  timingSafeEqual,
} from "~/lib/auth";
import { hasSupabase } from "~/lib/env";
import { exchangeCodeForSession, fetchUser } from "~/lib/supabase";
import { clearSessionCookies, policyFromEnv, sessionCookieOptions, setSessionCookies } from "~/lib/session";

/** Step 2 of the PKCE flow. Runs on the server, never exposes a token to the page. */
export const GET: APIRoute = async ({ cookies, redirect, url, locals }) => {
  const env = locals.env;

  const fail = (reason: string) => {
    cookies.delete(OAUTH_STATE_COOKIE, sessionCookieOptions());
    cookies.delete(PKCE_VERIFIER_COOKIE, sessionCookieOptions());
    return redirect(`/login?error=${reason}`, 302);
  };

  const providerError = url.searchParams.get("error");
  if (providerError) {
    console.warn(`[auth] provider returned an error: ${providerError}`);
    return fail("oauth");
  }

  if (!hasSupabase(env)) return fail("config");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const nextPath = safeNextPath(cookies.get(NEXT_PATH_COOKIE)?.value);

  if (!code || !state || !expectedState || !verifier) return fail("session");
  if (!timingSafeEqual(state, expectedState)) return fail("state");

  const session = await exchangeCodeForSession(env, code, verifier);
  if (!session) return fail("oauth");

  const user = await fetchUser(env, session.access_token);
  if (!user?.email) return fail("oauth");

  const policy = policyFromEnv(env);
  if (policy.allowedDomain.trim() === "") {
    console.error("[auth] ALLOWED_EMAIL_DOMAIN is not set. Refusing the sign-in.");
    clearSessionCookies(cookies);
    return fail("config");
  }

  if (!isAllowedEmail(user.email, policy)) {
    console.warn(`[auth] refused a sign-in from ${user.email}`);
    clearSessionCookies(cookies);
    return fail("domain");
  }

  setSessionCookies(cookies, session);
  cookies.delete(OAUTH_STATE_COOKIE, sessionCookieOptions());
  cookies.delete(PKCE_VERIFIER_COOKIE, sessionCookieOptions());
  cookies.delete(NEXT_PATH_COOKIE, sessionCookieOptions());

  return redirect(nextPath, 302);
};