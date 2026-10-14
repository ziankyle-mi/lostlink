export interface CampusBuilding {
  id: number;
  name: string;
  subtitle?: string;
  isClaimOffice?: boolean;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: 1, name: "DVM Building", subtitle: "Doctor of Veterinary Medicine" },
  { id: 2, name: "Gate 2", subtitle: "Campus Entry & Security Gate" },
  { id: 3, name: "LSB (Life Science Building)", subtitle: "LostLink & Security Claim Office", isClaimOffice: true },
  { id: 4, name: "Golden Pavilion", subtitle: "Campus Study Pavilion" },
  { id: 5, name: "Cabanas", subtitle: "Open Courtyard Gazebos" },
  { id: 6, name: "Grandstand", subtitle: "Athletic Field Bleachers" },
  { id: 7, name: "Oval", subtitle: "Track & Field Running Grounds" },
  { id: 8, name: "Open Court (TAFO)", subtitle: "Outdoor Basketball & Sports Area" },
  { id: 9, name: "Amphitheatre", subtitle: "Open-Air Auditorium" },
  { id: 10, name: "Performing Arts Hall", subtitle: "University Theater & Auditorium" },
  { id: 11, name: "P.E. Building", subtitle: "Physical Education & Roofdeck Court" },
  { id: 12, name: "Salikneta Mart", subtitle: "University Agri-Aqua Store" },
  { id: 13, name: "Administrative Office", subtitle: "Central University Administration" },
  { id: 14, name: "Highschool Building", subtitle: "Junior & Senior High School Department" },
  { id: 15, name: "IAC", subtitle: "Institutional Activity Center" },
  { id: 16, name: "2nd Cafeteria", subtitle: "Campus Food Hall & Dining" },
  { id: 17, name: "Gradeschool Building", subtitle: "Basic Education Department" },
];

/**
 * Single source of truth for selectable campus locations.
 * Derived from CAMPUS_BUILDINGS so the /help map and the report/filter
 * dropdowns can never drift apart.
 */
export const CAMPUS_LOCATIONS: string[] = CAMPUS_BUILDINGS.map((b) => b.name);

/** Location filter options: sentinel "All Locations" + every official building. */
export const LOCATION_FILTER_OPTIONS: string[] = ["All Locations", ...CAMPUS_LOCATIONS];
