/**
 * PULSE domain model — the single source of truth for every entity the app
 * knows about. Both the mock services and any future real backend speak in
 * these types; UI components import from here and nowhere else.
 */

export type LanguageCode = "el" | "en";

/** Copy that ships in data (studio descriptions, notifications, …). */
export interface LocalizedText {
  el: string;
  en: string;
}

export type Role = "member" | "studio_owner";

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  memberSince: string; // ISO date
  /** Only for studio_owner — the studio they manage. */
  studioId?: string;
}

export type CityId = "thessaloniki" | "athens";

export interface City {
  id: CityId;
  name: LocalizedText;
  lat: number;
  lng: number;
  zoom: number;
}

export interface Neighborhood {
  id: string;
  cityId: CityId;
  name: LocalizedText;
}

export type CategoryId =
  | "pilates"
  | "crossfit"
  | "boxing"
  | "ems"
  | "yoga"
  | "hiit";

export interface Category {
  id: CategoryId;
  name: LocalizedText;
  /** Index into the cover-art palette table (see components/shared/cover-art). */
  palette: number;
}

export type AmenityId =
  | "showers"
  | "lockers"
  | "towels"
  | "parking"
  | "wifi"
  | "water"
  | "ac"
  | "shop";

export interface Studio {
  id: string;
  ownerId: string;
  name: string;
  cityId: CityId;
  neighborhoodId: string;
  categoryIds: CategoryId[];
  description: LocalizedText;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  amenities: AmenityId[];
  featured: boolean;
  /** Visual seed for deterministic cover art (no external images needed). */
  artSeed: number;
  /* -------- Studio-controlled policy (the platform never overrides) ------ */
  /** Default € the studio earns per confirmed attendance. */
  defaultFloorPriceEUR: number;
  /** Free cancellation until this many hours before start. */
  cancellationCutoffHours: number;
}

export interface ClassType {
  id: string;
  studioId: string;
  categoryId: CategoryId;
  name: string;
  durationMin: number;
  level: "all" | "beginner" | "intermediate" | "advanced";
  description: LocalizedText;
}

export type SessionStatus = "scheduled" | "cancelled" | "completed";

/** A scheduled class instance. creditCost is DERIVED — see lib/rules/pricing. */
export interface Session {
  id: string;
  studioId: string;
  classTypeId: string;
  startsAt: string; // ISO datetime
  durationMin: number;
  instructor: string;
  /** Total room capacity. */
  capacity: number;
  /** Spots the studio releases to PULSE for this session (studio-controlled). */
  spotsReleasedToPlatform: number;
  /** € the studio earns per confirmed attendance for this session. */
  floorPriceEUR: number;
  peak: boolean;
  status: SessionStatus;
  /**
   * Demo-only: baseline platform spots already taken by "other members" that
   * aren't materialized as Booking rows (keeps localStorage small). A real
   * backend counts actual bookings and leaves this at 0.
   */
  seedBooked: number;
}

export type BookingStatus =
  | "reserved"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "late_cancelled"
  | "no_show";

export interface Booking {
  id: string;
  userId: string;
  sessionId: string;
  studioId: string;
  status: BookingStatus;
  /** Credit cost snapshotted at reservation time. */
  creditCost: number;
  /** € payout snapshotted at reservation time (= session floor price). */
  payoutEUR: number;
  qrToken: string;
  createdAt: string;
  checkedInAt?: string;
  cancelledAt?: string;
}

export type PlanId = "starter" | "plus" | "premium";

export interface Plan {
  id: PlanId;
  name: LocalizedText;
  creditsPerCycle: number;
  priceEUR: number;
  blurb: LocalizedText;
  highlight: boolean;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  creditsPerCycle: number;
  priceEUR: number;
  cycleStart: string; // ISO
  cycleEnd: string; // ISO
}

export type CreditTxType = "spend" | "refund" | "topup" | "fee";
export type CreditTxStatus = "pending" | "confirmed" | "reversed";

/**
 * Credit ledger entry. `delta` is signed: spend/fee negative, refund/topup
 * positive. Balance = Σ delta of entries whose status ≠ reversed (pending
 * spends already reduce the available balance).
 */
