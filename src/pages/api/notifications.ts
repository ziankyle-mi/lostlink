import type { APIRoute } from "astro";
import { getServiceClient, getUserClient } from "~/lib/supabase";


export const GET: APIRoute = async ({ locals, cookies }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const accessToken = cookies?.get("ll_access_token")?.value;
    // Scoped client with user's access token enforces notifications_read policy
    const supabase = accessToken
      ? getUserClient(locals.env, accessToken)
      : getServiceClient(locals.env, "Fallback notifications query");
    const userEmail = user.email.toLowerCase().trim();

    // Resolve user's profile ID
    let profileId: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile?.id) {
      profileId = profile.id;
    } else {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) profileId = user.id;
    }

    if (!profileId) {
      return new Response(
        JSON.stringify({ ok: true, notifications: [], unreadCount: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: notifs, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[api/notifications] Query error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not load notifications." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const unreadCount = notifs?.filter((n) => !n.read).length ?? 0;

    return new Response(
      JSON.stringify({
        ok: true,
        notifications: notifs ?? [],
        unreadCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error querying notifications";
    console.error("[api/notifications] GET exception:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Could not load notifications." }), {
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
    const supabase = getServiceClient(locals.env, "Mark notification as read");
    const userEmail = user.email.toLowerCase().trim();
    const body = await request.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    let profileId: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile?.id) profileId = profile.id;
    else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      profileId = user.id;
    }

    if (!profileId) {
      return new Response(JSON.stringify({ ok: false, error: "Profile not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (markAllRead) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profileId)
        .eq("read", false);

      return new Response(JSON.stringify({ ok: true, message: "All marked as read." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", profileId);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "Missing action." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error updating notification";
    console.error("[api/notifications] POST exception:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Could not update notifications." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getServiceClient(locals.env, "Delete notification");
    const userEmail = user.email.toLowerCase().trim();
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const notificationId = url.searchParams.get("id") || body.notificationId;

    if (!notificationId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing notification id." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let profileId: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile?.id) profileId = profile.id;
    else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      profileId = user.id;
    }

    if (!profileId) {
      return new Response(JSON.stringify({ ok: false, error: "Profile not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", profileId);

    if (error) {
      console.error("[api/notifications] Delete error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: "Could not delete the notification." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Notification deleted." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error deleting notification";
    console.error("[api/notifications] DELETE exception:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Could not delete the notification." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
