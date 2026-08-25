/**
 * Seed catalog + demo accounts for the PULSE mock backend.
 *
 * Everything is generated relative to "now" so the demo always has history
 * (analytics, payouts, ledger) and a live future (bookable sessions). The
 * generator is deterministic (seeded PRNG) so reloads within a day are stable.
 */
import type {
  AppNotification,
  Booking,
  Category,
  City,
  ClassType,
  CreditTransaction,
  Favorite,
  Neighborhood,
  PayoutEntry,
  Plan,
  Review,
  Session,
  Studio,
  Subscription,
  User,
  WaitlistEntry,
} from "@/lib/types";
import { computeCreditCost, isPeakHour } from "@/lib/rules/pricing";
import { addDays, startOfDay } from "@/lib/utils";
import { createRng, type Rng } from "./random";

export interface DBState {
  seededAt: string;
  users: User[];
  cities: City[];
  neighborhoods: Neighborhood[];
  categories: Category[];
  plans: Plan[];
  studios: Studio[];
  classTypes: ClassType[];
  sessions: Session[];
  bookings: Booking[];
  subscriptions: Subscription[];
  creditTxs: CreditTransaction[];
  payoutEntries: PayoutEntry[];
  reviews: Review[];
  notifications: AppNotification[];
  favorites: Favorite[];
  waitlist: WaitlistEntry[];
}

/* ------------------------------- Static data ------------------------------ */

export const DEMO_MEMBER_ID = "u_demo_member";
export const DEMO_OWNER_ID = "u_demo_owner";
export const DEMO_STUDIO_ID = "st_forge";

const CITIES: City[] = [
  {
    id: "thessaloniki",
    name: { el: "Θεσσαλονίκη", en: "Thessaloniki" },
    lat: 40.6264,
    lng: 22.9484,
    zoom: 13,
  },
  {
    id: "athens",
    name: { el: "Αθήνα", en: "Athens" },
    lat: 37.9755,
    lng: 23.7348,
    zoom: 12,
  },
];

const NEIGHBORHOODS: Neighborhood[] = [
  { id: "kentro", cityId: "thessaloniki", name: { el: "Κέντρο", en: "City Center" } },
  { id: "kalamaria", cityId: "thessaloniki", name: { el: "Καλαμαριά", en: "Kalamaria" } },
  { id: "toumpa", cityId: "thessaloniki", name: { el: "Τούμπα", en: "Toumba" } },
  { id: "ano-poli", cityId: "thessaloniki", name: { el: "Άνω Πόλη", en: "Ano Poli" } },
  { id: "pylaia", cityId: "thessaloniki", name: { el: "Πυλαία", en: "Pylaia" } },
  { id: "kolonaki", cityId: "athens", name: { el: "Κολωνάκι", en: "Kolonaki" } },
  { id: "gazi", cityId: "athens", name: { el: "Γκάζι", en: "Gazi" } },
  { id: "glyfada", cityId: "athens", name: { el: "Γλυφάδα", en: "Glyfada" } },
  { id: "neo-psychiko", cityId: "athens", name: { el: "Νέο Ψυχικό", en: "Neo Psychiko" } },
];

const CATEGORIES: Category[] = [
  { id: "pilates", name: { el: "Reformer Pilates", en: "Reformer Pilates" }, palette: 0 },
  { id: "crossfit", name: { el: "CrossFit", en: "CrossFit" }, palette: 1 },
  { id: "boxing", name: { el: "Boxing & Muay Thai", en: "Boxing & Muay Thai" }, palette: 2 },
  { id: "ems", name: { el: "EMS", en: "EMS" }, palette: 3 },
  { id: "yoga", name: { el: "Yoga", en: "Yoga" }, palette: 4 },
  { id: "hiit", name: { el: "Functional / HIIT", en: "Functional / HIIT" }, palette: 5 },
];

const PLANS: Plan[] = [
  {
    id: "starter",
    name: { el: "Starter", en: "Starter" },
    creditsPerCycle: 10,
    priceEUR: 29,
    blurb: { el: "Για 1–2 μαθήματα την εβδομάδα.", en: "For 1–2 classes a week." },
    highlight: false,
  },
  {
    id: "plus",
    name: { el: "Plus", en: "Plus" },
    creditsPerCycle: 22,
    priceEUR: 59,
    blurb: {
      el: "Το πιο δημοφιλές — 3–4 μαθήματα την εβδομάδα.",
      en: "Most popular — 3–4 classes a week.",
    },
    highlight: true,
  },
  {
    id: "premium",
    name: { el: "Premium", en: "Premium" },
    creditsPerCycle: 40,
    priceEUR: 99,
    blurb: {
      el: "Για καθημερινή προπόνηση χωρίς δεύτερη σκέψη.",
      en: "For training daily without thinking twice.",
    },
    highlight: false,
  },
];

interface StudioSpec {
  id: string;
  name: string;
  neighborhoodId: string;
  categoryIds: Studio["categoryIds"];
  floor: number;
  featured?: boolean;
  lat: number;
  lng: number;
  address: string;
  descEl: string;
  descEn: string;
  rating: number;
}