export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTxType;
  status: CreditTxStatus;
  delta: number;
  /** Why the entry exists — rendered via i18n key + params. */
  reason:
    | "booking"
    | "late_cancel_fee"
    | "no_show_fee"
    | "cancel_refund"
    | "cycle_grant"
    | "topup_pack";
  bookingId?: string;
  studioId?: string;
  createdAt: string;
  settledAt?: string;
}

export type PayoutStatus = "pending" | "confirmed" | "reversed";

/** One per-attendance € accrual for a studio. Fully transparent. */
export interface PayoutEntry {
  id: string;
  studioId: string;
  bookingId: string;
  sessionId: string;
  userId: string;
  amountEUR: number;
  status: PayoutStatus;
  createdAt: string;
  confirmedAt?: string;
}

export interface Review {
  id: string;
  studioId: string;
  userId: string;
  authorName: string;
  rating: number; // 1..5
  text: string;
  lang: LanguageCode;
  createdAt: string;
}

export type NotificationKind = "booking" | "wallet" | "payout" | "system";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: LocalizedText;
  body: LocalizedText;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  studioId: string;
  createdAt: string;
}

/* ---------------------------------------------------------------------------
   Service-layer view models (DTOs) — enriched shapes the UI consumes so
   components never need to join raw entities themselves.
--------------------------------------------------------------------------- */

export interface SessionView {
  session: Session;
  classType: ClassType;
  studio: Studio;
  /** Derived by the pricing rules at read time. */
  creditCost: number;
  /** Bookings currently holding a platform spot. */
  booked: number;
  spotsLeft: number;
}

export interface BookingView {
  booking: Booking;
  session: Session;
  classType: ClassType;
  studio: Studio;
}

export interface WalletSummary {
  balance: number;
  pendingSpends: number;
  cycleGranted: number;
  cycleSpent: number;
  cycleEndsAt: string;
}

export interface VisitCapStatus {
  used: number;
  cap: number;
  /** true when another booking at this studio would exceed the cap. */
  reached: boolean;
}

export type BookingDenialReason =
  | "full"
  | "insufficient_credits"
  | "visit_cap"
  | "already_booked"
  | "in_past";

export interface BookingEligibility {
  ok: boolean;
  reason?: BookingDenialReason;
  creditCost: number;
  capStatus: VisitCapStatus;
}

export interface CancellationQuote {
  late: boolean;
  feeCredits: number;
  refundCredits: number;
  cutoffHours: number;
}

export interface RosterEntry {
  booking: Booking;
  memberName: string;
}

export interface PayoutSummary {
  pendingEUR: number;
  confirmedThisMonthEUR: number;
  confirmedAllTimeEUR: number;
  attendancesThisMonth: number;
}

export interface PayoutStatement {
  month: string; // YYYY-MM
  totalEUR: number;
  attendanceCount: number;
  entries: PayoutEntry[];
}

/** Payout accrual enriched for the transparent per-attendance breakdown. */
export interface PayoutEntryView {
  entry: PayoutEntry;
  memberName: string;
  className: string;
  sessionStartsAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  label: LocalizedText;
  amountEUR: number;
  issuedAt: string;
  status: "paid";
}

export interface MemberStats {
  classesThisMonth: number;
  streakWeeks: number;
  favoriteCategoryId?: CategoryId;
  totalClasses: number;
  studiosVisited: number;
  creditsSpentThisCycle: number;
}

export interface StudioKpis {
  bookingsThisMonth: number;
  attendanceRate: number; // 0..1 of completed vs booked
  fillRate: number; // 0..1 released spots filled (next 7 days)
  revenueThisMonthEUR: number;
}

export interface TimeSeriesPoint {
  label: string; // pre-formatted short date
  value: number;
}

export interface StudioAnalytics {
  kpis: StudioKpis;
  bookingsOverTime: TimeSeriesPoint[];
  newVsReturning: { label: string; newMembers: number; returning: number }[];
  fillRateByDay: TimeSeriesPoint[];
  categoryPerformance: { categoryId: CategoryId; bookings: number }[];
}

export interface StudioFilter {
  cityId?: CityId;
  neighborhoodId?: string;
  categoryId?: CategoryId;
  maxCredits?: number;
  availableToday?: boolean;
  query?: string;
}

export interface SessionCreateInput {
  studioId: string;
  classTypeId: string;
  startsAt: string;
  durationMin: number;
  instructor: string;
  capacity: number;
  spotsReleasedToPlatform: number;
  floorPriceEUR: number;
  peak: boolean;
}
