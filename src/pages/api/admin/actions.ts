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

export const POST: APIRoute = async ({ request, locals }) => {
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
    return new Response(JSON.stringify({ ok: false, error: "Admin access required." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getAdminClient(locals.env);

  // Resolve admin profile ID
  let adminProfileId: string | null = null;
  const { data: adminProf } = await supabase.from("profiles").select("id").eq("email", userEmail).maybeSingle();
  if (adminProf?.id) {
    adminProfileId = adminProf.id;
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    adminProfileId = user.id;
  } else {
    const { data: anyProf } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
    adminProfileId = anyProf?.id ?? null;
  }

  try {
    const body = await request.json();
    const { action, itemId, claimId } = body;

    // ACTION: Confirm Intake (Move found item from pending to approved in DO custody)
    if (action === "confirm_intake") {
      if (!itemId) {
        return new Response(JSON.stringify({ ok: false, error: "Item ID required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
      if (!isItemUuid) {
        // Fallback demo intake item
        return new Response(JSON.stringify({ ok: true, message: "Item intake confirmed into custody." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: item } = await supabase.from("items").select("id, name, reporter_id, reference_code").eq("id", itemId).maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ ok: false, error: "Item not found in database." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase.from("items").update({ status: "approved" }).eq("id", itemId);

      if (adminProfileId) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: "intake_confirmed",
          item_id: itemId,
        });
      }

      if (item.reporter_id) {
        await supabase.from("notifications").insert({
          user_id: item.reporter_id,
          message: `Your found item report for "${item.name}" was confirmed in custody and is now public.`,
          link: "/",
        });
      }

      return new Response(JSON.stringify({ ok: true, message: "Item intake confirmed into custody." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Verify Claim
    if (action === "verify_claim") {
      if (!claimId) {
        return new Response(JSON.stringify({ ok: false, error: "Claim ID required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isClaimUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claimId);
      if (!isClaimUuid) {
        // Fallback demo claim item
        return new Response(JSON.stringify({ ok: true, status: "verified" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: claim } = await supabase
        .from("claims")
        .select("id, item_id, claimant_id, items ( name, reference_code )")
        .eq("id", claimId)
        .maybeSingle();

      if (!claim) {
        return new Response(JSON.stringify({ ok: false, error: "Claim not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase.from("claims").update({ status: "verified" }).eq("id", claimId);
      await supabase.from("items").update({ status: "claimed" }).eq("id", claim.item_id);

      // Auto-deny other pending claims on this item
      const { data: competing } = await supabase
        .from("claims")
        .select("id, claimant_id")
        .eq("item_id", claim.item_id)
        .eq("status", "pending")
        .neq("id", claimId);

      if (competing && competing.length > 0) {
        await supabase
          .from("claims")
          .update({ status: "denied" })
          .eq("item_id", claim.item_id)
          .eq("status", "pending")
          .neq("id", claimId);

        for (const c of competing) {
          await supabase.from("notifications").insert({
            user_id: c.claimant_id,
            message: "This item was claimed and verified for another claimant.",
            link: "/",
          });
        }
      }

      const refCode = (claim.items as unknown as { reference_code?: string })?.reference_code || "LL-Item";
      await supabase.from("notifications").insert({
        user_id: claim.claimant_id,
        message: `Your claim was verified! Visit the security office with reference code ${refCode} for handover.`,
        link: "/profile",
      });

      if (adminProfileId) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: "claim_verified",
          item_id: claim.item_id,
          claim_id: claimId,
        });
      }

      return new Response(JSON.stringify({ ok: true, status: "verified" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Deny Claim
    if (action === "deny_claim") {
      if (!claimId) {
        return new Response(JSON.stringify({ ok: false, error: "Claim ID required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isClaimUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claimId);
      if (!isClaimUuid) {
        // Fallback demo claim item
        return new Response(JSON.stringify({ ok: true, status: "denied" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: claim } = await supabase.from("claims").select("id, item_id, claimant_id").eq("id", claimId).maybeSingle();
      if (!claim) {
        return new Response(JSON.stringify({ ok: false, error: "Claim not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase.from("claims").update({ status: "denied" }).eq("id", claimId);

      await supabase.from("notifications").insert({
        user_id: claim.claimant_id,
        message: "Your ownership claim could not be verified by security staff.",
        link: "/profile",
      });

      if (adminProfileId) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: "claim_denied",
          item_id: claim.item_id,
          claim_id: claimId,
        });
      }

      return new Response(JSON.stringify({ ok: true, status: "denied" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Remove / Delete Post (Only for Admins)
    if (action === "remove_post" || action === "delete_item") {
      if (!itemId) {
        return new Response(JSON.stringify({ ok: false, error: "Item ID required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
      if (!isItemUuid) {
        // Fallback for mock demo items
        if (adminProfileId) {
          try {
            await supabase.from("admin_log").insert({
              admin_id: adminProfileId,
              action: `post_removed: demo item ${itemId}`,
            });
          } catch {
            // Ignore demo logging error
          }
        }
        return new Response(
          JSON.stringify({
            ok: true,
            status: "removed",
            itemId,
            message: "Post removed from campus feed.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data: item } = await supabase
        .from("items")
        .select("id, name, reporter_id, reference_code")
        .eq("id", itemId)
        .maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ ok: false, error: "Item not found in database." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 1. Remove or unlink references in admin_log to prevent foreign key errors
      await supabase.from("admin_log").delete().eq("item_id", itemId);

      // 2. Remove related claims
      await supabase.from("claims").delete().eq("item_id", itemId);

      // 3. Delete the item record (with fallback to status rejection if cascade is restricted)
      const { error: deleteError } = await supabase.from("items").delete().eq("id", itemId);
      if (deleteError) {
        await supabase
          .from("items")
          .update({ status: "rejected", reject_reason: "Removed by admin" })
          .eq("id", itemId);
      }

      // 4. Log the deletion in admin_log
      if (adminProfileId) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: `post_removed: ${item.name}`,
        });
      }

      // 5. Notify the reporter that the post was removed by DO
      if (item.reporter_id) {
        try {
          await supabase.from("notifications").insert({
            user_id: item.reporter_id,
            message: `Your report for "${item.name}" was removed by the Disciplinary Office.`,
            link: "/",
          });
        } catch (notifErr) {
          console.warn("[admin/actions] Notification note:", notifErr);
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
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown admin action." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error executing admin action";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
