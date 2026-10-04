import { describe, expect, it } from "vitest";
import { devLoginSchema, emailSchema } from "~/lib/schemas";

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