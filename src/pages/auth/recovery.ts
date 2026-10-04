import type { APIRoute } from "astro";
import { PKCE_VERIFIER_COOKIE } from "~/lib/auth";
import { hasSupabase } from "~/lib/env";
import { exchangeCodeForSession } from "~/lib/supabase";
import { sessionCookieOptions, setSessionCookies } from "~/lib/session";

/** Landing point of the reset email. Exchanges the code, then shows the form. */
export const GET: APIRoute = async ({ cookies, redirect, url, locals }) => {
  const env = locals.env;
  const verifier = cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");

  const failed = async () => {
    cookies.delete(PKCE_VERIFIER_COOKIE, sessionCookieOptions());
    return redirect("/forgot-password?expired=1", 302);
  };

  if (providerError || !code || !verifier || !hasSupabase(env)) return failed();

  const session = await exchangeCodeForSession(env, code, verifier);
  if (!session) return failed();

  setSessionCookies(cookies, session, true);
  cookies.delete(PKCE_VERIFIER_COOKIE, sessionCookieOptions());
  return redirect("/reset-password", 302);
};