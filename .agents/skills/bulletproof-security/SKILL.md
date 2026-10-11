---
name: bulletproof-security
description: >-
  Audits, hardens, and fortifies web applications and databases against all incoming attacks,
  exploits, unauthorized access, and data leaks. Use this skill whenever the user asks about security,
  hardening, defending against attacks, penetration testing, vulnerability scanning, SQL injection,
  Row Level Security (RLS), XSS, CSRF, SSRF, DDoS, rate limiting, authentication hardening,
  security headers, Content Security Policy (CSP), file upload validation, or database protection.
  Always trigger when reviewing, building, or modifying auth logic, database schemas, API routes,
  server actions, middleware, or file upload handlers.
---

# Bulletproof Security: Web & Database Hardening Runbook

This skill provides a comprehensive, defense-in-depth standard for protecting web applications and databases against all incoming attacks, privilege escalation, data breaches, and service denial.

---

## 1. Threat Matrix & Defense Vectors

Attack Vector | Primary Threat | Bulletproof Defense | Reference
:--- | :--- | :--- | :---
**Database Breach** | Unauthorized reads/writes, privilege escalation | Zero-Trust RLS on 100% of tables, default deny, `FORCE RLS` | [RLS Guide](./references/database-and-rls-hardening.md)
**SQL Injection** | Data exfiltration, schema manipulation | Parameterized queries, ORM query builders, allowlists | [RLS Guide](./references/database-and-rls-hardening.md)
**Service Role Leak** | Complete database takeover | Secrets strictly server-side, zero client bundling | [OWASP Guide](./references/owasp-top-10-mitigation.md)
**XSS & HTML Injection** | Session hijacking, malicious script execution | Framework auto-escaping, zero raw `set:html`, strict CSP | [Headers Guide](./references/headers-and-ddos-protection.md)
**CSRF & Forged Requests** | Unauthorized state modification | Astro Action origin checks, `SameSite=Lax/Strict` cookies | [OWASP Guide](./references/owasp-top-10-mitigation.md)
**DDoS & Brute Force** | Credential stuffing, denial of service | IP/User rate limiting, Cloudflare Turnstile verification | [Headers Guide](./references/headers-and-ddos-protection.md)
**File Upload Exploits** | Remote code execution, MIME spoofing | Magic bytes inspection, random UUID filenames, private buckets | [Upload Guide](./references/file-upload-and-api-defense.md)
**Input Tampering / SSRF** | Parameter pollution, internal IP access | Zod `.strict()`, blocked private IP ranges | [Upload Guide](./references/file-upload-and-api-defense.md)

---

## 2. Hardening Execution Workflow

Follow this step-by-step process whenever securing a codebase or verifying an implementation:

### Phase 1: Automated Vulnerability & Secrets Audit
1. Run the built-in vulnerability scanner:
   ```bash
   node <skill_root>/scripts/security-scan.mjs [project_path]
   ```
2. Confirm `.env`, `.dev.vars`, and credential files are listed in `.gitignore`.
3. Verify that the Supabase `service_role` key never has a `PUBLIC_` or `VITE_` prefix and never appears in client bundles.
4. Run dependency vulnerability check: `npm audit`.

### Phase 2: Database & Row Level Security (RLS) Lockdown
1. **Enable RLS on Every Table:** Ensure all database tables execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` and `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;`.
2. **Implement Granular Policies:** Separate policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. Never rely on a permissive `FOR ALL` policy.
3. **Use Safe Helper Functions:** Check roles using `SECURITY DEFINER` functions with `SET search_path = public, auth, pg_temp;` to prevent recursion and path hijacking.
4. Reference template: [examples/hardened-supabase-rls.sql](./examples/hardened-supabase-rls.sql).

### Phase 3: Edge & HTTP Security Headers Suite
1. Ensure the application middleware injects all mandatory security headers on every response:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Resource-Policy: same-origin`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `Content-Security-Policy`: configured according to [references/headers-and-ddos-protection.md](./references/headers-and-ddos-protection.md).
2. Reference template: [examples/hardened-astro-middleware.ts](./examples/hardened-astro-middleware.ts).

### Phase 4: Authentication & Access Control Verification
1. **Server-Side Authorization:** Never rely on UI button hiding. Check user identity and role (`user` vs `admin`) on the server in every Action handler and API endpoint.
2. **Domain & Email Validation:** Verify institutional email domains server-side after login. Reject unauthorized domains regardless of OAuth hints.
3. **Session Cookies:** Must be flagged with `httpOnly: true`, `secure: true`, and `sameSite: "lax"`.

### Phase 5: Input Validation & Mutation Defense
1. **Strict Zod Schemas:** Every form and API mutation must pass through a Zod schema with `.strict()` to reject unknown parameters.
2. **Zero Raw HTML:** Ban `set:html`, `dangerouslySetInnerHTML`, and direct `innerHTML` assignments unless passed through an allowlist sanitizer (DOMPurify).
3. **Bot Protection:** Validate Cloudflare Turnstile tokens on login and report actions.
4. Reference template: [examples/secure-zod-actions.ts](./examples/secure-zod-actions.ts).

### Phase 6: File Upload Defense
1. **Magic Bytes Check:** Inspect buffer signatures for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`52 49 46 46`). Do not trust user-provided extensions or MIME headers alone.
2. **Filename Randomization:** Assign a `crypto.randomUUID()` filename to prevent path traversal attacks (`../../`).
3. **Size Enforcements:** Reject files exceeding 5MB before buffering into memory.
4. **Private Storage:** Keep sensitive images in non-public buckets served only via short-lived signed URLs.

---

## 3. Verification & Acceptance Checklist

Before declaring any feature or system secure, perform these three-identity verification checks:

- [ ] **Unauthenticated Visitor:**
  - Visiting protected routes (`/admin`, `/profile`, `/report`) immediately redirects to `/login`.
  - Calling mutation actions or API endpoints returns `401 Unauthorized`.
- [ ] **Standard Authenticated User:**
  - Attempting to access `/admin` or invoke admin actions returns `403 Forbidden`.
  - Attempting to query another user's unapproved/pending reports via database query returns 0 rows.
  - Attempting to update another user's item or claim fails with access denied.
- [ ] **Admin User:**
  - Authorized to read pending queues and execute approvals/rejections.
  - Every administrative action writes an immutable record to `admin_log`.
- [ ] **Scanner Clean:** `node <skill_root>/scripts/security-scan.mjs` returns 0 critical or high issues.
