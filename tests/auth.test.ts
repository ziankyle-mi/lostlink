import { describe, expect, it } from "vitest";
import {
  base64UrlDecode,
  base64UrlEncode,
  emailDomain,
  isAllowedEmail,
  isValidEmail,
  normalizeDomain,
  parseEmailList,
  safeNextPath,
  signDevSession,
  timingSafeEqual,
  verifyDevSession,
} from "~/lib/auth";

const policy = {
  allowedDomain: "dlsau.edu.ph",
  demoEmails: "Cruz.Andrew@DLSAU.edu.ph, faculty.test@demo.ph",
};

describe("normalizeDomain", () => {
  it("drops the @, spaces, and case", () => {
    expect(normalizeDomain(" @DLSAU.Edu.PH ")).toBe("dlsau.edu.ph");
    expect(normalizeDomain("dlsau.edu.ph")).toBe("dlsau.edu.ph");
  });

  it("returns an empty string for a missing value", () => {
    expect(normalizeDomain(undefined)).toBe("");
    expect(normalizeDomain("   ")).toBe("");
  });
});

describe("parseEmailList", () => {
  it("trims, lowercases, and drops empty entries", () => {
    expect(parseEmailList(" A@B.PH , ,c@d.ph ")).toEqual(["a@b.ph", "c@d.ph"]);
    expect(parseEmailList(undefined)).toEqual([]);
  });
});

describe("emailDomain", () => {
  it("reads the domain of a valid address", () => {
    expect(emailDomain("Student@DLSAU.edu.ph")).toBe("dlsau.edu.ph");
  });

  it("rejects malformed addresses", () => {
    expect(emailDomain("nope")).toBe("");
    expect(emailDomain("a@b@c.ph")).toBe("");
    expect(emailDomain("")).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail(" student@dlsau.edu.ph ")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isValidEmail("student")).toBe(false);
    expect(isValidEmail("student@dlsau")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("isAllowedEmail", () => {
  it("allows the DLSAU domain", () => {
    expect(isAllowedEmail("student@dlsau.edu.ph", policy)).toBe(true);
    expect(isAllowedEmail("Cruz.Andrew@DLSAU.edu.ph", policy)).toBe(true);
  });

  it("refuses any other domain", () => {
    expect(isAllowedEmail("someone@gmail.com", policy)).toBe(false);
    expect(isAllowedEmail("someone@dlsau.edu.ph.evil.com", policy)).toBe(false);
    expect(isAllowedEmail("someone@notdlsau.edu.ph", policy)).toBe(false);
  });

  it("allows a demo email even on another domain", () => {
    expect(isAllowedEmail("faculty.test@demo.ph", policy)).toBe(true);
  });

  it("refuses junk input", () => {
    expect(isAllowedEmail("", policy)).toBe(false);
    expect(isAllowedEmail(null, policy)).toBe(false);
    expect(isAllowedEmail("student@dlsau.edu.ph", { allowedDomain: "", demoEmails: "" })).toBe(
      false,
    );
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/report")).toBe("/report");
    expect(safeNextPath("/item/12?x=1")).toBe("/item/12?x=1");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("report")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/report", "/admin"])).toBe("/report");
  });
});

describe("base64url", () => {
  it("round trips bytes", () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 65, 66]);
    expect(base64UrlDecode(base64UrlEncode(bytes))).toEqual(bytes);
  });

  it("has no padding or unsafe characters", () => {
    const encoded = base64UrlEncode(new Uint8Array([251, 255, 254]));
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("timingSafeEqual", () => {
  it("compares equal and different strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("dev session token", () => {
  const secret = "test-secret-value";
  const payload = { email: "student@dlsau.edu.ph", role: "user" as const, exp: Date.now() + 60000 };

  it("signs and verifies", async () => {
    const token = await signDevSession(payload, secret);
    await expect(verifyDevSession(token, secret)).resolves.toEqual(payload);
  });

  it("fails on a wrong secret", async () => {
    const token = await signDevSession(payload, secret);
    await expect(verifyDevSession(token, "other-secret")).resolves.toBeNull();
  });

  it("fails on a tampered token", async () => {
    const token = await signDevSession(payload, secret);
    const [body, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...payload, email: "attacker@gmail.com" }),
    ).toString("base64url");
    await expect(verifyDevSession(`${forged}.${signature}`, secret)).resolves.toBeNull();
    await expect(verifyDevSession(`${body}.${signature}x`, secret)).resolves.toBeNull();
  });

  it("fails when expired", async () => {
    const token = await signDevSession({ ...payload, exp: Date.now() - 1 }, secret);
    await expect(verifyDevSession(token, secret)).resolves.toBeNull();
  });

  it("fails on missing input or an empty secret", async () => {
    await expect(verifyDevSession(undefined, secret)).resolves.toBeNull();
    await expect(verifyDevSession("", secret)).resolves.toBeNull();
    const token = await signDevSession(payload, secret);
    await expect(verifyDevSession(token, "")).resolves.toBeNull();
  });

  it("fails on garbage", async () => {
    await expect(verifyDevSession("not-a-token", secret)).resolves.toBeNull();
  });
});