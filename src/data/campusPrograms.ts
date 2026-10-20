export interface DegreeProgram {
  code: string;
  name: string;
  collegeCode: "CAST" | "CVMAS" | "CBMA" | "COED";
  collegeName: string;
  campus: string;
  campusSubtext: string;
  affiliationText: string;
}

export interface CollegeInfo {
  code: "CAST" | "CVMAS" | "CBMA" | "COED";
  name: string;
  shortLabel: string;
  description: string;
}

export const COLLEGES: Record<string, CollegeInfo> = {
  CAST: {
    code: "CAST",
    name: "College of Arts, Sciences and Technology",
    shortLabel: "CAST Tech & Sciences",
    description: "Committed to the holistic development of resources of change in humanities, sciences, computing, and engineering.",
  },
  CVMAS: {
    code: "CVMAS",
    name: "College of Veterinary Medicine and Agricultural Sciences",
    shortLabel: "CVMAS Agri-Vet",
    description: "Excellence in veterinary medicine, companion animal practice, livestock, food safety, and agricultural sciences.",
  },
  CBMA: {
    code: "CBMA",
    name: "College of Business, Management, and Accountancy",
    shortLabel: "CBMA Business",
    description: "Dynamic and output-oriented college producing globally competitive leaders in business, accounting, and tourism.",
  },
  COED: {
    code: "COED",
    name: "College of Education",
    shortLabel: "COED Education",
    description: "Preparing professionally competitive, research-based teachers transformed with Lasallian values.",
  },
};

export const DEGREE_PROGRAMS: Record<string, DegreeProgram> = {
  BSCS: {
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences & Technology",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Computer Science & AI Research Lab",
    affiliationText: "This account is provisioned under the College of Arts, Sciences & Technology with standard university LMS and software engineering laboratory access rights.",
  },
  BSCpE: {
    code: "BSCpE",
    name: "Bachelor of Science in Computer Engineering",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences & Technology",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Engineering & Microelectronics Lab",
    affiliationText: "This account is provisioned under the College of Arts, Sciences & Technology with hardware design, embedded systems, and CAD laboratory privileges.",
  },
  "AB Psych": {
    code: "AB Psych",
    name: "Bachelor of Arts in Psychology",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences & Technology",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Psychological Assessment & Testing Suite",
    affiliationText: "This account is provisioned under the College of Arts, Sciences & Technology with psychometric assessment and behavioral research privileges.",
  },
  DVM: {
    code: "DVM",
    name: "Doctor of Veterinary Medicine",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine & Agricultural Sciences",
    campus: "Victoneta Park & VTH",
    campusSubtext: "Veterinary Teaching Hospital & Necropsy Lab",
    affiliationText: "This account is provisioned under the College of Veterinary Medicine with clinical rotation and Veterinary Teaching Hospital clinical practice access.",
  },
  BSA: {
    code: "BSA",
    name: "Bachelor of Science in Agriculture",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine & Agricultural Sciences",
    campus: "Salikneta Farm (SJDM)",
    campusSubtext: "63-Hectare Practical Farm & Agrivet Institute",
    affiliationText: "This account is provisioned under the Agrivet Sciences Institute at Salikneta Farm with crop science, soil lab, and livestock research component rights.",
  },
  BSFT: {
    code: "BSFT",
    name: "Bachelor of Science in Food Technology",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine & Agricultural Sciences",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Food Processing & Microbiology Lab",
    affiliationText: "This account is provisioned under the College of Veterinary Medicine & Agricultural Sciences with food chemistry, safety, and sensory evaluation laboratory rights.",
  },
  "BSA-Act": {
    code: "BSA-Act",
    name: "Bachelor of Science in Accountancy",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, & Accountancy",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Accounting Information Systems Center",
    affiliationText: "This account is provisioned under the College of Business, Management, & Accountancy with tax law archives, accounting software, and financial analytics privileges.",
  },
  "BSBA-FM": {
    code: "BSBA-FM",
    name: "BSBA Major in Financial Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, & Accountancy",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Business Analytics & Trading Simulation Room",
    affiliationText: "This account is provisioned under the College of Business, Management, & Accountancy with portfolio simulation, investment, and banking systems access.",
  },
  "BSBA-MM": {
    code: "BSBA-MM",
    name: "BSBA Major in Marketing Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, & Accountancy",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Brand Strategy & Consumer Behavior Lab",
    affiliationText: "This account is provisioned under the College of Business, Management, & Accountancy with digital marketing, advertising studio, and CRM software privileges.",
  },
  BSHM: {
    code: "BSHM",
    name: "Bachelor of Science in Hospitality Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, & Accountancy",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Hot & Cold Kitchen Suites & Mock Hotel",
    affiliationText: "This account is provisioned under the College of Business, Management, & Accountancy with culinary laboratory, banquet operations, and hospitality suite privileges.",
  },
  BSTM: {
    code: "BSTM",
    name: "Bachelor of Science in Tourism Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, & Accountancy",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Global Distribution Systems (Amadeus/Sabre) Lab",
    affiliationText: "This account is provisioned under the College of Business, Management, & Accountancy with international ticketing, ecotourism, and tour planning privileges.",
  },
  BEEd: {
    code: "BEEd",
    name: "Bachelor in Elementary Education",
    collegeCode: "COED",
    collegeName: "College of Education",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Childhood Demonstration Classroom",
    affiliationText: "This account is provisioned under the College of Education with elementary curriculum resources, instructional materials center, and student-teaching rights.",
  },
  BSEd: {
    code: "BSEd",
    name: "Bachelor in Secondary Education",
    collegeCode: "COED",
    collegeName: "College of Education",
    campus: "Victoneta Park (Main)",
    campusSubtext: "Secondary Teaching & Pedagogy Center",
    affiliationText: "This account is provisioned under the College of Education with field-study laboratory, lesson simulation suite, and LET reviewer access privileges.",
  },
};