const STUDIO_SPECS: StudioSpec[] = [
  // ---------------- Thessaloniki ----------------
  {
    id: DEMO_STUDIO_ID,
    name: "FORGE Athletic Club",
    neighborhoodId: "kentro",
    categoryIds: ["crossfit", "hiit"],
    floor: 9,
    featured: true,
    lat: 40.6301,
    lng: 22.9439,
    address: "Τσιμισκή 87, Θεσσαλονίκη",
    descEl:
      "Βιομηχανικός χώρος 600τμ στην καρδιά της πόλης. Προγραμματισμός strength & conditioning από coaches με αγωνιστικό υπόβαθρο.",
    descEn:
      "A 600m² industrial space in the heart of the city. Strength & conditioning programming from coaches with competitive backgrounds.",
    rating: 4.9,
  },
  {
    id: "st_core",
    name: "CORE Reformer Studio",
    neighborhoodId: "kentro",
    categoryIds: ["pilates"],
    floor: 11,
    featured: true,
    lat: 40.6329,
    lng: 22.9411,
    address: "Μητροπόλεως 42, Θεσσαλονίκη",
    descEl:
      "Boutique reformer studio με 9 κρεβάτια, φυσικό φως και sessions μικρών γκρουπ. Precision πάνω απ' όλα.",
    descEn:
      "Boutique reformer studio with 9 beds, natural light and small-group sessions. Precision above all.",
    rating: 4.8,
  },
  {
    id: "st_mat",
    name: "The Mat Collective",
    neighborhoodId: "kalamaria",
    categoryIds: ["pilates", "yoga"],
    floor: 9,
    lat: 40.5825,
    lng: 22.9506,
    address: "Μεταμορφώσεως 21, Καλαμαριά",
    descEl:
      "Ζεστός χώρος για mat pilates και slow flow yoga, δίπλα στη μαρίνα της Καλαμαριάς.",
    descEn:
      "A warm space for mat pilates and slow flow yoga, next to the Kalamaria marina.",
    rating: 4.7,
  },
  {
    id: "st_northside",
    name: "Northside Boxing Lab",
    neighborhoodId: "kentro",
    categoryIds: ["boxing"],
    floor: 8,
    featured: true,
    lat: 40.6403,
    lng: 22.9347,
    address: "Ολύμπου 118, Θεσσαλονίκη",
    descEl:
      "Τεχνική πυγμαχία χωρίς εγωισμούς. Γάντια, ρινγκ και coaching που σε κάνει καλύτερο κάθε round.",
    descEn:
      "Technical boxing without egos. Gloves, a ring and coaching that makes you better every round.",
    rating: 4.9,
  },
  {
    id: "st_muaythai",
    name: "Siam Muay Thai House",
    neighborhoodId: "toumpa",
    categoryIds: ["boxing"],
    floor: 7,
    lat: 40.6136,
    lng: 22.9756,
    address: "Γρ. Λαμπράκη 156, Τούμπα",
    descEl:
      "Αυθεντικό Muay Thai από προπονητές που αγωνίστηκαν στην Ταϊλάνδη. Pads, clinch, κουλτούρα.",
    descEn:
      "Authentic Muay Thai from trainers who fought in Thailand. Pads, clinch, culture.",
    rating: 4.8,
  },
  {
    id: "st_volt",
    name: "VOLT EMS Studio",
    neighborhoodId: "kentro",
    categoryIds: ["ems"],
    floor: 12,
    lat: 40.6289,
    lng: 22.9522,
    address: "Π. Μελά 18, Θεσσαλονίκη",
    descEl:
      "Προπόνηση EMS 25 λεπτών one-to-one. Μέγιστο αποτέλεσμα, μηδενικός χαμένος χρόνος.",
    descEn:
      "25-minute one-to-one EMS training. Maximum result, zero wasted time.",
    rating: 4.6,
  },
  {
    id: "st_loft",
    name: "Ano Poli Yoga Loft",
    neighborhoodId: "ano-poli",
    categoryIds: ["yoga"],
    floor: 8,
    lat: 40.6442,
    lng: 22.9497,
    address: "Ηροδότου 17, Άνω Πόλη",
    descEl:
      "Σοφίτα με θέα όλη τη Θεσσαλονίκη. Vinyasa τα πρωινά, yin με κεριά τα βράδια.",
    descEn:
      "A loft overlooking all of Thessaloniki. Vinyasa in the mornings, candlelit yin at night.",
    rating: 4.9,
  },
  {
    id: "st_salt",
    name: "Salt & Soul Yoga",
    neighborhoodId: "kalamaria",
    categoryIds: ["yoga"],
    floor: 8,
    lat: 40.5769,
    lng: 22.9469,
    address: "Θεμ. Σοφούλη 89, Καλαμαριά",
    descEl:
      "Παραθαλάσσιο studio για flow με ανοιχτά παράθυρα και αλμύρα στον αέρα.",
    descEn:
      "A seaside studio for flow with open windows and salt in the air.",
    rating: 4.7,
  },
  {
    id: "st_pylaia",
    name: "Pylaia Performance Lab",
    neighborhoodId: "pylaia",
    categoryIds: ["hiit", "crossfit"],
    floor: 9,
    lat: 40.6014,
    lng: 23.0125,
    address: "Λεωφ. Γεωργικής Σχολής 65, Πυλαία",
    descEl:
      "Data-driven conditioning: heart-rate zones, μετρήσιμη πρόοδος, ομάδες έως 12 ατόμων.",
    descEn:
      "Data-driven conditioning: heart-rate zones, measurable progress, groups of up to 12.",
    rating: 4.6,
  },
  {
    id: "st_align",
    name: "Align Pilates & Physio",
    neighborhoodId: "pylaia",
    categoryIds: ["pilates"],
    floor: 10,
    lat: 40.5981,
    lng: 23.0037,
    address: "Κωνσταντινουπόλεως 12, Πυλαία",
    descEl:
      "Reformer με φυσικοθεραπευτική ματιά — ιδανικό για αποκατάσταση και σωστή στάση.",
    descEn:
      "Reformer with a physiotherapy lens — ideal for rehab and posture work.",
    rating: 4.8,
  },
  {
    id: "st_iron",
    name: "Iron Temple Strength Club",
    neighborhoodId: "toumpa",
    categoryIds: ["crossfit"],
    floor: 8,
    lat: 40.6089,
    lng: 22.9701,
    address: "Κλεάνθους 44, Τούμπα",
    descEl:
      "Barbell culture: όλα ξεκινούν από τη μπάρα. Ολυμπιακές άρσεις, strongman Σάββατα.",
    descEn:
      "Barbell culture: everything starts from the bar. Olympic lifts, strongman Saturdays.",
    rating: 4.7,
  },
  {
    id: "st_breathe",
    name: "Breathe Hot Yoga",
    neighborhoodId: "kentro",
    categoryIds: ["yoga"],
    floor: 9,
    lat: 40.6255,
    lng: 22.9557,
    address: "Εγνατία 142, Θεσσαλονίκη",
    descEl:
      "Θερμαινόμενη αίθουσα 38°C, power flow και απόλυτη αποφόρτιση μετά.",
    descEn: "A 38°C heated room, power flow and total decompression after.",
    rating: 4.5,
  },
  {
    id: "st_ko",
    name: "KO Boxing Club",
    neighborhoodId: "kalamaria",
    categoryIds: ["boxing", "hiit"],
    floor: 8,
    lat: 40.5872,
    lng: 22.9575,
    address: "Εθν. Αντιστάσεως 30, Καλαμαριά",
    descEl:
      "Boxing conditioning για όλους — σάκοι, σχοινάκια και playlists που χτυπάνε δυνατά.",
    descEn:
      "Boxing conditioning for everyone — bags, ropes and playlists that hit hard.",
    rating: 4.6,
  },
  {
    id: "st_spark",
    name: "Spark EMS Lab",
    neighborhoodId: "kalamaria",
    categoryIds: ["ems"],
    floor: 11,
    lat: 40.5837,
    lng: 22.9445,
    address: "Αιγαίου 52, Καλαμαριά",
    descEl:
      "EMS νέας γενιάς με ασύρματες στολές και προσωπικό coaching σε κάθε session.",
    descEn:
      "Next-gen EMS with wireless suits and personal coaching in every session.",
    rating: 4.7,
  },
  // ---------------- Athens ----------------
  {
    id: "st_kolonaki_reformer",
    name: "Kolonaki Reformer Room",
    neighborhoodId: "kolonaki",
    categoryIds: ["pilates"],
    floor: 12,
    featured: true,
    lat: 37.9787,
    lng: 23.7442,
    address: "Σκουφά 26, Κολωνάκι",
    descEl:
      "Το πιο διακριτικά πολυτελές reformer studio της Αθήνας. Έξι κρεβάτια, ατελείωτη προσοχή στη λεπτομέρεια.",
    descEn:
      "Athens' most quietly luxurious reformer studio. Six beds, endless attention to detail.",
    rating: 4.9,
  },
  {
    id: "st_gazi_fight",
    name: "Gazi Fight Factory",
    neighborhoodId: "gazi",
    categoryIds: ["boxing"],
    floor: 8,
    lat: 37.9778,
    lng: 23.7141,
    address: "Περσεφόνης 19, Γκάζι",
    descEl:
      "Παλιό μηχανουργείο, τώρα ναός του μαχητικού αθλητισμού. Boxing, kickboxing, sparring nights.",
    descEn:
      "A former machine shop, now a temple of fight sports. Boxing, kickboxing, sparring nights.",
    rating: 4.8,
  },
  {
    id: "st_wod",
    name: "WOD Athens",
    neighborhoodId: "gazi",
    categoryIds: ["crossfit", "hiit"],
    floor: 9,
    featured: true,
    lat: 37.9812,
    lng: 23.7109,
    address: "Ιερά Οδός 72, Γκάζι",
    descEl:
      "Affiliate με κοινότητα που δεν σε αφήνει να λείψεις δεύτερη μέρα. Καθημερινά WOD και open gym.",
    descEn:
      "An affiliate with a community that won't let you skip a second day. Daily WODs and open gym.",
    rating: 4.8,
  },
  {
    id: "st_riviera",
    name: "Riviera Yoga Glyfada",
    neighborhoodId: "glyfada",
    categoryIds: ["yoga", "pilates"],
    floor: 9,
    lat: 37.8622,
    lng: 23.7529,
    address: "Γρ. Λαμπράκη 34, Γλυφάδα",
    descEl:
      "Sunset flows πέντε λεπτά από το κύμα. Το πιο laid-back premium studio της Ριβιέρας.",
    descEn:
      "Sunset flows five minutes from the waves. The Riviera's most laid-back premium studio.",
    rating: 4.7,
  },
  {
    id: "st_atlas",
    name: "Atlas Performance",
    neighborhoodId: "neo-psychiko",
    categoryIds: ["hiit", "crossfit"],
    floor: 10,
    lat: 38.0106,
    lng: 23.7778,
    address: "Λεωφ. Κηφισίας 228, Νέο Ψυχικό",
    descEl:
      "Ημιπροσωπική προπόνηση απόδοσης με assessments κάθε 6 εβδομάδες. Σοβαρή δουλειά, όμορφος χώρος.",
    descEn:
      "Semi-private performance training with assessments every 6 weeks. Serious work, beautiful space.",
    rating: 4.8,
  },
  {
    id: "st_emsplus",
    name: "EMS+ Athens",
    neighborhoodId: "kolonaki",
    categoryIds: ["ems"],
    floor: 12,
    lat: 37.9769,
    lng: 23.7401,
    address: "Πατριάρχου Ιωακείμ 8, Κολωνάκι",
    descEl:
      "Το πρώτο EMS boutique της Αθήνας. 25 λεπτά, επιστημονικό πρωτόκολλο, ορατά αποτελέσματα.",
    descEn:
      "Athens' first EMS boutique. 25 minutes, a scientific protocol, visible results.",
    rating: 4.6,
  },
  {
    id: "st_flowstate",
    name: "Flow State Pilates",
    neighborhoodId: "glyfada",
    categoryIds: ["pilates"],
    floor: 10,
    lat: 37.8687,
    lng: 23.7581,
    address: "Κύπρου 70, Γλυφάδα",
    descEl:
      "Reformer, tower και chair σε έναν φωτεινό χώρο με νότια αύρα. Μικρά τμήματα, μεγάλη πρόοδος.",
    descEn:
      "Reformer, tower and chair in a bright space with southern-suburb ease. Small groups, big progress.",
    rating: 4.7,
  },
  {
    id: "st_lycabettus",
    name: "Lycabettus Power Yoga",
    neighborhoodId: "kolonaki",
    categoryIds: ["yoga", "hiit"],
    floor: 9,
    featured: true,
    lat: 37.9827,
    lng: 23.7446,
    address: "Κλεομένους 15, Κολωνάκι",
    descEl:
      "Δυναμικό yoga κάτω από τον Λυκαβηττό — rooftop sessions όταν ο καιρός το επιτρέπει.",
    descEn:
      "Power yoga beneath Lycabettus — rooftop sessions whenever the weather allows.",
    rating: 4.8,
  },
];

