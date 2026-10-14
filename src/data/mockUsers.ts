export interface CampusUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  created_at: string;
  department?: string;
  reports_count?: number;
  claims_count?: number;
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
];