export interface EnhancedCampusUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  created_at: string;
  programCode: string;
  programName: string;
  collegeCode: "CAST" | "CVMAS" | "CBMA" | "COED";
  collegeName: string;
  studentId: string;
  units: number;
  yearLevel: string;
  isFaculty: boolean;
  campus: string;
  campusSubtext: string;
  affiliationText: string;
  portalLevel: string;
}

// Deterministic hashing helper so accounts without explicit DB metadata get realistic assignments
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Special curated mappings for known accounts matching user-feature.png and key testers
const SPECIAL_USER_ASSIGNMENTS: Record<string, Partial<EnhancedCampusUser>> = {
  "rene.baterbonia@dlsau.edu.ph": {
    full_name: "Rene Baterbonia",
    programCode: "BSCS",
    collegeCode: "CAST",
    studentId: "2024-10144",
    units: 21,
    yearLevel: "3rd Year",
    isFaculty: false,
  },
  "ako.eto@dlsau.edu.ph": {
    full_name: "Ako Eto",
    programCode: "DVM",
    collegeCode: "CVMAS",
    studentId: "2023-01892",
    units: 24,
    yearLevel: "4th Year",
    isFaculty: false,
  },
  "paulo.mendoza@dlsau.edu.ph": {
    full_name: "Paulo Mendoza",
    programCode: "BSA-Act",
    collegeCode: "CBMA",
    studentId: "2024-00214",
    units: 23,
    yearLevel: "2nd Year",
    isFaculty: false,
  },
  "zian.piangco@dlsau.edu.ph": {
    full_name: "Zian Piangco",
    programCode: "BSCS",
    collegeCode: "CAST",
    studentId: "2022-10088",
    units: 18,
    yearLevel: "4th Year",
    isFaculty: false,
  },
  "andrew.cruz@dlsau.edu.ph": {
    full_name: "Andrew Cruz",
    programCode: "BSCpE",
    collegeCode: "CAST",
    studentId: "2022-10501",
    units: 21,
    yearLevel: "4th Year",
    isFaculty: false,
  },
  "dlsau.lostlink@dlsau.edu.ph": {
    full_name: "Disciplinary Office",
    programCode: "BSCS",
    collegeCode: "CAST",
    studentId: "DO-STAFF",
    units: 0,
    yearLevel: "Staff Member",
    isFaculty: true,
  },
  "jacob.robles@dlsau.edu.ph": {
    full_name: "Jacob Robles",
    programCode: "BSFT",
    collegeCode: "CVMAS",
    studentId: "2023-04118",
    units: 22,
    yearLevel: "3rd Year",
    isFaculty: false,
  },
  "marcelino.zapanta@dlsau.edu.ph": {
    full_name: "Marcelino Zapanta",
    programCode: "BSA",
    collegeCode: "CVMAS",
    studentId: "2024-03221",
    units: 20,
    yearLevel: "1st Year",
    isFaculty: false,
  },
  "huan.marzan@gmail.com": {
    full_name: "Huan Marzan",
    programCode: "BSCS",
    collegeCode: "CAST",
    studentId: "2024-10999",
    units: 21,
    yearLevel: "2nd Year",
    isFaculty: false,
  },
};

