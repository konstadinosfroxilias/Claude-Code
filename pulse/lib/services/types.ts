/**
 * THE SEAM. These interfaces are the only contract between the UI and any
 * data source. Today they're implemented by lib/services/mock (localStorage);
 * a real backend (REST/tRPC + DB + Stripe Connect + real auth) replaces the
 * implementations behind getServices() — UI components never change.
 */
import type {
  AchievementView,
  AppNotification,
  BookingEligibility,
  BookingView,
  CancellationQuote,
  Category,
  City,
  ClassType,
  CreditTransaction,
  DiscoverySuggestion,
  EngagementPrefs,
  EngagementSummary,
  HabitNudge,
  Invoice,
  LanguageCode,
  LocalizedText,
  MemberGoal,
  MemberStats,
  ProgressInsights,
  RoutineSuggestion,
  WeeklyRecap,
  PayoutEntryView,
  PayoutStatement,
  PayoutSummary,
  Plan,
  Review,
  Role,
  RosterEntry,
  Session,
  SessionCreateInput,
  SessionView,
  Studio,
  StudioAnalytics,
  StudioFilter,
  Subscription,
  User,
  VisitCapStatus,
  WaitlistEntry,
  WaitlistView,
} from "@/lib/types";

export interface AuthService {
  /** Demo sign-in: resolves the seeded demo account for the given role. */
  signInAsDemo(role: Role): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

export interface CatalogService {
  listCities(): Promise<City[]>;
  listNeighborhoods(cityId?: string): Promise<import("@/lib/types").Neighborhood[]>;
  listCategories(): Promise<Category[]>;
  listStudios(filter?: StudioFilter): Promise<Studio[]>;
  getStudio(id: string): Promise<Studio | null>;
  /** Sessions for one studio on one day, enriched with cost + availability. */
  listStudioSessions(studioId: string, dayISO: string): Promise<SessionView[]>;
  /** Bookable sessions across studios (e.g. "available today"). */
  listOpenSessions(opts: {
    cityId?: string;
    dayISO: string;
    limit?: number;
  }): Promise<SessionView[]>;
  /**
   * Sessions starting within `withinHours` from now, across all studios —
   * the "starting soon" feed. Includes full sessions so the UI can offer the
   * waitlist. Ranking is done client-side (it depends on the member's
   * location, which never leaves the device).
   */
  listStartingSoon(opts: {
    cityId?: string;
    withinHours: number;
    limit?: number;
  }): Promise<SessionView[]>;
  getSessionView(sessionId: string): Promise<SessionView | null>;
  listFavorites(userId: string): Promise<Studio[]>;
  isFavorite(userId: string, studioId: string): Promise<boolean>;
  toggleFavorite(userId: string, studioId: string): Promise<boolean>;
}

export interface BookingService {
  listMyBookings(userId: string): Promise<BookingView[]>;
  getBookingView(bookingId: string): Promise<BookingView | null>;
  /** Pre-flight: can this user book this session? Includes cap + cost info. */
  checkEligibility(userId: string, sessionId: string): Promise<BookingEligibility>;
  /** Reserve: writes PENDING credit spend + PENDING studio payout accrual. */
  reserve(userId: string, sessionId: string): Promise<BookingView>;
  /** What cancelling now would cost (before/after cutoff). */
  quoteCancellation(bookingId: string): Promise<CancellationQuote>;
  cancel(bookingId: string): Promise<{ late: boolean; feeCredits: number }>;
  /** Check-in (QR/simulated/roster): flips spend + payout to CONFIRMED. */
  checkIn(bookingId: string): Promise<BookingView>;
  /** Studio-side: mark a no-show — fee to member, payout reversed. */
  markNoShow(bookingId: string): Promise<BookingView>;
  visitCapStatus(userId: string, studioId: string): Promise<VisitCapStatus>;

