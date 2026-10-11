export interface DashboardItem {
  id: string;
  type: "found" | "lost";
  name: string;
  category: "Wallets & IDs" | "Bottles" | "Keys" | "Electronics" | "Bags" | "Accessories";
  location: string;
  locationPrefix: "Found at" | "Last seen at";
  date: string; // e.g. "Oct 9"
  eventDate: string; // ISO date for filtering e.g. "2026-10-09"
  icon: "wallet" | "bottle" | "id-card" | "keys" | "laptop" | "earbuds" | "backpack" | "umbrella";
  tint: string; // background tint for image area
  actionLabel: "Claim this item" | "I found this";
  referenceCode?: string;
  description: string;
  images?: string[];
}

export const INITIAL_ITEMS: DashboardItem[] = [
  {
    id: "item-1",
    type: "found",
    name: "Black bifold wallet",
    category: "Wallets & IDs",
    location: "Library, 2F",
    locationPrefix: "Found at",
    date: "Oct 9",
    eventDate: "2026-10-09",
    icon: "wallet",
    tint: "#e4ecd6",
    actionLabel: "Claim this item",
    referenceCode: "LL-4821",
    description: "Black leather bifold wallet with student card slots found near the quiet study section tables.",
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-2",
    type: "lost",
    name: "Blue insulated water bottle",
    category: "Bottles",
    location: "Gym Building",
    locationPrefix: "Last seen at",
    date: "Oct 8",
    eventDate: "2026-10-08",
    icon: "bottle",
    tint: "#e9e7dc",
    actionLabel: "I found this",
    description: "Cobalt blue vacuum-insulated stainless steel bottle with lime silicone boot and small dent on the bottom rim.",
  },
  {
    id: "item-3",
    type: "found",
    name: "Student ID card",
    category: "Wallets & IDs",
    location: "Main Gate",
    locationPrefix: "Found at",
    date: "Oct 9",
    eventDate: "2026-10-09",
    icon: "id-card",
    tint: "#dee8e0",
    actionLabel: "Claim this item",
    referenceCode: "LL-4819",
    description: "Official DLSAU student RFID card found on the turnstile counter. Turned in to security guard.",
    images: [
      "https://images.unsplash.com/photo-1589330694653-dad6ef49c654?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-4",
    type: "found",
    name: "Keys with a green lanyard",
    category: "Keys",
    location: "Engineering Building",
    locationPrefix: "Found at",
    date: "Oct 7",
    eventDate: "2026-10-07",
    icon: "keys",
    tint: "#e4ecd6",
    actionLabel: "Claim this item",
    referenceCode: "LL-4805",
    description: "Ring with 3 metallic door keys attached to a green DLSAU lanyard with swivel snap hook.",
    images: [
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1609137144822-44f24ef364c7?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590402494587-44b71d7772f6?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-5",
    type: "lost",
    name: "Silver 14\" laptop",
    category: "Electronics",
    location: "Cafeteria",
    locationPrefix: "Last seen at",
    date: "Oct 9",
    eventDate: "2026-10-09",
    icon: "laptop",
    tint: "#dee8e0",
    actionLabel: "I found this",
    description: "Silver 14-inch ultrabook with green sticker on the outer lid. Left near the window corner booth.",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-6",
    type: "found",
    name: "Wireless earbuds case",
    category: "Electronics",
    location: "Admin Lobby",
    locationPrefix: "Found at",
    date: "Oct 8",
    eventDate: "2026-10-08",
    icon: "earbuds",
    tint: "#e9e7dc",
    actionLabel: "Claim this item",
    referenceCode: "LL-4798",
    description: "White matte wireless charging case found on the waiting couch beside the registrar desk.",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-7",
    type: "lost",
    name: "Navy blue backpack",
    category: "Bags",
    location: "Chapel steps",
    locationPrefix: "Last seen at",
    date: "Oct 6",
    eventDate: "2026-10-06",
    icon: "backpack",
    tint: "#e4ecd6",
    actionLabel: "I found this",
    description: "Navy blue canvas backpack with two zipper compartments containing lecture notebooks and calculator.",
  },
  {
    id: "item-8",
    type: "found",
    name: "Folding umbrella",
    category: "Accessories",
    location: "Covered court",
    locationPrefix: "Found at",
    date: "Oct 5",
    eventDate: "2026-10-05",
    icon: "umbrella",
    tint: "#dee8e0",
    actionLabel: "Claim this item",
    referenceCode: "LL-4772",
    description: "Black 3-fold automatic umbrella with wooden hook handle, found under the bleachers.",
    images: [
      "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80"
    ],
  },
];

export const EXTRA_ITEMS: DashboardItem[] = [
  {
    id: "item-9",
    type: "found",
    name: "Scientific Calculator FX-991ES",
    category: "Electronics",
    location: "Science Lab 302",
    locationPrefix: "Found at",
    date: "Oct 4",
    eventDate: "2026-10-04",
    icon: "laptop",
    tint: "#e4ecd6",
    actionLabel: "Claim this item",
    referenceCode: "LL-4760",
    description: "Casio natural display scientific calculator with gray sliding cover.",
    images: [
      "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=600&q=80"
    ],
  },
  {
    id: "item-10",
    type: "lost",
    name: "Black Rimmed Eyeglasses",
    category: "Accessories",
    location: "Library, 1F",
    locationPrefix: "Last seen at",
    date: "Oct 3",
    eventDate: "2026-10-03",
    icon: "wallet",
    tint: "#e9e7dc",
    actionLabel: "I found this",
    description: "Square matte black acetate prescription glasses in a brown hard case.",
    images: [
      "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80"
    ],
  },
];

export const ALL_ITEMS: DashboardItem[] = [...INITIAL_ITEMS, ...EXTRA_ITEMS];

export const INITIAL_COUNT = INITIAL_ITEMS.length;
export const TOTAL = ALL_ITEMS.length;
export const FOUND_COUNT = ALL_ITEMS.filter((item) => item.type === "found").length;
export const LOST_COUNT = ALL_ITEMS.filter((item) => item.type === "lost").length;

// Demo placeholders with no backing data until the database step supplies real stats.
export const DEMO_STATS = {
  itemsInCustodyDelta: 12,
  lostDelta: 5,
  returnedThisMonth: 53,
  returnedDelta: 9,
  campusRecovered: 128,
  myActiveReports: 2,
  myActiveReportsNote: "1 lost, 1 found posted",
  unclaimed30Days: 3,
} as const;

export const CATEGORIES = [
  "All Categories",
  "Wallets & IDs",
  "Bottles",
  "Keys",
  "Electronics",
  "Bags",
  "Accessories",
] as const;

export const LOCATIONS = [
  "All Locations",
  "Library, 2F",
  "Gym Building",
  "Main Gate",
  "Engineering Building",
  "Cafeteria",
  "Admin Lobby",
  "Chapel steps",
  "Covered court",
] as const;
