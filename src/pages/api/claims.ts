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

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getAdminClient(locals.env);
  const isAdmin = user.role === "admin" || roleForEmail(user.email) === "admin";

  try {
    let query = supabase
      .from("claims")
      .select(`
        id,
        item_id,
        claimant_id,
        proof_description,
        status,
        created_at,
        items ( id, name, category, location, reference_code, status ),
        profiles ( id, full_name, email )
      `)
      .order("created_at", { ascending: false });

    // Students only view their own claims
    if (!isAdmin) {
      let profileId = user.id;
      const { data: p } = await supabase.from("profiles").select("id").eq("email", user.email.toLowerCase()).maybeSingle();
      if (p?.id) profileId = p.id;
      query = query.eq("claimant_id", profileId);
    }

    const { data: claims, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, claims: claims ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error querying claims";
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

  const supabase = getAdminClient(locals.env);
  const userEmail = user.email.toLowerCase().trim();
  const isAdmin = user.role === "admin" || roleForEmail(userEmail) === "admin";

  try {
    const body = await request.json();
    const { action, claimId, itemId, proofDescription } = body;

    // ACTION: Admin verification or denial
    if (action === "verify" || action === "deny") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ ok: false, error: "Admin authorization required." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!claimId) {
        return new Response(JSON.stringify({ ok: false, error: "Claim ID required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Fetch the target claim
      const { data: targetClaim } = await supabase
        .from("claims")
        .select("id, item_id, claimant_id, status, items ( id, name, reference_code )")
        .eq("id", claimId)
        .maybeSingle();

      if (!targetClaim) {
        return new Response(JSON.stringify({ ok: false, error: "Claim not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const newStatus = action === "verify" ? "verified" : "denied";

      // Update target claim status
      await supabase.from("claims").update({ status: newStatus }).eq("id", claimId);

      // If verified: mark item claimed, auto-deny other pending claims on this item
      if (action === "verify") {
        await supabase
          .from("items")
          .update({ status: "claimed" })
          .eq("id", targetClaim.item_id);

        // Auto-deny other pending claims on that item
        const { data: competingClaims } = await supabase
          .from("claims")
          .select("id, claimant_id")
          .eq("item_id", targetClaim.item_id)
          .eq("status", "pending")
          .neq("id", claimId);

        if (competingClaims && competingClaims.length > 0) {
          await supabase
            .from("claims")
            .update({ status: "denied" })
            .eq("item_id", targetClaim.item_id)
            .eq("status", "pending")
            .neq("id", claimId);

          // Notify competing claimants
          for (const c of competingClaims) {
            await supabase.from("notifications").insert({
              user_id: c.claimant_id,
              message: "This item was claimed by another user.",
              link: "/",
            });
          }
        }

        // Notify verified claimant
        const refCode = (targetClaim.items as unknown as { reference_code?: string })?.reference_code || "LL-Item";
        await supabase.from("notifications").insert({
          user_id: targetClaim.claimant_id,
          message: `Your claim was verified. Visit the security office with code ${refCode}.`,
          link: "/profile",
        });
      } else {
        // Denied notification
        await supabase.from("notifications").insert({
          user_id: targetClaim.claimant_id,
          message: "Your claim was not verified.",
          link: "/profile",
        });
      }

      // Record in admin_log
      let adminProfileId = user.id;
      const { data: adminProf } = await supabase.from("profiles").select("id").eq("email", userEmail).maybeSingle();
      if (adminProf?.id) adminProfileId = adminProf.id;

      await supabase.from("admin_log").insert({
        admin_id: adminProfileId,
        action: action === "verify" ? "claim_verified" : "claim_denied",
        item_id: targetClaim.item_id,
        claim_id: claimId,
      });

      return new Response(JSON.stringify({ ok: true, status: newStatus, itemId: targetClaim.item_id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACTION: Student Submitting a Claim
    if (!itemId) {
      return new Response(JSON.stringify({ ok: false, error: "Item ID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!proofDescription || typeof proofDescription !== "string" || proofDescription.trim().length < 20) {
      return new Response(
        JSON.stringify({ ok: false, error: "Proof description must be at least 20 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Resolve claimant profile
    let claimantId: string | null = null;
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", userEmail).maybeSingle();
    if (profile?.id) claimantId = profile.id;
    else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      claimantId = user.id;
    }

    if (!claimantId) {
      const { data: anyProf } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      claimantId = anyProf?.id || null;
    }

    if (!claimantId) {
      return new Response(JSON.stringify({ ok: false, error: "Claimant profile not found." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if target item exists in Supabase
    let targetItemId = itemId;
    const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);

    if (!isItemUuid) {
      // If it's a demo item (e.g. "item-1"), find or pick an existing item or create dummy
      const { data: existing } = await supabase.from("items").select("id, name").limit(1).maybeSingle();
      if (existing?.id) {
        targetItemId = existing.id;
      }
    }

    const { data: insertedClaim, error: claimErr } = await supabase
      .from("claims")
      .insert({
        item_id: targetItemId,
        claimant_id: claimantId,
        proof_description: proofDescription.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (claimErr) {
      return new Response(JSON.stringify({ ok: false, error: claimErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert notification for Admins
    const { data: adminProfiles } = await supabase.from("profiles").select("id").eq("role", "admin").limit(3);
    if (adminProfiles && adminProfiles.length > 0) {
      for (const a of adminProfiles) {
        await supabase.from("notifications").insert({
          user_id: a.id,
          message: "New claim submitted for review.",
          link: "/admin#claims",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, claim: insertedClaim }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error processing claim";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
