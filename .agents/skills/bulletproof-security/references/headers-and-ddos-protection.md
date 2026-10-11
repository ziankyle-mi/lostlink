# Security Headers, CSP & DDoS/Bot Protection

This reference provides production configurations for HTTP security headers, Content Security Policy (CSP), and request rate limiting.

---

## 1. Complete Production Security Headers Suite

Every HTTP response from the server must include the following headers (typically configured in `src/middleware.ts` or edge proxy):

```typescript
export const HARDENED_SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Prevent clickjacking by forbidding embedding in iframes
  "X-Frame-Options": "DENY",

  // Control referrer leakage
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Lock down browser hardware APIs
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=()",

  // Isolate browsing context from cross-origin popups/windows
  "Cross-Origin-Opener-Policy": "same-origin",

  // Prevent cross-origin resource leakage
  "Cross-Origin-Resource-Policy": "same-origin",

  // Force HTTPS for all future requests (2 years, include subdomains, preload)
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};
```

---

## 2. Hardened Content-Security-Policy (CSP)

A robust CSP prevents XSS, data exfiltration, unauthorized script execution, and clickjacking.

### CSP Directive Specification for Modern Web Apps (Astro / React / Supabase / Turnstile)
```typescript
export function buildContentSecurityPolicy(options: { nonce?: string; isDev?: boolean }): string {
  const { nonce, isDev } = options;

  const scriptSrc = [
    "'self'",
    "https://challenges.cloudflare.com", // Cloudflare Turnstile
    isDev ? "'unsafe-eval'" : "",        // Vite HMR in local development only
    nonce ? `'nonce-${nonce}'` : "'unsafe-inline'", // Prefer cryptographic nonces in production
  ].filter(Boolean).join(" ");

  const styleSrc = [
    "'self'",
    "'unsafe-inline'", // Needed for inline CSS/Tailwind runtime styling
    "https://fonts.googleapis.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",             // Supabase API and Auth
    "wss://*.supabase.co",              // Supabase Realtime WebSockets
    "https://challenges.cloudflare.com", // Turnstile validation
  ].join(" ");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://*.supabase.co",             // Supabase Storage CDN
  ].join(" ");

  const frameSrc = [
    "https://challenges.cloudflare.com", // Cloudflare Turnstile widget
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "object-src 'none'",                 // Disallow plugins (Flash, Java, Silverlight)
    "base-uri 'self'",                   // Prevent malicious <base> injection
    "form-action 'self'",                // Forms can only submit back to same origin
    "frame-ancestors 'none'",            // Modern equivalent to X-Frame-Options: DENY
    "upgrade-insecure-requests",         // Automatically upgrade http:// to https://
  ].join("; ");
}
```

---

## 3. Cloudflare Turnstile Server Verification

Protect authentication, registration, and reporting endpoints from bots and scrapers.

```typescript
export async function verifyTurnstileToken(token: string, secretKey: string, remoteIp?: string): Promise<boolean> {
  if (!token) return false;

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const outcome = (await res.json()) as { success: boolean };
    return outcome.success === true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}
```

---

## 4. Sliding Window Rate Limiting (In-Memory & Edge)

Rate limit brute-force attacks at the application level:

```typescript
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: record.resetAt - now };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetInMs: record.resetAt - now };
}
```
