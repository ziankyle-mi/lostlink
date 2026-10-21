import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/lib/env";
import { photoPathsFromColumn } from "~/lib/storage";
import { verifyTurnstile } from "~/lib/turnstile";
import { isRateLimitedDurable, recordFailedAttemptDurable } from "~/lib/rateLimit";

function getAdminClient(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Supabase service role key is not configured.");
  }
  return createClient(env.PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_STATUSES = new Set(["approved", "claimed", "resolved"]);

function referenceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `LL-${hex.toUpperCase()}`;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getAdminClient(locals.env);
  const typeFilter = url.searchParams.get("type"); // "lost" | "found" | null
  const statusFilter = url.searchParams.get("status");
  const isAdmin = user.role === "admin";

  try {
    // Never let the browser choose arbitrary columns or arbitrary statuses.
    // Reference codes are claim secrets and are only returned to admins.
    const columns = isAdmin
      ? "id,type,name,category,location,event_date,description,photo_path,status,hide_photo,reporter_id,reference_code,created_at"
      : "id,type,name,category,location,event_date,description,photo_path,status,hide_photo,created_at";
    let query = supabase.from("items").select(columns).order("created_at", { ascending: false });

    if (typeFilter && (typeFilter === "lost" || typeFilter === "found")) {
      query = query.eq("type", typeFilter);
    }

    if (isAdmin && statusFilter === "all") {
      // Full inventory for the Security Office only.
    } else if (isAdmin && statusFilter && PUBLIC_STATUSES.has(statusFilter)) {
      query = query.eq("status", statusFilter);
    } else {
      // Students only ever see approved items.
      query = query.eq("status", "approved");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[api/items] Query error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not load items." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Hidden photos never leave the server as usable object paths for students.
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const items = rows.map((item) => {
      if (!isAdmin && item.hide_photo) {
        return { ...item, photo_path: null };
      }
      return item;
    });

    return new Response(JSON.stringify({ ok: true, items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/items] Exception:", err);
    return new Response(JSON.stringify({ ok: false, error: "Could not load items." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const {
      type,
      name,
      category,
      location,
      description,
      eventDate,
      photos,
      photoUrls,
      photoPaths,
      turnstileToken,
    } = body;

    // Basic Validations
    if (!type || (type !== "lost" && type !== "found")) {
      return new Response(JSON.stringify({ ok: false, error: "Type must be 'lost' or 'found'." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return new Response(JSON.stringify({ ok: false, error: "Item name must be at least 2 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!category || typeof category !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Category is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!location || typeof location !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Location is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return new Response(JSON.stringify({ ok: false, error: "Description must be at least 10 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Store storage object paths, not public URLs. Photos live in a private
    // bucket and are signed when rendered.
    const incoming = [
      ...(Array.isArray(photoPaths) ? photoPaths : []),
      ...(Array.isArray(photoUrls) ? photoUrls : []),
      ...(Array.isArray(photos) ? photos : []),
    ];
    const allPhotos = Array.from(
      new Set(incoming.flatMap((value) => photoPathsFromColumn(String(value)))),
    );

    if (type === "found" && allPhotos.length < 1) {
      return new Response(JSON.stringify({ ok: false, error: "Found items require at least 1 photo." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (allPhotos.length > 3) {
      return new Response(JSON.stringify({ ok: false, error: "Maximum of 3 photos allowed." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown-ip";
    const reportKey = `report:user:${user.id}`;

    // Ten reports per account per hour. Rate-limit before bot verification so
    // a scripted loop cannot burn Turnstile verifications for free.
    const reportLimit = await isRateLimitedDurable(locals.env, reportKey);
    if (reportLimit.isBlocked) {
      const mins = Math.max(1, Math.ceil(reportLimit.remainingSeconds / 60));
      return new Response(
        JSON.stringify({ ok: false, error: `Too many reports. Please wait ${mins} minute(s).` }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    await recordFailedAttemptDurable(locals.env, reportKey, {
      maxFailures: 10,
      lockoutDurationMs: 60 * 60 * 1000,
    });

    const botCheck = await verifyTurnstile(locals.env, turnstileToken, clientIp);
    if (!botCheck.ok) {
      return new Response(JSON.stringify({ ok: false, error: botCheck.error }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient(locals.env);

    // Resolve the reporter profile. Never fall back to another person's row.
    let reporterId: string | null = null;
    const userEmail = user.email.toLowerCase().trim();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile?.id) {
      reporterId = profile.id;
    } else if (UUID_RE.test(user.id)) {
      reporterId = user.id;
    }

    if (!reporterId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Your account profile is missing. Contact the Security Office." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const hidePhoto = category === "IDs, Cards & Wallets" || category.toLowerCase().includes("id");
    const refCode = type === "found" ? referenceCode() : null;
    const photoPath = allPhotos.length > 0 ? (allPhotos.length === 1 ? allPhotos[0] : JSON.stringify(allPhotos)) : null;
    const today = new Date().toISOString().split("T")[0];
    const itemDate = eventDate || today;

    const { data: insertedItem, error: insertError } = await supabase
      .from("items")
      .insert({
        type,
        name: name.trim(),
        category: category.trim(),
        location: location.trim(),
        event_date: itemDate,
        description: description.trim(),
        photo_path: photoPath,
        reference_code: refCode,
        hide_photo: hidePhoto,
        reporter_id: reporterId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[api/items] Insert error:", insertError.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not save the report. Try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert in-app notification for reporter
    try {
      await supabase.from("notifications").insert({
        user_id: reporterId,
        message: "Your report was submitted and is waiting for Security Office review.",
        link: "/",
        read: false,
      });
    } catch (notifErr) {
      console.warn("[api/items] Notification insert error:", notifErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        item: insertedItem,
        images: allPhotos,
        referenceCode: refCode,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error saving report";
    console.error("[api/items] Exception:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Could not save the report. Try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { itemId, action } = body;

    if (action !== "resolve") {
      return new Response(JSON.stringify({ ok: false, error: "Unknown item action." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!itemId || typeof itemId !== "string" || !UUID_RE.test(itemId)) {
      return new Response(JSON.stringify({ ok: false, error: "A valid item ID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient(locals.env);
    const userEmail = user.email.toLowerCase().trim();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    const profileId = profile?.id ?? (UUID_RE.test(user.id) ? user.id : null);
    if (!profileId) {
      return new Response(JSON.stringify({ ok: false, error: "Your account profile is missing." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: item } = await supabase
      .from("items")
      .select("id, type, status, reporter_id")
      .eq("id", itemId)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ ok: false, error: "Item not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (item.reporter_id !== profileId) {
      return new Response(JSON.stringify({ ok: false, error: "Only the reporter can resolve this report." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (item.type !== "lost") {
      return new Response(JSON.stringify({ ok: false, error: "Only lost reports can be resolved." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (item.status !== "approved") {
      return new Response(JSON.stringify({ ok: false, error: "Only an active lost report can be resolved." }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: resolveErr } = await supabase
      .from("items")
      .update({ status: "resolved" })
      .eq("id", itemId)
      .eq("status", "approved");

    if (resolveErr) {
      console.error("[api/items] Resolve error:", resolveErr.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not resolve the report." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: "resolved" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/items] PATCH exception:", err);
    return new Response(JSON.stringify({ ok: false, error: "Could not update the report." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    return new Response(JSON.stringify({ ok: false, error: "Admin access required to remove posts." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let itemId = url.searchParams.get("id");
    if (!itemId) {
      try {
        const body = await request.json();
        itemId = body.itemId || body.id;
      } catch {
        // Body might be empty
      }
    }

    if (!itemId) {
      return new Response(JSON.stringify({ ok: false, error: "Item ID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient(locals.env);

    if (!UUID_RE.test(itemId)) {
      return new Response(JSON.stringify({ ok: false, error: "Item ID is invalid." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: item } = await supabase
      .from("items")
      .select("id, name, reporter_id")
      .eq("id", itemId)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ ok: false, error: "Item not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Soft removal. The audit trail and claim history must survive moderation,
    // so never cascade-delete admin_log or claims here.
    const { error: updErr } = await supabase
      .from("items")
      .update({ status: "rejected", reject_reason: "Removed by admin" })
      .eq("id", itemId);

    if (updErr) {
      console.error("[api/items] Remove error:", updErr.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not remove the post. Try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve the acting admin's profile for the audit row.
    const { data: adminProf } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    const adminProfileId = adminProf?.id ?? (UUID_RE.test(user.id) ? user.id : null);
    if (adminProfileId) {
      await supabase.from("admin_log").insert({
        admin_id: adminProfileId,
        action: `post_removed: ${item.name}`,
        item_id: itemId,
      });
    }

    if (item.reporter_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: item.reporter_id,
          message: `Your report for "${item.name}" was removed by the Disciplinary Office.`,
          link: "/",
        });
      } catch {
        // Notification optional
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: "removed",
        itemId,
        name: item.name,
        message: `Post "${item.name}" has been removed.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error deleting item";
    console.error("[api/items] Delete exception:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Could not remove the item. Try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

