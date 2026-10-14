import { describe, it, expect } from "vitest";
import { POST as adminActionsPost } from "~/pages/api/admin/actions";
import { INITIAL_CAMPUS_USERS } from "~/data/mockUsers";
import { readEnv } from "~/lib/env";

describe("Admin Users Management & Actions API", { timeout: 25000 }, () => {
  const env = readEnv();

  it("verifies mock campus users data structure", () => {
    expect(INITIAL_CAMPUS_USERS.length).toBeGreaterThan(0);
    const first = INITIAL_CAMPUS_USERS[0];
    expect(first.full_name).toBeDefined();
    expect(first.email).toContain("@dlsau.edu.ph");
    expect(["admin", "user"]).toContain(first.role);
    expect(typeof first.active).toBe("boolean");
  });

  it("rejects unauthenticated requests to admin actions", async () => {
    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_user_role", userId: "demo-user-1", newRole: "admin" }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: null, env },
    } as any);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("rejects non-admin users from accessing user moderation actions", async () => {
    const studentUser = {
      id: "student-uuid-1",
      email: "student.random@dlsau.edu.ph",
      role: "user" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_user_role", userId: "demo-user-1", newRole: "admin" }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: studentUser, env },
    } as any);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("Admin access required");
  });

  it("prevents administrators from demoting their own account", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId: "admin-uuid-1",
        email: "dlsau.lostlink@dlsau.edu.ph",
        newRole: "user",
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("cannot demote your own administrator account");
  });

  it("prevents administrators from suspending their own account", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: "admin-uuid-1",
        email: "dlsau.lostlink@dlsau.edu.ph",
        active: false,
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("cannot suspend your own administrator account");
  });

  it("allows admin to promote another user and returns success", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

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

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.newRole).toBe("admin");
  });

  it("allows admin to toggle status for another user", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: "user-student-2",
        email: "maria.santos@dlsau.edu.ph",
        active: false,
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.active).toBe(false);
  });

  it("dispatches password reset link for valid campus email", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset_user_password",
        email: "juan.reyes@dlsau.edu.ph",
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("juan.reyes@dlsau.edu.ph");
  });
});
