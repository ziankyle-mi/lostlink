import { defineMiddleware } from "astro:middleware";
import { readEnv } from "~/lib/env";
import { clearSessionCookies, resolveUser } from "~/lib/session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const PUBLIC_PATHS = new Set(["/login", "/auth/callback", "/404", "/500"]);
const PUBLIC_PREFIXES = ["/_astro", "/_image", "/favicon", "/robots.txt"];
const ACTION_PREFIX = "/_actions";
// Signing in has to work while logged out. Every other action needs a session.
const PUBLIC_ACTIONS = new Set(["devLogin", "googleSignIn"]);

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
    // Action handlers do their own role checks, so only the login gate lives here.
    if (isAction) {
      return withSecurityHeaders(
        new Response(JSON.stringify({ error: "You need to sign in first." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    clearSessionCookies(context.cookies);
    const nextPath = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/login?next=${nextPath}`, 302);
  }

  return withSecurityHeaders(await next());
});

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}