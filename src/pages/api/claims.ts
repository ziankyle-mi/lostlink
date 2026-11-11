import type { APIRoute, AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isRateLimitedDurable, recordFailedAttemptDurable } from "~/lib/rateLimit";
import {
  getServiceClient,
  getUserClient,
  isFallbackUser,
  isHostInUnreachableCooldown,
} from "~/lib/supabase";
import { ACCESS_COOKIE } from "~/lib/auth";
import { devBypassEnabled, sessionCookieOptions } from "~/lib/session";
import {
  DEMO_CLAIMS_COOKIE,
  DEMO_ITEMS_COOKIE,
  DEMO_NOTIFS_COOKIE,
  appendDemoNotification,
  getMergedDemoItems,
  isDemoClaimId,
  isDemoItemId,
  parseDemoClaims,
  parseDemoItemState,
  serializeDemoClaims,
  serializeDemoItemState,
} from "~/data/demoStore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function shouldUseDemoStore(
  user: { id: string } | null | undefined,
  cookies: AstroCookies | undefined,
  env: import("~/lib/env").Env,
): boolean {
  const accessToken = cookies?.get(ACCESS_COOKIE)?.value;
  return (
    devBypassEnabled(env) ||
    isFallbackUser(user, accessToken) ||
    isHostInUnreachableCooldown(env.PUBLIC_SUPABASE_URL)
  );
}

