/**
 * Demo/fallback campus announcements store.
 * Shares the canonical default notices between the student navbar and admin
 * console, and persists announcements created/toggled/deleted in fallback
 * sessions when the Supabase database is unreachable.
 */
export const DEMO_ANNOUNCEMENTS_COOKIE = "ll_demo_announcements";

export interface DemoAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: "urgent" | "important" | "normal";
  active: boolean;
  created_at: string;
}

export const DEFAULT_ANNOUNCEMENTS: DemoAnnouncement[] = [
  {
    id: "default-do-schedule",
    title: "Disciplinary Office Schedule",
    message:
      "Item turnover and claims verification are processed Monday to Friday, 8:00 AM - 5:00 PM at Admin Bldg Rm 102.",
    priority: "important",
    active: true,
    created_at: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "default-custody-window",
    title: "Custodial Claim Window",
    message:
      "Items unclaimed for more than 30 days are forwarded to the DLSAU University Warehouse.",
    priority: "normal",
    active: true,
    created_at: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "default-id-verification",
    title: "ID Verification Reminder",
    message:
      "Bring your physical DLSAU Student ID card when claiming valuables or electronics.",
    priority: "urgent",
    active: true,
    created_at: "2026-10-01T08:00:00.000Z",
  },
];

const MAX_ITEMS = 8;
const MAX_COOKIE_CHARS = 3600;

export function parseDemoAnnouncements(raw?: string): DemoAnnouncement[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row: unknown): row is DemoAnnouncement =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as DemoAnnouncement).id === "string" &&
          typeof (row as DemoAnnouncement).title === "string" &&
          typeof (row as DemoAnnouncement).message === "string",
      )
      .map((row): DemoAnnouncement => ({
        id: row.id,
        title: row.title,
        message: row.message,
        priority:
          row.priority === "urgent" || row.priority === "important" ? row.priority : "normal",
        active: row.active !== false,
        created_at:
          typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function serializeDemoAnnouncements(list: DemoAnnouncement[]): string {
  let items = list.slice(0, MAX_ITEMS);
  let encoded = encodeURIComponent(JSON.stringify(items));
  while (encoded.length > MAX_COOKIE_CHARS && items.length > 1) {
    items = items.slice(0, -1);
    encoded = encodeURIComponent(JSON.stringify(items));
  }
  return encoded;
}
