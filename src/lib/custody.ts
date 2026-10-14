/**
 * Custody rules for the Unclaimed Items Review (admin -> Disciplinary Office).
 *
 * The custody clock starts when a found item is reported (`items.created_at`).
 * After CUSTODY_OVERDUE_DAYS with no approved claim, the item is overdue and
 * the office can either grant one grace extension of CUSTODY_EXTENSION_DAYS or
 * mark it for donation turnover, which closes the case.
 *
 * One source of truth so the admin list, the action, and the copy never drift.
 */

export const CUSTODY_OVERDUE_DAYS = 30;
export const CUSTODY_EXTENSION_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CustodyRecord {
  created_at: string;
  custody_extended_until?: string | null;
  donation_turnover?: boolean | null;
}

function timeOf(value: string | Date | null | undefined): number {
  if (!value) return Number.NaN;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.NaN : ms;
}

/** Whole days an item has been sitting in the office. */
export function daysInCustody(createdAt: string | Date, now: Date = new Date()): number {
  const start = timeOf(createdAt);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS));
}

/**
 * Days left before the item is overdue. Zero or less means it is overdue now.
 * An active extension moves the deadline to `custody_extended_until`.
 */
export function daysUntilOverdue(item: CustodyRecord, now: Date = new Date()): number {
  const extended = timeOf(item.custody_extended_until);
  const start = timeOf(item.created_at);
  const deadline = Number.isNaN(extended)
    ? (Number.isNaN(start) ? Number.NaN : start + CUSTODY_OVERDUE_DAYS * DAY_MS)
    : extended;

  if (Number.isNaN(deadline)) return CUSTODY_OVERDUE_DAYS;
  return Math.ceil((deadline - now.getTime()) / DAY_MS);
}

export function isCustodyOverdue(item: CustodyRecord, now: Date = new Date()): boolean {
  if (item.donation_turnover) return false;
  return daysUntilOverdue(item, now) <= 0;
}

/** ISO timestamp for the end of a grace extension. */
export function extensionDeadline(
  days = CUSTODY_EXTENSION_DAYS,
  now: Date = new Date(),
): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/** "48" -> "48 days in custody", "1" -> "1 day in custody". */
export function custodyAgeLabel(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"} in custody`;
}