import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const STORAGE_BUCKET = "items-photos";

function getExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function isAllowedMimeType(mimeType: string): boolean {
  const norm = mimeType.toLowerCase();
  return ALLOWED_MIME_TYPES.includes(norm as (typeof ALLOWED_MIME_TYPES)[number]) || norm === "image/jpg";
}

export function getStorageClient(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
  return createClient(env.PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}

/**
 * Uploads an image binary buffer/Uint8Array to the Supabase Storage bucket 'items-photos'.
 * Enforces file size limits, MIME type validation, and secure random UUID filenames.
 */
export async function uploadPhotoToStorage(
  env: Env,
  data: Uint8Array | Buffer,
  mimeType: string,
): Promise<{ ok: boolean; url?: string; path?: string; error?: string }> {
  if (!isAllowedMimeType(mimeType)) {
    return { ok: false, error: "Only JPG, PNG, and WebP images are permitted." };
  }

  if (data.byteLength > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File size exceeds the 5 MB limit." };
  }

  if (!env.PUBLIC_SUPABASE_URL || (!env.SUPABASE_SERVICE_ROLE_KEY && !env.PUBLIC_SUPABASE_ANON_KEY)) {
    return { ok: false, error: "Supabase storage is not configured." };
  }

  try {
    const supabase = getStorageClient(env);
    const ext = getExtension(mimeType);
    const filename = `${crypto.randomUUID()}.${ext}`;

    const { data: uploadResult, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, data, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadErr) {
      console.error("[storage] Upload error:", uploadErr.message);
      return { ok: false, error: uploadErr.message };
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadResult.path);

    return {
      ok: true,
      url: publicData.publicUrl,
      path: uploadResult.path,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    console.error("[storage] Upload exception:", message);
    return { ok: false, error: message };
  }
}

/**
 * Parses a Data URL (e.g. data:image/jpeg;base64,...) into raw binary and MIME type.
 */
export function parseBase64DataUrl(dataUrl: string): { data: Uint8Array; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { data: bytes, mimeType };
  } catch {
    return null;
  }
}
