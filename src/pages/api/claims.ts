import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/lib/env";
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function resolveProfileId(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
  email: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (data?.id) return data.id;
  return UUID_RE.test(userId) ? userId : null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json({ ok: false, error: "Authentication required." }, 401);

  try {
    const supabase = getAdminClient(locals.env);
    const isAdmin = user.role === "admin";

    let query = supabase
      .from("claims")
      .select(
        `
        id,
        item_id,
        claimant_id,
        proof_description,
        status,
        created_at,
        items ( id, name, category, location, reference_code, status ),
        profiles ( id, full_name, email )
      `,
      )
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      const profileId = await resolveProfileId(supabase, user.id, user.email);
      if (!profileId) return json({ ok: true, claims: [] });
      query = query.eq("claimant_id", profileId);
    }

    const { data: claims, error } = await query;
    if (error) {
      console.error("[api/claims] Query error:", error.message);
      return json({ ok: false, error: "Could not load claims." }, 500);
    }

    return json({ ok: true, claims: claims ?? [] });
  } catch (err) {
    console.error("[api/claims] Exception:", err);
    return json({ ok: false, error: "Could not load claims." }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ ok: false, error: "Authentication required." }, 401);

  const supabase = getAdminClient(locals.env);
  const userEmail = user.email.toLowerCase().trim();
  const isAdmin = user.role === "admin";

  try {
    const body = await request.json();
    const { action, claimId, itemId, proofDescription } = body;

    // ACTION: Student withdraws their own pending claim
    if (action === "withdraw") {
      if (!claimId || !UUID_RE.test(claimId)) {
        return json({ ok: false, error: "Claim ID required." }, 400);
      }
      const claimantId = await resolveProfileId(supabase, user.id, userEmail);
      if (!claimantId) return json({ ok: false, error: "Claim not found." }, 404);

      const { data: claim } = await supabase
        .from("claims")
        .select("id, claimant_id, status")
        .eq("id", claimId)
        .maybeSingle();

      if (!claim || claim.claimant_id !== claimantId) {
        return json({ ok: false, error: "Claim not found." }, 404);
      }
      if (claim.status !== "pending") {
        return json({ ok: false, error: "Only a pending claim can be withdrawn." }, 400);
      }

      const { error } = await supabase
        .from("claims")
        .update({ status: "withdrawn" })
        .eq("id", claimId)
        .eq("status", "pending");

      if (error) {
        console.error("[api/claims] Withdraw error:", error.message);
        return json({ ok: false, error: "Could not withdraw the claim." }, 500);
      }
      return json({ ok: true, status: "withdrawn" });
    }

    // ACTION: Admin verification or denial
    if (action === "verify" || action === "deny") {
      if (!isAdmin) {
        return json({ ok: false, error: "Admin authorization required." }, 403);
      }
      if (!claimId || !UUID_RE.test(claimId)) {
        return json({ ok: false, error: "Claim ID required." }, 400);
      }

      const { data: targetClaim } = await supabase
        .from("claims")
        .select("id, item_id, claimant_id, status, items ( id, name, reference_code, status )")
        .eq("id", claimId)
        .maybeSingle();

      if (!targetClaim) return json({ ok: false, error: "Claim not found." }, 404);
      if (targetClaim.status !== "pending") {
        return json({ ok: false, error: "This claim was already decided." }, 409);
      }

      const item = targetClaim.items as unknown as {
        id: string;
        name: string;
        reference_code?: string;
        status?: string;
      } | null;

      if (action === "verify" && item?.status !== "approved") {
        return json({ ok: false, error: "This item is no longer available to claim." }, 409);
      }

      const newStatus = action === "verify" ? "verified" : "denied";

      const { error: claimErr } = await supabase
        .from("claims")
        .update({ status: newStatus })
        .eq("id", claimId)
        .eq("status", "pending");

      if (claimErr) {
        console.error("[api/claims] Decision error:", claimErr.message);
        return json({ ok: false, error: "Could not update the claim." }, 500);
      }

      if (action === "verify") {
        await supabase
          .from("items")
          .update({ status: "claimed" })
          .eq("id", targetClaim.item_id)
          .eq("status", "approved");

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

          for (const c of competingClaims) {
            await supabase.from("notifications").insert({
              user_id: c.claimant_id,
              message: "This item was claimed by another user.",
              link: "/",
            });
          }
        }

        const refCode = item?.reference_code || "LL-Item";
        await supabase.from("notifications").insert({
          user_id: targetClaim.claimant_id,
          message: `Your claim was verified. Visit the Security Office with code ${refCode}.`,
          link: "/profile",
        });
      } else {
        await supabase.from("notifications").insert({
          user_id: targetClaim.claimant_id,
          message: "Your claim was not verified.",
          link: "/profile",
        });
      }

      const adminProfileId =
        (await resolveProfileId(supabase, user.id, userEmail)) ??
        (UUID_RE.test(user.id) ? user.id : null);
      if (adminProfileId) {
        await supabase.from("admin_log").insert({
          admin_id: adminProfileId,
          action: action === "verify" ? "claim_verified" : "claim_denied",
          item_id: targetClaim.item_id,
          claim_id: claimId,
        });
      }

      return json({ ok: true, status: newStatus, itemId: targetClaim.item_id });
    }

    // ACTION: Student submitting a claim
    if (!itemId || typeof itemId !== "string" || !UUID_RE.test(itemId)) {
      return json({ ok: false, error: "A valid item ID is required." }, 400);
    }
    if (!proofDescription || typeof proofDescription !== "string" || proofDescription.trim().length < 20) {
      return json({ ok: false, error: "Proof description must be at least 20 characters." }, 400);
    }
    if (isAdmin) {
      return json({ ok: false, error: "Administrators cannot submit claims." }, 403);
    }

    const claimantId = await resolveProfileId(supabase, user.id, userEmail);
    if (!claimantId) {
      return json({ ok: false, error: "Your account profile is missing. Contact the Security Office." }, 400);
    }

    const claimKey = `claim:user:${claimantId}`;
    const claimLimit = await isRateLimitedDurable(locals.env, claimKey);
    if (claimLimit.isBlocked) {
      const mins = Math.max(1, Math.ceil(claimLimit.remainingSeconds / 60));
      return json({ ok: false, error: `Too many claims submitted. Please wait ${mins} minute(s).` }, 429);
    }
    await recordFailedAttemptDurable(locals.env, claimKey, {
      maxFailures: 10,
      lockoutDurationMs: 60 * 60 * 1000,
    });

    // The claim rules live on the server, not only in the UI copy.
    const { data: item } = await supabase
      .from("items")
      .select("id, type, status, reporter_id, name")
      .eq("id", itemId)
      .maybeSingle();

    if (!item || item.type !== "found") {
      return json({ ok: false, error: "That item cannot be claimed." }, 400);
    }
    if (item.status !== "approved") {
      return json({ ok: false, error: "That item is not available to claim." }, 400);
    }
    if (item.reporter_id === claimantId) {
      return json({ ok: false, error: "You cannot claim an item you reported." }, 400);
    }

    const { data: existingClaim } = await supabase
      .from("claims")
      .select("id")
      .eq("item_id", itemId)
      .eq("claimant_id", claimantId)
      .in("status", ["pending", "verified"])
      .maybeSingle();

    if (existingClaim) {
      return json({ ok: false, error: "You already have an open claim for this item." }, 409);
    }

    const { data: insertedClaim, error: claimErr } = await supabase
      .from("claims")
      .insert({
        item_id: itemId,
        claimant_id: claimantId,
        proof_description: proofDescription.trim(),
        status: "pending",
      })
      .select("id, item_id, status, created_at")
      .single();

    if (claimErr) {
      console.error("[api/claims] Insert error:", claimErr.message);
      return json({ ok: false, error: "Could not submit the claim. Try again." }, 500);
    }

    // Notify every active admin, not an arbitrary subset.
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);

    if (adminProfiles && adminProfiles.length > 0) {
      await supabase.from("notifications").insert(
        adminProfiles.map((a) => ({
          user_id: a.id,
          message: `New claim submitted for "${item.name}".`,
          link: "/admin?tab=claims",
          read: false,
        })),
      );
    }

    return json({ ok: true, claim: insertedClaim }, 201);
  } catch (err) {
    console.error("[api/claims] Exception:", err);
    return json({ ok: false, error: "Could not process the claim." }, 500);
  }
};
