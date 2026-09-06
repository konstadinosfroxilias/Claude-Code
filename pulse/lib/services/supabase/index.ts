/**
 * Supabase implementation of the Services contract.
 *
 * The second of two interchangeable backends (the other is lib/services/mock).
 * Selected by NEXT_PUBLIC_USE_MOCK in lib/services/index.ts. No UI component
 * imports anything from this directory.
 *
 * Two rules keep the backends honest:
 *  1. Anything that must be ATOMIC (booking, check-in, cancel, waitlist
 *     promotion, top-up) is a Postgres function — see 0003_functions.sql. This
 *     module only calls rpc() and re-throws the typed error codes the UI
 *     already handles.
 *  2. Anything that is a RULE is imported from lib/rules/* — the same pure
 *     modules the mock uses. The entire engagement layer (goal, streak,
 *     achievements, insights, recap, routine, nudges) runs through
 *     lib/rules/engagement.ts here too, so the two backends cannot drift.
 */
import { getSupabase, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/supabase/client";
import type { PulseSupabase } from "@/lib/supabase/client";
import { useSessionStore } from "@/lib/stores/session";
import { POLICY } from "@/lib/rules/policy";
import {
  ACHIEVEMENTS,
  clampGoal,
  computeInsights,
  computeRecap,
  computeStreak,
  computeWeeklyProgress,
  evaluateAchievements,
  GOAL_DEFAULT,
  hourBand,
  inferRoutine,
  nudgeId,
  planNudges,
  type AttendanceFact,
} from "@/lib/rules/engagement";
import type {
  AchievementId,
  AchievementView,
  BookingDenialReason,
  BookingEligibility,
  BookingView,
  CategoryId,
  ClassType,
  DiscoverySuggestion,
  EngagementPrefs,
  HabitNudge,
  Invoice,
  MemberGoal,
  MemberStats,
  PayoutEntry,
  PayoutStatement,
  Role,
  RosterEntry,
  RoutineSignal,
  RoutineSuggestion,
  Session,
  SessionView,
  Studio,
  StudioAnalytics,
  Subscription,
  TimeSeriesPoint,
  User,
  VisitCapStatus,
  WaitlistView,
  WalletSummary,
} from "@/lib/types";
import { addDays, monthKey, startOfDay, uid } from "@/lib/utils";
import type { Services } from "../types";
import { ServiceError } from "../mock/helpers";
import { ChangeFeed } from "./realtime";
import {
  toBooking,
  toCategory,
  toCity,
  toClassType,
  toCreditTransaction,
  toNeighborhood,
  toNotification,
  toPayoutEntry,
  toPlan,
  toReview,
  toSession,
  toSessionView,
  toStudio,
  toSubscription,
  toUser,
  toWaitlistEntry,
  type SessionViewRow,
} from "./mappers";

const DAY_MS = 86_400_000;

let feed: ChangeFeed | null = null;
function changeFeed(): ChangeFeed {
  if (!feed) feed = new ChangeFeed(getSupabase());
  return feed;
}
function sb(): PulseSupabase {
  return getSupabase();
}
/** Fire the local change feed after a write so live queries refetch at once. */
function touched(): void {
  changeFeed().emit();
}

/* ------------------------------- errors ---------------------------------- */

/**
 * Postgres raises with the ServiceError code as the message (see
 * 0003_functions.sql), so error handling is identical in both backends.
 */
function rethrow(error: { message?: string } | null, fallback = "unknown"): never {
  const raw = error?.message ?? fallback;
  const code = raw.replace(/^.*?:\s*/, "").trim() || fallback;
  throw new ServiceError(code, raw);
}

function unwrapList<T>(res: { data: T[] | null; error: { message?: string } | null }): T[] {
  if (res.error) rethrow(res.error);
  return res.data ?? [];
}

/* ----------------------------- shared reads ------------------------------ */

const STUDIO_SELECT = "*, studio_categories(category_id)";

async function fetchStudios(ids?: string[]): Promise<Map<string, Studio>> {
  let q = sb().from("studios").select(STUDIO_SELECT);
  if (ids && ids.length > 0) q = q.in("id", ids);
  const rows = unwrapList(await q);
  return new Map(rows.map((r) => [r.id, toStudio(r)]));
}

async function fetchClassTypes(ids?: string[]): Promise<Map<string, ClassType>> {
  let q = sb().from("class_types").select("*");
  if (ids && ids.length > 0) q = q.in("id", ids);
  const rows = unwrapList(await q);
  return new Map(rows.map((r) => [r.id, toClassType(r)]));
}

/** Join session_view rows with their class type and studio. */
async function hydrateSessionViews(rows: SessionViewRow[]): Promise<SessionView[]> {
  if (rows.length === 0) return [];
  const [studios, classTypes] = await Promise.all([
    fetchStudios([...new Set(rows.map((r) => r.studio_id).filter((x): x is string => !!x))]),
    fetchClassTypes([...new Set(rows.map((r) => r.class_type_id).filter((x): x is string => !!x))]),
  ]);
  const out: SessionView[] = [];
  for (const row of rows) {
    const ct = classTypes.get(row.class_type_id ?? "");
    const st = studios.get(row.studio_id ?? "");
    if (ct && st) out.push(toSessionView(row, ct, st));
  }
  return out;
}

async function getSessionViewRow(sessionId: string): Promise<SessionView | null> {
  const rows = unwrapList(
    await sb().from("session_view").select("*").eq("id", sessionId).limit(1),
  );
  const views = await hydrateSessionViews(rows);
  return views[0] ?? null;
}

/** Bookings joined with everything BookingView needs. */
async function hydrateBookings(
  rows: { session_id: string; studio_id: string }[],
): Promise<{ sessions: Map<string, Session>; classTypes: Map<string, ClassType>; studios: Map<string, Studio> }> {
  const sessionIds = [...new Set(rows.map((r) => r.session_id))];
  const sessionRows = sessionIds.length
    ? unwrapList(await sb().from("sessions").select("*").in("id", sessionIds))
    : [];
  const sessions = new Map(sessionRows.map((r) => [r.id, toSession(r)]));
  const [classTypes, studios] = await Promise.all([
    fetchClassTypes([...new Set(sessionRows.map((r) => r.class_type_id))]),
    fetchStudios([...new Set(rows.map((r) => r.studio_id))]),
  ]);
  return { sessions, classTypes, studios };
}

async function walletSummaryFor(userId: string): Promise<WalletSummary> {
  const [txs, subs] = await Promise.all([
    sb().from("credit_transactions").select("*").eq("member_id", userId),
    sb().from("subscriptions").select("*").eq("member_id", userId).eq("status", "active").limit(1),
  ]);
  const rows = unwrapList(txs);
  const sub = unwrapList(subs)[0];
  let balance = 0;
  let pendingSpends = 0;
  for (const t of rows) {
    if (t.status === "reversed") continue;
    balance += t.delta;
    if (t.status === "pending" && t.delta < 0) pendingSpends += -t.delta;
  }
  const cycleStart = sub ? new Date(sub.cycle_start).getTime() : 0;
  const cycleSpent = rows
    .filter(
      (t) =>
        t.delta < 0 && t.status !== "reversed" && new Date(t.created_at).getTime() >= cycleStart,
    )
    .reduce((a, t) => a + -t.delta, 0);
  return {
    balance,
    pendingSpends,
    cycleGranted: sub?.credits_per_cycle ?? 0,
    cycleSpent,
    cycleEndsAt: sub?.cycle_end ?? new Date().toISOString(),
  };
}

/* ---------------------------------- auth --------------------------------- */

async function profileToUser(id: string): Promise<User | null> {
  const rows = unwrapList(await sb().from("profiles").select("*").eq("id", id).limit(1));
  const profile = rows[0];
  if (!profile) return null;
  let studioId: string | undefined;
  if (profile.role === "studio_owner") {
    const studios = unwrapList(
      await sb().from("studios").select("id").eq("owner_id", id).limit(1),
    );
    studioId = studios[0]?.id;
  }
  return toUser(profile, studioId);
}

const auth: Services["auth"] = {
  async signInAsDemo(role: Role) {
    const { email } = DEMO_ACCOUNTS[role];
    const { data, error } = await sb().auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });
    if (error) {
      throw new ServiceError(
        "demo_signin_failed",
        `Could not sign in as ${email}. Has the seed been run? (${error.message})`,
      );
    }
    const user = await profileToUser(data.user.id);
    if (!user) throw new ServiceError("user_not_found");
    useSessionStore.getState().setSession(user.id, user.role);
    return user;
  },

  async signOut() {
    await sb().auth.signOut();
    useSessionStore.getState().clearSession();
  },

  async getCurrentUser() {
    const { data } = await sb().auth.getUser();
    if (!data.user) return null;
    return profileToUser(data.user.id);
  },
};

