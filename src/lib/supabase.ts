import type { Env } from "./env";
import {
  type SupabaseSession,
  type SupabaseUser,
  base64UrlEncode,
  pkcePair,
  randomToken,
} from "./auth";

const AUTHORIZE_PATH = "/auth/v1/authorize";
const TOKEN_PATH = "/auth/v1/token";
const USER_PATH = "/auth/v1/user";

function jsonHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export function authBaseUrl(env: Env): string {
  return `${env.PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
}

/**
 * Builds the Google authorize URL with PKCE. The verifier is stored in an
 * httpOnly cookie by the caller, so nothing sensitive reaches the browser.
 */
export async function buildGoogleAuthorizeUrl(
  env: Env,
  redirectTo: string,
): Promise<{ url: string; state: string; verifier: string }> {
  const { verifier, challenge } = await pkcePair();
  const state = randomToken();
  const url = new URL(`${authBaseUrl(env)}${AUTHORIZE_PATH}`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return { url: url.toString(), state, verifier };
}

export async function exchangeCodeForSession(
  env: Env,
  code: string,
  verifier: string,
): Promise<SupabaseSession | null> {
  const response = await fetch(`${authBaseUrl(env)}${TOKEN_PATH}?grant_type=pkce`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({
      client_id: env.PUBLIC_SUPABASE_ANON_KEY,
      code,
      code_verifier: verifier,
      grant_type: "pkce",
    }),
  });
  if (!response.ok) return null;
  return (await response.json()) as SupabaseSession;
}

export async function refreshSession(
  env: Env,
  refreshToken: string,
): Promise<SupabaseSession | null> {
  const response = await fetch(`${authBaseUrl(env)}${TOKEN_PATH}?grant_type=refresh_token`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({
      client_id: env.PUBLIC_SUPABASE_ANON_KEY,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  return (await response.json()) as SupabaseSession;
}

/** Verifies the access token with Supabase and returns the user behind it. */
export async function fetchUser(
  env: Env,
  accessToken: string,
): Promise<SupabaseUser | null> {
  const response = await fetch(`${authBaseUrl(env)}${USER_PATH}`, {
    headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  return user?.id ? user : null;
}

export function encodeState(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}