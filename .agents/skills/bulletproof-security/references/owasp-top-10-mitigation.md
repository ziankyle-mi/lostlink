# OWASP Top 10 Web Vulnerabilities & Bulletproof Defenses

This guide details code-level hardening strategies against the top web security threats.

---

## 1. Broken Access Control (A01)

### Threats:
- Insecure Direct Object References (IDOR): An attacker modifies `?id=uuid` in the URL or payload to edit or delete someone else's record.
- Privilege Escalation: A standard user triggers administrative actions by calling admin endpoints directly.

### Mitigations:
1. **Server-Side Authorization Checks:**
   Never assume that hiding a UI button restricts access. Every server action or API route must verify:
   ```typescript
   // In Server Action or API Endpoint:
   if (!user) {
     throw new UnauthorizedError("Authentication required");
   }
   if (requiredRole === "admin" && user.role !== "admin") {
     throw new ForbiddenError("Insufficient administrative privileges");
   }
   ```
2. **Ownership Verification on Mutations:**
   Always scope update and delete operations by both ID and owner ID:
   ```typescript
   // Safe mutation scoping:
   const { data, error } = await supabase
     .from("items")
     .update({ description: sanitizedDescription })
     .eq("id", targetId)
     .eq("reporter_id", user.id); // Guarantees only the owner can modify
   ```

---

## 2. Cryptographic Failures & Secrets Protection (A02)

### Threats:
- Hardcoded API tokens, private keys, or service role secrets exposed in client-side bundles.
- Transmission of credentials over unencrypted channels.

### Mitigations:
1. **Strict Environment Prefix Separation:**
   - Client-exposed variables must be explicitly prefixed (e.g., `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
   - Private secrets (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `JWT_SECRET`) must NEVER contain a `PUBLIC_` or `VITE_` prefix.
2. **Cookie Flags:**
   ```typescript
   cookies.set("ll_session", token, {
     httpOnly: true,     // Immune to JavaScript document.cookie theft (XSS defense)
     secure: true,       // Only transmitted over HTTPS
     sameSite: "lax",    // Protects against Cross-Site Request Forgery (CSRF)
     path: "/",
     maxAge: 60 * 60 * 24 * 7 // 7 days expiration
   });
   ```

---

## 3. Injection (SQL, XSS, Command) (A03)

### Cross-Site Scripting (XSS)
- **Rule:** Never insert unsanitized user content into HTML strings or raw templates (`set:html` in Astro, `dangerouslySetInnerHTML` in React).
- **Defense:**
  1. Default to framework escaping (Astro and React automatically escape `{variable}`).
  2. If rich HTML is strictly necessary, sanitize server-side using an allowlist with DOMPurify:
     ```typescript
     import DOMPurify from "isomorphic-dompurify";
     const cleanHtml = DOMPurify.sanitize(userInput, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
       ALLOWED_ATTR: ['href']
     });
     ```

### Server-Side Request Forgery (SSRF)
- If the application fetches user-provided URLs (e.g. webhooks, link previews), forbid internal network and metadata IP addresses:
  ```typescript
  const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'];
  function isSafeUrl(inputUrl: string): boolean {
    const parsed = new URL(inputUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) return false;
    // Check private RFC 1918 ranges (10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x)
    return true;
  }
  ```

---

## 4. Insecure Design & Rate Limiting (A04)

### Threats:
- Automated credential stuffing, password cracking, or denial of service via high-volume submissions.

### Mitigations:
1. **Cloudflare Turnstile / Captcha:** Require token verification on all login, registration, and report forms.
2. **IP and User Rate Limiting:** Apply token-bucket rate limits on sensitive routes:
   - Login attempts: max 5 requests per minute per IP.
   - Report submissions: max 10 requests per 10 minutes per user.

---

## 5. Security Misconfiguration & Defensive Headers (A05)

- Never disclose stack traces, framework versions, or database errors to the user.
- Enforce hardened HTTP headers on every response.
- Eliminate directory listing and default files.

---

## 6. Software & Data Integrity Failures (A08)

- Protect against untrusted deserialization.
- Pin dependency versions and enforce automated vulnerability auditing (`npm audit`).
- Ensure CI/CD pipelines fail if critical vulnerabilities are detected.

---

## 7. Security Logging & Monitoring (A09)

- Maintain an immutable `admin_log` table tracking:
  - Timestamp
  - Actor ID (`admin_id`)
  - Action performed (`approved`, `rejected`, `verified`, `deleted`)
  - Target entity ID (`item_id`, `claim_id`)
  - Originating IP or session identifier
- Never log sensitive credentials, passwords, or personal identity numbers in server logs.
