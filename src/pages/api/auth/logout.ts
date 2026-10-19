import type { APIRoute } from "astro";
import { clearSessionCookies } from "~/lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  clearSessionCookies(cookies);

  const accept = request.headers.get("accept") || "";
  const isJsonRequest =
    accept.includes("application/json") ||
    request.headers.get("content-type")?.includes("application/json");

  if (isJsonRequest) {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Session logged out successfully.",
        redirect: "/login",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  return redirect("/login", 303);
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  clearSessionCookies(cookies);
  return redirect("/login", 303);
};

