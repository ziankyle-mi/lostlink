import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
// Base64 expands bytes by ~4/3. Reject oversized data URLs before decoding so
// a malicious payload cannot allocate a huge buffer first.
export const MAX_DATA_URL_LENGTH = Math.ceil((MAX_FILE_SIZE_BYTES * 4) / 3) + 64;
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

/** Verifies the file actually starts with JPEG/PNG/WebP magic bytes. */
export function hasValidImageSignature(data: Uint8Array): boolean {
  if (data.length < 12) return false;
  // JPEG: FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return true;
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return true;
  }
  return false;
}

/** Strips APP1 (Exif/GPS/XMP), APP13 (IPTC), and COM markers from JPEG image data. */
export function stripJpegMetadata(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return data;
  const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) break;
    while (offset < data.length && data[offset] === 0xff) offset++;
    if (offset >= data.length) break;
    const marker = data[offset++];
    if (marker === 0xd9) {
      chunks.push(new Uint8Array([0xff, 0xd9]));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(new Uint8Array([0xff, marker]));
      continue;
    }
    if (offset + 2 > data.length) break;
    const length = (data[offset] << 8) | data[offset + 1];
    if (offset + length > data.length || length < 2) break;

    // Filter out APP1 (0xE1 - Exif/GPS), APP13 (0xED - IPTC), and COM (0xFE)
    const isMetadata = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!isMetadata) {
      chunks.push(data.subarray(offset - 2, offset + length));
    }
    offset += length;
    if (marker === 0xda) {
      chunks.push(data.subarray(offset));
      break;
    }
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (totalLength <= 4) return data;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/** Strips eXIf, tEXt, zTXt, and iTXt metadata chunks from PNG images. */
export function stripPngMetadata(data: Uint8Array): Uint8Array {
  if (data.length < 8) return data;
  if (
    data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4e || data[3] !== 0x47 ||
    data[4] !== 0x0d || data[5] !== 0x0a || data[6] !== 0x1a || data[7] !== 0x0a
  ) {
    return data;
  }
  const chunks: Uint8Array[] = [data.subarray(0, 8)];
  let offset = 8;
  const decoder = new TextDecoder("ascii");
  while (offset + 12 <= data.length) {
    const length =
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3];
    if (length < 0 || offset + 12 + length > data.length) break;
    const type = decoder.decode(data.subarray(offset + 4, offset + 8));
    const isMetadata = type === "eXIf" || type === "tEXt" || type === "zTXt" || type === "iTXt";
    if (!isMetadata) {
      chunks.push(data.subarray(offset, offset + 12 + length));
    }
    offset += 12 + length;
    if (type === "IEND") break;
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (totalLength <= 8) return data;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/** Strips EXIF and XMP metadata chunks from WebP RIFF images. */
export function stripWebpMetadata(data: Uint8Array): Uint8Array {
  if (data.length < 12) return data;
  if (
    data[0] !== 0x52 || data[1] !== 0x49 || data[2] !== 0x46 || data[3] !== 0x46 ||
    data[8] !== 0x57 || data[9] !== 0x45 || data[10] !== 0x42 || data[11] !== 0x50
  ) {
    return data;
  }
  const chunks: Uint8Array[] = [];
  let offset = 12;
  const decoder = new TextDecoder("ascii");
  while (offset + 8 <= data.length) {
    const fourCC = decoder.decode(data.subarray(offset, offset + 4));
    const length =
      data[offset + 4] |
      (data[offset + 5] << 8) |
      (data[offset + 6] << 16) |
      (data[offset + 7] << 24);
    const paddedLength = length + (length % 2);
    if (offset + 8 + paddedLength > data.length) break;
    const isMetadata = fourCC === "EXIF" || fourCC === "XMP ";
    if (!isMetadata) {
      chunks.push(data.subarray(offset, offset + 8 + paddedLength));
    }
    offset += 8 + paddedLength;
  }

  const chunksLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (chunksLength === 0) return data;
  const newFileSize = 4 + chunksLength;
  const header = new Uint8Array(12);
  header.set(data.subarray(0, 4), 0);
  header[4] = newFileSize & 0xff;
  header[5] = (newFileSize >> 8) & 0xff;
  header[6] = (newFileSize >> 16) & 0xff;
  header[7] = (newFileSize >> 24) & 0xff;
  header.set(data.subarray(8, 12), 8);

  const result = new Uint8Array(12 + chunksLength);
  result.set(header, 0);
  let pos = 12;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/** Strips EXIF, GPS, camera metadata, and comments before storing photos. */
export function stripImageMetadata(data: Uint8Array, mimeType: string): Uint8Array {
  const norm = mimeType.toLowerCase();
  if (norm.includes("jpeg") || norm.includes("jpg")) return stripJpegMetadata(data);
  if (norm.includes("png")) return stripPngMetadata(data);
  if (norm.includes("webp")) return stripWebpMetadata(data);
  return data;
}


export function getStorageClient(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Supabase service role key is not configured.");
  }
  return createClient(env.PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}

const PUBLIC_MARKER = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
const SIGNED_MARKER = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;

/** Converts the legacy `photo_path` column into storage object paths. */
export function photoPathsFromColumn(value: string | null | undefined): string[] {
  if (!value) return [];
  let entries: string[] = [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) entries = parsed.filter((v): v is string => typeof v === "string");
    } catch {
      entries = [value];
    }
  } else {
    entries = [value];
  }

  return entries
    .map((entry) => {
      if (entry.startsWith("data:")) return "";
      const publicIdx = entry.indexOf(PUBLIC_MARKER);
      if (publicIdx >= 0) return decodeURIComponent(entry.slice(publicIdx + PUBLIC_MARKER.length));
      const signedIdx = entry.indexOf(SIGNED_MARKER);
      if (signedIdx >= 0) {
        const rest = entry.slice(signedIdx + SIGNED_MARKER.length);
        return decodeURIComponent(rest.split("?")[0]);
      }
      if (/^https?:\/\//i.test(entry)) return "";
      return entry;
    })
    .filter((entry) => entry.length > 0);
}

/**
 * Signs private-bucket object paths for rendering. Returns an empty string for
 * any path that cannot be signed, so a missing object never breaks a page.
 */
export async function signPhotoPaths(
  env: Env,
  paths: string[],
  expiresIn = 60 * 60,
): Promise<string[]> {
  if (paths.length === 0) return [];
  try {
    const supabase = getStorageClient(env);
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(paths, expiresIn);

    if (error || !data) {
      console.warn("[storage] Signing failed:", error?.message);
      return [];
    }

    const base = env.PUBLIC_SUPABASE_URL.replace(/\/$/, "");
    return data.map((entry) => {
      if (!entry?.signedUrl) return "";
      const url = entry.signedUrl;
      if (/^https?:\/\//i.test(url)) return url;
      return url.startsWith("/storage/") ? `${base}${url}` : `${base}/storage/v1${url.startsWith("/") ? "" : "/"}${url}`;
    });
  } catch (err) {
    console.warn("[storage] Signing exception:", err);
    return [];
  }
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

  if (!hasValidImageSignature(data)) {
    return { ok: false, error: "The file is not a valid JPG, PNG, or WebP image." };
  }

  if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Supabase storage is not configured." };
  }

  try {
    const supabase = getStorageClient(env);
    const ext = getExtension(mimeType);
    const filename = `${crypto.randomUUID()}.${ext}`;

    const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const sanitizedBytes = stripImageMetadata(rawBytes, mimeType);

    const { data: uploadResult, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, sanitizedBytes, {
        contentType: mimeType,
        upsert: false,
      });


    if (uploadErr) {
      console.error("[storage] Upload error:", uploadErr.message);
      return { ok: false, error: uploadErr.message };
    }

    const { data: signed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(uploadResult.path, 60 * 60);

    const rawSigned = signed?.signedUrl ?? "";
    const base = env.PUBLIC_SUPABASE_URL.replace(/\/$/, "");
    const signedUrl = rawSigned
      ? /^https?:\/\//i.test(rawSigned)
        ? rawSigned
        : rawSigned.startsWith("/storage/")
          ? `${base}${rawSigned}`
          : `${base}/storage/v1${rawSigned.startsWith("/") ? "" : "/"}${rawSigned}`
      : undefined;

    return {
      ok: true,
      url: signedUrl,
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

  // Reject by encoded length before allocating the decoded buffer.
  const padding = base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((base64Data.length * 3) / 4) - padding;
  if (decodedBytes > MAX_FILE_SIZE_BYTES) return null;

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
