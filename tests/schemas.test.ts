import { describe, expect, it } from "vitest";
import {
  devLoginSchema,
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "~/lib/schemas";

describe("emailSchema", () => {
  it("trims and lowercases a valid address", () => {
    const parsed = emailSchema.parse("  Student@DLSAU.edu.PH ");
    expect(parsed).toBe("student@dlsau.edu.ph");
  });

  it("rejects an empty value", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("student").success).toBe(false);
    expect(emailSchema.safeParse("student@dlsau").success).toBe(false);
  });

  it("rejects an oversized address", () => {
    expect(emailSchema.safeParse(`${"a".repeat(250)}@dlsau.edu.ph`).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts credentials and defaults remember to false", () => {
    const parsed = loginSchema.parse({ email: "a.b@dlsau.edu.ph", password: "hunter2pass" });
    expect(parsed.remember).toBe(false);
    expect(parsed.next).toBe("/");
  });

  it("treats a checked remember box as true", () => {
    expect(loginSchema.parse({ email: "a.b@dlsau.edu.ph", password: "hunter2pass", remember: "on" }).remember).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a.b@dlsau.edu.ph", password: "" }).success).toBe(false);
  });

  it("rejects a bad email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "hunter2pass" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a full registration", () => {
    const parsed = registerSchema.parse({
      name: "Ziankyle Piangco",
      email: "ziankyle.piangco@dlsau.edu.ph",
      password: "hunter2pass",
      agree: "on",
    });
    expect(parsed.agree).toBe(true);
  });

  it("requires a name", () => {
    expect(
      registerSchema.safeParse({ name: " ", email: "a.b@dlsau.edu.ph", password: "hunter2pass" })
        .success,
    ).toBe(false);
  });

  it("rejects a short password", () => {
    expect(
      registerSchema.safeParse({ name: "Zian Piangco", email: "a@b.ph", password: "short" })
        .success,
    ).toBe(false);
  });

  it("defaults agree to false when the box is left empty", () => {
    expect(
      registerSchema.parse({ name: "Zian Piangco", email: "a@b.ph", password: "hunter2pass" })
        .agree,
    ).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a.b@dlsau.edu.ph" }).success).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "hunter2pass", confirm: "hunter2pass" }).success,
    ).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "hunter2pass",
      confirm: "different1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    expect(resetPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(
      false,
    );
  });
});

describe("devLoginSchema", () => {
  it("defaults next to the dashboard", () => {
    expect(devLoginSchema.parse({ email: "student@dlsau.edu.ph" }).next).toBe("/");
  });

  it("keeps a provided next path", () => {
    expect(devLoginSchema.parse({ email: "a@b.ph", next: "/report" }).next).toBe("/report");
  });

  it("rejects an oversized next path", () => {
    expect(devLoginSchema.safeParse({ email: "a@b.ph", next: "/" + "a".repeat(300) }).success).toBe(
      false,
    );
  });
});