import { describe, it, expect } from "vitest";
import {
  DEMO_REGISTERED_COOKIE,
  DEMO_USER_STATE_COOKIE,
  getCombinedDemoRegisteredUsers,
  isKnownDemoUser,
  parseDemoUserState,
  serializeDemoUserState,
  withDemoUserState,
  type CampusUser,
} from "~/data/mockUsers";
import { DEV_SESSION_COOKIE, signDevSession } from "~/lib/auth";
import { resolveUser } from "~/lib/session";
import { POST as adminActionsPost } from "~/pages/api/admin/actions";
import { readEnv } from "~/lib/env";

function cookieJar() {
  const jar = new Map<string, string>();
  return {
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
    jar,
  };
}

describe("demo user state (fallback accounts)", () => {
  it("parses only well-formed role and status entries", () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        "juan.reyes@dlsau.edu.ph": { role: "admin", active: false },
        "maria.santos@dlsau.edu.ph": { role: "superuser" },
        "bad-entry": "nope",
      }),
    );

    const state = parseDemoUserState(raw);
    expect(state["juan.reyes@dlsau.edu.ph"]).toEqual({ role: "admin", active: false });
    expect(state["maria.santos@dlsau.edu.ph"]).toBeUndefined();
    expect(state["bad-entry"]).toBeUndefined();
  });

  it("returns an empty map for malformed cookies instead of throwing", () => {
    expect(parseDemoUserState(undefined)).toEqual({});
    expect(parseDemoUserState("%%%not-json")).toEqual({});
    expect(parseDemoUserState(encodeURIComponent("[]"))).toEqual({});
  });

  it("round-trips through the cookie serializer", () => {
    const state = { "juan.reyes@dlsau.edu.ph": { role: "admin" as const } };
    expect(parseDemoUserState(serializeDemoUserState(state))).toEqual(state);
  });

  it("overlays role and status without mutating the original users", () => {
    const users: CampusUser[] = [
      {
        id: "user-student-1",
        full_name: "Juan D. Reyes",
        email: "juan.reyes@dlsau.edu.ph",
        role: "user",
        active: true,
        created_at: "2024-01-10T09:30:00Z",
      },
    ];

    const updated = withDemoUserState(users, {
      "juan.reyes@dlsau.edu.ph": { role: "admin", active: false },
    });

    expect(updated[0].role).toBe("admin");
    expect(updated[0].active).toBe(false);
    expect(users[0].role).toBe("user");
    expect(users[0].active).toBe(true);
  });

  it("recognizes seeded and self-registered demo accounts", () => {
    const registered: CampusUser = {
      id: "reg-1",
      full_name: "New Student",
      email: "new.student@dlsau.edu.ph",
      role: "user",
      active: true,
      created_at: "2026-01-01T00:00:00Z",
    };
    const rawCookie = encodeURIComponent(JSON.stringify([registered]));

    expect(isKnownDemoUser("juan.reyes@dlsau.edu.ph")).toBe(true);
    expect(isKnownDemoUser("new.student@dlsau.edu.ph", rawCookie)).toBe(true);
    expect(isKnownDemoUser("unknown@dlsau.edu.ph")).toBe(false);
    expect(getCombinedDemoRegisteredUsers(rawCookie)).toHaveLength(1);
  });
});

