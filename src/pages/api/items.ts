import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/lib/env";
import { roleForEmail } from "~/lib/session";

function getAdminClient(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
  return createClient(env.PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
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
  const statusFilter = url.searchParams.get("status"); // "approved" | "claimed" | "all" | null

  try {
    let query = supabase.from("items").select("*").order("created_at", { ascending: false });

    if (typeFilter && (typeFilter === "lost" || typeFilter === "found")) {
      query = query.eq("type", typeFilter);
    }

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    } else if (!statusFilter) {
      // Default to approved active items so claimed and resolved items are not returned publicly
      query = query.eq("status", "approved");
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, items: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error querying items";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
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

    const allPhotos: string[] = photoUrls || photos || [];
    if (type === "found" && allPhotos.length < 1) {
      return new Response(JSON.stringify({ ok: false, error: "Found items require at least 1 photo." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient(locals.env);

    // Resolve or find reporter profile
    let reporterId: string | null = null;
    const userEmail = user.email.toLowerCase().trim();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile?.id) {
      reporterId = profile.id;
    } else {
      // Fallback: search by user.id if it is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) {
        reporterId = user.id;
      } else {
        // Pick first existing admin or user profile as fallback
        const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
        reporterId = anyProfile?.id || null;
      }
    }

    if (!reporterId) {
      return new Response(JSON.stringify({ ok: false, error: "Reporter profile could not be found." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hidePhoto = category === "IDs, Cards & Wallets" || category.toLowerCase().includes("id");
    const refCode = type === "found" ? `LL-${Math.floor(4000 + Math.random() * 900)}` : null;
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
        status: "approved", // Set approved for live campus feed display
      })
      .select()
      .single();

    if (insertError) {
      console.error("[api/items] Insert error:", insertError.message);
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert in-app notification for reporter
    try {
      await supabase.from("notifications").insert({
        user_id: reporterId,
        message: "Your report has been submitted successfully.",
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
    return new Response(JSON.stringify({ ok: false, error: msg }), {
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

  const userEmail = user.email.toLowerCase().trim();
  const isAdmin = user.role === "admin" || roleForEmail(userEmail) === "admin";
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
    const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);

    if (!isItemUuid) {
      return new Response(
        JSON.stringify({ ok: true, status: "removed", itemId, message: "Post removed from campus feed." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
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

    // Clean up foreign dependencies before deleting item
    await supabase.from("admin_log").delete().eq("item_id", itemId);
    await supabase.from("claims").delete().eq("item_id", itemId);

    const { error: delErr } = await supabase.from("items").delete().eq("id", itemId);
    if (delErr) {
      await supabase.from("items").update({ status: "rejected", reject_reason: "Removed by admin" }).eq("id", itemId);
    }

    // Resolve admin profile ID
    const { data: adminProf } = await supabase.from("profiles").select("id").eq("email", userEmail).maybeSingle();
    const adminProfileId = adminProf?.id ?? (isItemUuid ? user.id : null);
    if (adminProfileId) {
      await supabase.from("admin_log").insert({
        admin_id: adminProfileId,
        action: `post_removed: ${item.name}`,
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
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

