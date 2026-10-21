import type { APIRoute } from "astro";
import { ACCESS_COOKIE } from "~/lib/auth";
import { clearSessionCookies } from "~/lib/session";
import { revokeUserSession } from "~/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals }) => {
  const accessToken = typeof cookies?.get === "function" ? cookies.get(ACCESS_COOKIE)?.value : undefined;
  if (accessToken && locals?.env) {
    await revokeUserSession(locals.env, accessToken);
  }

  clearSessionCookies(cookies);

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