/* -------------------------------- catalog -------------------------------- */

const catalog: Services["catalog"] = {
  async listCities() {
    return unwrapList(await sb().from("cities").select("*")).map(toCity);
  },

  async listNeighborhoods(cityId) {
    let q = sb().from("neighborhoods").select("*");
    if (cityId) q = q.eq("city_id", cityId);
    return unwrapList(await q).map(toNeighborhood);
  },

  async listCategories() {
    return unwrapList(await sb().from("categories").select("*")).map(toCategory);
  },

  async listStudios(filter) {
    let q = sb().from("studios").select(STUDIO_SELECT);
    if (filter?.cityId) q = q.eq("city_id", filter.cityId);
    if (filter?.neighborhoodId) q = q.eq("neighborhood_id", filter.neighborhoodId);
    if (filter?.query) q = q.or(`name.ilike.%${filter.query}%,address.ilike.%${filter.query}%`);
    let studios = unwrapList(await q).map(toStudio);

    if (filter?.categoryId) {
      studios = studios.filter((s) => s.categoryIds.includes(filter.categoryId as CategoryId));
    }

    // Cost / availability filters need upcoming sessions.
    if (filter?.maxCredits !== undefined || filter?.availableToday) {
      const now = new Date();
      const endOfToday = addDays(startOfDay(now), 1);
      const rows = unwrapList(
        await sb()
          .from("session_view")
          .select("studio_id, start_at, credit_cost, spots_left, status")
          .eq("status", "scheduled")
          .gt("start_at", now.toISOString()),
      );
      const minCost = new Map<string, number>();
      const openToday = new Set<string>();
      for (const r of rows) {
        const studioId = r.studio_id ?? "";
        const cost = r.credit_cost ?? 99;
        minCost.set(studioId, Math.min(minCost.get(studioId) ?? 99, cost));
        if ((r.spots_left ?? 0) > 0 && new Date(r.start_at ?? 0) < endOfToday) {
          openToday.add(studioId);
        }
      }
      if (filter.maxCredits !== undefined) {
        studios = studios.filter((s) => (minCost.get(s.id) ?? 99) <= filter.maxCredits!);
      }
      if (filter.availableToday) studios = studios.filter((s) => openToday.has(s.id));
    }

    return studios.sort(
      (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
    );
  },

  async getStudio(id) {
    const rows = unwrapList(await sb().from("studios").select(STUDIO_SELECT).eq("id", id).limit(1));
    return rows[0] ? toStudio(rows[0]) : null;
  },

  async listStudioSessions(studioId, dayISO) {
    const day = startOfDay(new Date(dayISO));
    const next = addDays(day, 1);
    const rows = unwrapList(
      await sb()
        .from("session_view")
        .select("*")
        .eq("studio_id", studioId)
        .eq("status", "scheduled")
        .gte("start_at", day.toISOString())
        .lt("start_at", next.toISOString())
        .order("start_at"),
    );
    return hydrateSessionViews(rows);
  },

  async listOpenSessions({ cityId, dayISO, limit = 12 }) {
    const day = startOfDay(new Date(dayISO));
    const next = addDays(day, 1);
    const now = new Date();
    const q = sb()
      .from("session_view")
      .select("*")
      .eq("status", "scheduled")
      .gt("start_at", now.toISOString())
      .lt("start_at", next.toISOString())
      .gte("start_at", day.toISOString())
      .gt("spots_left", 0)
      .order("start_at")
      .limit(limit * 3);
    const rows = unwrapList(await q);
    const views = await hydrateSessionViews(rows);
    return views.filter((v) => !cityId || v.studio.cityId === cityId).slice(0, limit);
  },

  async listStartingSoon({ cityId, withinHours, limit = 10 }) {
    const now = Date.now();
    // Leave a small lead time — a class starting in 3 minutes isn't bookable.
    const from = new Date(now + 10 * 60_000);
    const endOfToday = addDays(startOfDay(new Date()), 1).getTime();
    const until = new Date(Math.min(now + withinHours * 3_600_000, endOfToday));
    const rows = unwrapList(
      await sb()
        .from("session_view")
        .select("*")
        .eq("status", "scheduled")
        .gte("start_at", from.toISOString())
        .lte("start_at", until.toISOString())
        .order("start_at")
        .limit(limit * 3),
    );
    const views = await hydrateSessionViews(rows);
    return views.filter((v) => !cityId || v.studio.cityId === cityId).slice(0, limit);
  },

  async getSessionView(sessionId) {
    return getSessionViewRow(sessionId);
  },

  async listFavorites(userId) {
    const favs = unwrapList(
      await sb()
        .from("favorites")
        .select("studio_id, created_at")
        .eq("member_id", userId)
        .order("created_at", { ascending: false }),
    );
    if (favs.length === 0) return [];
    const studios = await fetchStudios(favs.map((f) => f.studio_id));
    return favs.map((f) => studios.get(f.studio_id)).filter((s): s is Studio => !!s);
  },

  async isFavorite(userId, studioId) {
    const rows = unwrapList(
      await sb()
        .from("favorites")
        .select("studio_id")
        .eq("member_id", userId)
        .eq("studio_id", studioId)
        .limit(1),
    );
    return rows.length > 0;
  },

  async toggleFavorite(userId, studioId) {
    const isFav = await catalog.isFavorite(userId, studioId);
    if (isFav) {
      const res = await sb()
        .from("favorites")
        .delete()
        .eq("member_id", userId)
        .eq("studio_id", studioId);
      if (res.error) rethrow(res.error);
    } else {
      const res = await sb().from("favorites").insert({ member_id: userId, studio_id: studioId });
      if (res.error) rethrow(res.error);
    }
    touched();
    return !isFav;
  },
};

/* -------------------------------- booking -------------------------------- */

async function capStatusFor(
  userId: string,
  studioId: string,
  atISO?: string,
): Promise<VisitCapStatus> {
  const { data, error } = await sb().rpc("visit_cap_status", {
    p_studio_id: studioId,
    p_at: atISO ?? new Date().toISOString(),
    p_member_id: userId,
  });
  if (error) rethrow(error);
  const row = (data as { used: number; cap: number; reached: boolean }[] | null)?.[0];
  return row ?? { used: 0, cap: POLICY.visitCapPerStudioPerMonth, reached: false };
}

async function bookingViewById(bookingId: string): Promise<BookingView> {
  const rows = unwrapList(await sb().from("bookings").select("*").eq("id", bookingId).limit(1));
  const row = rows[0];
  if (!row) throw new ServiceError("booking_not_found");
  const { sessions, classTypes, studios } = await hydrateBookings([row]);
  const session = sessions.get(row.session_id);
  const classType = session ? classTypes.get(session.classTypeId) : undefined;
  const studio = studios.get(row.studio_id);
  if (!session || !classType || !studio) throw new ServiceError("unknown");
  return { booking: toBooking(row), session, classType, studio };
}

const booking: Services["booking"] = {
  async listMyBookings(userId) {
    const rows = unwrapList(
      await sb()
        .from("bookings")
        .select("*")
        .eq("member_id", userId)
        .order("created_at", { ascending: false }),
    );
    if (rows.length === 0) return [];
    const { sessions, classTypes, studios } = await hydrateBookings(rows);
    return rows
      .map((row): BookingView | null => {
        const session = sessions.get(row.session_id);
        const classType = session ? classTypes.get(session.classTypeId) : undefined;
        const studio = studios.get(row.studio_id);
        if (!session || !classType || !studio) return null;
        return { booking: toBooking(row), session, classType, studio };
      })
      .filter((v): v is BookingView => v !== null)
      .sort((a, b) => b.session.startsAt.localeCompare(a.session.startsAt));
  },

  async getBookingView(bookingId) {
    try {
      return await bookingViewById(bookingId);
    } catch {
      return null;
    }
  },

  /**
   * Pre-flight only. The authoritative checks run inside book_session() — this
   * mirrors them so the sheet can explain WHY before the member taps.
   */
  async checkEligibility(userId, sessionId) {
    const view = await getSessionViewRow(sessionId);
    if (!view) throw new ServiceError("session_not_found");

    const [capStatus, wallet, mine, queued] = await Promise.all([
      capStatusFor(userId, view.studio.id, view.session.startsAt),
      walletSummaryFor(userId),
      sb()
        .from("bookings")
        .select("id, status")
        .eq("member_id", userId)
        .eq("session_id", sessionId)
        .in("status", ["reserved", "checked_in", "completed"]),
      sb()
        .from("waitlist_entries")
        .select("position")
        .eq("member_id", userId)
        .eq("session_id", sessionId)
        .limit(1),
    ]);
    const waitlistPosition = unwrapList(queued)[0]?.position;

    const deny = (
      reason: BookingDenialReason,
      canJoinWaitlist = false,
    ): BookingEligibility => ({
      ok: false,
      reason,
      creditCost: view.creditCost,
      capStatus,
      canJoinWaitlist,
      waitlistPosition,
    });

    if (view.session.status !== "scheduled" || new Date(view.session.startsAt).getTime() <= Date.now())
      return deny("in_past");
    if (unwrapList(mine).length > 0) return deny("already_booked");
    if (view.spotsLeft <= 0) {
      const affordable = wallet.balance >= view.creditCost;
      return deny("full", !capStatus.reached && affordable && waitlistPosition === undefined);
    }
    if (capStatus.reached) return deny("visit_cap");
    if (wallet.balance < view.creditCost) return deny("insufficient_credits");

    return {
      ok: true,
      creditCost: view.creditCost,
      capStatus,
      canJoinWaitlist: false,
      waitlistPosition,
    };
  },

  async reserve(userId, sessionId) {
    const { data, error } = await sb().rpc("book_session", { p_session_id: sessionId });
    if (error) rethrow(error);
    touched();
    return bookingViewById(data as unknown as string);
  },

  async quoteCancellation(bookingId) {
    const { data, error } = await sb().rpc("quote_cancellation", { p_booking_id: bookingId });
    if (error) rethrow(error);
    const row = (
      data as { late: boolean; fee_credits: number; refund_credits: number; cutoff_hours: number }[] | null
    )?.[0];
    if (!row) throw new ServiceError("booking_not_found");
    return {
      late: row.late,
      feeCredits: row.fee_credits,
      refundCredits: row.refund_credits,
      cutoffHours: row.cutoff_hours,
    };
  },

  async cancel(bookingId) {
    const { data, error } = await sb().rpc("cancel_booking", { p_booking_id: bookingId });
    if (error) rethrow(error);
    touched();
    const row = (data as { late: boolean; fee_credits: number }[] | null)?.[0];
    return { late: row?.late ?? false, feeCredits: row?.fee_credits ?? 0 };
  },

  async checkIn(bookingId) {
    const { error } = await sb().rpc("check_in", { p_booking_id: bookingId });
    if (error) rethrow(error);
    touched();
    return bookingViewById(bookingId);
  },

  async markNoShow(bookingId) {
    const { error } = await sb().rpc("mark_no_show", { p_booking_id: bookingId });
    if (error) rethrow(error);
    touched();
    return bookingViewById(bookingId);
  },

  async visitCapStatus(userId, studioId) {
    return capStatusFor(userId, studioId);
  },

  async joinWaitlist(userId, sessionId) {
    const { data, error } = await sb().rpc("join_waitlist", { p_session_id: sessionId });
    if (error) rethrow(error);
    touched();
    const rows = unwrapList(
      await sb().from("waitlist_entries").select("*").eq("id", data as unknown as string).limit(1),
    );
    if (!rows[0]) throw new ServiceError("unknown");
    return toWaitlistEntry(rows[0]);
  },

  async leaveWaitlist(_userId, sessionId) {
    const { error } = await sb().rpc("leave_waitlist", { p_session_id: sessionId });
    if (error) rethrow(error);
    touched();
  },

  async listMyWaitlist(userId) {
    const rows = unwrapList(
      await sb().from("waitlist_entries").select("*").eq("member_id", userId),
    );
    if (rows.length === 0) return [];
    const { sessions, classTypes, studios } = await hydrateBookings(rows);
    return rows
      .map((row): WaitlistView | null => {
        const session = sessions.get(row.session_id);
        const classType = session ? classTypes.get(session.classTypeId) : undefined;
        const studio = studios.get(row.studio_id);
        if (!session || !classType || !studio) return null;
        return { entry: toWaitlistEntry(row), session, classType, studio };
      })
      .filter((v): v is WaitlistView => v !== null)
      .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
  },

  async listSessionWaitlist(sessionId) {
    const rows = unwrapList(
      await sb().from("waitlist_entries").select("*").eq("session_id", sessionId).order("position"),
    );
    return rows.map(toWaitlistEntry);
  },
};

/* --------------------------------- wallet -------------------------------- */

const wallet: Services["wallet"] = {
  async getSummary(userId) {
    await sb().rpc("ensure_cycle_current", { p_member_id: userId });
    return walletSummaryFor(userId);
  },

  async listTransactions(userId) {
    const rows = unwrapList(
      await sb()
        .from("credit_transactions")
        .select("*")
        .eq("member_id", userId)
        .order("created_at", { ascending: false }),
    );
    return rows.map(toCreditTransaction);
  },

  // PAYMENTS SEAM — mock only. See the README, "Going to production → Stripe".
  async topUp(_userId, packId) {
    const { data, error } = await sb().rpc("top_up", { p_pack_id: packId });
    if (error) rethrow(error);
    touched();
    const rows = unwrapList(
      await sb().from("credit_transactions").select("*").eq("id", data as unknown as string).limit(1),
    );
    if (!rows[0]) throw new ServiceError("unknown");
    return toCreditTransaction(rows[0]);
  },
};

/* ----------------------------- subscriptions ----------------------------- */

const subscriptions: Services["subscriptions"] = {
  async listPlans() {
    return unwrapList(await sb().from("plans").select("*").order("sort_order")).map(toPlan);
  },

  async getMySubscription(userId) {
    await sb().rpc("ensure_cycle_current", { p_member_id: userId });
    const rows = unwrapList(
      await sb()
        .from("subscriptions")
        .select("*")
        .eq("member_id", userId)
        .eq("status", "active")
        .limit(1),
    );
    return rows[0] ? toSubscription(rows[0]) : null;
  },

  async changePlan(userId, planId) {
    const { error } = await sb().rpc("change_plan", { p_plan_id: planId });
    if (error) rethrow(error);
    touched();
    const sub = await subscriptions.getMySubscription(userId);
    if (!sub) throw new ServiceError("plan_not_found");
    return sub as Subscription;
  },

  async listInvoices(userId) {
    const [subRes, txRes] = await Promise.all([
      sb().from("subscriptions").select("*").eq("member_id", userId).limit(1),
      sb()
        .from("credit_transactions")
        .select("*")
        .eq("member_id", userId)
        .eq("reason", "topup_pack"),
    ]);
    const sub = unwrapList(subRes)[0];
    const invoices: Invoice[] = [];
    if (sub) {
      const plans = unwrapList(await sb().from("plans").select("*").eq("id", sub.plan_id).limit(1));
      const plan = plans[0];
      for (let i = 0; i < 3; i++) {
        const date = addDays(new Date(sub.cycle_start), -30 * i);
        invoices.push({
          id: `inv_${userId}_${i}`,
          userId,
          label: {
            el: `Συνδρομή ${plan?.name_el ?? ""}`,
            en: `${plan?.name_en ?? ""} membership`,
          },
          amountEUR: Number(sub.price_eur),
          issuedAt: date.toISOString(),
          status: "paid",
        });
      }
    }
    for (const t of unwrapList(txRes)) {
      const pack = POLICY.topUpPacks.find((p) => p.credits === t.delta);
      invoices.push({
        id: `inv_${t.id}`,
        userId,
        label: { el: `Top-up ${t.delta} credits`, en: `Top-up ${t.delta} credits` },
        amountEUR: pack?.priceEUR ?? t.delta * 2.5,
        issuedAt: t.created_at,
        status: "paid",
      });
    }
    return invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },
};

/* -------------------------------- payouts -------------------------------- */

const payouts: Services["payouts"] = {
  async getSummary(studioId) {
    const rows = unwrapList(await sb().from("payout_entries").select("*").eq("studio_id", studioId));
    const nowMonth = monthKey(new Date().toISOString());
    let pendingEUR = 0;
    let confirmedThisMonthEUR = 0;
    let confirmedAllTimeEUR = 0;
    let attendancesThisMonth = 0;
    for (const p of rows) {
      const amount = Number(p.amount_eur);
      if (p.status === "pending") pendingEUR += amount;
      if (p.status === "confirmed") {
        confirmedAllTimeEUR += amount;
        if (monthKey(p.confirmed_at ?? p.created_at) === nowMonth) {
          confirmedThisMonthEUR += amount;
          attendancesThisMonth += 1;
        }
      }
    }
    return { pendingEUR, confirmedThisMonthEUR, confirmedAllTimeEUR, attendancesThisMonth };
  },

  async listEntries(studioId, opts) {
    const rows = unwrapList(
      await sb()
        .from("payout_entries")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false }),
    );
    const filtered = rows.filter(
      (p) => !opts?.month || monthKey(p.confirmed_at ?? p.created_at) === opts.month,
    );
    if (filtered.length === 0) return [];

    const [profiles, sessionRows] = await Promise.all([
      sb().from("profiles").select("id, display_name").in("id", [...new Set(filtered.map((p) => p.member_id))]),
      sb().from("sessions").select("id, class_type_id, start_at").in("id", [...new Set(filtered.map((p) => p.session_id))]),
    ]);
    const names = new Map(unwrapList(profiles).map((p) => [p.id, p.display_name]));
    const sessions = new Map(unwrapList(sessionRows).map((s) => [s.id, s]));
    const classTypes = await fetchClassTypes([
      ...new Set(unwrapList(sessionRows).map((s) => s.class_type_id)),
    ]);

    const views = filtered
      .map((entry) => {
        const session = sessions.get(entry.session_id);
        return {
          entry: toPayoutEntry(entry),
          memberName: names.get(entry.member_id) ?? "Member",
          className: session ? (classTypes.get(session.class_type_id)?.name ?? "") : "",
          sessionStartsAt: session?.start_at ?? entry.created_at,
        };
      })
      .sort((a, b) =>
        (b.entry.confirmedAt ?? b.entry.createdAt).localeCompare(
          a.entry.confirmedAt ?? a.entry.createdAt,
        ),
      );
    return opts?.limit ? views.slice(0, opts.limit) : views;
  },

  async listStatements(studioId) {
    const rows = unwrapList(
      await sb()
        .from("payout_entries")
        .select("*")
        .eq("studio_id", studioId)
        .eq("status", "confirmed"),
    );
    const byMonth = new Map<string, PayoutEntry[]>();
    for (const r of rows) {
      const key = monthKey(r.confirmed_at ?? r.created_at);
      byMonth.set(key, [...(byMonth.get(key) ?? []), toPayoutEntry(r)]);
    }
    const statements: PayoutStatement[] = [...byMonth.entries()].map(([month, entries]) => ({
      month,
      totalEUR: entries.reduce((a, p) => a + p.amountEUR, 0),
      attendanceCount: entries.length,
      entries,
    }));
    return statements.sort((a, b) => b.month.localeCompare(a.month));
  },
};

