import type { APIRoute } from "astro";
import { ACCESS_COOKIE } from "~/lib/auth";
import { clearSessionCookies } from "~/lib/session";
import { revokeUserSession } from "~/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect, request }) => {
  const accessToken = typeof cookies?.get === "function" ? cookies.get(ACCESS_COOKIE)?.value : undefined;
  if (accessToken && locals?.env) {
    await revokeUserSession(locals.env, accessToken);
  }

  clearSessionCookies(cookies);

  const accept = request?.headers?.get("accept") || "";
  const contentType = request?.headers?.get("content-type") || "";
  const isFormOrNav =
    accept.includes("text/html") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  if (isFormOrNav && typeof redirect === "function") {
    return redirect("/login", 302);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: "Session logged out successfully.",
      redirect: "/login?timeout=1",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
};

export const GET: APIRoute = async ({ cookies, locals, redirect }) => {
  const accessToken = typeof cookies?.get === "function" ? cookies.get(ACCESS_COOKIE)?.value : undefined;
  if (accessToken && locals?.env) {
    await revokeUserSession(locals.env, accessToken);
  }

  clearSessionCookies(cookies);
  return redirect("/login", 302);
};

