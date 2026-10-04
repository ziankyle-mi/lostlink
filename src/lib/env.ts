export interface Env {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_EMAIL_DOMAIN: string;
  DEMO_ALLOWED_EMAILS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  /** Dev only. "true" enables the mock login screen. Never enable in production. */
  DEV_LOGIN_BYPASS: string;
  /** Dev only. Secret used to sign the mock session cookie. */
  DEV_SESSION_SECRET: string;
}

export function readEnv(runtimeEnv?: Record<string, unknown>): Env {
  const source = (runtimeEnv ?? {}) as Record<string, unknown>;
  const pick = (key: keyof Env): string => {
    const value = source[key];
    return typeof value === "string" ? value : "";
  };
  return {
    PUBLIC_SUPABASE_URL: pick("PUBLIC_SUPABASE_URL"),
    PUBLIC_SUPABASE_ANON_KEY: pick("PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: pick("SUPABASE_SERVICE_ROLE_KEY"),
    ALLOWED_EMAIL_DOMAIN: pick("ALLOWED_EMAIL_DOMAIN"),
    DEMO_ALLOWED_EMAILS: pick("DEMO_ALLOWED_EMAILS"),
    GOOGLE_CLIENT_ID: pick("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: pick("GOOGLE_CLIENT_SECRET"),
    TURNSTILE_SITE_KEY: pick("TURNSTILE_SITE_KEY"),
    TURNSTILE_SECRET_KEY: pick("TURNSTILE_SECRET_KEY"),
    RESEND_API_KEY: pick("RESEND_API_KEY"),
    DEV_LOGIN_BYPASS: pick("DEV_LOGIN_BYPASS"),
    DEV_SESSION_SECRET: pick("DEV_SESSION_SECRET"),
  };
}

export function hasSupabase(env: Env): boolean {
  return env.PUBLIC_SUPABASE_URL.length > 0 && env.PUBLIC_SUPABASE_ANON_KEY.length > 0;
}

export function supabaseProjectRef(env: Env): string {
  try {
    return new URL(env.PUBLIC_SUPABASE_URL).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}