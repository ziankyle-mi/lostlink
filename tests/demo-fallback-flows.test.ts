import { describe, it, expect } from "vitest";
import { GET as itemsGet, POST as itemsPost } from "~/pages/api/items";
import { GET as claimsGet, POST as claimsPost } from "~/pages/api/claims";
import { GET as notifsGet } from "~/pages/api/notifications";
import { POST as adminActionsPost } from "~/pages/api/admin/actions";
import {
  DEFAULT_ANNOUNCEMENTS,
  DEMO_ANNOUNCEMENTS_COOKIE,
  parseDemoAnnouncements,
} from "~/data/demoAnnouncements";
import {
  DEMO_CLAIMS_COOKIE,
  DEMO_ITEMS_COOKIE,
  DEMO_NOTIFS_COOKIE,
  getMergedDemoItems,
} from "~/data/demoStore";
import { ACCESS_COOKIE } from "~/lib/auth";
import { readEnv } from "~/lib/env";

function cookieJar() {
  const jar = new Map<string, string>();
  return {
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
    jar,
  };
}

describe("demo/fallback end-to-end user & admin API flows", { timeout: 25000 }, () => {
  const rawEnv = readEnv();
  const env = {
    ...rawEnv,
    DEV_LOGIN_BYPASS: "false",
    PUBLIC_SUPABASE_URL: rawEnv.PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: rawEnv.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key",
  };

  const studentUser = {
    id: "dev:juan.reyes@dlsau.edu.ph",
    email: "juan.reyes@dlsau.edu.ph",
    role: "user" as const,
  };

  const adminUser = {
    id: "dev:dlsau.lostlink@dlsau.edu.ph",
    email: "dlsau.lostlink@dlsau.edu.ph",
    role: "admin" as const,
  };

  it("returns 200 items for student dev-token sessions on GET /api/items", async () => {
    const cookies = cookieJar();
    cookies.set(ACCESS_COOKIE, "dev-token-juan.reyes@dlsau.edu.ph");

    const res = await itemsGet({
      url: new URL("https://lostlink.local/api/items"),
      locals: { user: studentUser, env },
      cookies,
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("lets students submit lost reports and admins approve intake", async () => {
    const cookies = cookieJar();
    cookies.set(ACCESS_COOKIE, "dev-token-juan.reyes@dlsau.edu.ph");

    const createReq = new Request("https://lostlink.local/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "lost",
        name: "Calculator fx-991EX",
        category: "Books, Stationery & School Supplies",
        location: "Library, 2F",
        description: "Matte black Casio scientific calculator with white sticker on back cover.",
      }),
    });

    const createRes = await itemsPost({
      request: createReq,
      locals: { user: studentUser, env },
      cookies,
    } as any);
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    expect(createdBody.ok).toBe(true);
    expect(createdBody.item.status).toBe("pending");

    cookies.set(ACCESS_COOKIE, "dev-token-dlsau.lostlink@dlsau.edu.ph");
    const approveReq = new Request("https://lostlink.local/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "confirm_intake",
        itemId: createdBody.item.id,
      }),
    });
    const approveRes = await adminActionsPost({
      request: approveReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(approveRes.status).toBe(200);

    const merged = getMergedDemoItems(cookies.jar.get(DEMO_ITEMS_COOKIE));
    expect(merged.find((i) => i.id === createdBody.item.id)?.status).toBe("approved");
  });

  it("lets students submit claims on campus feed items and admins verify them", async () => {
    const cookies = cookieJar();
    cookies.set(ACCESS_COOKIE, "dev-token-juan.reyes@dlsau.edu.ph");

    const claimReq = new Request("https://lostlink.local/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: "item-1",
        proofDescription: "Black leather bifold wallet with initials JR and DLSAU library card inside.",
      }),
    });
    const claimRes = await claimsPost({
      request: claimReq,
      locals: { user: studentUser, env },
      cookies,
    } as any);
    expect(claimRes.status).toBe(201);
    const claimBody = await claimRes.json();
    expect(claimBody.ok).toBe(true);
    expect(cookies.jar.has(DEMO_CLAIMS_COOKIE)).toBe(true);

    const getClaimsRes = await claimsGet({
      locals: { user: studentUser, env },
      cookies,
    } as any);
    expect(getClaimsRes.status).toBe(200);
    const listBody = await getClaimsRes.json();
    expect(listBody.claims).toHaveLength(1);

    cookies.set(ACCESS_COOKIE, "dev-token-dlsau.lostlink@dlsau.edu.ph");
    const verifyReq = new Request("https://lostlink.local/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_claim",
        claimId: claimBody.claim.id,
      }),
    });
    const verifyRes = await adminActionsPost({
      request: verifyReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(verifyRes.status).toBe(200);

    const merged = getMergedDemoItems(cookies.jar.get(DEMO_ITEMS_COOKIE));
    expect(merged.find((i) => i.id === "item-1")?.status).toBe("claimed");

    cookies.set(ACCESS_COOKIE, "dev-token-juan.reyes@dlsau.edu.ph");
    const notifsRes = await notifsGet({
      locals: { user: studentUser, env },
      cookies,
    } as any);
    expect(notifsRes.status).toBe(200);
    const notifsBody = await notifsRes.json();
    expect(cookies.jar.has(DEMO_NOTIFS_COOKIE)).toBe(true);
    expect(notifsBody.unreadCount).toBeGreaterThan(0);
  });

  it("publishes, pauses, and deletes announcements in fallback admin sessions even when DEV_LOGIN_BYPASS=false", async () => {
    const cookies = cookieJar();
    cookies.set(ACCESS_COOKIE, "dev-token-dlsau.lostlink@dlsau.edu.ph");

    const createReq = new Request("https://lostlink.local/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_announcement",
        title: "Exam Week Custody Hours",
        message: "Security Office custody desk is open 7:30 AM to 6:00 PM this week.",
        priority: "important",
      }),
    });
    const createRes = await adminActionsPost({
      request: createReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    const annId = createData.announcement.id;

    const toggleReq = new Request("https://lostlink.local/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_announcement_status",
        announcementId: annId,
        active: false,
      }),
    });
    const toggleRes = await adminActionsPost({
      request: toggleReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(toggleRes.status).toBe(200);
    expect(parseDemoAnnouncements(cookies.jar.get(DEMO_ANNOUNCEMENTS_COOKIE))[0]?.active).toBe(false);

    const deleteReq = new Request("https://lostlink.local/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_announcement",
        announcementId: annId,
      }),
    });
    const deleteRes = await adminActionsPost({
      request: deleteReq,
      locals: { user: adminUser, env },
      cookies,
    } as any);
    expect(deleteRes.status).toBe(200);
    expect(parseDemoAnnouncements(cookies.jar.get(DEMO_ANNOUNCEMENTS_COOKIE))).toHaveLength(0);
    expect(DEFAULT_ANNOUNCEMENTS.length).toBeGreaterThan(0);
  });
});