/** Every studio id in the catalog — used to pre-render pages for static export. */
export const STUDIO_IDS: string[] = STUDIO_SPECS.map((s) => s.id);

/** Class-type templates per category: [name, duration, level]. */
const CLASS_TEMPLATES: Record<
  string,
  [string, number, ClassType["level"], { el: string; en: string }][]
> = {
  pilates: [
    ["Reformer Flow 55'", 55, "all", {
      el: "Δυναμική ροή στο reformer για όλο το σώμα.",
      en: "A dynamic full-body flow on the reformer.",
    }],
    ["Reformer Sculpt", 55, "intermediate", {
      el: "Στοχευμένη ενδυνάμωση με ελατήρια βαριάς αντίστασης.",
      en: "Targeted strength work with heavy-spring resistance.",
    }],
    ["Mat Pilates", 50, "beginner", {
      el: "Κλασικό mat ρεπερτόριο, ιδανικό για αρχή.",
      en: "Classic mat repertoire, the perfect starting point.",
    }],
  ],
  crossfit: [
    ["WOD 60'", 60, "all", {
      el: "Το ημερήσιο WOD — strength piece και metcon.",
      en: "The daily WOD — a strength piece plus a metcon.",
    }],
    ["Strength & Conditioning", 60, "intermediate", {
      el: "Βαριά σύνθετα κινήματα με έμφαση στην τεχνική.",
      en: "Heavy compound lifts with a focus on technique.",
    }],
    ["Gymnastics Skills", 60, "advanced", {
      el: "Pull-ups, handstands και έλεγχος σώματος.",
      en: "Pull-ups, handstands and body control.",
    }],
  ],
  boxing: [
    ["Boxing Fundamentals", 60, "beginner", {
      el: "Στάση, βήμα, βασικά χτυπήματα — από το μηδέν.",
      en: "Stance, footwork, basic punches — from zero.",
    }],
    ["Bag & Pads 60'", 60, "all", {
      el: "Δουλειά σε σάκο και pads με conditioning finisher.",
      en: "Bag and pad work with a conditioning finisher.",
    }],
    ["Sparring Tech", 60, "advanced", {
      el: "Ελεγχόμενο τεχνικό sparring για έμπειρους.",
      en: "Controlled technical sparring for experienced members.",
    }],
  ],
  ems: [
    ["EMS Full Body 25'", 25, "all", {
      el: "Ολόσωμη ηλεκτρομυϊκή προπόνηση με coach.",
      en: "Full-body electro-muscular training with a coach.",
    }],
    ["EMS Strength 25'", 25, "intermediate", {
      el: "Πρωτόκολλο δύναμης υψηλής έντασης.",
      en: "A high-intensity strength protocol.",
    }],
  ],
  yoga: [
    ["Vinyasa Flow", 60, "all", {
      el: "Ροή συγχρονισμένη με την αναπνοή.",
      en: "A flow synchronized with the breath.",
    }],
    ["Power Flow 60'", 60, "intermediate", {
      el: "Δυναμικό, ιδρωτικό flow για δυνατό core.",
      en: "A strong, sweaty flow for a powerful core.",
    }],
    ["Yin & Restore", 75, "all", {
      el: "Βαθιές, αργές στάσεις για πλήρη αποφόρτιση.",
      en: "Deep, slow holds for total release.",
    }],
  ],
  hiit: [
    ["HIIT Circuit 45'", 45, "all", {
      el: "Κυκλική προπόνηση υψηλής έντασης σε σταθμούς.",
      en: "High-intensity circuit training across stations.",
    }],
    ["Metcon 45'", 45, "intermediate", {
      el: "Metabolic conditioning με kettlebells και sleds.",
      en: "Metabolic conditioning with kettlebells and sleds.",
    }],
    ["Engine Builder", 45, "all", {
      el: "Αερόβια βάση: row, bike, ski erg.",
      en: "Aerobic base: row, bike, ski erg.",
    }],
  ],
};

