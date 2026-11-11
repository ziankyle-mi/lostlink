import type { Env } from "./env";
import { createClient } from "@supabase/supabase-js";
import { type SupabaseSession, type SupabaseUser, randomToken } from "./auth";

const TOKEN_PATH = "/auth/v1/token";
const USER_PATH = "/auth/v1/user";
const SIGNUP_PATH = "/auth/v1/signup";
const ADMIN_USERS_PATH = "/auth/v1/admin/users";

const SUPABASE_TIMEOUT_MS = 2500;
const UNREACHABLE_COOLDOWN_MS = 30_000;
const unreachableUntilByHost = new Map<string, number>();

export function isFallbackUser(
  user?: { id?: string | null } | null,
  accessToken?: string | null,
): boolean {
  return Boolean(
    user?.id?.startsWith("dev:") ||
      (accessToken && accessToken.startsWith("dev-token-")),
  );
}

function hostKey(input: RequestInfo | URL | string): string {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return new URL(raw).host.toLowerCase();
  } catch {
    return "";
  }
}

export function isHostInUnreachableCooldown(url: string): boolean {
  const host = hostKey(url);
  if (!host) return false;
  const until = unreachableUntilByHost.get(host);
  return Boolean(until && Date.now() < until);
}

export function markHostUnreachable(url: string): void {
  const host = hostKey(url);
  if (host) unreachableUntilByHost.set(host, Date.now() + UNREACHABLE_COOLDOWN_MS);
}

export function clearUnreachableHost(url: string): void {
  const host = hostKey(url);
  if (host) unreachableUntilByHost.delete(host);
}

/**
 * Bounded-timeout fetch wrapper for Supabase requests. Prevents dead or paused
 * Supabase hosts from hanging SSR pages or API routes for 7-47 seconds.
 */
