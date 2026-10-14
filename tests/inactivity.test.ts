import { describe, expect, it } from "vitest";
import {
  INACTIVITY_TIMEOUT_SECONDS,
  INACTIVITY_WARNING_SECONDS,
  LAST_ACTIVE_COOKIE,
  isSessionExpired,
  remainingSessionSeconds,
} from "~/lib/auth";
import { POST as logoutPost } from "~/pages/api/auth/logout";
import { GET as pingGet } from "~/pages/api/auth/ping";

describe("Session Inactivity Auto-Logout Feature", () => {
  it("defines standard campus idle timeout parameters", () => {
    expect(INACTIVITY_TIMEOUT_SECONDS).toBe(900); // 15 minutes
    expect(INACTIVITY_WARNING_SECONDS).toBe(60); // 60 seconds warning
    expect(LAST_ACTIVE_COOKIE).toBe("ll_last_active");
  });

  describe("isSessionExpired", () => {
    it("returns false when user activity is recent", () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      expect(isSessionExpired(fiveMinutesAgo, 900, now)).toBe(false);
    });

    it("returns false at the exact threshold boundary", () => {
      const now = Date.now();
      const exactlyFifteenMinutesAgo = now - 900 * 1000;
      expect(isSessionExpired(exactlyFifteenMinutesAgo, 900, now)).toBe(false);
    });

    it("returns true when user activity exceeds the inactivity timeout", () => {
      const now = Date.now();
      const sixteenMinutesAgo = now - 16 * 60 * 1000;
      expect(isSessionExpired(sixteenMinutesAgo, 900, now)).toBe(true);
    });

    it("handles invalid or zero timestamps gracefully without false positives", () => {
      expect(isSessionExpired(0)).toBe(false);
      expect(isSessionExpired(Number.NaN)).toBe(false);
    });
  });

  describe("remainingSessionSeconds", () => {
    it("calculates remaining active session duration accurately", () => {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000; // 600s elapsed
      const remaining = remainingSessionSeconds(tenMinutesAgo, 900, now);
      expect(remaining).toBe(300); // 900 - 600 = 300s left
    });

    it("clamps remaining seconds to 0 when expired", () => {
      const now = Date.now();
      const twentyMinutesAgo = now - 20 * 60 * 1000;
      const remaining = remainingSessionSeconds(twentyMinutesAgo, 900, now);
      expect(remaining).toBe(0);
    });
  });

  describe("API Endpoints", () => {
    it("POST /api/auth/logout clears session cookies and returns redirect url", async () => {
      const deletedCookies: string[] = [];
      const mockCookies = {
        delete: (name: string) => {
          deletedCookies.push(name);
        },
      };

      const res = await logoutPost({ cookies: mockCookies } as any);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.redirect).toBe("/login?timeout=1");
      expect(deletedCookies).toContain(LAST_ACTIVE_COOKIE);
      expect(deletedCookies).toContain("ll_access_token");
      expect(deletedCookies).toContain("ll_refresh_token");
    });

    it("GET /api/auth/ping returns 401 when user is not signed in", async () => {
      const res = await pingGet({
        locals: { user: null },
        cookies: { set: () => {} },
      } as any);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
    });

    it("GET /api/auth/ping updates activity and returns active session info for authenticated users", async () => {
      let touchedCookie = "";
      const mockCookies = {
        set: (name: string) => {
          touchedCookie = name;
        },
      };

      const res = await pingGet({
        locals: { user: { id: "123", email: "student@dlsau.edu.ph", role: "user" } },
        cookies: mockCookies,
      } as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.active).toBe(true);
      expect(body.email).toBe("student@dlsau.edu.ph");
      expect(touchedCookie).toBe(LAST_ACTIVE_COOKIE);
    });
  });
});