/* -------------------------------- reviews -------------------------------- */

const reviews: Services["reviews"] = {
  async listForStudio(studioId) {
    const rows = unwrapList(
      await sb()
        .from("reviews")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false }),
    );
    return rows.map(toReview);
  },

  async add(input) {
    const profiles = unwrapList(
      await sb().from("profiles").select("display_name").eq("id", input.userId).limit(1),
    );
    const res = await sb()
      .from("reviews")
      .insert({
        studio_id: input.studioId,
        member_id: input.userId,
        author_name: profiles[0]?.display_name ?? "Member",
        rating: input.rating,
        body: input.text,
        lang: input.lang,
      })
      .select("*")
      .limit(1);
    const rows = unwrapList(res);
    if (!rows[0]) throw new ServiceError("unknown");
    touched();
    return toReview(rows[0]);
  },
};

/* ----------------------------- notifications ----------------------------- */

const notifications: Services["notifications"] = {
  async list(userId) {
    const rows = unwrapList(
      await sb()
        .from("notifications")
        .select("*")
        .eq("member_id", userId)
        .order("created_at", { ascending: false }),
    );
    return rows.map(toNotification);
  },

  async unreadCount(userId) {
    const { count, error } = await sb()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("member_id", userId)
      .eq("read", false);
    if (error) rethrow(error);
    return count ?? 0;
  },

  async markRead(id) {
    const res = await sb().from("notifications").update({ read: true }).eq("id", id);
    if (res.error) rethrow(res.error);
    touched();
  },

  async markAllRead(userId) {
    const res = await sb()
      .from("notifications")
      .update({ read: true })
      .eq("member_id", userId)
      .eq("read", false);
    if (res.error) rethrow(res.error);
    touched();
  },
};

