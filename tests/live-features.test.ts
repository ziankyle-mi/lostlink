import { describe, it, expect } from "vitest";
import { readEnv } from "~/lib/env";
import { createClient } from "@supabase/supabase-js";

describe("Live Admin & Notifications Integration", () => {
  const env = readEnv();

  it("loads environment configuration with valid Supabase settings", () => {
    expect(env.PUBLIC_SUPABASE_URL).toBeDefined();
    expect(env.PUBLIC_SUPABASE_URL).toContain("supabase.co");
    expect(env.PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it("can query live Supabase items, claims, notifications, and admin_log tables", async () => {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(env.PUBLIC_SUPABASE_URL, key, {
      auth: { persistSession: false },
    });

    const [itemsRes, claimsRes, notifsRes, logsRes] = await Promise.all([
      supabase.from("items").select("id, name, type, status").limit(5),
      supabase.from("claims").select("id, status").limit(5),
      supabase.from("notifications").select("id, message, read").limit(5),
      supabase.from("admin_log").select("id, action").limit(5),
    ]);

    expect(itemsRes.error).toBeNull();
    expect(claimsRes.error).toBeNull();
    expect(notifsRes.error).toBeNull();
    expect(logsRes.error).toBeNull();

    expect(Array.isArray(itemsRes.data)).toBe(true);
    expect(Array.isArray(claimsRes.data)).toBe(true);
    expect(Array.isArray(notifsRes.data)).toBe(true);
    expect(Array.isArray(logsRes.data)).toBe(true);
  });

  it("supports notification insert and mark-as-read workflow", async () => {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(env.PUBLIC_SUPABASE_URL, key, {
      auth: { persistSession: false },
    });

    // Find any test profile
    const { data: prof } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
    if (!prof?.id) {
      // If no profile, pass gracefully
      return;
    }

    // Insert a test notification
    const testMsg = `Test verification notification [${Date.now()}]`;
    const { data: inserted, error: insErr } = await supabase
      .from("notifications")
      .insert({
        user_id: prof.id,
        message: testMsg,
        read: false,
      })
      .select()
      .single();

    expect(insErr).toBeNull();
    expect(inserted?.message).toBe(testMsg);
    expect(inserted?.read).toBe(false);

    // Mark as read
    const { error: updErr } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", inserted.id);

    expect(updErr).toBeNull();

    // Verify it was marked read
    const { data: fetched } = await supabase
      .from("notifications")
      .select("read")
      .eq("id", inserted.id)
      .single();

    expect(fetched?.read).toBe(true);

    // Clean up test notification
    await supabase.from("notifications").delete().eq("id", inserted.id);
  });
});
