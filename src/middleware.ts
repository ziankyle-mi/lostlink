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

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const env = readEnv(context.locals.runtime?.env as Record<string, unknown> | undefined);
  context.locals.env = env;

  if (isPublic(context.url.pathname)) {
    return withSecurityHeaders(await next());
  }

  const user = await resolveUser(context.cookies, env);
  context.locals.user = user;

  if (!user) {
    clearSessionCookies(context.cookies);
    if (context.url.pathname === "/") return context.redirect("/login", 302);
    const next_ = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/login?next=${next_}`, 302);
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