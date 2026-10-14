import type { APIRoute } from "astro";
import { touchActivityCookie } from "~/lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ locals, cookies }) => {
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: "Unauthenticated" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }

  touchActivityCookie(cookies);

  return new Response(
    JSON.stringify({
      ok: true,
      active: true,
      email: user.email,
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};

export const POST: APIRoute = GET;