const PROGRAM_KEYS = Object.keys(DEGREE_PROGRAMS);

export function enrichCampusUser(raw: {
  id: string;
  full_name?: string;
  email: string;
  role?: "admin" | "user";
  active?: boolean;
  created_at?: string;
  program?: string;
  student_id?: string;
  studentId?: string;
  year_level?: string;
  yearLevel?: string;
  user_metadata?: Record<string, any>;
}): EnhancedCampusUser {
  const emailLower = (raw.email || "").toLowerCase().trim();
  const meta = raw.user_metadata || {};
  const special = SPECIAL_USER_ASSIGNMENTS[emailLower] || {};

  // Check direct DB column, auth metadata, special override, or deterministic fallback
  const h = hashString(emailLower || raw.id);
  const progKey = raw.program || meta.program || special.programCode || PROGRAM_KEYS[h % PROGRAM_KEYS.length];
  const program = DEGREE_PROGRAMS[progKey] || DEGREE_PROGRAMS.BSCS;

  const isFaculty = meta.is_faculty !== undefined
    ? Boolean(meta.is_faculty)
    : (special.isFaculty ?? (h % 11 === 0)); // ~1 in 11 accounts is faculty

  const yearLevels =
    progKey === "DVM"
      ? ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year"]
      : ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearLevel = isFaculty
    ? "Faculty Member"
    : raw.year_level ||
      raw.yearLevel ||
      meta.year_level ||
      meta.yearLevel ||
      special.yearLevel ||
      yearLevels[h % yearLevels.length];

  const units = isFaculty ? 0 : (special.units || meta.units || (18 + (h % 7))); // 18-24 units
  const idYear = 2022 + (h % 3);
  const idSeq = String(10000 + (h % 90000)).slice(0, 5);
  const studentId =
    raw.student_id ||
    raw.studentId ||
    meta.student_id ||
    meta.studentId ||
    special.studentId ||
    (isFaculty ? `${idYear}-F${idSeq.slice(0, 3)}` : `${idYear}-${idSeq}`);

  const fullName = raw.full_name || special.full_name || meta.full_name || emailLower.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: raw.id,
    full_name: fullName,
    email: raw.email,
    role: (raw.role as "admin" | "user") || "user",
    active: raw.active ?? true,
    created_at: raw.created_at || new Date().toISOString(),
    programCode: program.code,
    programName: program.name,
    collegeCode: program.collegeCode,
    collegeName: program.collegeName,
    studentId,
    units,
    yearLevel,
    isFaculty,
    campus: program.campus,
    campusSubtext: program.campusSubtext,
    affiliationText: isFaculty
      ? `This faculty account is provisioned under the ${program.collegeName} with academic teaching and LMS instructor access.`
      : program.affiliationText,
    portalLevel:
      raw.role === "admin"
        ? "Disciplinary Office Administrator"
        : isFaculty
          ? "Faculty Member (Standard Privileges)"
          : "Student",
  };
}