/* ------------------------------ studio admin ----------------------------- */

const studioAdmin: Services["studioAdmin"] = {
  async getMyStudio(ownerId) {
    const rows = unwrapList(
      await sb().from("studios").select(STUDIO_SELECT).eq("owner_id", ownerId).limit(1),
    );
    return rows[0] ? toStudio(rows[0]) : null;
  },

  async updateStudio(studioId, patch) {
    const res = await sb()
      .from("studios")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.address !== undefined ? { address: patch.address } : {}),
        ...(patch.description !== undefined
          ? { description_el: patch.description.el, description_en: patch.description.en }
          : {}),
        ...(patch.amenities !== undefined ? { amenities: patch.amenities } : {}),
        ...(patch.defaultFloorPriceEUR !== undefined
          ? { default_floor_price_eur: patch.defaultFloorPriceEUR }
          : {}),
        ...(patch.cancellationCutoffHours !== undefined
          ? { cancellation_cutoff_hours: patch.cancellationCutoffHours }
          : {}),
      })
      .eq("id", studioId)
      .select(STUDIO_SELECT)
      .limit(1);
    const rows = unwrapList(res);
    if (!rows[0]) throw new ServiceError("studio_not_found");

    // categoryIds live in the join table.
    if (patch.categoryIds) {
      await sb().from("studio_categories").delete().eq("studio_id", studioId);
      if (patch.categoryIds.length > 0) {
        await sb()
          .from("studio_categories")
          .insert(patch.categoryIds.map((c, i) => ({ studio_id: studioId, category_id: c, sort_order: i })));
      }
    }
    touched();
    return toStudio({ ...rows[0], studio_categories: (patch.categoryIds ?? []).map((c) => ({ category_id: c })) });
  },

  async listClassTypes(studioId) {
    return unwrapList(await sb().from("class_types").select("*").eq("studio_id", studioId)).map(
      toClassType,
    );
  },

  async listSessions(studioId, fromISO, toISO) {
    const rows = unwrapList(
      await sb()
        .from("session_view")
        .select("*")
        .eq("studio_id", studioId)
        .gte("start_at", new Date(fromISO).toISOString())
        .lte("start_at", new Date(toISO).toISOString())
        .order("start_at"),
    );
    return hydrateSessionViews(rows);
  },

  async createSession(input) {
    const res = await sb()
      .from("sessions")
      .insert({
        id: uid("se"),
        studio_id: input.studioId,
        class_type_id: input.classTypeId,
        start_at: input.startsAt,
        duration_min: input.durationMin,
        instructor: input.instructor,
        capacity: input.capacity,
        spots_released_to_platform: input.spotsReleasedToPlatform,
        floor_price_eur: input.floorPriceEUR,
        is_peak: input.peak,
      })
      .select("*")
      .limit(1);
    const rows = unwrapList(res);
    if (!rows[0]) throw new ServiceError("unknown");
    touched();
    return toSession(rows[0]);
  },

  async updateSession(sessionId, patch) {
    const res = await sb()
      .from("sessions")
      .update({
        ...(patch.startsAt !== undefined ? { start_at: patch.startsAt } : {}),
        ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
        ...(patch.spotsReleasedToPlatform !== undefined
          ? { spots_released_to_platform: patch.spotsReleasedToPlatform }
          : {}),
        ...(patch.floorPriceEUR !== undefined ? { floor_price_eur: patch.floorPriceEUR } : {}),
        ...(patch.peak !== undefined ? { is_peak: patch.peak } : {}),
        ...(patch.instructor !== undefined ? { instructor: patch.instructor } : {}),
      })
      .eq("id", sessionId)
      .select("*")
      .limit(1);
    const rows = unwrapList(res);
    if (!rows[0]) throw new ServiceError("session_not_found");
    touched();
    return toSession(rows[0]);
  },

  async cancelSession(sessionId) {
    const { error } = await sb().rpc("cancel_session", { p_session_id: sessionId });
    if (error) rethrow(error);
    touched();
  },

  async getRoster(sessionId) {
    const rows = unwrapList(await sb().from("bookings").select("*").eq("session_id", sessionId));
    if (rows.length === 0) return [];
    const profiles = unwrapList(
      await sb()
        .from("profiles")
        .select("id, display_name")
        .in("id", [...new Set(rows.map((r) => r.member_id))]),
    );
    const names = new Map(profiles.map((p) => [p.id, p.display_name]));
    return rows
      .map((row): RosterEntry => ({
        booking: toBooking(row),
        memberName: names.get(row.member_id) ?? "Member",
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName, "el"));
  },
};

