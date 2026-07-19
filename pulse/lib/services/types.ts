/**
 * THE SEAM. These interfaces are the only contract between the UI and any
 * data source. Today they're implemented by lib/services/mock (localStorage);
 * a real backend (REST/tRPC + DB + Stripe Connect + real auth) replaces the
 * implementations behind getServices() — UI components never change.
 */
import type {
  AppNotification,
  BookingEligibility,
  BookingView,
  CancellationQuote,
  Category,
  City,
  ClassType,
  CreditTransaction,
  Invoice,
  LanguageCode,
  MemberStats,
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
  demo: DemoService;
  /**
   * Change feed: fires after any write so live queries can refetch.
   * A real backend maps this to websockets/SSE/polling.
   */
  subscribe(listener: () => void): () => void;
}