const INSTRUCTORS = [
  "Άρης Δ.", "Μαρίνα Κ.", "Νίκος Τ.", "Ελένη Σ.", "Γιώργος Π.", "Σοφία Μ.",
  "Αλέξανδρος Β.", "Κατερίνα Λ.", "Στέλιος Ν.", "Δάφνη Χ.", "Πέτρος Α.", "Ζωή Ρ.",
];

const FAKE_MEMBER_NAMES = [
  "Μαρία Κωνσταντίνου", "Γιάννης Αντωνίου", "Άννα Γεωργίου", "Κώστας Δημητρίου",
  "Ειρήνη Παππά", "Θάνος Μακρής", "Νατάσα Ιωάννου", "Παύλος Σταύρου",
  "Χριστίνα Λάμπρου", "Μιχάλης Ρήγας", "Δέσποινα Αθανασίου", "Ορέστης Φωτίου",
  "Λυδία Χατζή", "Στέφανος Καλογήρου", "Ηλέκτρα Μαυρίδου", "Άγγελος Οικονομίδης",
];

const REVIEW_POOL: { rating: number; text: string; lang: "el" | "en" }[] = [
  { rating: 5, text: "Απίστευτη ενέργεια και προσοχή στη λεπτομέρεια. Το καλύτερο studio που έχω πάει.", lang: "el" },
  { rating: 5, text: "Ο χώρος είναι πανέμορφος και οι προπονητές πραγματικοί επαγγελματίες.", lang: "el" },
  { rating: 4, text: "Πολύ καλό πρόγραμμα και ωραία ατμόσφαιρα. Λίγο δύσκολο το παρκάρισμα.", lang: "el" },
  { rating: 5, text: "Με το PULSE το ανακάλυψα και τώρα είναι στη μόνιμη ρουτίνα μου.", lang: "el" },
  { rating: 5, text: "Μικρά τμήματα, προσωπική προσοχή, μηδέν βιομηχανοποίηση. Ό,τι πρέπει.", lang: "el" },
  { rating: 4, text: "Εξαιρετικοί coaches. Θα ήθελα περισσότερα απογευματινά slots.", lang: "el" },
  { rating: 5, text: "Immaculate space, world-class coaching. Worth every credit.", lang: "en" },
  { rating: 5, text: "Found this gem through the app — small classes and real attention to form.", lang: "en" },
  { rating: 4, text: "Great vibe and a tough workout. Gets busy at peak hours.", lang: "en" },
  { rating: 5, text: "The instructors remember your name and your injuries. Rare.", lang: "en" },
  { rating: 4, text: "Beautiful studio, spotless changing rooms, strong coffee next door.", lang: "en" },
  { rating: 5, text: "Το 25λεπτο EMS είναι πιο απαιτητικό από ό,τι φανταζόμουν. Τέλειο για μεσημέρι.", lang: "el" },
];

