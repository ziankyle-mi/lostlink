import type { APIRoute } from "astro";
import { clearSessionCookies } from "~/lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
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
