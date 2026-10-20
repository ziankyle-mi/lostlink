import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/lib/env";
import { roleForEmail } from "~/lib/session";
import { INITIAL_CAMPUS_USERS } from "~/data/mockUsers";

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
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    adminProfileId = user.id;
  } else {
    const { data: adminProf } = await supabase.from("profiles").select("id").eq("email", userEmail).maybeSingle();
    if (adminProf?.id) {
      adminProfileId = adminProf.id;
    } else {
      const { data: anyProf } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      adminProfileId = anyProf?.id ?? null;
    }
  }

  try {
    const body = await request.json();
    const { action, itemId, claimId, userId, newRole, active, email } = body;

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
        // Fallback demo claim item: map demo claims to item IDs
        const demoClaimToItem: Record<string, string> = {
          "claim-1": "item-1",
          "claim-2": "item-2",
          "claim-3": "item-3",
          "claim-4": "item-4",
          "claim-5": "item-5",
        };
        const mappedItemId = demoClaimToItem[claimId] || null;
        return new Response(JSON.stringify({ ok: true, status: "verified", itemId: mappedItemId }), {
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

      return new Response(JSON.stringify({ ok: true, status: "verified", itemId: claim.item_id }), {
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

    // ACTION: Toggle User Role (Student <-> Admin)
    if (action === "toggle_user_role") {
      if (!userId || !newRole || !["admin", "user"].includes(newRole)) {
        return new Response(JSON.stringify({ ok: false, error: "Valid User ID and target role ('admin' | 'user') required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Query target user profile if email not already provided
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let targetEmail = email ? String(email).toLowerCase().trim() : "";
      if (!targetEmail && isUuid) {
        const { data: targetProf } = await supabase.from("profiles").select("id, email, role").eq("id", userId).maybeSingle();
        targetEmail = targetProf?.email?.toLowerCase().trim() || "";
      }

      // Guard: Prevent self-demotion from admin
      if ((targetEmail === userEmail || userId === adminProfileId) && newRole === "user") {
        return new Response(JSON.stringify({ ok: false, error: "You cannot demote your own administrator account." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (isUuid) {
        const { error: updateErr } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
        if (updateErr) {
          return new Response(JSON.stringify({ ok: false, error: updateErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else if (targetEmail) {
        const { error: updateErr } = await supabase.from("profiles").update({ role: newRole }).eq("email", targetEmail);
        if (updateErr) {
          console.warn("[admin/actions] Profile role update by email note:", updateErr.message);
        }
      }

      if (adminProfileId) {
        try {
          await supabase.from("admin_log").insert({
            admin_id: adminProfileId,
            action: `role_updated: ${targetEmail || userId} set to ${newRole}`,
          });
        } catch (logErr) {
          console.warn("[admin/actions] Log warning:", logErr);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        userId,
        newRole,
        message: `User role successfully updated to ${newRole === "admin" ? "Administrator" : "Student"}.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Toggle User Status (Active <-> Suspended)
    if (action === "toggle_user_status") {
      if (!userId || typeof active !== "boolean") {
        return new Response(JSON.stringify({ ok: false, error: "User ID and boolean status required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Query target user profile if email not already provided
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let targetEmail = email ? String(email).toLowerCase().trim() : "";
      if (!targetEmail && isUuid) {
        const { data: targetProf } = await supabase.from("profiles").select("id, email").eq("id", userId).maybeSingle();
        targetEmail = targetProf?.email?.toLowerCase().trim() || "";
      }

      // Guard: Prevent self-suspension
      if ((targetEmail === userEmail || userId === adminProfileId) && !active) {
        return new Response(JSON.stringify({ ok: false, error: "You cannot suspend your own administrator account." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (isUuid) {
        const { error: statusErr } = await supabase.from("profiles").update({ active }).eq("id", userId);
        if (statusErr) {
          return new Response(JSON.stringify({ ok: false, error: statusErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (adminProfileId) {
        try {
          await supabase.from("admin_log").insert({
            admin_id: adminProfileId,
            action: `status_updated: ${targetEmail || userId} set to ${active ? "active" : "suspended"}`,
          });
        } catch (logErr) {
          console.warn("[admin/actions] Log warning:", logErr);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        userId,
        active,
        message: `User account is now ${active ? "active" : "suspended"}.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Issue temporary password (office-verified recovery; no email)
    if (action === "reset_user_password") {
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return new Response(JSON.stringify({ ok: false, error: "Valid email address required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const cleanEmail = email.toLowerCase().trim();

      // profiles.id references auth.users, so it is also the auth user id.
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("email", cleanEmail)
        .maybeSingle();

      const isKnownCampusEmail =
        cleanEmail.endsWith("@dlsau.edu.ph") ||
        INITIAL_CAMPUS_USERS.some((u) => u.email.toLowerCase() === cleanEmail);

      if (!targetProfile?.id && !isKnownCampusEmail) {
        return new Response(JSON.stringify({ ok: false, error: "No account found for that email." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Temp password the student reads off the office screen / notification.
      const tempPassword = `Reset-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (targetProfile?.id) {
        try {
          await supabase.auth.admin.updateUserById(targetProfile.id, {
            password: tempPassword,
          });
        } catch (authErr: any) {
          console.warn("[admin/actions] updateUserById note:", authErr?.message || authErr);
        }

        // Force the student to pick a new password on next sign-in.
        await supabase.from("profiles").update({ must_change_password: true }).eq("id", targetProfile.id);

        try {
          await supabase.from("notifications").insert({
            user_id: targetProfile.id,
            message: `Recovery approved. Sign in with temporary password ${tempPassword}, then set a new password.`,
            link: "/reset-password",
            read: false,
          });
        } catch (notifErr) {
          console.warn("[admin/actions] Notification insert error:", notifErr);
        }
      }

      if (adminProfileId) {
        try {
          await supabase.from("admin_log").insert({
            admin_id: adminProfileId,
            action: `temp_password_issued: ${cleanEmail}`,
          });
        } catch (logErr) {
          console.warn("[admin/actions] Log warning:", logErr);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        email: cleanEmail,
        tempPassword,
        message: `Temporary password issued for ${cleanEmail}.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Delete / Remove Account
    if (action === "delete_user") {
      if (!userId && !email) {
        return new Response(JSON.stringify({ ok: false, error: "User ID or email required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      let targetProfileId = userId;
      let targetEmail = email;

      if (!targetProfileId && targetEmail) {
        const { data: p } = await supabase.from("profiles").select("id, email").eq("email", targetEmail.toLowerCase().trim()).maybeSingle();
        targetProfileId = p?.id;
      } else if (targetProfileId && !targetEmail) {
        const { data: p } = await supabase.from("profiles").select("id, email").eq("id", targetProfileId).maybeSingle();
        targetEmail = p?.email;
      }

      // Prevent self-deletion of current acting admin account
      if ((targetProfileId && targetProfileId === user.id) || (targetEmail && targetEmail.toLowerCase() === userEmail.toLowerCase())) {
        return new Response(JSON.stringify({ ok: false, error: "Administrators cannot delete their own active account." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 1. Delete associated claims
      if (targetProfileId) {
        await supabase.from("claims").delete().eq("claimant_id", targetProfileId);
      }

      // 2. Delete auth user (cascades to profiles)
      if (targetProfileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetProfileId)) {
        try {
          await supabase.auth.admin.deleteUser(targetProfileId);
        } catch (e) {
          console.warn("[admin/actions] auth.admin.deleteUser note:", e);
        }
      }

      // Fallback: Delete from profiles directly
      if (targetProfileId) {
        await supabase.from("profiles").delete().eq("id", targetProfileId);
      } else if (targetEmail) {
        await supabase.from("profiles").delete().eq("email", targetEmail.toLowerCase().trim());
      }

      // 3. Log to admin_log
      if (adminProfileId) {
        try {
          await supabase.from("admin_log").insert({
            admin_id: adminProfileId,
            action: `user_deleted: ${targetEmail || targetProfileId}`,
          });
        } catch (logErr) {
          console.warn("[admin/actions] Delete log note:", logErr);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        userId: targetProfileId,
        email: targetEmail,
        message: `Account ${targetEmail || targetProfileId} has been successfully removed from campus records.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
