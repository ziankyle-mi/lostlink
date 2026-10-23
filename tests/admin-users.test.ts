import { describe, it, expect } from "vitest";
import { POST as adminActionsPost } from "~/pages/api/admin/actions";
import { INITIAL_CAMPUS_USERS } from "~/data/mockUsers";
import { readEnv } from "~/lib/env";
import { enrichCampusUser, COLLEGES, DEGREE_PROGRAMS } from "~/data/campusPrograms";

describe("Admin Users Management & Actions API", () => {
  const rawEnv = readEnv();
  const env = {
    ...rawEnv,
    PUBLIC_SUPABASE_URL: rawEnv.PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: rawEnv.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key",
  };

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

  it("rejects reset_user_password with a missing or invalid email", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_user_password", email: "" }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("issues a temporary password (or reports no account) for a campus email", async () => {
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

    const data = await res.json();
    if (res.status === 200) {
      // Account exists in this environment: a temp password must be returned.
      expect(data.ok).toBe(true);
      expect(data.tempPassword).toMatch(/^Reset-/);
      expect(data.message).toContain("juan.reyes@dlsau.edu.ph");
    } else {
      // Account not provisioned here: the action must say so, never fake success.
      expect(res.status).toBe(404);
      expect(data.ok).toBe(false);
    }
  });

  it("prevents administrators from deactivating their own active account", async () => {
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_user",
        userId: "admin-uuid-1",
        email: "dlsau.lostlink@dlsau.edu.ph",
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("Administrators cannot deactivate their own active account");
  });

  it.skip("deactivates a student account without deleting claims or audit history (live)", async () => {
    // Destructive live test: it must run against an isolated staging project,
    // never production. The route now deactivates (`active=false` + auth ban)
    // instead of hard-deleting the profile and cascading claims away.
    const adminUser = {
      id: "admin-uuid-1",
      email: "dlsau.lostlink@dlsau.edu.ph",
      role: "admin" as const,
    };

    const req = new Request("http://localhost:4321/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_user",
        userId: "demo-student-id-99",
        email: "student.testdelete@dlsau.edu.ph",
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("deactivated");
  });

  it("validates 4 official DLSAU colleges and degree programs mapping", () => {
    // 1. CAST
    expect(COLLEGES.CAST.name).toContain("Arts, Sciences");
    expect(DEGREE_PROGRAMS["BSCS"].collegeCode).toBe("CAST");
    expect(DEGREE_PROGRAMS["BSCpE"].collegeCode).toBe("CAST");
    expect(DEGREE_PROGRAMS["AB Psych"].collegeCode).toBe("CAST");

    // 2. CVMAS
    expect(COLLEGES.CVMAS.name).toContain("Veterinary Medicine");
    expect(DEGREE_PROGRAMS["DVM"].collegeCode).toBe("CVMAS");
    expect(DEGREE_PROGRAMS["BSA"].collegeCode).toBe("CVMAS");
    expect(DEGREE_PROGRAMS["BSA"].campus).toContain("Salikneta Farm");
    expect(DEGREE_PROGRAMS["BSFT"].collegeCode).toBe("CVMAS");

    // 3. CBMA
    expect(COLLEGES.CBMA.name).toContain("Business");
    expect(DEGREE_PROGRAMS["BSA-Act"].collegeCode).toBe("CBMA");
    expect(DEGREE_PROGRAMS["BSBA-FM"].collegeCode).toBe("CBMA");
    expect(DEGREE_PROGRAMS["BSBA-MM"].collegeCode).toBe("CBMA");
    expect(DEGREE_PROGRAMS["BSHM"].collegeCode).toBe("CBMA");
    expect(DEGREE_PROGRAMS["BSTM"].collegeCode).toBe("CBMA");

    // 4. COED
    expect(COLLEGES.COED.name).toContain("Education");
    expect(DEGREE_PROGRAMS["BEEd"].collegeCode).toBe("COED");
    expect(DEGREE_PROGRAMS["BSEd"].collegeCode).toBe("COED");
  });

  it("enriches campus users and designates faculty with standard student privileges", () => {
    const facultyUser = enrichCampusUser({
      id: "fac-1",
      email: "engr.corpuz@dlsau.edu.ph",
      full_name: "Engr. Danilo Corpuz",
      user_metadata: {
        college: "CAST",
        program: "BSCS",
        is_faculty: true,
        student_id: "2018-F102",
      },
    });

    expect(facultyUser.isFaculty).toBe(true);
    expect(facultyUser.collegeCode).toBe("CAST");
    expect(facultyUser.programCode).toBe("BSCS");
    expect(facultyUser.studentId).toBe("2018-F102");
    // Standard privileges - no special elevated admin rights
    expect(facultyUser.role).toBe("user");
    expect(facultyUser.portalLevel).toContain("Faculty Member (Standard Privileges)");

    const studentUser = enrichCampusUser({
      id: "std-1",
      email: "rene.baterbonia@dlsau.edu.ph",
      full_name: "Rene Baterbonia",
      user_metadata: {
        college: "CAST",
        program: "BSCS",
        is_faculty: false,
        student_id: "2024-10144",
      },
    });

    expect(studentUser.isFaculty).toBe(false);
    expect(studentUser.studentId).toBe("2024-10144");
    expect(studentUser.role).toBe("user");
    expect(studentUser.portalLevel).toBe("Student");
  });

  // Live mutation: skipped unless explicitly enabled. Running this against the
  // production project resets a real account's password.
  const runLive = process.env.RUN_LIVE_TESTS === "true";

  it.skipIf(!runLive)("issues temporary password for campus user (arona.levela@dlsau.edu.ph) with proper format", async () => {
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
        email: "arona.levela@dlsau.edu.ph",
      }),
    });

    const res = await adminActionsPost({
      request: req,
      locals: { user: adminUser, env },
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.email).toBe("arona.levela@dlsau.edu.ph");
    expect(data.tempPassword).toBeDefined();
    expect(data.tempPassword).toMatch(/^Lk-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    expect(data.message).toContain("arona.levela@dlsau.edu.ph");
  });
});


