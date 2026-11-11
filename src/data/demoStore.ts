import { ALL_ITEMS, type DashboardItem } from "./mockItems";

export const DEMO_ITEMS_COOKIE = "ll_demo_items";
export const DEMO_CLAIMS_COOKIE = "ll_demo_claims";
export const DEMO_NOTIFS_COOKIE = "ll_demo_notifs";

export type DemoItemStatus = "pending" | "approved" | "claimed" | "resolved" | "rejected";
export type DemoClaimStatus = "pending" | "verified" | "denied" | "withdrawn";

export interface DemoItemStatePayload {
  added: StoredDemoItem[];
  statuses: Record<string, { status: DemoItemStatus; rejectReason?: string }>;
}

export interface StoredDemoItem {
  id: string;
  type: "found" | "lost";
  name: string;
  category: DashboardItem["category"];
  location: string;
  eventDate: string;
  description: string;
  referenceCode: string;
  status: DemoItemStatus;
  reporterEmail: string;
  createdAt: string;
  photoUrl?: string;
}

export interface MergedDemoItem extends DashboardItem {
  status: DemoItemStatus;
  reporterEmail: string;
  createdAt: string;
  rejectReason?: string;
}

export interface StoredDemoClaim {
  id: string;
  itemId: string;
  itemName: string;
  itemReferenceCode?: string;
  itemLocation?: string;
  claimantEmail: string;
  proofDescription: string;
  status: DemoClaimStatus;
  denialReason?: string;
  createdAt: string;
}

export interface StoredDemoNotification {
  id: string;
  userEmail: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const MAX_COOKIE_CHARS = 3600;
const DEFAULT_ITEM_DATES: Record<string, string> = {
  "item-1": "2026-10-09T09:00:00.000Z",
  "item-2": "2026-10-08T10:30:00.000Z",
  "item-3": "2026-10-09T11:15:00.000Z",
  "item-4": "2026-10-07T14:20:00.000Z",
  "item-5": "2026-10-08T15:00:00.000Z",
  "item-6": "2026-10-09T13:10:00.000Z",
  "item-7": "2026-10-06T16:40:00.000Z",
  "item-8": "2026-10-08T08:45:00.000Z",
  "item-9": "2026-10-07T12:00:00.000Z",
  "item-10": "2026-10-05T17:15:00.000Z",
};

const ICON_BY_CATEGORY: Record<string, DashboardItem["icon"]> = {
  "IDs, Cards & Wallets": "wallet",
  "Keys & Keychains": "keys",
  Electronics: "laptop",
  "Bags & Backpacks": "backpack",
  "Water Bottles & Tumblers": "bottle",
  "Clothing & Apparel": "umbrella",
  "Books, Stationery & School Supplies": "id-card",
  "Accessories, Jewelry & Eyewear": "earbuds",
  "Personal Care & Miscellaneous": "wallet",
};

export function isDemoItemId(id: string): boolean {
  return id.startsWith("item-") || id.startsWith("demo-item-");
}

export function isDemoClaimId(id: string): boolean {
  return id.startsWith("demo-claim-");
}

export function parseDemoItemState(raw?: string): DemoItemStatePayload {
  if (!raw) return { added: [], statuses: {} };
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return { added: [], statuses: {} };
    const added = Array.isArray(parsed.added)
      ? parsed.added.filter(
          (item: unknown): item is StoredDemoItem =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as StoredDemoItem).id === "string" &&
            typeof (item as StoredDemoItem).name === "string",
        )
      : [];
    const statuses: Record<string, { status: DemoItemStatus; rejectReason?: string }> = {};
    if (parsed.statuses && typeof parsed.statuses === "object") {
      for (const [key, val] of Object.entries(parsed.statuses as Record<string, any>)) {
        if (
          val &&
          typeof val === "object" &&
          ["pending", "approved", "claimed", "resolved", "rejected"].includes(val.status)
        ) {
          statuses[key] = {
            status: val.status,
            ...(typeof val.rejectReason === "string" ? { rejectReason: val.rejectReason } : {}),
          };
        }
      }
    }
    return { added: added.slice(0, 12), statuses };
  } catch {
    return { added: [], statuses: {} };
  }
}

