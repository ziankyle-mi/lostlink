import type { Env } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped: boolean }
  | { ok: false; error: string };

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * The check is enforced only when TURNSTILE_SECRET_KEY is configured, so local
 * development and previews without keys still work. Production MUST set both
 * TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY; startup logs a warning otherwise.
 */
export async function verifyTurnstile(
  env: Env,
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  if (!secret) {
    if (!import.meta.env.DEV && siteKey) {
      console.error(
        "[turnstile] CRITICAL: TURNSTILE_SITE_KEY is configured in production but TURNSTILE_SECRET_KEY is missing. Failing closed.",
      );
      return {
        ok: false,
        error: "Bot verification is misconfigured on the server. Please contact the Security Office.",
      };
    }
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY is not set; bot verification is disabled.",
    );
    return { ok: true, skipped: true };
  }


  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, error: "Please complete the bot check and try again." };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; "error-codes"?: string[] }
      | null;

    if (!data?.success) {
      console.warn("[turnstile] verification failed:", data?.["error-codes"]);
      return { ok: false, error: "The bot check failed. Please try again." };
    }

    return { ok: true, skipped: false };
  } catch (err) {
    // Fail closed: a configured bot check must not be bypassed by an outage.
    console.warn("[turnstile] verify request failed:", err);
    return { ok: false, error: "The bot check is unavailable. Please try again." };
  }
}

/** Reads the widget token from a form submission without consuming the action input. */
export async function readFormTurnstileToken(request: Request): Promise<string | null> {
  try {
    const form = await request.clone().formData();
    const token = form.get("cf-turnstile-response");
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}