describe("toggle_user_role persists demo accounts", { timeout: 25000 }, () => {
  const rawEnv = readEnv();
  const env = {
    ...rawEnv,
    PUBLIC_SUPABASE_URL: rawEnv.PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: rawEnv.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key",
  };
  const adminUser = {
    id: "admin-uuid-1",
    email: "dlsau.lostlink@dlsau.edu.ph",
    role: "admin" as const,
  };

  it("writes a demo role override when no profile row exists", async () => {
    const cookies = cookieJar();
    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId: "user-student-1",
        email: "juan.reyes@dlsau.edu.ph",
        newRole: "admin",
      }),
    });

    const res = await adminActionsPost({ request: req, locals: { user: adminUser, env }, cookies } as any);
    expect(res.status).toBe(200);

    const saved = parseDemoUserState(cookies.jar.get(DEMO_USER_STATE_COOKIE));
    expect(saved["juan.reyes@dlsau.edu.ph"]?.role).toBe("admin");
  });

  it("reports a real failure for an account that is neither in the DB nor the demo set", async () => {
    const cookies = cookieJar();
    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId: "ghost-account-1",
        email: "ghost.account@dlsau.edu.ph",
        newRole: "admin",
      }),
    });

    const res = await adminActionsPost({ request: req, locals: { user: adminUser, env }, cookies } as any);
    expect(res.status).not.toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(cookies.jar.has(DEMO_USER_STATE_COOKIE)).toBe(false);
  });

  it("keeps the demo registered cookie name stable", () => {
    expect(DEMO_REGISTERED_COOKIE).toBe("ll_demo_registered_users");
  });

  it("writes a demo status override on suspend and deactivate", async () => {
    const cookies = cookieJar();
    const suspendReq = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: "user-student-2",
        email: "maria.santos@dlsau.edu.ph",
        active: false,
      }),
    });

    const suspendRes = await adminActionsPost({
      request: suspendReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(suspendRes.status).toBe(200);
    expect(
      parseDemoUserState(cookies.jar.get(DEMO_USER_STATE_COOKIE))["maria.santos@dlsau.edu.ph"]?.active,
    ).toBe(false);

    const deactivateReq = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_user",
        userId: "user-student-1",
        email: "juan.reyes@dlsau.edu.ph",
      }),
    });

    const deactivateRes = await adminActionsPost({
      request: deactivateReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(deactivateRes.status).toBe(200);
    expect(
      parseDemoUserState(cookies.jar.get(DEMO_USER_STATE_COOKIE))["juan.reyes@dlsau.edu.ph"]?.active,
    ).toBe(false);
  });

  it("applies promoted admin role and suspended status to resolved sessions", async () => {
    const cookies = cookieJar();
    const testEnv = {
      ...env,
      DEV_LOGIN_BYPASS: "true",
      DEV_SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      ALLOWED_EMAIL_DOMAIN: "dlsau.edu.ph",
    };

    // 1. Promote juan.reyes@dlsau.edu.ph to admin
    const promoteReq = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId: "user-student-1",
        email: "juan.reyes@dlsau.edu.ph",
        newRole: "admin",
      }),
    });
    const promoteRes = await adminActionsPost({
      request: promoteReq,
      locals: { user: adminUser, env: testEnv },
      cookies,
    } as any);
    expect(promoteRes.status).toBe(200);

    // 2. Sign in as juan.reyes@dlsau.edu.ph via dev session -> resolves as admin
    const devToken = await signDevSession(
      { email: "juan.reyes@dlsau.edu.ph", role: "user", exp: Date.now() + 60_000 },
      testEnv.DEV_SESSION_SECRET,
    );
    cookies.set(DEV_SESSION_COOKIE, devToken);

    const resolvedAdmin = await resolveUser(cookies as any, testEnv);
    expect(resolvedAdmin).toEqual({
      id: "dev:juan.reyes@dlsau.edu.ph",
      email: "juan.reyes@dlsau.edu.ph",
      role: "admin",
    });

    // 3. Suspend juan.reyes@dlsau.edu.ph -> session resolves to null (blocked)
    cookies.delete(DEV_SESSION_COOKIE);
    // Only signed dev sessions are trusted. An unsigned "dev-token-<email>"
    // access token is deliberately rejected now, so use a signed one to prove
    // the suspension overlay still blocks the account.
    const suspendedToken = await signDevSession(
      { email: "juan.reyes@dlsau.edu.ph", role: "admin", exp: Date.now() + 60_000 },
      testEnv.DEV_SESSION_SECRET,
    );
    cookies.set(DEV_SESSION_COOKIE, suspendedToken);
    const suspendReq = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: "user-student-1",
        email: "juan.reyes@dlsau.edu.ph",
        active: false,
      }),
    });
    const suspendRes = await adminActionsPost({
      request: suspendReq,
      locals: { user: adminUser, env: testEnv },
      cookies,
    } as any);
    expect(suspendRes.status).toBe(200);

    const resolvedSuspended = await resolveUser(cookies as any, testEnv);
    expect(resolvedSuspended).toBeNull();
  });
});
