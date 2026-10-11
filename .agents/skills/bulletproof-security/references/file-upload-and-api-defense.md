# File Upload & API Input Defense

This reference provides defensive recipes for processing file uploads and hardening API inputs against malicious payloads, path traversal, and buffer exhaustion.

---

## 1. Magic Bytes (File Signature) Validation

Attackers routinely bypass MIME type and extension checks by renaming malicious `.exe`, `.html`, or `.php` files to `.jpg`. Always validate the actual file header bytes.

```typescript
// Known magic byte signatures
const MAGIC_SIGNATURES: Record<string, { bytes: number[]; offset: number }> = {
  jpeg: { bytes: [0xff, 0xd8, 0xff], offset: 0 },
  png: { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  webp: { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // WebP starts with 'RIFF'
  pdf: { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },  // PDF starts with '%PDF'
};

export async function validateImageMagicBytes(buffer: Uint8Array): Promise<{ valid: boolean; ext: string | null }> {
  // Check JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg" };
  }
  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: "png" };
  }
  // Check WebP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { valid: true, ext: "webp" };
  }

  return { valid: false, ext: null };
}
```

---

## 2. Filename Randomization & Path Traversal Prevention

### Rules:
1. **Never use the client-supplied filename:** Usernames or file names containing `../../` or null bytes (`%00`) can overwrite critical server files.
2. **Assign a cryptographically secure UUID:**
```typescript
import { randomUUID } from "node:crypto";

export function generateSafeStoragePath(folder: string, validatedExtension: string): string {
  // Disallow any path traversal characters in folder name
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFilename = `${randomUUID()}.${validatedExtension}`;
  return `${safeFolder}/${safeFilename}`;
}
```

---

## 3. Strict Payload Size & Memory Guard

Never buffer arbitrarily large payloads into memory. Always enforce size caps before buffer conversion.

```typescript
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit (5MB).`);
  }
}
```

---

## 4. Private Storage Buckets & Signed URLs

For sensitive files (such as student IDs, proof of identity, or unverified claims):
1. **Store in Private Buckets:**
   - Configure the Supabase bucket with `public: false`.
2. **Access via Ephemeral Signed URLs:**
   - Only generate signed URLs on demand after verifying user authorization.
   - Set expiry to a minimal window (e.g. 60 seconds).
```typescript
// Generate temporary signed URL on server:
const { data, error } = await supabase.storage
  .from("private-verification-docs")
  .createSignedUrl(safePath, 60); // Valid for 60 seconds only
```

---

## 5. Input Validation with Zod `.strict()`

Always enforce `.strict()` on Zod schemas to reject unexpected or prototype-polluting fields.

```typescript
import { z } from "zod";

export const SafeReportInputSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    category: z.enum(["electronics", "clothing", "documents", "valuables", "others"]),
    location: z.string().trim().min(2).max(100),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().trim().min(10).max(1000),
    turnstile_token: z.string().min(1),
  })
  .strict(); // Disallows unknown fields and prototype poisoning
```
