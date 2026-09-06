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

/**
 * A member queued for a full session.
 *
 * Joining charges nothing: `holdCredits` is a SOFT hold (verified against the
 * balance at join time, not deducted). On promotion the hold becomes a real
 * pending credit spend, exactly like a normal booking.
 */
export interface WaitlistEntry {
  id: string;
  sessionId: string;
  studioId: string;
  userId: string;
  /** 1-based queue position; recomputed when entries leave. */
  position: number;
  holdCredits: number;
  createdAt: string;
}

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
  /** True when this reservation came from an automatic waitlist promotion. */
  fromWaitlist?: boolean;
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

export type NotificationKind =
  | "booking"
  | "wallet"
  | "payout"
  | "system"
  /** Opt-in habit nudges (see lib/rules/engagement). */
  | "habit";

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
  /** Members queued for this session (0 when nobody is waiting). */
  waitlistCount: number;
}

export interface BookingView {
  booking: Booking;
  session: Session;
  classType: ClassType;
  studio: Studio;
}

/** A member's waitlist entry, enriched for "My bookings". */
export interface WaitlistView {
  entry: WaitlistEntry;
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
  /**
   * True when the ONLY thing blocking the booking is that the session is
   * full — i.e. the member may join the waitlist instead.
   */
  canJoinWaitlist: boolean;
  /** Set when this member already holds a queue place. */
  waitlistPosition?: number;
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

/* ---------------------------------------------------------------------------
   Engagement layer — healthy by design.

   Everything here motivates through CONSISTENCY, PROGRESS, VARIETY and
   ENJOYMENT. There is deliberately no weight, calorie, body-shape or
   "before/after" concept anywhere in the model. Goals and streaks are
   WEEK-based (never daily), rest weeks are first-class, and every nudge is
   opt-in and muteable. See lib/rules/engagement.ts for the rules.
--------------------------------------------------------------------------- */

/** A member's self-chosen weekly class target (1–5, default 2). Persisted. */
export interface MemberGoal {
  userId: string;
  weeklyTarget: number;
  updatedAt: string;
}

/** Where this week stands against the goal. Derived from bookings. */
export interface WeeklyProgress {
  /** Monday 00:00 local, ISO. */
  weekStart: string;
  /** Next Monday 00:00 local, ISO (exclusive). */
  weekEnd: string;
  /** Attended (checked-in / completed) classes with a start inside the week. */
  attended: number;
  target: number;
  met: boolean;
  /** attended / target, capped at 1. */
  ratio: number;
  /** Reserved classes later this week — "already on the calendar". */
  planned: number;
  /** Whole days left in the week including today (1–7). */
  daysLeft: number;
}

/**
 * Week streak states, from warmest to freshest:
 * - on_track:    this week already has a class — the streak includes it.
 * - building:    last week was active; this week is still open.
 * - rested:      last week was a rest week — allowed, the streak is kept.
 * - fresh_start: no live streak. "New week, fresh start." Never a failure.
 */
export type StreakState = "on_track" | "building" | "rested" | "fresh_start";

export interface StreakStatus {
  /** Active weeks (≥1 attended class) in the current run. Rest weeks don't count, but don't break it. */
  weeks: number;
  state: StreakState;
  /** Longest run ever, for a quiet "personal best" line. */
  longest: number;
}

export interface EngagementSummary {
  goal: MemberGoal;
  progress: WeeklyProgress;
  streak: StreakStatus;
}

export type AchievementId =
  | "first_booking"
  | "first_checkin"
  | "classes_5"
  | "classes_10"
  | "classes_25"
  | "classes_50"
  | "goal_week"
  | "goal_month"
  | "three_categories"
  | "new_neighborhood"
  | "explorer_5"
  | "early_bird"
  | "comeback";

export type AchievementGroup = "start" | "consistency" | "variety" | "moments";

/** Catalog row. Titles/bodies live in i18n (`achievements.<id>.title/body`). */
export interface Achievement {
  id: AchievementId;
  group: AchievementGroup;
  order: number;
  /** Countable goal (e.g. 25 classes); undefined for one-off moments. */
  target?: number;
}

/** Persisted unlock. One row per member × achievement. */
export interface MemberAchievement {
  userId: string;
  achievementId: AchievementId;
  unlockedAt: string;
}

export interface AchievementView {
  achievement: Achievement;
  unlockedAt?: string;
  /** Progress toward `target` (0..target). Equals target once unlocked. */
  progress: number;
}

export type HourBand = "morning" | "midday" | "evening";

export interface ProgressInsights {
  classesThisMonth: number;
  classesAllTime: number;
  minutesThisMonth: number;
  minutesAllTime: number;
  /** All-time category mix, most attended first. */
  categoryMix: { categoryId: CategoryId; count: number }[];
  favoriteStudio?: { studioId: string; name: string; count: number };
  /** 0 = Sunday … 6 = Saturday (JS convention). */
  mostActiveWeekday?: number;
  mostActiveHourBand?: HourBand;
  /** Last 8 weeks, oldest first. */
  weeklyTrend: { weekStart: string; label: string; attended: number; minutes: number }[];
  /** Last 6 months, oldest first. */
  monthlyTrend: { month: string; label: string; attended: number }[];
  studiosVisited: number;
}

/** "Your week in movement" — shareable, body-neutral. */
export interface WeeklyRecap {
  /** Which week the recap describes. */
  scope: "current" | "last";
  weekStart: string;
  weekEnd: string;
  attended: number;
  target: number;
  met: boolean;
  minutes: number;
  categoryIds: CategoryId[];
  studioNames: string[];
  /** A studio visited for the very first time this week, if any. */
  firstTimeStudio?: string;
  streakWeeks: number;
}

/** Opt-in nudge preferences. Off by default; muting is one tap. */
export interface EngagementPrefs {
  userId: string;
  nudgesEnabled: boolean;
  /** While set and in the future, no nudges are produced. */
  nudgesMutedUntil?: string;
  updatedAt: string;
}

/** Persisted "already shown" marker so a nudge is delivered at most once. */
export interface NudgeDelivery {
  userId: string;
  nudgeId: string;
  deliveredAt: string;
}

export type NudgeKind =
  /** "You usually train Tue 19:00 — here's this week's." */
  | "usual_slot"
  /** "Book the same class as last time?" */
  | "rebook_last"
  /** Kind check-in after ≥14 quiet days. No guilt. */
  | "been_a_while"
  /** Frequent trainers are told a lighter week is a good idea. */
  | "ease_off";

export interface HabitNudge {
  /** Stable per kind × week so a nudge is delivered at most once. */
  id: string;
  kind: NudgeKind;
  /** Bookable session for usual_slot / rebook_last. */
  session?: SessionView;
}

/** The member's inferred "usual slot", when the history is clear enough. */
export interface RoutineSignal {
  weekday: number;
  hour: number;
  studioId: string;
  classTypeId: string;
  /** Times this exact pattern was attended in the lookback window. */
  count: number;
}

/** Next logical booking: the routine slot, or a plain rebook of the last class. */
export interface RoutineSuggestion {
  basis: "usual_slot" | "last_class";
  signal?: RoutineSignal;
  session: SessionView;
}

export type DiscoveryReason =
  | "untried_category"
  | "untried_studio"
  | "new_neighborhood";

/** "Try something new" candidate — optional, never pushed. */
export interface DiscoverySuggestion {
  reason: DiscoveryReason;
  studio: Studio;
  categoryId: CategoryId;
  /** A beginner-friendly upcoming session with spots, when one exists. */
  session?: SessionView;
}