  /* ------------------------------ Waitlist ------------------------------ */
  /**
   * Queue for a full session. Charges nothing now: verifies the balance and
   * records a soft hold. Throws `not_full`, `already_waitlisted`,
   * `already_booked`, `insufficient_credits` or `visit_cap`.
   */
  joinWaitlist(userId: string, sessionId: string): Promise<WaitlistEntry>;
  /** Leave the queue and release the hold; positions behind shift up. */
  leaveWaitlist(userId: string, sessionId: string): Promise<void>;
  listMyWaitlist(userId: string): Promise<WaitlistView[]>;
  /** Studio-side: who is queued for a session, in order. */
  listSessionWaitlist(sessionId: string): Promise<WaitlistEntry[]>;
}

export interface WalletService {
  getSummary(userId: string): Promise<import("@/lib/types").WalletSummary>;
  listTransactions(userId: string): Promise<CreditTransaction[]>;
  /** Mock payment → confirmed top-up ledger entry. */
  topUp(userId: string, packId: string): Promise<CreditTransaction>;
}

export interface SubscriptionService {
  listPlans(): Promise<Plan[]>;
  getMySubscription(userId: string): Promise<Subscription | null>;
  changePlan(userId: string, planId: Plan["id"]): Promise<Subscription>;
  listInvoices(userId: string): Promise<Invoice[]>;
}

export interface PayoutService {
  getSummary(studioId: string): Promise<PayoutSummary>;
  listEntries(
    studioId: string,
    opts?: { month?: string; limit?: number },
  ): Promise<PayoutEntryView[]>;
  listStatements(studioId: string): Promise<PayoutStatement[]>;
}

export interface ReviewService {
  listForStudio(studioId: string): Promise<Review[]>;
  add(input: {
    studioId: string;
    userId: string;
    rating: number;
    text: string;
    lang: LanguageCode;
  }): Promise<Review>;
}

export interface NotificationService {
  list(userId: string): Promise<AppNotification[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export interface StudioAdminService {
  getMyStudio(ownerId: string): Promise<Studio | null>;
  updateStudio(studioId: string, patch: Partial<Studio>): Promise<Studio>;
  listClassTypes(studioId: string): Promise<ClassType[]>;
  /** All sessions in a day range (past + future), enriched. */
  listSessions(studioId: string, fromISO: string, toISO: string): Promise<SessionView[]>;
  createSession(input: SessionCreateInput): Promise<Session>;
  updateSession(
    sessionId: string,
    patch: Partial<
      Pick<
        Session,
        | "startsAt"
        | "capacity"
        | "spotsReleasedToPlatform"
        | "floorPriceEUR"
        | "peak"
        | "instructor"
      >
    >,
  ): Promise<Session>;
  /** Cancels the session, refunds all reserved members, reverses payouts. */
  cancelSession(sessionId: string): Promise<void>;
  getRoster(sessionId: string): Promise<RosterEntry[]>;
}

export interface AnalyticsService {
  getMemberStats(userId: string): Promise<MemberStats>;
  getStudioAnalytics(studioId: string): Promise<StudioAnalytics>;
}

export interface DemoService {
  /** Reset all demo data to the fresh seed. */
  reset(): Promise<void>;
}

/**
 * Engagement — weekly goal, week streak, achievements, progress, nudges,
 * discovery. Only the goal, achievement unlocks, nudge prefs and nudge
 * deliveries are PERSISTED; everything else is derived from bookings through
 * the pure rules in lib/rules/engagement.ts, so every implementation agrees.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TODO(backend) — THIS INTERFACE IS THE SEAM. Today it is implemented only by
 * lib/services/mock/engagement.ts against the localStorage store. A real
 * backend implements the SAME methods and the UI does not change at all:
 *
 *   Persist just four things (everything else stays derived):
 *     goals               (user_id PK, weekly_target int 1..5, updated_at)
 *     member_achievements (user_id + achievement_id PK, unlocked_at)
 *     engagement_prefs    (user_id PK, nudges_enabled bool, nudges_muted_until)
 *     nudge_deliveries    (user_id + nudge_id PK, delivered_at)
 *
 *   Keep lib/rules/engagement.ts as the single source of truth — it is pure
 *   and takes `now` as a parameter, so it can run server-side unchanged.
 *   Row-level security is simply "a member reads and writes only their own
 *   rows"; the achievements CATALOG is static (ACHIEVEMENTS in that module)
 *   and needs no table unless you want it editable.
 *
 *   Two invariants a backend MUST preserve:
 *     - setGoal clamps to 1..5 (clampGoal). Never auto-escalate a target.
 *     - syncAchievements and markNudgeDelivered are idempotent; the latter
 *       resolves true only on the first delivery of a given nudge id.
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface EngagementService {
  getGoal(userId: string): Promise<MemberGoal>;
  /** Clamped to 1–5. Never auto-escalated by the app. */
  setGoal(userId: string, weeklyTarget: number): Promise<MemberGoal>;
  /** Goal + this week's progress + streak in one read (home / profile). */
  getSummary(userId: string): Promise<EngagementSummary>;

  /** Full catalog with the member's unlock state and progress. */
  listAchievements(userId: string): Promise<AchievementView[]>;
  /**
   * Evaluate against the latest bookings, persist any new unlocks and return
   * ONLY the newly unlocked ones (drives the unlock moment). Idempotent.
   */
  syncAchievements(userId: string): Promise<AchievementView[]>;

  getProgressInsights(userId: string): Promise<ProgressInsights>;
  getWeeklyRecap(userId: string): Promise<WeeklyRecap>;

  getPrefs(userId: string): Promise<EngagementPrefs>;
  setPrefs(
    userId: string,
    patch: Partial<Pick<EngagementPrefs, "nudgesEnabled" | "nudgesMutedUntil">>,
  ): Promise<EngagementPrefs>;

  /** Current nudges (0 or 1). Empty unless the member opted in and isn't muted. */
  getNudges(userId: string): Promise<HabitNudge[]>;
  /**
   * Record that a nudge was surfaced so it is never repeated; optionally
   * mirror it into the in-app notification feed. Resolves true only the
   * first time (so callers can fire a browser notification exactly once).
   */
  markNudgeDelivered(
    userId: string,
    nudgeId: string,
    notification?: { title: LocalizedText; body: LocalizedText; href?: string },
  ): Promise<boolean>;
  /** Next logical booking: usual slot if the history shows one, else a rebook of the last class. */
  getRoutine(userId: string): Promise<RoutineSuggestion | null>;

  /** Untried categories / studios with a beginner-friendly upcoming class. */
  listDiscoveries(
    userId: string,
    opts?: { cityId?: string; limit?: number },
  ): Promise<DiscoverySuggestion[]>;
}

export interface Services {
  auth: AuthService;
  catalog: CatalogService;
  booking: BookingService;
  wallet: WalletService;
  subscriptions: SubscriptionService;
  payouts: PayoutService;
  reviews: ReviewService;
  notifications: NotificationService;
  studioAdmin: StudioAdminService;
  analytics: AnalyticsService;
  engagement: EngagementService;
  demo: DemoService;
  /**
   * Change feed: fires after any write so live queries can refetch.
   * A real backend maps this to websockets/SSE/polling.
   */
  subscribe(listener: () => void): () => void;
}
