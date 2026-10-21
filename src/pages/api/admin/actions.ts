import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/lib/env";

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

/** CSPRNG temporary password. Never Math.random(). */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Lk-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
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
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    return new Response(JSON.stringify({ ok: false, error: "Admin access required." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getAdminClient(locals.env);

  // Resolve the acting admin's real profile id for the audit trail. Never fall
  // back to an arbitrary profile: a wrong attribution poisons the audit log.
  let adminProfileId: string | null = null;
  if (UUID_RE.test(user.id)) {
    adminProfileId = user.id;
  } else {
    const { data: adminProf } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    adminProfileId = adminProf?.id ?? null;
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

      if (!UUID_RE.test(itemId)) {
        return new Response(JSON.stringify({ ok: false, error: "Item ID is invalid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: item } = await supabase.from("items").select("id, name, reporter_id, reference_code, status").eq("id", itemId).maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ ok: false, error: "Item not found in database." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (item.status !== "pending") {
        return new Response(JSON.stringify({ ok: false, error: "This report is not waiting for intake." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { error: intakeErr } = await supabase
        .from("items")
        .update({ status: "approved" })
        .eq("id", itemId)
        .eq("status", "pending");

      if (intakeErr) {
        console.error("[admin/actions] Intake error:", intakeErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Could not confirm intake." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

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

      if (!UUID_RE.test(claimId)) {
        return new Response(JSON.stringify({ ok: false, error: "Claim ID is invalid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: claim } = await supabase
        .from("claims")
        .select("id, item_id, claimant_id, status, items ( name, reference_code, status )")
        .eq("id", claimId)
        .maybeSingle();

      if (!claim) {
        return new Response(JSON.stringify({ ok: false, error: "Claim not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (claim.status !== "pending") {
        return new Response(JSON.stringify({ ok: false, error: "This claim was already decided." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const claimItem = claim.items as unknown as { status?: string } | null;
      if (claimItem?.status !== "approved") {
        return new Response(JSON.stringify({ ok: false, error: "This item is no longer available to claim." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { error: verifyErr } = await supabase
        .from("claims")
        .update({ status: "verified" })
        .eq("id", claimId)
        .eq("status", "pending");

      if (verifyErr) {
        console.error("[admin/actions] Verify error:", verifyErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Could not verify the claim." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("items")
        .update({ status: "claimed" })
        .eq("id", claim.item_id)
        .eq("status", "approved");

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

      if (!UUID_RE.test(claimId)) {
        return new Response(JSON.stringify({ ok: false, error: "Claim ID is invalid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: claim } = await supabase.from("claims").select("id, item_id, claimant_id, status").eq("id", claimId).maybeSingle();
      if (!claim) {
        return new Response(JSON.stringify({ ok: false, error: "Claim not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (claim.status !== "pending") {
        return new Response(JSON.stringify({ ok: false, error: "This claim was already decided." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase.from("claims").update({ status: "denied" }).eq("id", claimId).eq("status", "pending");

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

      if (!UUID_RE.test(itemId)) {
        return new Response(JSON.stringify({ ok: false, error: "Item ID is invalid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
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

      // Soft removal: keep claims and the audit trail intact.
      const { error: removeErr } = await supabase
        .from("items")
        .update({ status: "rejected", reject_reason: "Removed by admin" })
        .eq("id", itemId);

      if (removeErr) {
        console.error("[admin/actions] Remove error:", removeErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Could not remove the post." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
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

        // Mirror the app-level flag into Supabase Auth so a suspended user
        // cannot keep a direct Supabase session on another device.
        const { error: banErr } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: active ? "none" : "876000h",
        });
        if (banErr) {
          console.warn("[admin/actions] Auth status mirror failed:", banErr.message);
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

      if (!targetProfile?.id) {
        return new Response(JSON.stringify({ ok: false, error: "No account found for that email." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Shown once to the admin at the counter; never persisted in plaintext.
      const tempPassword = generateTempPassword();

      const { error: authErr } = await supabase.auth.admin.updateUserById(targetProfile.id, {
        password: tempPassword,
      });

      if (authErr) {
        console.error("[admin/actions] Password reset failed:", authErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Could not issue a temporary password." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Force the student to pick a new password on next sign-in.
      const { error: flagErr } = await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", targetProfile.id);

      if (flagErr) {
        console.error("[admin/actions] Reset flag failed:", flagErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Password changed but the reset flag failed." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase.from("notifications").insert({
        user_id: targetProfile.id,
        message: "The Security Office issued you a temporary password. Sign in with it, then set a new password.",
        link: "/reset-password",
        read: false,
      });

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

    // ACTION: Deactivate Account
    // Keeps the profile, claims, reports, and audit history intact. The
    // previous hard delete destroyed evidence and could cascade away claims.
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

      if (targetProfileId === user.id || (targetEmail && targetEmail.toLowerCase() === userEmail.toLowerCase())) {
        return new Response(JSON.stringify({ ok: false, error: "Administrators cannot deactivate their own active account." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!targetProfileId || !UUID_RE.test(targetProfileId)) {
        return new Response(JSON.stringify({ ok: false, error: "No matching account found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 1. Audit first, so the action is recorded even if a later call fails.
      if (adminProfileId) {
        const { error: auditErr } = await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: `user_deactivated: ${targetEmail || targetProfileId}`,
        });
        if (auditErr) console.error("[admin/actions] Audit log failed:", auditErr.message);
      }

      // 2. Block the app session and any direct Supabase session.
      const { error: statusErr } = await supabase
        .from("profiles")
        .update({ active: false })
        .eq("id", targetProfileId);
      if (statusErr) {
        console.error("[admin/actions] Deactivate profile failed:", statusErr.message);
        return new Response(JSON.stringify({ ok: false, error: "Could not deactivate the account." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { error: banErr } = await supabase.auth.admin.updateUserById(targetProfileId, {
        ban_duration: "876000h",
      });
      if (banErr) {
        // The app-level `active=false` check still blocks this account, so
        // report success but surface the weaker auth-layer state in logs.
        console.warn("[admin/actions] Auth ban failed:", banErr.message);
      }

      return new Response(JSON.stringify({
        ok: true,
        userId: targetProfileId,
        email: targetEmail,
        message: `Account ${targetEmail || targetProfileId} has been deactivated. Records and claims were preserved.`,
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
    console.error("[admin/actions] Exception:", err);
    return new Response(JSON.stringify({ ok: false, error: "Could not complete the admin action." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
