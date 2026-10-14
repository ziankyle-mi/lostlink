import { describe, expect, it } from "vitest";
import {
  CUSTODY_EXTENSION_DAYS,
  CUSTODY_OVERDUE_DAYS,
  custodyAgeLabel,
  daysInCustody,
  daysUntilOverdue,
  extensionDeadline,
  isCustodyOverdue,
} from "~/lib/custody";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-15T08:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

describe("custody rules", () => {
  it("uses the policy window of 30 days and a 15 day extension", () => {
    expect(CUSTODY_OVERDUE_DAYS).toBe(30);
    expect(CUSTODY_EXTENSION_DAYS).toBe(15);
  });

  it("counts whole days in custody", () => {
    expect(daysInCustody(daysAgo(48), NOW)).toBe(48);
    expect(daysInCustody(daysAgo(1), NOW)).toBe(1);
    expect(daysInCustody(daysAgo(0.5), NOW)).toBe(0);
    expect(daysInCustody("not-a-date", NOW)).toBe(0);
  });

  it("treats an item as not overdue before the window closes", () => {
    expect(isCustodyOverdue({ created_at: daysAgo(29) }, NOW)).toBe(false);
    expect(isCustodyOverdue({ created_at: daysAgo(30) }, NOW)).toBe(true);
    expect(isCustodyOverdue({ created_at: daysAgo(48) }, NOW)).toBe(true);
  });

  it("counts down to the window instead of to the report date when extended", () => {
    const item = { created_at: daysAgo(40), custody_extended_until: extensionDeadline(15, NOW) };
    expect(daysUntilOverdue(item, NOW)).toBe(15);
    // Still inside the grace period, so it must not be flagged again.
    expect(isCustodyOverdue(item, NOW)).toBe(false);
    // Once the extension lapses it is overdue again.
    expect(isCustodyOverdue({ ...item, custody_extended_until: daysAgo(1) }, NOW)).toBe(true);
  });

  it("never flags an item already marked for donation turnover", () => {
    expect(
      isCustodyOverdue({ created_at: daysAgo(90), donation_turnover: true }, NOW),
    ).toBe(false);
  });

  it("pushes the extension deadline out by the extension window", () => {
    const deadline = new Date(extensionDeadline(15, NOW)).getTime();
    expect(deadline - NOW.getTime()).toBe(15 * DAY);
  });

  it("labels the age in plain language", () => {
    expect(custodyAgeLabel(48)).toBe("48 days in custody");
    expect(custodyAgeLabel(1)).toBe("1 day in custody");
  });
});