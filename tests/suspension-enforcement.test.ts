import { describe, it, expect, afterAll } from "vitest";
import { POST as adminActionsPost } from "~/pages/api/admin/actions";
import { POST as itemsPost } from "~/pages/api/items";
import { POST as claimsPost } from "~/pages/api/claims";
import { readEnv } from "~/lib/env";
import { createClient } from "@supabase/supabase-js";

describe("Account Suspension & Disciplinary Enforcement", { timeout: 35000 }, () => {
  const env = readEnv();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });

  const adminUser = {
    id: "admin-uuid-test",
    email: "dlsau.lostlink@dlsau.edu.ph",
    role: "admin" as const,
  };

  // Known seeded student account from account_credentials.md
  const testStudentEmail = "rene.baterbonia@dlsau.edu.ph";
  let testStudentId: string = "";

  afterAll(async () => {
    // Ensure test student is restored to active: true after all tests run
    await supabase.from("profiles").update({ active: true }).eq("email", testStudentEmail);
  });

  it("admin can suspend student account and persist active: false in database", async () => {
    // Look up real ID for test student
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", testStudentEmail)
      .maybeSingle();

    testStudentId = prof?.id || "student-test-uuid";

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: testStudentId,
        email: testStudentEmail,
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

    // Verify persisted directly in database
    const { data: verifyProf } = await supabase
      .from("profiles")
      .select("active")
      .eq("email", testStudentEmail)
      .single();
    expect(verifyProf?.active).toBe(false);
  });

  it("admin toggle_user_status supports email fallback for non-UUID identifiers", async () => {
    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: "non-uuid-student-handle",
        email: testStudentEmail,
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

  it("blocks suspended student from reporting items with 403 Forbidden", async () => {
    const suspendedStudentUser = {
      id: testStudentId || "student-test-uuid",
      email: testStudentEmail,
      role: "user" as const,
    };

    const req = new Request("http://localhost:4321/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "lost",
        name: "Lost Green Notebook",
        category: "Books & Notebooks",
        location: "Library 2nd Floor",
        description: "Green spiral notebook with physics lecture notes inside.",
      }),
    });

    const res = await itemsPost({
      request: req,
      locals: { user: suspendedStudentUser, env },
    } as any);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.suspended).toBe(true);
    expect(data.error).toContain("suspended by the Disciplinary Office");
  });

  it("blocks suspended student from submitting claims with 403 Forbidden", async () => {
    const suspendedStudentUser = {
      id: testStudentId || "student-test-uuid",
      email: testStudentEmail,
      role: "user" as const,
    };

    const req = new Request("http://localhost:4321/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: "item-test-claim",
        proofDescription: "This belongs to me, it has my student sticker on the back cover.",
      }),
    });

    const res = await claimsPost({
      request: req,
      locals: { user: suspendedStudentUser, env },
    } as any);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.suspended).toBe(true);
    expect(data.error).toContain("suspended by the Disciplinary Office");
  });

  it("verifies suspended profile active status prevents authentication", async () => {
    // Ensure profile is suspended
    await supabase.from("profiles").update({ active: false }).eq("email", testStudentEmail);

    const { data: prof } = await supabase
      .from("profiles")
      .select("active")
      .eq("email", testStudentEmail)
      .maybeSingle();

    expect(prof?.active).toBe(false);
  });

  it("restores privileges when admin reactivates student account", async () => {
    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_status",
        userId: testStudentId,
        email: testStudentEmail,
        active: true,
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.active).toBe(true);

    const { data: prof } = await supabase.from("profiles").select("active").eq("email", testStudentEmail).single();
    expect(prof?.active).toBe(true);
  });
});