async function resolveProfileId(
  supabase: SupabaseClient,
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

export const GET: APIRoute = async ({ locals, cookies }) => {
  const user = locals.user;
  if (!user) return json({ ok: false, error: "Authentication required." }, 401);

  try {
    const isAdmin = user.role === "admin";
    const userEmail = user.email.toLowerCase().trim();
    const accessToken = cookies?.get(ACCESS_COOKIE)?.value;

    if (shouldUseDemoStore(user, cookies, locals.env)) {
      const demoClaims = parseDemoClaims(cookies?.get(DEMO_CLAIMS_COOKIE)?.value);
      const filtered = isAdmin
        ? demoClaims
        : demoClaims.filter((c) => c.claimantEmail.toLowerCase().trim() === userEmail);
      const claims = filtered.map((c) => ({
        id: c.id,
        item_id: c.itemId,
        proof_description: c.proofDescription,
        status: c.status,
        created_at: c.createdAt,
        items: {
          id: c.itemId,
          name: c.itemName,
          location: c.itemLocation ?? "Campus",
          reference_code: isAdmin ? c.itemReferenceCode ?? null : null,
        },
        profiles: { full_name: c.claimantEmail.split("@")[0], email: c.claimantEmail },
      }));
      return json({ ok: true, claims, demo: true });
    }

    // Non-admins with a real JWT query via user client to enforce Postgres RLS.
    const supabase =
      !isAdmin && accessToken && !accessToken.startsWith("dev-token-")
        ? getUserClient(locals.env, accessToken)
        : getServiceClient(locals.env, isAdmin ? "Admin view claims" : "Fallback claims query");


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

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const user = locals.user;
  if (!user) return json({ ok: false, error: "Authentication required." }, 401);

  const userEmail = user.email.toLowerCase().trim();
  const isAdmin = user.role === "admin";
  const demoActive = shouldUseDemoStore(user, cookies, locals.env);
  const supabase = demoActive
    ? null
    : getServiceClient(locals.env, "Claim mutations (withdraw, verify, submit)");

  try {
    const body = await request.json();
    const { action, claimId, itemId, proofDescription } = body;

    // ACTION: Student withdraws their own pending claim
    if (action === "withdraw") {
      if (!claimId || (!UUID_RE.test(claimId) && !isDemoClaimId(claimId))) {
        return json({ ok: false, error: "Claim ID required." }, 400);
      }

      if (isDemoClaimId(claimId) && demoActive) {
        const claims = parseDemoClaims(cookies?.get(DEMO_CLAIMS_COOKIE)?.value);
        const idx = claims.findIndex(
          (c) => c.id === claimId && c.claimantEmail.toLowerCase().trim() === userEmail,
        );
        if (idx === -1) return json({ ok: false, error: "Claim not found." }, 404);
        if (claims[idx].status !== "pending") {
          return json({ ok: false, error: "Only a pending claim can be withdrawn." }, 400);
        }
        claims[idx] = { ...claims[idx], status: "withdrawn" };
        cookies?.set(DEMO_CLAIMS_COOKIE, serializeDemoClaims(claims), sessionCookieOptions(60 * 60 * 24 * 7));
        return json({ ok: true, status: "withdrawn", demo: true });
      }

      if (!supabase) return json({ ok: false, error: "Claim not found." }, 404);
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
      if (!claimId || (!UUID_RE.test(claimId) && !isDemoClaimId(claimId))) {
        return json({ ok: false, error: "Claim ID required." }, 400);
      }

      if (isDemoClaimId(claimId) && demoActive) {
        const claims = parseDemoClaims(cookies?.get(DEMO_CLAIMS_COOKIE)?.value);
        const idx = claims.findIndex((c) => c.id === claimId);
        if (idx === -1) return json({ ok: false, error: "Claim not found." }, 404);
        const target = claims[idx];
        if (target.status !== "pending") {
          return json({ ok: false, error: "This claim was already decided." }, 409);
        }

        const itemState = parseDemoItemState(cookies?.get(DEMO_ITEMS_COOKIE)?.value);
        const mergedItems = getMergedDemoItems(cookies?.get(DEMO_ITEMS_COOKIE)?.value);
        const targetItem = mergedItems.find((i) => i.id === target.itemId);
        if (action === "verify" && targetItem?.status !== "approved") {
          return json({ ok: false, error: "This item is no longer available to claim." }, 409);
        }

        const newStatus = action === "verify" ? "verified" : "denied";
        let updatedClaims = claims.map((c) =>
          c.id === claimId ? { ...c, status: newStatus as "verified" | "denied" } : c,
        );

        let notifCookie = cookies?.get(DEMO_NOTIFS_COOKIE)?.value;
        if (action === "verify") {
          itemState.statuses[target.itemId] = { status: "claimed" };
          cookies?.set(DEMO_ITEMS_COOKIE, serializeDemoItemState(itemState), sessionCookieOptions(60 * 60 * 24 * 7));
          updatedClaims = updatedClaims.map((c) => {
            if (c.itemId === target.itemId && c.id !== claimId && c.status === "pending") {
              notifCookie = appendDemoNotification(notifCookie, {
                userEmail: c.claimantEmail,
                message: `Your claim for "${target.itemName}" was closed because another claim was verified.`,
                link: "/profile",
              });
              return { ...c, status: "denied" };
            }
            return c;
          });
          const refCode = targetItem?.referenceCode ?? target.itemReferenceCode ?? "N/A";
          notifCookie = appendDemoNotification(notifCookie, {
            userEmail: target.claimantEmail,
            message: `Your claim was verified. Visit the Security Office with code ${refCode}.`,
            link: "/profile",
          });
        } else {
          notifCookie = appendDemoNotification(notifCookie, {
            userEmail: target.claimantEmail,
            message: `Your claim for "${target.itemName}" was not verified.`,
            link: "/profile",
          });
        }

        cookies?.set(DEMO_CLAIMS_COOKIE, serializeDemoClaims(updatedClaims), sessionCookieOptions(60 * 60 * 24 * 7));
        if (notifCookie) {
          cookies?.set(DEMO_NOTIFS_COOKIE, notifCookie, sessionCookieOptions(60 * 60 * 24 * 7));
        }

        return json({ ok: true, status: newStatus, itemId: target.itemId, demo: true });
      }

      if (!supabase) return json({ ok: false, error: "Claim not found." }, 404);
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

      const { data: decidedClaims, error: claimErr } = await supabase
        .from("claims")
        .update({ status: newStatus })
        .eq("id", claimId)
        .eq("status", "pending")
        .select("id");

      if (claimErr) {
        console.error("[api/claims] Decision error:", claimErr.message);
        return json({ ok: false, error: "Could not update the claim." }, 500);
      }

      if (!decidedClaims || decidedClaims.length === 0) {
        return json({ ok: false, error: "This claim was already decided." }, 409);
      }

      if (action === "verify") {
        // If another admin verified a competing claim first, put this claim
        // back so no one is told to collect an item that is already gone.
        const { data: claimedItems, error: itemClaimErr } = await supabase
          .from("items")
          .update({ status: "claimed" })
          .eq("id", targetClaim.item_id)
          .eq("status", "approved")
          .select("id");

        if (itemClaimErr || !claimedItems || claimedItems.length === 0) {
          console.error("[api/claims] Item claim error:", itemClaimErr?.message ?? "no matching approved item");
          await supabase
            .from("claims")
            .update({ status: "pending" })
            .eq("id", claimId)
            .eq("status", "verified");
          return json({ ok: false, error: "This item is no longer available to claim." }, 409);
        }

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
    const allowDemoItem = demoActive && typeof itemId === "string" && isDemoItemId(itemId);
    if (!itemId || typeof itemId !== "string" || (!UUID_RE.test(itemId) && !allowDemoItem)) {
      return json({ ok: false, error: "A valid item ID is required." }, 400);
    }
    if (!proofDescription || typeof proofDescription !== "string" || proofDescription.trim().length < 20) {
      return json({ ok: false, error: "Proof description must be at least 20 characters." }, 400);
    }
    if (isAdmin) {
      return json({ ok: false, error: "Administrators cannot submit claims." }, 403);
    }

    const claimKey = `claim:user:${user.id}`;
    const claimLimit = await isRateLimitedDurable(locals.env, claimKey);
    if (claimLimit.isBlocked) {
      const mins = Math.max(1, Math.ceil(claimLimit.remainingSeconds / 60));
      return json({ ok: false, error: `Too many claims submitted. Please wait ${mins} minute(s).` }, 429);
    }
    await recordFailedAttemptDurable(locals.env, claimKey, {
      maxFailures: 10,
      lockoutDurationMs: 60 * 60 * 1000,
    });

    if (allowDemoItem || demoActive) {
      const mergedItems = getMergedDemoItems(cookies?.get(DEMO_ITEMS_COOKIE)?.value);
      const item = mergedItems.find((i) => i.id === itemId);
      if (!item || item.type !== "found") {
        return json({ ok: false, error: "That item cannot be claimed." }, 400);
      }
      if (item.status !== "approved") {
        return json({ ok: false, error: "That item is not available to claim." }, 400);
      }
      if (item.reporterEmail.toLowerCase().trim() === userEmail) {
        return json({ ok: false, error: "You cannot claim an item you reported." }, 400);
      }

      const existingClaims = parseDemoClaims(cookies?.get(DEMO_CLAIMS_COOKIE)?.value);
      const duplicate = existingClaims.some(
        (c) =>
          c.itemId === itemId &&
          c.claimantEmail.toLowerCase().trim() === userEmail &&
          (c.status === "pending" || c.status === "verified"),
      );
      if (duplicate) {
        return json({ ok: false, error: "You already have an open claim for this item." }, 409);
      }

      const newClaim = {
        id: `demo-claim-${crypto.randomUUID().slice(0, 8)}`,
        itemId,
        itemName: item.name,
        itemReferenceCode: item.referenceCode,
        itemLocation: item.location,
        claimantEmail: userEmail,
        proofDescription: proofDescription.trim(),
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      cookies?.set(
        DEMO_CLAIMS_COOKIE,
        serializeDemoClaims([newClaim, ...existingClaims]),
        sessionCookieOptions(60 * 60 * 24 * 7),
      );
      cookies?.set(
        DEMO_NOTIFS_COOKIE,
        appendDemoNotification(cookies?.get(DEMO_NOTIFS_COOKIE)?.value, {
          userEmail,
          message: `Your verification claim for "${item.name}" was submitted to the Security Office.`,
          link: "/profile",
        }),
        sessionCookieOptions(60 * 60 * 24 * 7),
      );

      return json(
        {
          ok: true,
          demo: true,
          claim: {
            id: newClaim.id,
            item_id: newClaim.itemId,
            status: newClaim.status,
            created_at: newClaim.createdAt,
          },
        },
        201,
      );
    }

    if (!supabase) {
      return json({ ok: false, error: "Your account profile is missing. Contact the Security Office." }, 400);
    }

    const claimantId = await resolveProfileId(supabase, user.id, userEmail);
    if (!claimantId) {
      return json({ ok: false, error: "Your account profile is missing. Contact the Security Office." }, 400);
    }

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
        adminProfiles.map((a: { id: string }) => ({
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
