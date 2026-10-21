import type { Env } from "./env";
import { createClient } from "@supabase/supabase-js";
import { type SupabaseSession, type SupabaseUser, randomToken } from "./auth";

const TOKEN_PATH = "/auth/v1/token";
const USER_PATH = "/auth/v1/user";
const SIGNUP_PATH = "/auth/v1/signup";
const ADMIN_USERS_PATH = "/auth/v1/admin/users";

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
  program?: string,
  studentId?: string,
  yearLevel?: string,
): Promise<{ session: SupabaseSession | null; error?: string }> {
  const response = await fetch(`${base(env)}${AUTH_USERS}`, {
    method: "POST",
    headers: jsonHeaders(env),
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName,
        program,
        student_id: studentId,
        year_level: yearLevel,
      },
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

/**
 * Sets a user's password directly (admin recovery). Requires the service-role
 * key and the Supabase auth user id. Used by the Security Office temp-password
 * flow because students cannot open their @dlsau.edu.ph inboxes.
 */
export async function adminSetUserPassword(
  env: Env,
  authUserId: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { ok: false, error: "Service role key is not configured." };
  const response = await fetch(`${base(env)}${ADMIN_USERS_PATH}/${authUserId}`, {
    method: "PUT",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!response.ok) {
    return { ok: false, error: plainAuthError(await safeJson(response)) };
  }
  return { ok: true };
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

/**
 * Creates the `profiles` row for a brand-new account.
 *
 * Sign-up only creates the Supabase auth user, and RLS blocks client-side
 * inserts into `profiles`, so this runs on the server with the service role
 * key. Without this row the account is invisible to the admin directory, has
 * no notifications, and shows a blank name on /profile.
 *
 * Failures are swallowed on purpose: a missing profile row must never block a
 * student from registering.
 */
export async function ensureProfileRow(
  env: Env,
  userId: string,
  email: string,
  fullName: string,
  role: "user" | "admin" = "user",
  program?: string,
  studentId?: string,
  yearLevel?: string,
): Promise<boolean> {
  // Profiles are written with the service role only. Falling back to the anon
  // key would silently fail under RLS or, worse, write a partial row.
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !key) return false;

  const supabase = createClient(env.PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
  const row: Record<string, unknown> = {
    id: userId,
    email: email.toLowerCase().trim(),
    full_name: fullName,
    role,
    active: true,
  };
  if (program) row.program = program;
  if (studentId) row.student_id = studentId;
  if (yearLevel) row.year_level = yearLevel;

  // Insert-only. A returning user must never be able to reset their own
  // role/active flags by registering again.
  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    // If the database does not have newly added columns yet, retry without them
    if (
      (program || studentId || yearLevel) &&
      (error.message?.includes("column") || error.code === "PGRST204" || error.code === "42703")
    ) {
      delete row.program;
      delete row.student_id;
      delete row.year_level;
      const { error: retryError } = await supabase
        .from("profiles")
        .upsert(row, { onConflict: "id", ignoreDuplicates: true });
      if (retryError) {
        console.warn("[register] profiles fallback upsert failed:", retryError.message);
        return false;
      }
      return true;
    }
    console.warn("[register] profiles row not created:", error.message);
    return false;
  }
  return true;
}

export { randomToken };

/**
 * True when the Security Office flagged this account with a temporary
 * password. The student must set a new one before using the app.
 */
export async function mustChangePassword(env: Env, accessToken: string): Promise<boolean> {
  const user = await fetchUser(env, accessToken);
  if (!user?.id) return false;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !key) {
    // Fail closed: without the service key we cannot prove the account is
    // clear, so treat it as needing a reset rather than letting it through.
    return true;
  }
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
  const { data } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(data?.must_change_password);
}

async function safeJson(response: Response): Promise<AuthErrorBody | null> {
  try {
    return (await response.json()) as AuthErrorBody;
  } catch {
    return null;
  }
}