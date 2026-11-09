export interface CampusUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  created_at: string;
  department?: string;
  program?: string;
  student_id?: string;
  year_level?: string;
  reports_count?: number;
  claims_count?: number;
}

export const DEMO_REGISTERED_COOKIE = "ll_demo_registered_users";

// In-memory store for newly registered accounts in demo / offline fallback mode
export const REGISTERED_CAMPUS_USERS: CampusUser[] = [];

export function parseDemoRegisteredCookie(rawCookie?: string): CampusUser[] {
  if (!rawCookie) return [];
  try {
    const decoded = decodeURIComponent(rawCookie);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed.filter((u) => u && typeof u.email === "string" && typeof u.full_name === "string");
    }
  } catch {
    try {
      const parsed = JSON.parse(rawCookie);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => u && typeof u.email === "string" && typeof u.full_name === "string");
      }
    } catch {
      // Ignore malformed cookie
    }
  }
  return [];
}

export function serializeDemoRegisteredCookie(users: CampusUser[]): string {
  return encodeURIComponent(JSON.stringify(users.slice(0, 15)));
}

export function recordDemoRegisteredUser(user: {
  fullName: string;
  email: string;
  program?: string;
  studentId?: string;
  yearLevel?: string;
}): CampusUser {
  const cleanEmail = user.email.toLowerCase().trim();
  const existingIndex = REGISTERED_CAMPUS_USERS.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);
  const entry: CampusUser = {
    id: `reg-${Date.now()}-${cleanEmail.split("@")[0]}`,
    full_name: user.fullName,
    email: cleanEmail,
    role: "user",
    active: true,
    created_at: new Date().toISOString(),
    program: user.program,
    student_id: user.studentId,
    year_level: user.yearLevel,
    reports_count: 0,
    claims_count: 0,
  };

  if (existingIndex >= 0) {
    REGISTERED_CAMPUS_USERS[existingIndex] = entry;
  } else {
    REGISTERED_CAMPUS_USERS.unshift(entry);
  }

  return entry;
}

export function getCombinedDemoRegisteredUsers(rawCookie?: string): CampusUser[] {
  const cookieUsers = parseDemoRegisteredCookie(rawCookie);
  const combined: CampusUser[] = [...cookieUsers];
  const seen = new Set(combined.map((u) => u.email.toLowerCase().trim()));
  for (const memUser of REGISTERED_CAMPUS_USERS) {
    const em = memUser.email.toLowerCase().trim();
    if (!seen.has(em)) {
      seen.add(em);
      combined.push(memUser);
    }
  }
  return combined;
}

export const INITIAL_CAMPUS_USERS: CampusUser[] = [
  {
    id: "user-admin-1",
    full_name: "Security Office DO",
    email: "dlsau.lostlink@dlsau.edu.ph",
    role: "admin",
    active: true,
    created_at: "2023-08-15T08:00:00Z",
    department: "Disciplinary & Security Office",
    reports_count: 14,
    claims_count: 0,
  },
  {
    id: "user-admin-2",
    full_name: "Andrew Cruz",
    email: "andrew.cruz@dlsau.edu.ph",
    role: "admin",
    active: true,
    created_at: "2023-09-01T08:00:00Z",
    department: "DO Head / Admin Staff",
    reports_count: 8,
    claims_count: 0,
  },
  {
    id: "user-admin-3",
    full_name: "Zian Piangco",
    email: "zian.piangco@dlsau.edu.ph",
    role: "admin",
    active: true,
    created_at: "2023-08-10T08:00:00Z",
    department: "System Administration",
    reports_count: 5,
    claims_count: 0,
  },
  {
    id: "user-student-1",
    full_name: "Juan D. Reyes",
    email: "juan.reyes@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: "2024-01-10T09:30:00Z",
    department: "BS Agriculture",
    reports_count: 2,
    claims_count: 1,
  },
  {
    id: "user-student-2",
    full_name: "Maria Santos",
    email: "maria.santos@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: "2024-02-14T11:15:00Z",
    department: "BS Veterinary Medicine",
    reports_count: 1,
    claims_count: 1,
  },
  {
    id: "user-student-3",
    full_name: "Paolo Cruz",
    email: "paolo.cruz@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: "2024-03-01T14:20:00Z",
    department: "BS Information Technology",
    reports_count: 3,
    claims_count: 1,
  },
  {
    id: "user-student-4",
    full_name: "Ana Villanueva",
    email: "ana.villanueva@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: "2024-03-22T10:00:00Z",
    department: "BS Business Administration",
    reports_count: 1,
    claims_count: 2,
  },
  {
    id: "user-student-5",
    full_name: "Rico Mendoza",
    email: "rico.mendoza@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: "2024-04-05T16:45:00Z",
    department: "BS Forestry",
    reports_count: 2,
    claims_count: 1,
  },
  {
    id: "user-student-6",
    full_name: "Markus Bautista",
    email: "markus.bautista@dlsau.edu.ph",
    role: "user",
    active: false,
    created_at: "2023-11-19T13:10:00Z",
    department: "BS Animal Husbandry",
    reports_count: 0,
    claims_count: 0,
  },
  {
    id: "user-student-7",
    full_name: "Marcelino Zapanta",
    email: "marcelino.zapanta@dlsau.edu.ph",
    role: "user",
    active: true,
    created_at: new Date().toISOString(),
    department: "BS Agriculture",
    program: "BSA",
    student_id: "2024-00-003221",
    year_level: "1st Year",
    reports_count: 0,
    claims_count: 0,
  },
];