/* ------------------------------ Generation -------------------------------- */

function iso(d: Date): string {
  return d.toISOString();
}

function at(day: Date, hourDecimal: number): Date {
  const d = new Date(day);
  d.setHours(Math.floor(hourDecimal), Math.round((hourDecimal % 1) * 60), 0, 0);
  return d;
}

/** Hour slots per category (weekdays; weekends get a subset). */
function hourSlotsFor(categoryId: string, rng: Rng): number[] {
  if (categoryId === "ems") return [9, 10, 11, 12.5, 17, 18, 19, 20];
  const morning = rng.pick([[7.5, 9.5], [8, 10], [7.5, 10.5]]);
  const evening = rng.pick([[17.5, 19, 20.5], [18, 19.5, 21], [17, 18.5, 20]]);
  const midday = rng.chance(0.5) ? [12.5] : [];
  return [...morning, ...midday, ...evening];
}

function capacityFor(categoryId: string, rng: Rng): { cap: number; released: number } {
  switch (categoryId) {
    case "ems":
      return { cap: rng.int(2, 3), released: rng.int(1, 2) };
    case "pilates":
      return { cap: rng.int(8, 10), released: rng.int(2, 4) };
    case "yoga":
      return { cap: rng.int(12, 16), released: rng.int(3, 6) };
    default:
      return { cap: rng.int(12, 16), released: rng.int(3, 6) };
  }
}

