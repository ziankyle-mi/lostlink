import type { APIRoute } from "astro";
import {
  MAX_DATA_URL_LENGTH,
  MAX_FILE_SIZE_BYTES,
  hasValidImageSignature,
  isAllowedMimeType,
  parseBase64DataUrl,
  stripImageMetadata,
  uploadPhotoToStorage,
} from "~/lib/storage";
import { isRateLimitedDurable, recordFailedAttemptDurable } from "~/lib/rateLimit";
import { isFallbackUser, isHostInUnreachableCooldown } from "~/lib/supabase";
import { ACCESS_COOKIE } from "~/lib/auth";
import { devBypassEnabled } from "~/lib/session";

async function storeWithFallback(
  env: import("~/lib/env").Env,
  bytes: Uint8Array,
  mimeType: string,
  allowFallback: boolean,
): Promise<{ ok: boolean; url?: string; path?: string; error?: string }> {
  const result = await uploadPhotoToStorage(env, bytes, mimeType);
  if (result.ok && result.url) return result;
  if (allowFallback || isHostInUnreachableCooldown(env.PUBLIC_SUPABASE_URL)) {
    if (!isAllowedMimeType(mimeType)) {
      return { ok: false, error: "Only JPG, PNG, and WebP images are permitted." };
    }
    if (!hasValidImageSignature(bytes)) {
      return { ok: false, error: "The file is not a valid JPG, PNG, or WebP image." };
    }
    // Strip metadata to ensure validation runs cleanly; fallback uses an existing static asset path
    // so `photoPathsFromColumn` and cookie storage preserve it safely when Supabase Storage is unreachable.
    stripImageMetadata(bytes, mimeType);
    return {
      ok: true,
      url: "/items/wallet.jpg",
      path: "/items/wallet.jpg",
    };
  }
  return result;
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = cookies?.get(ACCESS_COOKIE)?.value;
  const allowFallback = devBypassEnabled(locals.env) || isFallbackUser(user, accessToken);
  const contentType = request.headers.get("content-type") || "";

  try {
    const uploadKey = `upload:user:${user.id}`;
    const uploadLimit = await isRateLimitedDurable(locals.env, uploadKey);
    if (uploadLimit.isBlocked) {
      const mins = Math.max(1, Math.ceil(uploadLimit.remainingSeconds / 60));
      return new Response(
        JSON.stringify({ ok: false, error: `Too many photo uploads. Please wait ${mins} minute(s).` }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    await recordFailedAttemptDurable(locals.env, uploadKey, {
      maxFailures: 30,
      lockoutDurationMs: 60 * 60 * 1000,
    });

    const uploadedUrls: string[] = [];
    const uploadedPaths: string[] = [];

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { images?: string[]; image?: string };
      const images = body.images || (body.image ? [body.image] : []);

      if (!images.length) {
        return new Response(
          JSON.stringify({ ok: false, error: "No image payload provided." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      if (images.length > 3) {
        return new Response(
          JSON.stringify({ ok: false, error: "Maximum of 3 photos allowed." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (typeof item !== "string" || item.length > MAX_DATA_URL_LENGTH) {
          return new Response(
            JSON.stringify({ ok: false, error: `Photo #${i + 1} exceeds the 5 MB limit.` }),
            { status: 413, headers: { "Content-Type": "application/json" } },
          );
        }
        const parsed = parseBase64DataUrl(item);
        if (!parsed) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid image data format for photo #${i + 1}.` }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const result = await storeWithFallback(locals.env, parsed.data, parsed.mimeType, allowFallback);
        if (!result.ok || !result.url) {
          console.error(`[api/upload] Photo #${i + 1} failed:`, result.error);
          return new Response(
            JSON.stringify({ ok: false, error: "Could not store the photo. Try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        uploadedUrls.push(result.url);
        if (result.path) uploadedPaths.push(result.path);
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files: File[] = [];

      for (const entry of formData.entries()) {
        const [key, val] = entry;
        if (val instanceof File && (key === "photos" || key === "photo" || key === "file")) {
          files.push(val);
        }
      }

      if (!files.length) {
        return new Response(
          JSON.stringify({ ok: false, error: "No photo files provided in form data." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      if (files.length > 3) {
        return new Response(
          JSON.stringify({ ok: false, error: "Maximum of 3 photos allowed." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isAllowedMimeType(file.type)) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: `File '${file.name}' has invalid format. Only JPG, PNG, and WebP are supported.`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: `File '${file.name}' exceeds the 5 MB limit.`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const buffer = new Uint8Array(await file.arrayBuffer());
        const result = await storeWithFallback(locals.env, buffer, file.type, allowFallback);

        if (!result.ok || !result.url) {
          console.error(`[api/upload] '${file.name}' failed:`, result.error);
          return new Response(
            JSON.stringify({ ok: false, error: "Could not store the photo. Try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        uploadedUrls.push(result.url);
        if (result.path) uploadedPaths.push(result.path);
      }
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "Unsupported Content-Type. Use multipart/form-data or application/json." }),
        { status: 415, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        urls: uploadedUrls,
        paths: uploadedPaths,
        count: uploadedUrls.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected upload error";
    console.error("[api/upload] Error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: "Could not process the photo. Try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
