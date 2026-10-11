import type { APIRoute } from "astro";
import {
  MAX_FILE_SIZE_BYTES,
  isAllowedMimeType,
  parseBase64DataUrl,
  uploadPhotoToStorage,
} from "~/lib/storage";

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
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
        const parsed = parseBase64DataUrl(item);
        if (!parsed) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid image data format for photo #${i + 1}.` }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const result = await uploadPhotoToStorage(locals.env, parsed.data, parsed.mimeType);
        if (!result.ok || !result.url) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: result.error || `Failed to upload photo #${i + 1} to storage.`,
            }),
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
        const result = await uploadPhotoToStorage(locals.env, buffer, file.type);

        if (!result.ok || !result.url) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: result.error || `Failed to upload '${file.name}' to storage.`,
            }),
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
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
