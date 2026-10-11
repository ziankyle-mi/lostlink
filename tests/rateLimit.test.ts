import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimit,
  isRateLimited,
  recordFailedAttempt,
  resetRateLimitStore,
} from "~/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("starts in an unblocked state", () => {
    const status = isRateLimited("127.0.0.1");
    expect(status.isBlocked).toBe(false);
    expect(status.remainingSeconds).toBe(0);
  });

  it("decrements attemptsLeft on consecutive failures", () => {
    const f1 = recordFailedAttempt("test@dlsau.edu.ph", { maxFailures: 5 });
    expect(f1.isBlocked).toBe(false);
    expect(f1.attemptsLeft).toBe(4);

    const f2 = recordFailedAttempt("test@dlsau.edu.ph", { maxFailures: 5 });
    expect(f2.isBlocked).toBe(false);
    expect(f2.attemptsLeft).toBe(3);
  });

  it("locks out the user once maxFailures is reached", () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt("192.168.1.1", { maxFailures: 5, lockoutDurationMs: 60_000 });
    }

    const fifth = recordFailedAttempt("192.168.1.1", { maxFailures: 5, lockoutDurationMs: 60_000 });
    expect(fifth.isBlocked).toBe(true);
    expect(fifth.attemptsLeft).toBe(0);
    expect(fifth.remainingSeconds).toBeGreaterThan(0);

    const check = isRateLimited("192.168.1.1");
    expect(check.isBlocked).toBe(true);
    expect(check.remainingSeconds).toBeGreaterThan(0);
  });

  it("resets counters when clearRateLimit is called", () => {
    recordFailedAttempt("user@dlsau.edu.ph");
    recordFailedAttempt("user@dlsau.edu.ph");

    clearRateLimit("user@dlsau.edu.ph");

    const status = isRateLimited("user@dlsau.edu.ph");
    expect(status.isBlocked).toBe(false);

    const fresh = recordFailedAttempt("user@dlsau.edu.ph", { maxFailures: 5 });
    expect(fresh.attemptsLeft).toBe(4);
  });

  it("handles case-insensitivity and leading/trailing whitespace", () => {
    recordFailedAttempt("  Admin@DLSAU.edu.ph  ");
    const check = isRateLimited("admin@dlsau.edu.ph");
    expect(check.isBlocked).toBe(false);

    for (let i = 0; i < 4; i++) {
      recordFailedAttempt("ADMIN@dlsau.edu.ph");
    }

    expect(isRateLimited("admin@dlsau.edu.ph").isBlocked).toBe(true);
  });
});
