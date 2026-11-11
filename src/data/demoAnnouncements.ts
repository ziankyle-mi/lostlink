/**
 * Dev-only announcement store. When Supabase is unreachable (local demo), a
 * published notice is kept in this cookie so it survives the reload the admin
 * console performs. Production never reads or writes it: the callers gate every
 * use behind `devBypassEnabled`, and a real database failure is reported as an
 * error instead of being faked.
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

const MAX_ITEMS = 8;
const MAX_COOKIE_CHARS = 3800;

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