/* ------------------------------- analytics ------------------------------- */

function dayLabel(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * The member's attendance history, flattened for lib/rules/engagement.ts.
 * This is the ONLY thing the engagement layer needs from the database — every
 * number it shows is derived from these facts by the shared pure rules.
 */
async function attendanceFacts(userId: string): Promise<AttendanceFact[]> {
  const rows = unwrapList(await sb().from("bookings").select("*").eq("member_id", userId));
  if (rows.length === 0) return [];
  const { sessions, classTypes, studios } = await hydrateBookings(rows);
  const facts: AttendanceFact[] = [];
  for (const row of rows) {
    const session = sessions.get(row.session_id);
    const classType = session ? classTypes.get(session.classTypeId) : undefined;
    const studio = studios.get(row.studio_id);
    if (!session || !classType || !studio) continue;
    facts.push({
      bookingId: row.id,
      status: row.status,
      startsAt: session.startsAt,
      durationMin: session.durationMin,
      studioId: studio.id,
      neighborhoodId: studio.neighborhoodId,
      categoryId: classType.categoryId,
      classTypeId: classType.id,
      createdAt: row.created_at,
    });
  }
  return facts;
}

const analytics: Services["analytics"] = {
  async getMemberStats(userId): Promise<MemberStats> {
    const facts = await attendanceFacts(userId);
    const attended = facts.filter((f) => f.status === "completed" || f.status === "checked_in");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const catCounts = new Map<CategoryId, number>();
    for (const f of attended) catCounts.set(f.categoryId, (catCounts.get(f.categoryId) ?? 0) + 1);

    const wallet = await walletSummaryFor(userId);
    return {
      classesThisMonth: attended.filter((f) => new Date(f.startsAt).getTime() >= monthStart).length,
      // Same rest-aware rule the goal card shows, so the two can never disagree.
      streakWeeks: computeStreak(facts, now).weeks,
      favoriteCategoryId: [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      totalClasses: attended.length,
      studiosVisited: new Set(attended.map((f) => f.studioId)).size,
      creditsSpentThisCycle: wallet.cycleSpent,
    };
  },

  async getStudioAnalytics(studioId): Promise<StudioAnalytics> {
    const now = new Date();
    const today = startOfDay(now);
    const [sessionRows, bookingRows, payoutRows] = await Promise.all([
      sb().from("sessions").select("*").eq("studio_id", studioId),
      sb().from("bookings").select("*").eq("studio_id", studioId),
      sb().from("payout_entries").select("*").eq("studio_id", studioId).eq("status", "confirmed"),
    ]);
    const sessions = unwrapList(sessionRows);
    const bookings = unwrapList(bookingRows);
    const sessionsById = new Map(sessions.map((s) => [s.id, s]));
    const classTypes = await fetchClassTypes([...new Set(sessions.map((s) => s.class_type_id))]);

    const mine = bookings
      .map((b) => ({ b, s: sessionsById.get(b.session_id) }))
      .filter((x): x is { b: (typeof bookings)[number]; s: (typeof sessions)[number] } => !!x.s);

    const bookingsOverTime: TimeSeriesPoint[] = [];
    for (let d = -29; d <= 0; d++) {
      const day = addDays(today, d);
      const next = addDays(day, 1);
      bookingsOverTime.push({
        label: dayLabel(day),
        value: mine.filter((x) => {
          const t = new Date(x.s.start_at);
          return (
            t >= day && t < next && x.b.status !== "cancelled" && x.b.status !== "late_cancelled"
          );
        }).length,
      });
    }

    const firstBookingAt = new Map<string, number>();
    for (const x of mine) {
      const t = new Date(x.b.created_at).getTime();
      const prev = firstBookingAt.get(x.b.member_id);
      if (prev === undefined || t < prev) firstBookingAt.set(x.b.member_id, t);
    }
    const newVsReturning: StudioAnalytics["newVsReturning"] = [];
    for (let w = 3; w >= 0; w--) {
      const end = now.getTime() - w * 7 * DAY_MS;
      const start = end - 7 * DAY_MS;
      const weekUsers = new Set(
        mine
          .filter((x) => {
            const t = new Date(x.b.created_at).getTime();
            return t > start && t <= end;
          })
          .map((x) => x.b.member_id),
      );
      let newMembers = 0;
      let returning = 0;
      for (const u of weekUsers) {
        const first = firstBookingAt.get(u) ?? 0;
        if (first > start && first <= end) newMembers++;
        else returning++;
      }
      newVsReturning.push({
        label: `${dayLabel(new Date(start))}–${dayLabel(new Date(end))}`,
        newMembers,
        returning,
      });
    }

    const activeStatuses = ["reserved", "checked_in", "completed"];
    const bookedOn = (sessionId: string, seedBooked: number) =>
      seedBooked + bookings.filter((b) => b.session_id === sessionId && activeStatuses.includes(b.status)).length;

    const fillRateByDay: TimeSeriesPoint[] = [];
    for (let d = -13; d <= 0; d++) {
      const day = addDays(today, d);
      const next = addDays(day, 1);
      const daySessions = sessions.filter((s) => {
        const t = new Date(s.start_at);
        return t >= day && t < next;
      });
      const released = daySessions.reduce((a, s) => a + s.spots_released_to_platform, 0);
      const booked = daySessions.reduce((a, s) => a + bookedOn(s.id, s.seed_booked), 0);
      fillRateByDay.push({
        label: dayLabel(day),
        value: released > 0 ? Math.round((booked / released) * 100) : 0,
      });
    }

    const monthAgo = now.getTime() - 30 * DAY_MS;
    const catMap = new Map<CategoryId, number>();
    for (const x of mine) {
      const t = new Date(x.s.start_at).getTime();
      if (t < monthAgo || t > now.getTime() + 14 * DAY_MS) continue;
      if (x.b.status === "cancelled" || x.b.status === "late_cancelled") continue;
      const ct = classTypes.get(x.s.class_type_id);
      if (ct) catMap.set(ct.categoryId, (catMap.get(ct.categoryId) ?? 0) + 1);
    }
    const categoryPerformance = [...catMap.entries()]
      .map(([categoryId, count]) => ({ categoryId, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const bookingsThisMonth = mine.filter(
      (x) => new Date(x.b.created_at).getTime() >= monthStart && x.b.status !== "cancelled",
    ).length;
    const done = mine.filter((x) => x.b.status === "completed" || x.b.status === "checked_in").length;
    const noShows = mine.filter((x) => x.b.status === "no_show").length;

    const upcoming = sessions.filter((s) => {
      const t = new Date(s.start_at).getTime();
      return s.status === "scheduled" && t > now.getTime() && t < now.getTime() + 7 * DAY_MS;
    });
    const upReleased = upcoming.reduce((a, s) => a + s.spots_released_to_platform, 0);
    const upBooked = upcoming.reduce((a, s) => a + bookedOn(s.id, s.seed_booked), 0);

    const revenueThisMonthEUR = unwrapList(payoutRows)
      .filter((p) => monthKey(p.confirmed_at ?? p.created_at) === monthKey(now.toISOString()))
      .reduce((a, p) => a + Number(p.amount_eur), 0);

    return {
      kpis: {
        bookingsThisMonth,
        attendanceRate: done + noShows > 0 ? done / (done + noShows) : 1,
        fillRate: upReleased > 0 ? upBooked / upReleased : 0,
        revenueThisMonthEUR,
      },
      bookingsOverTime,
      newVsReturning,
      fillRateByDay,
      categoryPerformance,
    };
  },
};

/* ------------------------------- engagement ------------------------------ */

async function goalFor(userId: string): Promise<MemberGoal> {
  const rows = unwrapList(await sb().from("goals").select("*").eq("member_id", userId).limit(1));
  const row = rows[0];
  return row
    ? { userId, weeklyTarget: row.weekly_target, updatedAt: row.updated_at }
    : { userId, weeklyTarget: GOAL_DEFAULT, updatedAt: new Date(0).toISOString() };
}

async function prefsFor(userId: string): Promise<EngagementPrefs> {
  const rows = unwrapList(
    await sb().from("engagement_prefs").select("*").eq("member_id", userId).limit(1),
  );
  const row = rows[0];
  return row
    ? {
        userId,
        nudgesEnabled: row.nudges_enabled,
        ...(row.nudges_muted_until ? { nudgesMutedUntil: row.nudges_muted_until } : {}),
        updatedAt: row.updated_at,
      }
    : { userId, nudgesEnabled: false, updatedAt: new Date(0).toISOString() };
}

async function achievementViewsFor(userId: string, now: Date): Promise<AchievementView[]> {
  const [facts, goal, unlockedRows] = await Promise.all([
    attendanceFacts(userId),
    goalFor(userId),
    sb().from("member_achievements").select("*").eq("member_id", userId),
  ]);
  const evals = evaluateAchievements(facts, goal.weeklyTarget, now);
  const unlocked = new Map(
    unwrapList(unlockedRows).map((r) => [r.achievement_key as AchievementId, r.unlocked_at]),
  );
  return ACHIEVEMENTS.map((achievement) => {
    const ev = evals.find((e) => e.id === achievement.id);
    const unlockedAt = unlocked.get(achievement.id);
    const target = achievement.target ?? ev?.target ?? 1;
    return {
      achievement,
      unlockedAt,
      progress: unlockedAt ? target : Math.min(target, ev?.progress ?? 0),
    };
  }).sort((a, b) => a.achievement.order - b.achievement.order);
}

/** Bookable-right-now filter, mirroring bookableView() in the mock helpers. */
async function bookableSessionViews(
  userId: string,
  candidates: SessionView[],
  now: Date,
): Promise<SessionView[]> {
  if (candidates.length === 0) return [];
  const [wallet, myBookings] = await Promise.all([
    walletSummaryFor(userId),
    sb()
      .from("bookings")
      .select("session_id")
      .eq("member_id", userId)
      .in("status", ["reserved", "checked_in", "completed"]),
  ]);
  const held = new Set(unwrapList(myBookings).map((b) => b.session_id));
  const studioIds = [...new Set(candidates.map((c) => c.studio.id))];
  const caps = new Map<string, boolean>();
  await Promise.all(
    studioIds.map(async (id) => {
      const status = await capStatusFor(userId, id);
      caps.set(id, status.reached);
    }),
  );
  return candidates.filter(
    (v) =>
      v.session.status === "scheduled" &&
      new Date(v.session.startsAt).getTime() > now.getTime() + 30 * 60_000 &&
      v.spotsLeft > 0 &&
      !held.has(v.session.id) &&
      !caps.get(v.studio.id) &&
      wallet.balance >= v.creditCost,
  );
}

async function routineFor(userId: string, now: Date): Promise<RoutineSuggestion | null> {
  const facts = await attendanceFacts(userId);
  const signal: RoutineSignal | null = inferRoutine(facts, now);

  const upcoming = unwrapList(
    await sb()
      .from("session_view")
      .select("*")
      .eq("status", "scheduled")
      .gt("start_at", new Date(now.getTime() + 60 * 60_000).toISOString())
      .lt("start_at", new Date(now.getTime() + 14 * DAY_MS).toISOString())
      .order("start_at"),
  );
  const views = await hydrateSessionViews(upcoming);

  if (signal) {
    const sameSlot = views.filter((v) => {
      const t = new Date(v.session.startsAt);
      return (
        v.studio.id === signal.studioId &&
        t.getDay() === signal.weekday &&
        hourBand(t.getHours()) === hourBand(signal.hour) &&
        t.getTime() <= now.getTime() + 8 * DAY_MS
      );
    });
    const bookable = await bookableSessionViews(userId, sameSlot, now);
    const best = bookable.sort(
      (a, b) =>
        Math.abs(new Date(a.session.startsAt).getHours() - signal.hour) -
          Math.abs(new Date(b.session.startsAt).getHours() - signal.hour) ||
        a.session.startsAt.localeCompare(b.session.startsAt),
    )[0];
    if (best) return { basis: "usual_slot", signal, session: best };
  }

  const attended = facts
    .filter((f) => f.status === "completed" || f.status === "checked_in")
    .filter((f) => new Date(f.startsAt).getTime() <= now.getTime())
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const last = attended[0];
  if (!last) return null;
  const sameClass = views.filter((v) => v.classType.id === last.classTypeId);
  const bookable = await bookableSessionViews(userId, sameClass, now);
  const session = bookable.sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))[0];
  return session ? { basis: "last_class", session } : null;
}

const engagement: Services["engagement"] = {
  async getGoal(userId) {
    return goalFor(userId);
  },

  async setGoal(userId, weeklyTarget) {
    const target = clampGoal(weeklyTarget);
    const res = await sb()
      .from("goals")
      .upsert({ member_id: userId, weekly_target: target }, { onConflict: "member_id" });
    if (res.error) rethrow(res.error);
    touched();
    return goalFor(userId);
  },

  async getSummary(userId) {
    const now = new Date();
    const [goal, facts] = await Promise.all([goalFor(userId), attendanceFacts(userId)]);
    return {
      goal,
      progress: computeWeeklyProgress(facts, goal.weeklyTarget, now),
      streak: computeStreak(facts, now),
    };
  },

  async listAchievements(userId) {
    return achievementViewsFor(userId, new Date());
  },

  /** Idempotent: only genuinely new unlocks are written and returned. */
  async syncAchievements(userId) {
    const now = new Date();
    const [facts, goal, existing] = await Promise.all([
      attendanceFacts(userId),
      goalFor(userId),
      sb().from("member_achievements").select("achievement_key").eq("member_id", userId),
    ]);
    const have = new Set(unwrapList(existing).map((r) => r.achievement_key));
    const fresh = evaluateAchievements(facts, goal.weeklyTarget, now).filter(
      (e) => e.achieved && !have.has(e.id),
    );
    if (fresh.length === 0) return [];

    const res = await sb()
      .from("member_achievements")
      .upsert(
        fresh.map((e) => ({
          member_id: userId,
          achievement_key: e.id,
          unlocked_at: e.achievedAt ?? now.toISOString(),
        })),
        { onConflict: "member_id,achievement_key", ignoreDuplicates: true },
      );
    if (res.error) rethrow(res.error);
    touched();

    const views = await achievementViewsFor(userId, now);
    return fresh
      .map((e) => views.find((v) => v.achievement.id === e.id))
      .filter((v): v is AchievementView => !!v);
  },

  async getProgressInsights(userId) {
    const facts = await attendanceFacts(userId);
    const core = computeInsights(facts, new Date());
    let favoriteStudio: { studioId: string; name: string; count: number } | undefined;
    if (core.favoriteStudioId) {
      const studios = await fetchStudios([core.favoriteStudioId]);
      const studio = studios.get(core.favoriteStudioId);
      if (studio) {
        favoriteStudio = {
          studioId: studio.id,
          name: studio.name,
          count: core.favoriteStudioCount,
        };
      }
    }
    const { favoriteStudioId, favoriteStudioCount, ...rest } = core;
    void favoriteStudioId;
    void favoriteStudioCount;
    return { ...rest, favoriteStudio };
  },

  async getWeeklyRecap(userId) {
    const [facts, goal] = await Promise.all([attendanceFacts(userId), goalFor(userId)]);
    const core = computeRecap(facts, goal.weeklyTarget, new Date());
    const studios = await fetchStudios(core.studioIds);
    const { studioIds, firstTimeStudioId, ...rest } = core;
    return {
      ...rest,
      studioNames: studioIds.map((id) => studios.get(id)?.name).filter((n): n is string => !!n),
      firstTimeStudio: firstTimeStudioId ? studios.get(firstTimeStudioId)?.name : undefined,
    };
  },

  async getPrefs(userId) {
    return prefsFor(userId);
  },

  async setPrefs(userId, patch) {
    const current = await prefsFor(userId);
    const res = await sb()
      .from("engagement_prefs")
      .upsert(
        {
          member_id: userId,
          nudges_enabled: patch.nudgesEnabled ?? current.nudgesEnabled,
          nudges_muted_until:
            "nudgesMutedUntil" in patch
              ? (patch.nudgesMutedUntil ?? null)
              : (current.nudgesMutedUntil ?? null),
        },
        { onConflict: "member_id" },
      );
    if (res.error) rethrow(res.error);
    touched();
    return prefsFor(userId);
  },

  async getNudges(userId) {
    const now = new Date();
    const [facts, goal, prefs, upcomingRes] = await Promise.all([
      attendanceFacts(userId),
      goalFor(userId),
      prefsFor(userId),
      sb()
        .from("bookings")
        .select("session_id, status")
        .eq("member_id", userId)
        .eq("status", "reserved"),
    ]);
    const upcomingIds = unwrapList(upcomingRes).map((b) => b.session_id);
    let hasUpcomingReservation = false;
    if (upcomingIds.length > 0) {
      const rows = unwrapList(
        await sb()
          .from("sessions")
          .select("id")
          .in("id", upcomingIds)
          .gt("start_at", now.toISOString())
          .limit(1),
      );
      hasUpcomingReservation = rows.length > 0;
    }

    const routine = inferRoutine(facts, now);
    const kinds = planNudges({
      facts,
      target: goal.weeklyTarget,
      now,
      prefs,
      hasUpcomingReservation,
      hasRoutine: !!routine,
    });

    for (const kind of kinds) {
      const id = nudgeId(kind, now);
      if (kind === "ease_off" || kind === "been_a_while") {
        return [{ id, kind }] satisfies HabitNudge[];
      }
      const suggestion = await routineFor(userId, now);
      if (!suggestion) continue;
      if (kind === "usual_slot" && suggestion.basis !== "usual_slot") continue;
      return [{ id, kind, session: suggestion.session }];
    }
    return [];
  },

  async markNudgeDelivered(userId, id, notification) {
    const existing = unwrapList(
      await sb()
        .from("nudge_deliveries")
        .select("nudge_id")
        .eq("member_id", userId)
        .eq("nudge_id", id)
        .limit(1),
    );
    if (existing.length > 0) return false;

    const res = await sb()
      .from("nudge_deliveries")
      .upsert({ member_id: userId, nudge_id: id }, { onConflict: "member_id,nudge_id", ignoreDuplicates: true });
    if (res.error) rethrow(res.error);

    if (notification) {
      await sb().from("notifications").insert({
        member_id: userId,
        kind: "habit",
        title_el: notification.title.el,
        title_en: notification.title.en,
        body_el: notification.body.el,
        body_en: notification.body.en,
        href: notification.href ?? null,
      });
    }
    touched();
    return true;
  },

  async getRoutine(userId) {
    return routineFor(userId, new Date());
  },

  async listDiscoveries(userId, opts) {
    const now = new Date();
    const limit = opts?.limit ?? 6;
    const [mineRes, studios] = await Promise.all([
      sb()
        .from("bookings")
        .select("studio_id, session_id")
        .eq("member_id", userId)
        .in("status", ["reserved", "checked_in", "completed"]),
      sb().from("studios").select(STUDIO_SELECT),
    ]);
    const mine = unwrapList(mineRes);
    const triedStudios = new Set(mine.map((b) => b.studio_id));
    const allStudios = unwrapList(studios).map(toStudio);
    const studioById = new Map(allStudios.map((s) => [s.id, s]));

    const triedCategories = new Set<CategoryId>();
    const triedHoods = new Set<string>();
    if (mine.length > 0) {
      const sessionRows = unwrapList(
        await sb()
          .from("sessions")
          .select("id, class_type_id")
          .in("id", [...new Set(mine.map((b) => b.session_id))]),
      );
      const classTypes = await fetchClassTypes([...new Set(sessionRows.map((s) => s.class_type_id))]);
      for (const s of sessionRows) {
        const ct = classTypes.get(s.class_type_id);
        if (ct) triedCategories.add(ct.categoryId);
      }
      for (const b of mine) {
        const st = studioById.get(b.studio_id);
        if (st) triedHoods.add(st.neighborhoodId);
      }
    }

    const untried = allStudios
      .filter((s) => !triedStudios.has(s.id))
      .filter((s) => !opts?.cityId || s.cityId === opts.cityId);
    if (untried.length === 0) return [];

    // One query for every candidate studio's next beginner-friendly classes.
    const rows = unwrapList(
      await sb()
        .from("session_view")
        .select("*")
        .eq("status", "scheduled")
        .in("studio_id", untried.map((s) => s.id))
        .gt("start_at", now.toISOString())
        .lt("start_at", new Date(now.getTime() + 7 * DAY_MS).toISOString())
        .order("start_at"),
    );
    const views = await hydrateSessionViews(rows);
    const beginnerFriendly = views.filter(
      (v) => v.classType.level === "beginner" || v.classType.level === "all",
    );
    const bookable = await bookableSessionViews(userId, beginnerFriendly, now);
    const firstByStudio = new Map<string, SessionView>();
    for (const v of bookable) if (!firstByStudio.has(v.studio.id)) firstByStudio.set(v.studio.id, v);

    const rank = (r: DiscoverySuggestion["reason"]) =>
      r === "untried_category" ? 0 : r === "new_neighborhood" ? 1 : 2;

    return untried
      .map((studio): DiscoverySuggestion => {
        const newCat = studio.categoryIds.find((c) => !triedCategories.has(c));
        const reason: DiscoverySuggestion["reason"] = newCat
          ? "untried_category"
          : !triedHoods.has(studio.neighborhoodId)
            ? "new_neighborhood"
            : "untried_studio";
        return {
          reason,
          studio,
          categoryId: newCat ?? studio.categoryIds[0],
          session: firstByStudio.get(studio.id),
        };
      })
      .sort(
        (a, b) =>
          rank(a.reason) - rank(b.reason) ||
          Number(!!b.session) - Number(!!a.session) ||
          b.studio.rating - a.studio.rating,
      )
      .slice(0, limit);
  },
};

/* ---------------------------------- demo --------------------------------- */

const demo: Services["demo"] = {
  async reset() {
    // Re-seeding a shared Postgres from the browser would be destructive for
    // everyone connected to it, so this is a no-op here. Re-run the seed
    // instead: `npm run db:seed` (see the README).
    throw new ServiceError(
      "not_supported",
      "Resetting demo data is a mock-mode feature. Re-run `npm run db:seed` against your Supabase project instead.",
    );
  },
};

export const supabaseServices: Services = {
  auth,
  catalog,
  booking,
  wallet,
  subscriptions,
  payouts,
  reviews,
  notifications,
  studioAdmin,
  analytics,
  engagement,
  demo,
  subscribe: (listener) => changeFeed().subscribe(listener),
};