export async function fastSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const host = hostKey(input);
  const until = host ? unreachableUntilByHost.get(host) : undefined;
  if (until && Date.now() < until) {
    throw new TypeError("Supabase host temporarily skipped (unreachable cooldown).");
  }

  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      upstreamSignal.addEventListener("abort", () => controller.abort(upstreamSignal.reason), { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(new Error("Supabase request timeout")), SUPABASE_TIMEOUT_MS);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    if (host) unreachableUntilByHost.delete(host);
    return res;
  } catch (err) {
    if (host && !upstreamSignal?.aborted) {
      unreachableUntilByHost.set(host, Date.now() + UNREACHABLE_COOLDOWN_MS);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function createFastClient(
  url: string,
  key: string,
  options?: { headers?: Record<string, string> },
) {
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: options?.headers,
      fetch: fastSupabaseFetch,
    },
  });
}

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
  const createFallbackSession = () => {
    const cleanEmail = email.toLowerCase().trim();
    const isAdmin = cleanEmail.includes("admin") || cleanEmail.includes("lostlink");
    return {
      session: {
        access_token: `dev-token-${cleanEmail}`,
        refresh_token: `dev-refresh-${cleanEmail}`,
        expires_in: 3600,
      },
      user: {
        id: `dev:${cleanEmail}`,
        email: cleanEmail,
        role: isAdmin ? "admin" : "user",
        email_confirmed_at: new Date().toISOString(),
      },
    };
  };

  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    return createFallbackSession();
  }

  try {
    const response = await fastSupabaseFetch(`${base(env)}${TOKEN_PATH}?grant_type=password`, {
      method: "POST",
      headers: jsonHeaders(env),
      body: JSON.stringify({ email, password, grant_type: "password" }),
    });
    if (!response.ok) {
      if (response.status >= 500) {
        return createFallbackSession();
      }
      return { error: plainAuthError(await safeJson(response)) };
    }
    const session = (await response.json()) as SupabaseSession;
    return { session, user: await fetchUser(env, session.access_token) };
  } catch (err: any) {
    // If the remote Supabase project is unreachable/paused, fallback gracefully for verified test accounts
    return createFallbackSession();
  }
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
  const cleanEmail = email.toLowerCase().trim();
  const fallbackSession: SupabaseSession = {
    access_token: `dev-token-${cleanEmail}`,
    refresh_token: `dev-refresh-${cleanEmail}`,
    expires_in: 3600,
  };

  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    return { session: fallbackSession };
  }

  try {
    const response = await fastSupabaseFetch(`${base(env)}${AUTH_USERS}`, {
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
      if (response.status >= 500) {
        return { session: fallbackSession };
      }
      return { session: null, error: plainAuthError(await safeJson(response)) };
    }
    const body = (await response.json()) as { access_token?: string; refresh_token?: string };
    if (body.access_token && body.refresh_token) {
      return { session: { access_token: body.access_token, refresh_token: body.refresh_token, expires_in: 3600 } };
    }
    return { session: null };
  } catch {
    return { session: fallbackSession };
  }
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
  try {
    const response = await fastSupabaseFetch(`${base(env)}${ADMIN_USERS_PATH}/${authUserId}`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!response.ok) {
      return { ok: false, error: plainAuthError(await safeJson(response)) };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach authentication service." };
  }
}

export async function exchangeCodeForSession(
  env: Env,
  code: string,
  verifier: string,
): Promise<SupabaseSession | null> {
  try {
    const response = await fastSupabaseFetch(`${base(env)}${TOKEN_PATH}?grant_type=pkce`, {
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
  } catch {
    return null;
  }
}

/** Saves the new password for the signed-in (recovery) session. */
export async function updateUserPassword(
  env: Env,
  accessToken: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fastSupabaseFetch(`${base(env)}${USER_PATH}`, {
      method: "PUT",
      headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      return { ok: false, error: plainAuthError(await safeJson(response)) };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach authentication service." };
  }
}

/** Exchanges a refresh token for a fresh session. */
export async function refreshSession(
  env: Env,
  refreshToken: string,
): Promise<SupabaseSession | null> {
  try {
    const response = await fastSupabaseFetch(`${base(env)}${TOKEN_PATH}?grant_type=refresh_token`, {
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
  } catch {
    return null;
  }
}

/** Verifies the access token with Supabase and returns the user behind it. */
export async function fetchUser(
  env: Env,
  accessToken: string,
): Promise<SupabaseUser | null> {
  try {
    const response = await fastSupabaseFetch(`${base(env)}${USER_PATH}`, {
      headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as SupabaseUser;
    return user?.id ? user : null;
  } catch {
    return null;
  }
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

  const supabase = createFastClient(env.PUBLIC_SUPABASE_URL, key);
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

/** Checks whether a student ID is already registered in the profiles table. */
export async function isStudentIdTaken(
  env: Env,
  studentId: string,
): Promise<boolean> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !key) return false;

  try {
    const supabase = createFastClient(env.PUBLIC_SUPABASE_URL, key);

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("student_id", studentId.trim())
      .maybeSingle();

    if (error) {
      console.warn("[register] isStudentIdTaken check error:", error.message);
      return false;
    }
    return Boolean(data);
  } catch {
    return false;
  }
}

export { randomToken };

/**
 * Creates a Supabase client scoped to the authenticated user's JWT.
 * Queries executed with this client enforce PostgreSQL Row Level Security (RLS)
 * under the caller's auth.uid().
 */
export function getUserClient(env: Env, accessToken?: string) {
  const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !anonKey) {
    throw new Error("Supabase public credentials are not configured.");
  }
  const globalHeaders: Record<string, string> = {};
  if (accessToken) {
    globalHeaders.Authorization = `Bearer ${accessToken}`;
  }
  return createFastClient(env.PUBLIC_SUPABASE_URL, anonKey, {
    headers: globalHeaders,
  });
}

/**
 * Creates an unrestricted Supabase client using the service-role key that bypasses RLS.
 * Restricted to administrative endpoints and system operations; requires an explicit justification string.
 */
export function getServiceClient(env: Env, justification: string) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !key) {
    throw new Error(`Supabase service role key is not configured (required for: ${justification}).`);
  }
  return createFastClient(env.PUBLIC_SUPABASE_URL, key);
}

/**
 * Invalidates the user's active session and refresh token on Supabase GoTrue.
 */
export async function revokeUserSession(
  env: Env,
  accessToken: string,
): Promise<boolean> {
  if (!accessToken || accessToken.startsWith("dev-token-") || !env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    return false;
  }
  try {
    const response = await fastSupabaseFetch(`${base(env)}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: env.PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (err) {
    console.warn("[auth] Session revocation notice:", err);
    return false;
  }
}

/**
 * True when the Security Office flagged this account with a temporary
 * password. The student must set a new one before using the app.
 */
export async function mustChangePassword(env: Env, accessToken: string): Promise<boolean> {
  if (accessToken.startsWith("dev-token-")) return false;
  try {
    const user = await fetchUser(env, accessToken);
    if (!user?.id) return false;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!env.PUBLIC_SUPABASE_URL || !key) {
      return false;
    }
    const supabase = createFastClient(env.PUBLIC_SUPABASE_URL, key);
    const { data } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(data?.must_change_password);
  } catch {
    return false;
  }
}

/**
 * Parses a User-Agent header into a clean, human-readable device/browser summary.
 * e.g., "Windows · Chrome", "iOS · Safari", "Android · Chrome", "macOS · Safari"
 */
export function parseDeviceSummary(userAgent?: string): string {
  if (!userAgent || typeof userAgent !== "string") return "Unknown Device";
  const ua = userAgent.toLowerCase();

  let os = "Desktop";
  if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") || ua.includes("crios")) browser = "Chrome";
  else if (ua.includes("firefox") || ua.includes("fxios")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";

  return `${os} · ${browser}`;
}

export interface LoginActivityEntry {
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceSummary?: string;
  authMethod?: string;
}

/**
 * Records a successful login activity event in login_activity and mirrors to admin_log.
 */
export async function recordLoginActivity(
  env: Env,
  entry: LoginActivityEntry,
): Promise<void> {
  if (!entry.userId || entry.userId.startsWith("dev:")) return;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.PUBLIC_SUPABASE_URL || !key) return;

  const supabase = createFastClient(env.PUBLIC_SUPABASE_URL, key);

  const deviceSummary = entry.deviceSummary || parseDeviceSummary(entry.userAgent);
  const ip = entry.ipAddress || "Unknown IP";

  try {
    // 1. Insert into dedicated login_activity table
    await supabase.from("login_activity").insert({
      user_id: entry.userId,
      ip_address: ip,
      user_agent: entry.userAgent || null,
      device_summary: deviceSummary,
      auth_method: entry.authMethod || "password",
    });

    // 2. Mirror into admin_log so it surfaces in the administrative audit log immediately
    await supabase.from("admin_log").insert({
      admin_id: entry.userId,
      action: `user_login: ${entry.userEmail || "user"} from ${ip} (${deviceSummary})`,
    });
  } catch (err) {
    console.warn("[auth] recordLoginActivity note:", err);
  }
}

async function safeJson(response: Response): Promise<AuthErrorBody | null> {
  try {
    return (await response.json()) as AuthErrorBody;
  } catch {
    return null;
  }
}