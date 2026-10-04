export const ACCESS_COOKIE = "ll_access_token";
export const REFRESH_COOKIE = "ll_refresh_token";
export const OAUTH_STATE_COOKIE = "ll_oauth_state";
export const PKCE_VERIFIER_COOKIE = "ll_pkce_verifier";
export const DEV_SESSION_COOKIE = "ll_dev_session";

export type Role = "user" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

export interface DomainPolicy {
  allowedDomain: string;
  demoEmails: string;
}

/** Strips a leading @, spaces, and case so " @DLSAU.Edu.PH " and "dlsau.edu.ph" match. */
export function normalizeDomain(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "");
}

export function parseEmailList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export function emailDomain(email: string | undefined | null): string {
  if (!email) return "";
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return "";
  return parts[1];
}

export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

/**
 * The only login gate. An email passes when its domain matches
 * ALLOWED_EMAIL_DOMAIN or when it is listed in DEMO_ALLOWED_EMAILS.
 */
export function isAllowedEmail(
  email: string | undefined | null,
  policy: DomainPolicy,
): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!isValidEmail(normalized)) return false;
  const domain = emailDomain(normalized);
  if (domain === "") return false;

  const allowed = normalizeDomain(policy.allowedDomain);
  if (allowed !== "" && domain === allowed) return true;

  return parseEmailList(policy.demoEmails).includes(normalized);
}

/** Blocks open redirects. Only same-origin paths starting with a single slash pass. */
export function safeNextPath(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || value.includes(":")) return "/";
  return value;
}

/* -------------------------------------------------------------------------- */
/* Supabase token + PKCE helpers (server side only)                            */
/* -------------------------------------------------------------------------- */

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
}

export interface SupabaseUser {
  id: string;
  email: string | null;
}

export async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64UrlEncode(randomBytes(32));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomToken(length = 24): string {
  return base64UrlEncode(randomBytes(length));
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* -------------------------------------------------------------------------- */
/* Dev mock session cookie                                                     */
/* -------------------------------------------------------------------------- */

export interface DevSessionPayload {
  email: string;
  role: Role;
  exp: number;
}

export async function signDevSession(
  payload: DevSessionPayload,
  secret: string,
): Promise<string> {
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body, secret)}`;
}

export async function verifyDevSession(
  token: string | undefined,
  secret: string,
): Promise<DevSessionPayload | null> {
  if (!token || secret === "") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!timingSafeEqual(signature, await hmac(body, secret))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as DevSessionPayload;
    if (typeof parsed?.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}