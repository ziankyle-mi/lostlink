import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureProfileRow } from "~/lib/supabase";
import type { Env } from "~/lib/env";

const env = {
  PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
} as unknown as Env;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ensureProfileRow", () => {
  it("writes the profiles row with the service role key so new accounts are visible", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: "user-1" }], 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureProfileRow(env, "user-1", "Renee@DLSAU.edu.ph", "Renee De La Cruz"),
    ).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("/rest/v1/profiles");
    expect(init.method).toBe("POST");
    // Service role key, not the anon key: RLS blocks anon inserts.
    expect(new Headers(init.headers).get("apikey")).toBe("service-key");

    const sentRow = JSON.parse(String(init.body));
    expect(sentRow).toMatchObject({
      id: "user-1",
      email: "renee@dlsau.edu.ph",
      full_name: "Renee De La Cruz",
      role: "user",
      active: true,
    });
  });

  it("stores the admin role only when the server allowlist grants it", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: "user-2" }], 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureProfileRow(env, "user-2", "security@dlsau.edu.ph", "Security Staff", "admin"),
    ).resolves.toBe(true);

    const sentRow = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(sentRow.role).toBe("admin");
  });

  it("never throws when Supabase rejects the insert", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "row-level security violation" }, 403)),
    );

    await expect(
      ensureProfileRow(env, "user-3", "student@dlsau.edu.ph", "Student"),
    ).resolves.toBe(false);
  });

  it("does nothing when Supabase is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureProfileRow({} as unknown as Env, "user-4", "student@dlsau.edu.ph", "Student"),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});