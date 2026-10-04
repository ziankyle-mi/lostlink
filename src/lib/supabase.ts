import type { Env } from "./env";
import { type SupabaseSession, type SupabaseUser, pkcePair, randomToken } from "./auth";

const TOKEN_PATH = "/auth/v1/token";
const USER_PATH = "/auth/v1/user";
const SIGNUP_PATH = "/auth/v1/signup";
const RECOVER_PATH = "/auth/v1/recover";

function base(env: Env): string {
  return `${env.PUBLIC_SUPABASE_URL.replace(/\/$/, "")}`;
}

function jsonHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

interface AuthErrorBody {
  error_description?: string;
  msg?: string;
  error?: string;
}

/** Turns GoTrue messages into short, plain copy. */
export function plainAuthError(body: AuthErrorBody | null): string {
  const raw = (body?.error_description ?? body?.msg ?? body?.error ?? "").toLowerCase();
  if (raw.includes("invalid login")) return "Email or password is incorrect.";
  if (raw.includes("email not confirmed")) return "Confirm your email first, then sign in.";
  if (raw.includes("already registered")) return "That email already has an account.";
  if (raw.includes("password should be")) return "Password does not meet the requirements.";
  if (raw.includes("rate limit")) return "Too many attempts. Wait a moment and try again.";
  if (raw.includes("not configured") || raw.includes("signups not allowed"))
    return "That account cannot be created yet.";
  return "That did not work. Try again.";
}

export async function signInWithPassword(
  env: Env,
  email: string,
  password: string,
): Promise<{ session: SupabaseSession; user: SupabaseUser | null } | { error: string }> {
  const response = await fetch(`${base(env)}${TOKEN_PATH}?grant_type=password`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({ email, password, grant_type: "password" }),
  });
  if (!response.ok) {
    return { error: plainAuthError(await safeJson(response)) };
  }
  const session = (await response.json()) as SupabaseSession;
  return { session, user: await fetchUser(env, session.access_token) };
}

const AUTH_USERS = SIGNUP_PATH;

export async function signUpWithPassword(
  env: Env,
  email: string,
  password: string,
  fullName: string,
): Promise<{ session: SupabaseSession | null; error?: string }> {
  const response = await fetch(`${base(env)}${AUTH_USERS}`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName },
    }),
  });
  if (!response.ok) {
    return { session: null, error: plainAuthError(await safeJson(response)) };
  }
  const body = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (body.access_token && body.refresh_token) {
    return { session: { access_token: body.access_token, refresh_token: body.refresh_token, expires_in: 3600 } };
  }
  return { session: null };
}

/** Sends the reset link. The link lands on /auth/recovery with a PKCE code. */
export async function requestPasswordRecovery(
  env: Env,
  email: string,
  redirectTo: string,
): Promise<{ ok: boolean; verifier: string; error?: string }> {
  const { verifier, challenge } = await pkcePair();
  const response = await fetch(`${base(env)}${RECOVER_PATH}`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({
      email,
      redirect_to: redirectTo,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }),
  });
  if (!response.ok) {
    return { ok: false, verifier, error: plainAuthError(await safeJson(response)) };
  }
  return { ok: true, verifier };
}

export async function exchangeCodeForSession(
  env: Env,
  code: string,
  verifier: string,
): Promise<SupabaseSession | null> {
  const response = await fetch(`${base(env)}${TOKEN_PATH}?grant_type=pkce`, {
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

/** Saves the new password for the signed-in (recovery) session. */
export async function updateUserPassword(
  env: Env,
  accessToken: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${base(env)}${USER_PATH}`, {
    method: "PUT",
    headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    return { ok: false, error: plainAuthError(await safeJson(response)) };
  }
  return { ok: true };
}

/** Exchanges a refresh token for a fresh session. */
export async function refreshSession(
  env: Env,
  refreshToken: string,
): Promise<SupabaseSession | null> {
  const response = await fetch(`${base(env)}${TOKEN_PATH}?grant_type=refresh_token`, {
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
  const response = await fetch(`${base(env)}${USER_PATH}`, {
    headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  return user?.id ? user : null;
}

export { randomToken };

async function safeJson(response: Response): Promise<AuthErrorBody | null> {
  try {
    return (await response.json()) as AuthErrorBody;
  } catch {
    return null;
  }
}