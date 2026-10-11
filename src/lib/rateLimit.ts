/**
 * In-memory sliding rate limiter for authentication & brute force mitigation.
 * Tracks consecutive failed attempts by IP and email identifier.
 */

interface AttemptRecord {
  failures: number;
  lockedUntil: number;
  lastAttempt: number;
}

const attemptsStore = new Map<string, AttemptRecord>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStale(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of attemptsStore.entries()) {
    if (record.lockedUntil < now && now - record.lastAttempt > 15 * 60 * 1000) {
      attemptsStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  maxFailures?: number;       // default: 5
  lockoutDurationMs?: number; // default: 5 minutes (300,000 ms)
}

/**
 * Checks if a key (IP or email) is currently locked out.
 */
export function isRateLimited(
  key: string
): { isBlocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  purgeStale(now);

  const normalizedKey = key.trim().toLowerCase();
  const record = attemptsStore.get(normalizedKey);
  if (!record) return { isBlocked: false, remainingSeconds: 0 };

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isBlocked: true, remainingSeconds };
  }

  return { isBlocked: false, remainingSeconds: 0 };
}

/**
 * Records a failed attempt for a given key.
 * If failures meet or exceed maxFailures, locks the key for lockoutDurationMs.
 */
export function recordFailedAttempt(
  key: string,
  options: RateLimitOptions = {}
): { isBlocked: boolean; remainingSeconds: number; attemptsLeft: number } {
  const maxFailures = options.maxFailures ?? 5;
  const lockoutDurationMs = options.lockoutDurationMs ?? 5 * 60 * 1000;
  const now = Date.now();
  purgeStale(now);

  const normalizedKey = key.trim().toLowerCase();
  const record = attemptsStore.get(normalizedKey) ?? {
    failures: 0,
    lockedUntil: 0,
    lastAttempt: now,
  };

  // If a previous lockout expired, reset failure counter
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.failures = 0;
    record.lockedUntil = 0;
  }

  record.failures += 1;
  record.lastAttempt = now;

  if (record.failures >= maxFailures) {
    record.lockedUntil = now + lockoutDurationMs;
    attemptsStore.set(normalizedKey, record);
    return {
      isBlocked: true,
      remainingSeconds: Math.ceil(lockoutDurationMs / 1000),
      attemptsLeft: 0,
    };
  }

  attemptsStore.set(normalizedKey, record);
  return {
    isBlocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, maxFailures - record.failures),
  };
}

/**
 * Clears attempt history for a key upon successful authentication.
 */
export function clearRateLimit(key: string): void {
  const normalizedKey = key.trim().toLowerCase();
  attemptsStore.delete(normalizedKey);
}

/**
 * Resets the entire rate limit store (used in unit tests).
 */
export function resetRateLimitStore(): void {
  attemptsStore.clear();
}