export function buildSeed(now: Date = new Date()): DBState {
  const rng = createRng(20260719);
  const today = startOfDay(now);

  /* Users ------------------------------------------------------------------ */
  const demoMember: User = {
    id: DEMO_MEMBER_ID,
    role: "member",
    name: "Έλενα Βασιλείου",
    email: "elena@demo.pulse.fit",
    memberSince: iso(addDays(today, -160)),
  };
  const demoOwner: User = {
    id: DEMO_OWNER_ID,
    role: "studio_owner",
    name: "Δημήτρης Οικονόμου",
    email: "dimitris@forge.gr",
    memberSince: iso(addDays(today, -400)),
    studioId: DEMO_STUDIO_ID,
  };
  const fakeMembers: User[] = FAKE_MEMBER_NAMES.map((name, i) => ({
    id: `u_m${i + 1}`,
    role: "member",
    name,
    email: `member${i + 1}@demo.pulse.fit`,
    memberSince: iso(addDays(today, -rng.int(30, 500))),
  }));
  const ownerUsers: User[] = STUDIO_SPECS.filter(
    (s) => s.id !== DEMO_STUDIO_ID,
  ).map((s, i) => ({
    id: `u_o${i + 1}`,
    role: "studio_owner",
    name: `Owner ${s.name}`,
    email: `owner${i + 1}@demo.pulse.fit`,
    memberSince: iso(addDays(today, -400)),
    studioId: s.id,
  }));

  /* Studios & class types --------------------------------------------------- */
  const studios: Studio[] = STUDIO_SPECS.map((spec, i) => {
    const nb = NEIGHBORHOODS.find((n) => n.id === spec.neighborhoodId)!;
    return {
      id: spec.id,
      ownerId:
        spec.id === DEMO_STUDIO_ID
          ? DEMO_OWNER_ID
          : ownerUsers.find((o) => o.studioId === spec.id)!.id,
      name: spec.name,
      cityId: nb.cityId,
      neighborhoodId: spec.neighborhoodId,
      categoryIds: spec.categoryIds,
      description: { el: spec.descEl, en: spec.descEn },
      address: spec.address,
      lat: spec.lat,
      lng: spec.lng,
      rating: spec.rating,
      reviewCount: 0, // filled after reviews are generated
      amenities:
        spec.categoryIds[0] === "ems"
          ? ["showers", "towels", "water", "ac"]
          : rng.shuffle([
              "showers",
              "lockers",
              "towels",
              "parking",
              "wifi",
              "water",
              "ac",
              "shop",
            ] as const).slice(0, rng.int(4, 6)),
      featured: !!spec.featured,
      artSeed: i * 7 + 3,
      defaultFloorPriceEUR: spec.floor,
      cancellationCutoffHours: rng.pick([8, 12, 12, 24]),
    };
  });

  const classTypes: ClassType[] = [];
  for (const studio of studios) {
    for (const catId of studio.categoryIds) {
      const templates = CLASS_TEMPLATES[catId] ?? [];
      const take = studio.categoryIds.length > 1 ? 2 : Math.min(3, templates.length);
      for (let i = 0; i < take; i++) {
        const [name, dur, level, desc] = templates[i];
        classTypes.push({
          id: `ct_${studio.id}_${catId}_${i}`,
          studioId: studio.id,
          categoryId: catId,
          name,
          durationMin: dur,
          level,
          description: desc,
        });
      }
    }
  }

  /* Sessions ----------------------------------------------------------------- */
  const sessions: Session[] = [];
  const DAYS_BACK = 30;
  const DAYS_FWD = 14;
  for (const studio of studios) {
    const slots = hourSlotsFor(studio.categoryIds[0], rng);
    const studioClasses = classTypes.filter((c) => c.studioId === studio.id);
    // Sundays: only "recovery" categories (yoga/pilates/EMS) and the demo
    // studio open, on a reduced schedule — keeps every demo day alive.
    const opensSunday =
      studio.id === DEMO_STUDIO_ID ||
      studio.categoryIds.some((c) =>
        ["yoga", "pilates", "ems"].includes(c),
      );
    for (let d = -DAYS_BACK; d <= DAYS_FWD; d++) {
      const day = addDays(today, d);
      const dow = day.getDay();
      if (dow === 0 && !opensSunday) continue;
      const daySlots =
        dow === 6 || dow === 0
          ? slots.filter((_, idx) => idx % 2 === 0)
          : slots;
      for (const hour of daySlots) {
        if (rng.chance(0.15)) continue; // realistic gaps
        const ct = rng.pick(studioClasses);
        const start = at(day, hour);
        const isPast = start.getTime() < now.getTime();
        const { cap, released } = capacityFor(ct.categoryId, rng);
        const peak = isPeakHour(start);
        const fillTarget = peak ? rng.next() * 0.5 + 0.45 : rng.next() * 0.6 + 0.15;
        const seedBooked =
          studio.id === DEMO_STUDIO_ID
            ? 0
            : Math.min(released, Math.round(released * fillTarget));
        sessions.push({
          id: `se_${studio.id}_${d + DAYS_BACK}_${hour * 10}`,
          studioId: studio.id,
          classTypeId: ct.id,
          startsAt: iso(start),
          durationMin: ct.durationMin,
          instructor: rng.pick(INSTRUCTORS),
          capacity: cap,
          spotsReleasedToPlatform: released,
          floorPriceEUR: studio.defaultFloorPriceEUR,
          peak,
          status: isPast ? "completed" : "scheduled",
          seedBooked,
        });
      }
    }
  }

  /* Bookings, ledger, payouts -------------------------------------------------- */
  const bookings: Booking[] = [];
  const creditTxs: CreditTransaction[] = [];
  const payoutEntries: PayoutEntry[] = [];
  const notifications: AppNotification[] = [];

  const creditCostOf = (s: Session) =>
    computeCreditCost(
      s.floorPriceEUR,
      s.peak,
      s.spotsReleasedToPlatform > 0 ? s.seedBooked / s.spotsReleasedToPlatform : 0,
    );

  let n = 0;
  const nid = () => `sd_${n++}`;

  /** FORGE (demo studio): materialize a real roster + payout history. */
  const forgeSessions = sessions
    .filter((s) => s.studioId === DEMO_STUDIO_ID)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const memberPool = fakeMembers.map((m) => m.id);

  for (const s of forgeSessions) {
    const start = new Date(s.startsAt);
    const isPast = start.getTime() < now.getTime();
    const horizonDays = (start.getTime() - now.getTime()) / 86_400_000;
    // Future sessions further out have fewer bookings yet.
    const targetFill = isPast
      ? rng.next() * 0.35 + 0.55
      : Math.max(0.15, (rng.next() * 0.5 + 0.4) * (1 - horizonDays / 20));
    const count = Math.min(
      s.spotsReleasedToPlatform,
      Math.round(s.spotsReleasedToPlatform * targetFill),
    );
    const who = rng.shuffle(memberPool).slice(0, count);
    for (const userId of who) {
      const cost = creditCostOf(s);
      // Bookings are always created in the past — for future sessions clamp
      // the creation time to before "now".
      const createdAt = iso(
        new Date(
          Math.min(
            start.getTime() - rng.int(6, 96) * 3_600_000,
            now.getTime() - rng.int(1, 72) * 3_600_000,
          ),
        ),
      );
      if (isPast) {
        const roll = rng.next();
        const status: Booking["status"] =
          roll < 0.82 ? "completed" : roll < 0.9 ? "no_show" : "late_cancelled";
        const b: Booking = {
          id: nid(),
          userId,
          sessionId: s.id,
          studioId: s.studioId,
          status,
          creditCost: cost,
          payoutEUR: s.floorPriceEUR,
          qrToken: nid(),
          createdAt,
          checkedInAt: status === "completed" ? s.startsAt : undefined,
          cancelledAt:
            status === "late_cancelled"
              ? iso(new Date(start.getTime() - 2 * 3_600_000))
              : undefined,
        };
        bookings.push(b);
        payoutEntries.push({
          id: nid(),
          studioId: s.studioId,
          bookingId: b.id,
          sessionId: s.id,
          userId,
          amountEUR: s.floorPriceEUR,
          status: status === "completed" ? "confirmed" : "reversed",
          createdAt,
          confirmedAt: status === "completed" ? s.startsAt : undefined,
        });
      } else {
        const b: Booking = {
          id: nid(),
          userId,
          sessionId: s.id,
          studioId: s.studioId,
          status: "reserved",
          creditCost: cost,
          payoutEUR: s.floorPriceEUR,
          qrToken: nid(),
          createdAt,
        };
        bookings.push(b);
        payoutEntries.push({
          id: nid(),
          studioId: s.studioId,
          bookingId: b.id,
          sessionId: s.id,
          userId,
          amountEUR: s.floorPriceEUR,
          status: "pending",
          createdAt,
        });
      }
    }
  }

  /* Demo member: subscription, ledger, personal bookings ----------------------- */
  const cycleStart = addDays(today, -12);
  const cycleEnd = addDays(today, 18);
  const subscription: Subscription = {
    id: "sub_demo",
    userId: DEMO_MEMBER_ID,
    planId: "plus",
    status: "active",
    creditsPerCycle: 22,
    priceEUR: 59,
    cycleStart: iso(cycleStart),
    cycleEnd: iso(cycleEnd),
  };

  const tx = (
    t: Omit<CreditTransaction, "id" | "userId">,
  ): CreditTransaction => ({ id: nid(), userId: DEMO_MEMBER_ID, ...t });

  // Previous cycle: grant +22 fully spent across 5 visits (net 0).
  creditTxs.push(
    tx({
      type: "topup",
      reason: "cycle_grant",
      status: "confirmed",
      delta: 22,
      createdAt: iso(addDays(today, -42)),
      settledAt: iso(addDays(today, -42)),
    }),
  );

  /** Helper: book the demo member into a real session near a target day. */
  const memberBooking = (
    studioId: string,
    dayOffset: number,
    opts: {
      status: Booking["status"];
      pending?: boolean;
    },
  ): Booking | null => {
    const target = addDays(today, dayOffset).getTime();
    const candidates = sessions
      .filter(
        (s) =>
          s.studioId === studioId &&
          Math.abs(new Date(s.startsAt).getTime() - target) < 3 * 86_400_000 &&
          (dayOffset < 0
            ? new Date(s.startsAt).getTime() < now.getTime()
            : new Date(s.startsAt).getTime() > now.getTime() + 3_600_000) &&
          !bookings.some(
            (b) => b.sessionId === s.id && b.userId === DEMO_MEMBER_ID,
          ) &&
          // keep at least one free platform spot for this booking
          s.seedBooked +
            bookings.filter(
              (b) =>
                b.sessionId === s.id &&
                ["reserved", "checked_in", "completed"].includes(b.status),
            ).length <
            s.spotsReleasedToPlatform,
      )
      .sort(
        (a, b) =>
          Math.abs(new Date(a.startsAt).getTime() - target) -
          Math.abs(new Date(b.startsAt).getTime() - target),
      );
    const s = candidates[0];
    if (!s) return null;
    const cost = creditCostOf(s);
    const b: Booking = {
      id: nid(),
      userId: DEMO_MEMBER_ID,
      sessionId: s.id,
      studioId,
      status: opts.status,
      creditCost: cost,
      payoutEUR: s.floorPriceEUR,
      qrToken: nid(),
      createdAt: iso(new Date(new Date(s.startsAt).getTime() - 48 * 3_600_000)),
      checkedInAt: opts.status === "completed" ? s.startsAt : undefined,
      cancelledAt:
        opts.status === "late_cancelled"
          ? iso(new Date(new Date(s.startsAt).getTime() - 2 * 3_600_000))
          : undefined,
    };
    bookings.push(b);
    payoutEntries.push({
      id: nid(),
      studioId,
      bookingId: b.id,
      sessionId: s.id,
      userId: DEMO_MEMBER_ID,
      amountEUR: s.floorPriceEUR,
      status:
        opts.status === "completed"
          ? "confirmed"
          : opts.status === "reserved"
            ? "pending"
            : "reversed",
      createdAt: b.createdAt,
      confirmedAt: opts.status === "completed" ? s.startsAt : undefined,
    });
    return b;
  };

  // Previous-cycle history (5 completed visits, spends confirmed, total 22).
  const prevSpends: [string, number][] = [
    ["st_core", -40],
    ["st_loft", -36],
    ["st_northside", -30],
    ["st_core", -24],
    ["st_volt", -16],
  ];
  const prevCosts = [5, 4, 5, 4, 4];
  prevSpends.forEach(([studioId, dayOff], i) => {
    const b = memberBooking(studioId, dayOff, { status: "completed" });
    if (b) {
      b.creditCost = prevCosts[i]; // normalize so the old cycle nets to zero
      creditTxs.push(
        tx({
          type: "spend",
          reason: "booking",
          status: "confirmed",
          delta: -prevCosts[i],
          bookingId: b.id,
          studioId,
          createdAt: b.createdAt,
          settledAt: b.checkedInAt,
        }),
      );
    }
  });

  // Current cycle grant.
  creditTxs.push(
    tx({
      type: "topup",
      reason: "cycle_grant",
      status: "confirmed",
      delta: 22,
      createdAt: iso(cycleStart),
      settledAt: iso(cycleStart),
    }),
  );
  // Top-up pack inside the cycle.
  creditTxs.push(
    tx({
      type: "topup",
      reason: "topup_pack",
      status: "confirmed",
      delta: 12,
      createdAt: iso(addDays(today, -9)),
      settledAt: iso(addDays(today, -9)),
    }),
  );

  // Current cycle completed visits: 2× CORE (drives the 3/4 cap story) + 1 more.
  const cur1 = memberBooking("st_core", -10, { status: "completed" });
  const cur2 = memberBooking("st_core", -5, { status: "completed" });
  const cur3 = memberBooking("st_breathe", -3, { status: "completed" });
  for (const b of [cur1, cur2, cur3]) {
    if (b) {
      creditTxs.push(
        tx({
          type: "spend",
          reason: "booking",
          status: "confirmed",
          delta: -b.creditCost,
          bookingId: b.id,
          studioId: b.studioId,
          createdAt: b.createdAt,
          settledAt: b.checkedInAt,
        }),
      );
    }
  }

  // A late cancellation: spend reversed + fee charged.
  const lateB = memberBooking("st_ko", -6, { status: "late_cancelled" });
  if (lateB) {
    creditTxs.push(
      tx({
        type: "spend",
        reason: "booking",
        status: "reversed",
        delta: -lateB.creditCost,
        bookingId: lateB.id,
        studioId: lateB.studioId,
        createdAt: lateB.createdAt,
        settledAt: lateB.cancelledAt,
      }),
      tx({
        type: "fee",
        reason: "late_cancel_fee",
        status: "confirmed",
        delta: -2,
        bookingId: lateB.id,
        studioId: lateB.studioId,
        createdAt: lateB.cancelledAt!,
        settledAt: lateB.cancelledAt,
      }),
    );
  }

  // Upcoming reserved: one at FORGE (cross-side demo!) + one at CORE (→ 3/4 cap).
  const up1 = memberBooking(DEMO_STUDIO_ID, 1, { status: "reserved" });
  const up2 = memberBooking("st_core", 3, { status: "reserved" });
  for (const b of [up1, up2]) {
    if (b) {
      creditTxs.push(
        tx({
          type: "spend",
          reason: "booking",
          status: "pending",
          delta: -b.creditCost,
          bookingId: b.id,
          studioId: b.studioId,
          createdAt: b.createdAt,
        }),
      );
    }
  }

  /* Reviews ------------------------------------------------------------------ */
  const reviews: Review[] = [];
  for (const studio of studios) {
    const count = rng.int(3, 6);
    const picks = rng.shuffle(REVIEW_POOL).slice(0, count);
    picks.forEach((p, i) => {
      const author = rng.pick(fakeMembers);
      reviews.push({
        id: `rv_${studio.id}_${i}`,
        studioId: studio.id,
        userId: author.id,
        authorName: author.name,
        rating: p.rating,
        text: p.text,
        lang: p.lang,
        createdAt: iso(addDays(today, -rng.int(2, 90))),
      });
    });
    studio.reviewCount = count + rng.int(14, 80);
  }

  /* Favorites ------------------------------------------------------------------ */
  const favorites: Favorite[] = [
    { userId: DEMO_MEMBER_ID, studioId: "st_core", createdAt: iso(addDays(today, -40)) },
    { userId: DEMO_MEMBER_ID, studioId: "st_loft", createdAt: iso(addDays(today, -25)) },
    { userId: DEMO_MEMBER_ID, studioId: DEMO_STUDIO_ID, createdAt: iso(addDays(today, -10)) },
  ];

  /* Notifications ---------------------------------------------------------------- */
  const notif = (
    userId: string,
    kind: AppNotification["kind"],
    title: AppNotification["title"],
    body: AppNotification["body"],
    daysAgo: number,
    href?: string,
    read = false,
  ): AppNotification => ({
    id: nid(),
    userId,
    kind,
    title,
    body,
    href,
    read,
    createdAt: iso(new Date(now.getTime() - daysAgo * 86_400_000)),
  });

  notifications.push(
    notif(
      DEMO_MEMBER_ID,
      "booking",
      { el: "Η κράτησή σου επιβεβαιώθηκε", en: "Your booking is confirmed" },
      {
        el: "FORGE Athletic Club — αύριο. Το QR σου είναι έτοιμο.",
        en: "FORGE Athletic Club — tomorrow. Your QR is ready.",
      },
      0.2,
      "/member/bookings",
    ),
    notif(
      DEMO_MEMBER_ID,
      "wallet",
      { el: "+12 credits προστέθηκαν", en: "+12 credits added" },
      {
        el: "Το top-up πακέτο σου ολοκληρώθηκε.",
        en: "Your top-up pack was processed.",
      },
      9,
      "/member/wallet",
      true,
    ),
    notif(
      DEMO_MEMBER_ID,
      "system",
      { el: "Νέο στούντιο στην Καλαμαριά", en: "New studio in Kalamaria" },
      {
        el: "Το Spark EMS Lab μόλις μπήκε στο PULSE.",
        en: "Spark EMS Lab just joined PULSE.",
      },
      4,
      "/member/studios/st_spark",
      true,
    ),
    notif(
      DEMO_MEMBER_ID,
      "wallet",
      { el: "Ανανέωση κύκλου: +22 credits", en: "Cycle renewed: +22 credits" },
      {
        el: "Ο μηνιαίος κύκλος Plus ξεκίνησε.",
        en: "Your monthly Plus cycle has started.",
      },
      12,
      "/member/wallet",
      true,
    ),
    notif(
      DEMO_OWNER_ID,
      "booking",
      { el: "Νέα κράτηση μέσω PULSE", en: "New PULSE booking" },
      {
        el: "Έλενα Βασιλείου — αυριανό WOD.",
        en: "Elena Vasileiou — tomorrow's WOD.",
      },
      0.15,
      "/studio/roster",
    ),
    notif(
      DEMO_OWNER_ID,
      "payout",
      { el: "Πληρωμές επιβεβαιώθηκαν", en: "Payouts confirmed" },
      {
        el: "Τα σημερινά check-ins κατοχύρωσαν τις αντίστοιχες πληρωμές.",
        en: "Today's check-ins locked in their payouts.",
      },
      1,
      "/studio/payouts",
      true,
    ),
  );

  return {
    seededAt: iso(now),
    users: [demoMember, demoOwner, ...fakeMembers, ...ownerUsers],
    cities: CITIES,
    neighborhoods: NEIGHBORHOODS,
    categories: CATEGORIES,
    plans: PLANS,
    studios,
    classTypes,
    sessions,
    bookings,
    subscriptions: [subscription],
    creditTxs,
    payoutEntries,
    reviews,
    notifications,
    favorites,
    // Seeded empty: the demo builds its own queues as sessions fill up.
    waitlist: [],
  };
}
