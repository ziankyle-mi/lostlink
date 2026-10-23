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

let fileEnvCache: Record<string, string> | null = null;

function getLocalFileEnv(): Record<string, string> {
  if (fileEnvCache) return fileEnvCache;
  fileEnvCache = {};
  try {
    if (typeof process !== "undefined" && typeof (process as unknown as { cwd?: () => string }).cwd === "function") {
      const fs = (globalThis as unknown as { process?: { getBuiltinModule?: (m: string) => { existsSync: (p: string) => boolean; readFileSync: (p: string, e: string) => string } } }).process?.getBuiltinModule?.("fs");
      if (fs && fs.existsSync(".env")) {
        const content = fs.readFileSync(".env", "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const eqIdx = trimmed.indexOf("=");
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).split("#")[0].trim();
            fileEnvCache[key] = val;
          }
        }
      }
    }
  } catch {
    // Non-Node environments or sandboxes
  }
  return fileEnvCache;
}

export function readEnv(runtimeEnv?: Record<string, unknown>): Env {
  const source = (runtimeEnv ?? {}) as Record<string, unknown>;
  const pick = (key: keyof Env): string => {
    const fromRuntime = source[key];
    if (typeof fromRuntime === "string" && fromRuntime.trim() !== "") {
      return fromRuntime.trim();
    }
    const fromImportMeta =
      typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env as unknown as Record<string, unknown>)[key]
        : undefined;
    if (typeof fromImportMeta === "string" && fromImportMeta.trim() !== "") {
      return fromImportMeta.trim();
    }
    const fromProcess =
      typeof process !== "undefined" && process.env ? process.env[key] : undefined;
    if (typeof fromProcess === "string" && fromProcess.trim() !== "") {
      return fromProcess.trim();
    }
    const fromFile = getLocalFileEnv()[key];
    if (typeof fromFile === "string" && fromFile.trim() !== "") {
      return fromFile.trim();
    }
    return "";
  };
  const rawSupabaseUrl = pick("PUBLIC_SUPABASE_URL");
  const isTest =
    (typeof process !== "undefined" &&
      (process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST)));
  const isDev =
    !isTest &&
    ((typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV)) ||
      (typeof process !== "undefined" && process.env?.NODE_ENV === "development"));
  const supabaseUrl =
    isDev && rawSupabaseUrl.includes("supabase.co")
      ? "http://127.0.0.1:54321"
      : rawSupabaseUrl;

  return {
    PUBLIC_SUPABASE_URL: supabaseUrl,
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