export function serializeDemoItemState(state: DemoItemStatePayload): string {
  const added = state.added.slice(0, 12).map((item) => ({
    ...item,
    // Keep cookies compact; avoid storing multi-KB data URLs inside cookies.
    photoUrl: item.photoUrl && item.photoUrl.length <= 240 ? item.photoUrl : undefined,
  }));
  let copy: DemoItemStatePayload = { added, statuses: { ...state.statuses } };
  let encoded = encodeURIComponent(JSON.stringify(copy));
  while (encoded.length > MAX_COOKIE_CHARS && copy.added.length > 0) {
    copy = { ...copy, added: copy.added.slice(0, -1) };
    encoded = encodeURIComponent(JSON.stringify(copy));
  }
  return encoded;
}

export function getMergedDemoItems(rawCookie?: string): MergedDemoItem[] {
  const state = parseDemoItemState(rawCookie);

  const customItems: MergedDemoItem[] = state.added.map((row) => {
    const d = row.eventDate ? new Date(row.eventDate) : new Date(row.createdAt);
    const formattedDate = !Number.isNaN(d.getTime())
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Today";
    const override = state.statuses[row.id];
    const status = override?.status ?? row.status;
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      category: row.category,
      location: row.location,
      locationPrefix: row.type === "found" ? "Found at" : "Last seen at",
      date: formattedDate,
      eventDate: row.eventDate,
      icon: ICON_BY_CATEGORY[row.category] ?? "wallet",
      tint: row.type === "found" ? "#e4ecd6" : "#e9e7dc",
      actionLabel: row.type === "found" ? "Claim this item" : "I found this",
      referenceCode: row.referenceCode,
      description: row.description,
      images: row.photoUrl ? [row.photoUrl] : [],
      status,
      reporterEmail: row.reporterEmail,
      createdAt: row.createdAt,
      rejectReason: override?.rejectReason,
    };
  });

  const seededItems: MergedDemoItem[] = ALL_ITEMS.map((item, idx) => {
    const override = state.statuses[item.id];
    return {
      ...item,
      referenceCode: item.referenceCode ?? `LL-48${10 + idx}`,
      status: override?.status ?? "approved",
      reporterEmail:
        item.type === "found" ? "dlsau.lostlink@dlsau.edu.ph" : "maria.santos@dlsau.edu.ph",
      createdAt: DEFAULT_ITEM_DATES[item.id] ?? "2026-10-08T12:00:00.000Z",
      rejectReason: override?.rejectReason,
    };
  });

  return [...customItems, ...seededItems];
}

export function parseDemoClaims(raw?: string): StoredDemoClaim[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c: unknown): c is StoredDemoClaim =>
          Boolean(c) &&
          typeof c === "object" &&
          typeof (c as StoredDemoClaim).id === "string" &&
          typeof (c as StoredDemoClaim).itemId === "string" &&
          typeof (c as StoredDemoClaim).claimantEmail === "string",
      )
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function serializeDemoClaims(claims: StoredDemoClaim[]): string {
  let list = claims.slice(0, 12);
  let encoded = encodeURIComponent(JSON.stringify(list));
  while (encoded.length > MAX_COOKIE_CHARS && list.length > 1) {
    list = list.slice(0, -1);
    encoded = encodeURIComponent(JSON.stringify(list));
  }
  return encoded;
}

export function parseDemoNotifications(raw?: string): StoredDemoNotification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (n: unknown): n is StoredDemoNotification =>
          Boolean(n) &&
          typeof n === "object" &&
          typeof (n as StoredDemoNotification).id === "string" &&
          typeof (n as StoredDemoNotification).userEmail === "string" &&
          typeof (n as StoredDemoNotification).message === "string",
      )
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function serializeDemoNotifications(list: StoredDemoNotification[]): string {
  let items = list.slice(0, 12);
  let encoded = encodeURIComponent(JSON.stringify(items));
  while (encoded.length > MAX_COOKIE_CHARS && items.length > 1) {
    items = items.slice(0, -1);
    encoded = encodeURIComponent(JSON.stringify(items));
  }
  return encoded;
}

export function appendDemoNotification(
  rawCookie: string | undefined,
  entry: Omit<StoredDemoNotification, "id" | "read" | "createdAt">,
): string {
  const existing = parseDemoNotifications(rawCookie);
  const next: StoredDemoNotification = {
    id: `demo-notif-${crypto.randomUUID().slice(0, 8)}`,
    userEmail: entry.userEmail.toLowerCase().trim(),
    message: entry.message,
    link: entry.link ?? "/",
    read: false,
    createdAt: new Date().toISOString(),
  };
  return serializeDemoNotifications([next, ...existing]);
}
