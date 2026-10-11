import { defineMiddleware } from "astro:middleware";
import { readEnv } from "~/lib/env";
import { clearSessionCookies, resolveUser } from "~/lib/session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
};

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/recovery",
  "/privacy",
  "/terms",
  "/help",
  "/404",
  "/500",
]);
const PUBLIC_PREFIXES = [
  "/_astro",
  "/_image",
  "/favicon",
  "/robots.txt",
  "/dlsau-logo",
  "/lostlink-logo",
  "/lostlink-badge",
];
const ACTION_PREFIX = "/_actions";
// Signing in and registering have to work while logged out. Every other
// action needs a session.
const PUBLIC_ACTIONS = new Set(["login", "register", "forgotPassword", "devLogin"]);

function actionName(pathname: string): string {
  return pathname.slice(ACTION_PREFIX.length + 1);
}

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const env = readEnv(context.locals.runtime?.env as Record<string, unknown> | undefined);
  context.locals.env = env;

  const pathname = context.url.pathname;
  const isAction = pathname.startsWith(ACTION_PREFIX);
  const isPublicAction = isAction && PUBLIC_ACTIONS.has(actionName(pathname));

  if (isPublic(pathname) || isPublicAction) {
    // Logged-in visitors on /login are redirected by the page itself.
    context.locals.user = await resolveUser(context.cookies, env);
    return withSecurityHeaders(await next());
  }

  const user = await resolveUser(context.cookies, env);
  context.locals.user = user;

  if (!user) {
    // Action handlers and API routes do their own role checks or return JSON 401
    if (isAction || pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error: "You need to sign in first." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        "no-store",
      );
    }
    clearSessionCookies(context.cookies);
    const nextPath = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/login?next=${nextPath}`, 302);
  }

  // Signed-in pages must never be replayed from the browser's back/forward
  // cache after sign-out, so keep them out of every cache.
  return withSecurityHeaders(await next(), "no-store");
});

function withSecurityHeaders(response: Response, cacheControl?: string): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  if (cacheControl) headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}