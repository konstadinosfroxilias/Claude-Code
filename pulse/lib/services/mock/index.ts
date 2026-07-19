/**
 * Mock implementations of every service interface, backed by the
 * localStorage-persisted MockDb. This entire directory is what gets replaced
 * when a real backend arrives (see README → "Swapping in a real backend").
 */
import { mockDb } from "@/lib/mock/db";
import { DEMO_MEMBER_ID, DEMO_OWNER_ID } from "@/lib/mock/seed";
import { useSessionStore } from "@/lib/stores/session";
import {
  countVisitsInWindow,
  isLateCancellation,
  POLICY,
} from "@/lib/rules/policy";
import type {
  Booking,
  BookingDenialReason,
  BookingEligibility,
  BookingView,
  CategoryId,
  Invoice,
  MemberStats,
  PayoutEntry,
  PayoutStatement,
  Role,
  RosterEntry,
  Session,
  SessionView,
  Studio,
  StudioAnalytics,
  StudioFilter,
  Subscription,
  TimeSeriesPoint,
  VisitCapStatus,
} from "@/lib/types";
import { addDays, monthKey, startOfDay, uid } from "@/lib/utils";
import type { Services } from "../types";
import {
  bookedCount,
  isActiveBooking,
  pushNotification,
  READ_MS,
  ServiceError,
  simulate,
  toBookingView,
  toSessionView,
  walletSummary,
  WRITE_MS,
} from "./helpers";

const db = mockDb;

/* --------------------------------- Auth ---------------------------------- */

const auth: Services["auth"] = {
  async signInAsDemo(role: Role) {
    await simulate(WRITE_MS);
    const id = role === "member" ? DEMO_MEMBER_ID : DEMO_OWNER_ID;
    const user = db.get().users.find((u) => u.id === id);
    if (!user) throw new ServiceError("user_not_found");
    useSessionStore.getState().setSession(user.id, user.role);
    return user;
  },
  async signOut() {
    useSessionStore.getState().clearSession();
  },
  async getCurrentUser() {
    const { userId } = useSessionStore.getState();
    if (!userId) return null;
    return db.get().users.find((u) => u.id === userId) ?? null;
  },
};

/* -------------------------------- Catalog -------------------------------- */

function studioMatchesFilter(
  s: Studio,
  f: StudioFilter | undefined,
  minCreditCost: (st: Studio) => number,
  hasOpenToday: (st: Studio) => boolean,
): boolean {
  if (!f) return true;
  if (f.cityId && s.cityId !== f.cityId) return false;
  if (f.neighborhoodId && s.neighborhoodId !== f.neighborhoodId) return false;
  if (f.categoryId && !s.categoryIds.includes(f.categoryId)) return false;
  if (f.query) {
    const q = f.query.toLowerCase();
    const state = db.get();
    const nb = state.neighborhoods.find((n) => n.id === s.neighborhoodId);
    const hay = [s.name, s.address, nb?.name.el ?? "", nb?.name.en ?? ""]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.maxCredits !== undefined && minCreditCost(s) > f.maxCredits)
    return false;
  if (f.availableToday && !hasOpenToday(s)) return false;
  return true;
}

function upcomingSessionsFor(studioId: string, dayISO: string): Session[] {
  const state = db.get();
  const day = startOfDay(new Date(dayISO));
  const next = addDays(day, 1);
  return state.sessions
    .filter(
      (s) =>
        s.studioId === studioId &&
        s.status === "scheduled" &&
        new Date(s.startsAt) >= day &&
        new Date(s.startsAt) < next,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

const catalog: Services["catalog"] = {
  async listCities() {
    return db.get().cities;
  },
  async listNeighborhoods(cityId) {
    const all = db.get().neighborhoods;
    return cityId ? all.filter((n) => n.cityId === cityId) : all;
  },
  async listCategories() {
    return db.get().categories;
  },
  async listStudios(filter) {
    await simulate(READ_MS);
    const state = db.get();
    const now = Date.now();

    const minCreditCost = (st: Studio): number => {
      const upcoming = state.sessions.filter(
        (s) =>
          s.studioId === st.id &&
          s.status === "scheduled" &&
          new Date(s.startsAt).getTime() > now,
      );
      if (upcoming.length === 0) return 99;
      return Math.min(
        ...upcoming.map((s) => toSessionView(state, s)?.creditCost ?? 99),
      );
    };
    const hasOpenToday = (st: Studio): boolean =>
      upcomingSessionsFor(st.id, new Date().toISOString()).some((s) => {
        const v = toSessionView(state, s);
        return (
          !!v && v.spotsLeft > 0 && new Date(s.startsAt).getTime() > now
        );
      });

    return state.studios
      .filter((s) =>
        studioMatchesFilter(s, filter, minCreditCost, hasOpenToday),
      )
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      );
  },
  async getStudio(id) {
    await simulate(READ_MS);
    return db.get().studios.find((s) => s.id === id) ?? null;
  },
  async listStudioSessions(studioId, dayISO) {
    await simulate(READ_MS);
    const state = db.get();
    return upcomingSessionsFor(studioId, dayISO)
      .map((s) => toSessionView(state, s))
      .filter((v): v is SessionView => v !== null);
  },
  async listOpenSessions({ cityId, dayISO, limit = 12 }) {
    await simulate(READ_MS);
    const state = db.get();
    const now = Date.now();
    const day = startOfDay(new Date(dayISO));
    const next = addDays(day, 1);
    return state.sessions
      .filter((s) => {
        if (s.status !== "scheduled") return false;
        const t = new Date(s.startsAt);
        if (t < day || t >= next || t.getTime() <= now) return false;
        if (cityId) {
          const st = state.studios.find((x) => x.id === s.studioId);
          if (!st || st.cityId !== cityId) return false;
        }
        return true;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((s) => toSessionView(state, s))
      .filter((v): v is SessionView => v !== null && v.spotsLeft > 0)
      .slice(0, limit);
  },
  async getSessionView(sessionId) {
    const state = db.get();
    const s = state.sessions.find((x) => x.id === sessionId);
    return s ? toSessionView(state, s) : null;
  },
  async listFavorites(userId) {
    await simulate(READ_MS);
    const state = db.get();
    const ids = state.favorites
      .filter((f) => f.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((f) => f.studioId);
    return ids
      .map((id) => state.studios.find((s) => s.id === id))
      .filter((s): s is Studio => !!s);
  },
  async isFavorite(userId, studioId) {
    return db
      .get()
      .favorites.some((f) => f.userId === userId && f.studioId === studioId);
  },
  async toggleFavorite(userId, studioId) {
    let nowFav = false;
    db.mutate((s) => {
      const idx = s.favorites.findIndex(
        (f) => f.userId === userId && f.studioId === studioId,
      );
      if (idx >= 0) {
        s.favorites.splice(idx, 1);
      } else {
        s.favorites.push({
          userId,
          studioId,
          createdAt: new Date().toISOString(),
        });
        nowFav = true;
      }
    });
    return nowFav;
  },
};

/* -------------------------------- Booking -------------------------------- */

function capStatusFor(
  userId: string,
  studioId: string,
  atSessionStart?: Date,
): VisitCapStatus {
  const state = db.get();
  const cap = POLICY.visitCapPerStudioPerMonth;
  const starts = state.bookings
    .filter(
      (b) =>
        b.userId === userId && b.studioId === studioId && isActiveBooking(b),
    )
    .map((b) => {
      const s = state.sessions.find((x) => x.id === b.sessionId);
      return s?.startsAt;
    })
    .filter((x): x is string => !!x);

  let used: number;
  if (atSessionStart) {
    used = countVisitsInWindow(starts, atSessionStart);
  } else {
    // Display mode: visits in the trailing window + all upcoming holds.
    const windowStart =
      Date.now() - POLICY.rollingWindowDays * 86_400_000;
    used = starts.filter((iso) => new Date(iso).getTime() > windowStart).length;
  }
  return { used: Math.min(used, cap), cap, reached: used >= cap };
}

function eligibilityFor(userId: string, sessionId: string): BookingEligibility {
  const state = db.get();
  const s = state.sessions.find((x) => x.id === sessionId);
  if (!s) throw new ServiceError("session_not_found");
  const view = toSessionView(state, s);
  if (!view) throw new ServiceError("session_not_found");
  const capStatus = capStatusFor(userId, s.studioId, new Date(s.startsAt));

  const deny = (reason: BookingDenialReason): BookingEligibility => ({
    ok: false,
    reason,
    creditCost: view.creditCost,
    capStatus,
  });

  if (s.status !== "scheduled" || new Date(s.startsAt).getTime() <= Date.now())
    return deny("in_past");
  if (
    state.bookings.some(
      (b) =>
        b.sessionId === sessionId && b.userId === userId && isActiveBooking(b),
    )
  )
    return deny("already_booked");
  if (view.spotsLeft <= 0) return deny("full");
  if (capStatus.reached) return deny("visit_cap");
  if (walletSummary(state, userId).balance < view.creditCost)
    return deny("insufficient_credits");

  return { ok: true, creditCost: view.creditCost, capStatus };
}

const booking: Services["booking"] = {
  async listMyBookings(userId) {
    await simulate(READ_MS);
    const state = db.get();
    return state.bookings
      .filter((b) => b.userId === userId)
      .map((b) => toBookingView(state, b))
      .filter((v): v is BookingView => v !== null)
      .sort((a, b) => b.session.startsAt.localeCompare(a.session.startsAt));
  },
  async getBookingView(bookingId) {
    const state = db.get();
    const b = state.bookings.find((x) => x.id === bookingId);
    return b ? toBookingView(state, b) : null;
  },
  async checkEligibility(userId, sessionId) {
    await simulate(80);
    return eligibilityFor(userId, sessionId);
  },
  async reserve(userId, sessionId) {
    await simulate(WRITE_MS);
    const el = eligibilityFor(userId, sessionId);
    if (!el.ok) throw new ServiceError(el.reason ?? "unknown");

    let created: Booking | null = null;
    db.mutate((state) => {
      const s = state.sessions.find((x) => x.id === sessionId)!;
      const studio = state.studios.find((x) => x.id === s.studioId)!;
      const user = state.users.find((u) => u.id === userId);
      const now = new Date().toISOString();
      const b: Booking = {
        id: uid("bk"),
        userId,
        sessionId,
        studioId: s.studioId,
        status: "reserved",
        creditCost: el.creditCost,
        payoutEUR: s.floorPriceEUR,
        qrToken: uid("qr"),
        createdAt: now,
      };
      state.bookings.push(b);
      created = b;
      // PENDING credit spend…
      state.creditTxs.push({
        id: uid("tx"),
        userId,
        type: "spend",
        status: "pending",
        delta: -el.creditCost,
        reason: "booking",
        bookingId: b.id,
        studioId: s.studioId,
        createdAt: now,
      });
      // …and PENDING studio payout accrual.
      state.payoutEntries.push({
        id: uid("po"),
        studioId: s.studioId,
        bookingId: b.id,
        sessionId,
        userId,
        amountEUR: s.floorPriceEUR,
        status: "pending",
        createdAt: now,
      });
      pushNotification(state, {
        userId: studio.ownerId,
        kind: "booking",
        title: { el: "Νέα κράτηση μέσω PULSE", en: "New PULSE booking" },
        body: {
          el: `${user?.name ?? "Μέλος"} — ${studio.name}`,
          en: `${user?.name ?? "Member"} — ${studio.name}`,
        },
        href: "/studio/roster",
      });
    });

    const view = toBookingView(db.get(), created!);
    if (!view) throw new ServiceError("unknown");
    return view;
  },
  async quoteCancellation(bookingId) {
    const state = db.get();
    const b = state.bookings.find((x) => x.id === bookingId);
    if (!b) throw new ServiceError("booking_not_found");
    const s = state.sessions.find((x) => x.id === b.sessionId)!;
    const studio = state.studios.find((x) => x.id === b.studioId)!;
    const cutoff =
      studio.cancellationCutoffHours ?? POLICY.defaultCancellationCutoffHours;
    const late = isLateCancellation(s.startsAt, cutoff);
    return {
      late,
      feeCredits: late ? POLICY.lateCancelFeeCredits : 0,
      refundCredits: b.creditCost,
      cutoffHours: cutoff,
    };
  },
  async cancel(bookingId) {
    await simulate(WRITE_MS);
    const quote = await booking.quoteCancellation(bookingId);
    db.mutate((state) => {
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b || b.status !== "reserved")
        throw new ServiceError("not_cancellable");
      const now = new Date().toISOString();
      b.status = quote.late ? "late_cancelled" : "cancelled";
      b.cancelledAt = now;
      // Release the held spend.
      const spend = state.creditTxs.find(
        (t) => t.bookingId === b.id && t.type === "spend",
      );
      if (spend && spend.status === "pending") {
        spend.status = "reversed";
        spend.settledAt = now;
      }
      // Late fee, if past the cutoff.
      if (quote.late) {
        state.creditTxs.push({
          id: uid("tx"),
          userId: b.userId,
          type: "fee",
          status: "confirmed",
          delta: -quote.feeCredits,
          reason: "late_cancel_fee",
          bookingId: b.id,
          studioId: b.studioId,
          createdAt: now,
          settledAt: now,
        });
      }
      // The studio accrual never materializes.
      const po = state.payoutEntries.find((p) => p.bookingId === b.id);
      if (po && po.status === "pending") po.status = "reversed";
    });
    return { late: quote.late, feeCredits: quote.feeCredits };
  },
  async checkIn(bookingId) {
    await simulate(WRITE_MS);
    db.mutate((state) => {
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b) throw new ServiceError("booking_not_found");
      if (b.status !== "reserved") throw new ServiceError("not_checkinable");
      const now = new Date().toISOString();
      b.status = "checked_in";
      b.checkedInAt = now;
      // Finalize the member's spend…
      const spend = state.creditTxs.find(
        (t) => t.bookingId === b.id && t.type === "spend",
      );
      if (spend && spend.status === "pending") {
        spend.status = "confirmed";
        spend.settledAt = now;
      }
      // …and lock in the studio's earning.
      const po = state.payoutEntries.find((p) => p.bookingId === b.id);
      if (po && po.status === "pending") {
        po.status = "confirmed";
        po.confirmedAt = now;
      }
      const studio = state.studios.find((x) => x.id === b.studioId);
      if (studio) {
        pushNotification(state, {
          userId: studio.ownerId,
          kind: "payout",
          title: { el: "Check-in ✓ — πληρωμή κατοχυρώθηκε", en: "Check-in ✓ — payout locked in" },
          body: {
            el: `+${b.payoutEUR}€ από επιβεβαιωμένη παρουσία`,
            en: `+€${b.payoutEUR} from a confirmed attendance`,
          },
          href: "/studio/payouts",
        });
      }
    });
    const view = toBookingView(db.get(), db.get().bookings.find((x) => x.id === bookingId)!);
    if (!view) throw new ServiceError("unknown");
    return view;
  },
  async markNoShow(bookingId) {
    await simulate(WRITE_MS);
    db.mutate((state) => {
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b) throw new ServiceError("booking_not_found");
      if (b.status !== "reserved") throw new ServiceError("not_checkinable");
      const now = new Date().toISOString();
      b.status = "no_show";
      // Spend is released, but a no-show fee is charged.
      const spend = state.creditTxs.find(
        (t) => t.bookingId === b.id && t.type === "spend",
      );
      if (spend && spend.status === "pending") {
        spend.status = "reversed";
        spend.settledAt = now;
      }
      state.creditTxs.push({
        id: uid("tx"),
        userId: b.userId,
        type: "fee",
        status: "confirmed",
        delta: -POLICY.noShowFeeCredits,
        reason: "no_show_fee",
        bookingId: b.id,
        studioId: b.studioId,
        createdAt: now,
        settledAt: now,
      });
      const po = state.payoutEntries.find((p) => p.bookingId === b.id);
      if (po && po.status === "pending") po.status = "reversed";
    });
    const view = toBookingView(db.get(), db.get().bookings.find((x) => x.id === bookingId)!);
    if (!view) throw new ServiceError("unknown");
    return view;
  },
  async visitCapStatus(userId, studioId) {
    return capStatusFor(userId, studioId);
  },
};

/* --------------------------------- Wallet --------------------------------- */

/** Rolls the subscription cycle forward and grants credits when it lapses. */
function ensureCycleCurrent(userId: string): void {
  const state = db.get();
  const sub = state.subscriptions.find(
    (s) => s.userId === userId && s.status === "active",
  );
  if (!sub) return;
  if (new Date(sub.cycleEnd).getTime() > Date.now()) return;
  db.mutate((s) => {
    const live = s.subscriptions.find((x) => x.id === sub.id)!;
    while (new Date(live.cycleEnd).getTime() <= Date.now()) {
      live.cycleStart = live.cycleEnd;
      live.cycleEnd = addDays(new Date(live.cycleEnd), 30).toISOString();
      s.creditTxs.push({
        id: uid("tx"),
        userId,
        type: "topup",
        status: "confirmed",
        delta: live.creditsPerCycle,
        reason: "cycle_grant",
        createdAt: live.cycleStart,
        settledAt: live.cycleStart,
      });
    }
  });
}

const wallet: Services["wallet"] = {
  async getSummary(userId) {
    await simulate(READ_MS);
    ensureCycleCurrent(userId);
    return walletSummary(db.get(), userId);
  },
  async listTransactions(userId) {
    await simulate(READ_MS);
    return db
      .get()
      .creditTxs.filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async topUp(userId, packId) {
    const pack = POLICY.topUpPacks.find((p) => p.id === packId);
    if (!pack) throw new ServiceError("pack_not_found");
    // Mock payment processing delay.
    await simulate(900);
    let created: import("@/lib/types").CreditTransaction | null = null;
    db.mutate((state) => {
      const now = new Date().toISOString();
      created = {
        id: uid("tx"),
        userId,
        type: "topup",
        status: "confirmed",
        delta: pack.credits,
        reason: "topup_pack",
        createdAt: now,
        settledAt: now,
      };
      state.creditTxs.push(created);
      pushNotification(state, {
        userId,
        kind: "wallet",
        title: {
          el: `+${pack.credits} credits προστέθηκαν`,
          en: `+${pack.credits} credits added`,
        },
        body: {
          el: "Το top-up πακέτο σου ολοκληρώθηκε.",
          en: "Your top-up pack was processed.",
        },
        href: "/member/wallet",
      });
    });
    return created!;
  },
};

/* ------------------------------ Subscriptions ------------------------------ */

const subscriptions: Services["subscriptions"] = {
  async listPlans() {
    return db.get().plans;
  },
  async getMySubscription(userId) {
    await simulate(READ_MS);
    ensureCycleCurrent(userId);
    return (
      db
        .get()
        .subscriptions.find(
          (s) => s.userId === userId && s.status === "active",
        ) ?? null
    );
  },
  async changePlan(userId, planId) {
    await simulate(WRITE_MS);
    let updated: Subscription | null = null;
    db.mutate((state) => {
      const plan = state.plans.find((p) => p.id === planId);
      const sub = state.subscriptions.find(
        (s) => s.userId === userId && s.status === "active",
      );
      if (!plan || !sub) throw new ServiceError("plan_not_found");
      sub.planId = plan.id;
      sub.creditsPerCycle = plan.creditsPerCycle;
      sub.priceEUR = plan.priceEUR;
      updated = sub;
    });
    return updated!;
  },
  async listInvoices(userId) {
    await simulate(READ_MS);
    const state = db.get();
    const sub = state.subscriptions.find((s) => s.userId === userId);
    const invoices: Invoice[] = [];
    if (sub) {
      const plan = state.plans.find((p) => p.id === sub.planId);
      for (let i = 0; i < 3; i++) {
        const date = addDays(new Date(sub.cycleStart), -30 * i);
        invoices.push({
          id: `inv_${userId}_${i}`,
          userId,
          label: {
            el: `Συνδρομή ${plan?.name.el ?? ""}`,
            en: `${plan?.name.en ?? ""} membership`,
          },
          amountEUR: sub.priceEUR,
          issuedAt: date.toISOString(),
          status: "paid",
        });
      }
    }
    for (const t of state.creditTxs) {
      if (t.userId === userId && t.reason === "topup_pack") {
        const pack = POLICY.topUpPacks.find((p) => p.credits === t.delta);
        invoices.push({
          id: `inv_${t.id}`,
          userId,
          label: {
            el: `Top-up ${t.delta} credits`,
            en: `Top-up ${t.delta} credits`,
          },
          amountEUR: pack?.priceEUR ?? t.delta * 2.5,
          issuedAt: t.createdAt,
          status: "paid",
        });
      }
    }
    return invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },
};

/* -------------------------------- Payouts --------------------------------- */

const payouts: Services["payouts"] = {
  async getSummary(studioId) {
    await simulate(READ_MS);
    const entries = db
      .get()
      .payoutEntries.filter((p) => p.studioId === studioId);
    const nowMonth = monthKey(new Date().toISOString());
    let pendingEUR = 0;
    let confirmedThisMonthEUR = 0;
    let confirmedAllTimeEUR = 0;
    let attendancesThisMonth = 0;
    for (const p of entries) {
      if (p.status === "pending") pendingEUR += p.amountEUR;
      if (p.status === "confirmed") {
        confirmedAllTimeEUR += p.amountEUR;
        if (monthKey(p.confirmedAt ?? p.createdAt) === nowMonth) {
          confirmedThisMonthEUR += p.amountEUR;
          attendancesThisMonth += 1;
        }
      }
    }
    return {
      pendingEUR,
      confirmedThisMonthEUR,
      confirmedAllTimeEUR,
      attendancesThisMonth,
    };
  },
  async listEntries(studioId, opts) {
    await simulate(READ_MS);
    const state = db.get();
    const views = state.payoutEntries
      .filter(
        (p) =>
          p.studioId === studioId &&
          (!opts?.month ||
            monthKey(p.confirmedAt ?? p.createdAt) === opts.month),
      )
      .map((entry) => {
        const member = state.users.find((u) => u.id === entry.userId);
        const session = state.sessions.find((s) => s.id === entry.sessionId);
        const ct = state.classTypes.find(
          (c) => c.id === session?.classTypeId,
        );
        return {
          entry,
          memberName: member?.name ?? "Member",
          className: ct?.name ?? "",
          sessionStartsAt: session?.startsAt ?? entry.createdAt,
        };
      })
      // Most recent activity first — a fresh check-in bubbles straight to the top.
      .sort((a, b) =>
        (b.entry.confirmedAt ?? b.entry.createdAt).localeCompare(
          a.entry.confirmedAt ?? a.entry.createdAt,
        ),
      );
    return opts?.limit ? views.slice(0, opts.limit) : views;
  },
  async listStatements(studioId) {
    await simulate(READ_MS);
    const confirmed = db
      .get()
      .payoutEntries.filter(
        (p) => p.studioId === studioId && p.status === "confirmed",
      );
    const byMonth = new Map<string, PayoutEntry[]>();
    for (const p of confirmed) {
      const key = monthKey(p.confirmedAt ?? p.createdAt);
      byMonth.set(key, [...(byMonth.get(key) ?? []), p]);
    }
    const statements: PayoutStatement[] = [...byMonth.entries()].map(
      ([month, entries]) => ({
        month,
        totalEUR: entries.reduce((a, p) => a + p.amountEUR, 0),
        attendanceCount: entries.length,
        entries,
      }),
    );
    return statements.sort((a, b) => b.month.localeCompare(a.month));
  },
};

/* -------------------------------- Reviews --------------------------------- */

const reviews: Services["reviews"] = {
  async listForStudio(studioId) {
    await simulate(READ_MS);
    return db
      .get()
      .reviews.filter((r) => r.studioId === studioId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async add(input) {
    await simulate(WRITE_MS);
    let created: import("@/lib/types").Review | null = null;
    db.mutate((state) => {
      const user = state.users.find((u) => u.id === input.userId);
      created = {
        id: uid("rv"),
        studioId: input.studioId,
        userId: input.userId,
        authorName: user?.name ?? "Member",
        rating: input.rating,
        text: input.text,
        lang: input.lang,
        createdAt: new Date().toISOString(),
      };
      state.reviews.unshift(created);
      const studio = state.studios.find((s) => s.id === input.studioId);
      if (studio) {
        const all = state.reviews.filter((r) => r.studioId === studio.id);
        const avg = all.reduce((a, r) => a + r.rating, 0) / all.length;
        studio.rating = Math.round(((avg + studio.rating) / 2) * 10) / 10;
        studio.reviewCount += 1;
      }
    });
    return created!;
  },
};

/* ------------------------------ Notifications ------------------------------ */

const notifications: Services["notifications"] = {
  async list(userId) {
    await simulate(READ_MS);
    return db
      .get()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async unreadCount(userId) {
    return db
      .get()
      .notifications.filter((n) => n.userId === userId && !n.read).length;
  },
  async markRead(id) {
    db.mutate((state) => {
      const n = state.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    });
  },
  async markAllRead(userId) {
    db.mutate((state) => {
      for (const n of state.notifications) {
        if (n.userId === userId) n.read = true;
      }
    });
  },
};

/* ------------------------------ Studio admin ------------------------------- */

const studioAdmin: Services["studioAdmin"] = {
  async getMyStudio(ownerId) {
    await simulate(READ_MS);
    return db.get().studios.find((s) => s.ownerId === ownerId) ?? null;
  },
  async updateStudio(studioId, patch) {
    await simulate(WRITE_MS);
    let updated: Studio | null = null;
    db.mutate((state) => {
      const s = state.studios.find((x) => x.id === studioId);
      if (!s) throw new ServiceError("studio_not_found");
      Object.assign(s, patch, { id: s.id, ownerId: s.ownerId });
      updated = s;
    });
    return updated!;
  },
  async listClassTypes(studioId) {
    return db.get().classTypes.filter((c) => c.studioId === studioId);
  },
  async listSessions(studioId, fromISO, toISO) {
    await simulate(READ_MS);
    const state = db.get();
    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    return state.sessions
      .filter((s) => {
        const t = new Date(s.startsAt).getTime();
        return s.studioId === studioId && t >= from && t <= to;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((s) => toSessionView(state, s))
      .filter((v): v is SessionView => v !== null);
  },
  async createSession(input) {
    await simulate(WRITE_MS);
    let created: Session | null = null;
    db.mutate((state) => {
      created = {
        id: uid("se"),
        studioId: input.studioId,
        classTypeId: input.classTypeId,
        startsAt: input.startsAt,
        durationMin: input.durationMin,
        instructor: input.instructor,
        capacity: input.capacity,
        spotsReleasedToPlatform: input.spotsReleasedToPlatform,
        floorPriceEUR: input.floorPriceEUR,
        peak: input.peak,
        status: "scheduled",
        seedBooked: 0,
      };
      state.sessions.push(created);
    });
    return created!;
  },
  async updateSession(sessionId, patch) {
    await simulate(WRITE_MS);
    let updated: Session | null = null;
    db.mutate((state) => {
      const s = state.sessions.find((x) => x.id === sessionId);
      if (!s) throw new ServiceError("session_not_found");
      Object.assign(s, patch);
      updated = s;
    });
    return updated!;
  },
  async cancelSession(sessionId) {
    await simulate(WRITE_MS);
    db.mutate((state) => {
      const s = state.sessions.find((x) => x.id === sessionId);
      if (!s) throw new ServiceError("session_not_found");
      s.status = "cancelled";
      const now = new Date().toISOString();
      for (const b of state.bookings) {
        if (b.sessionId !== sessionId || b.status !== "reserved") continue;
        b.status = "cancelled";
        b.cancelledAt = now;
        // Full refund — the studio cancelled, never the member's fault.
        const spend = state.creditTxs.find(
          (t) => t.bookingId === b.id && t.type === "spend",
        );
        if (spend && spend.status === "pending") {
          spend.status = "reversed";
          spend.settledAt = now;
        }
        const po = state.payoutEntries.find((p) => p.bookingId === b.id);
        if (po && po.status === "pending") po.status = "reversed";
        const studio = state.studios.find((x) => x.id === s.studioId);
        pushNotification(state, {
          userId: b.userId,
          kind: "booking",
          title: { el: "Μάθημα ακυρώθηκε", en: "Class cancelled" },
          body: {
            el: `${studio?.name ?? ""} — τα credits σου επιστράφηκαν.`,
            en: `${studio?.name ?? ""} — your credits were refunded.`,
          },
          href: "/member/bookings",
        });
      }
    });
  },
  async getRoster(sessionId) {
    await simulate(READ_MS);
    const state = db.get();
    return state.bookings
      .filter((b) => b.sessionId === sessionId)
      .map((b): RosterEntry => {
        const member = state.users.find((u) => u.id === b.userId);
        return { booking: b, memberName: member?.name ?? "Member" };
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName, "el"));
  },
};

/* -------------------------------- Analytics -------------------------------- */

function dayLabel(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const analytics: Services["analytics"] = {
  async getMemberStats(userId): Promise<MemberStats> {
    await simulate(READ_MS);
    const state = db.get();
    const mine = state.bookings.filter(
      (b) =>
        b.userId === userId &&
        (b.status === "completed" || b.status === "checked_in"),
    );
    const withStart = mine
      .map((b) => ({
        b,
        start: state.sessions.find((s) => s.id === b.sessionId)?.startsAt,
      }))
      .filter((x): x is { b: Booking; start: string } => !!x.start);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const classesThisMonth = withStart.filter(
      (x) => new Date(x.start).getTime() >= monthStart,
    ).length;

    // Week streak: consecutive 7-day windows (back from today) with ≥1 class.
    let streakWeeks = 0;
    for (let w = 0; w < 52; w++) {
      const end = now.getTime() - w * 7 * 86_400_000;
      const start = end - 7 * 86_400_000;
      const hit = withStart.some((x) => {
        const t = new Date(x.start).getTime();
        return t > start && t <= end;
      });
      if (hit) streakWeeks++;
      else break;
    }

    const catCounts = new Map<CategoryId, number>();
    for (const x of withStart) {
      const session = state.sessions.find((s) => s.id === x.b.sessionId);
      const ct = state.classTypes.find((c) => c.id === session?.classTypeId);
      if (ct) catCounts.set(ct.categoryId, (catCounts.get(ct.categoryId) ?? 0) + 1);
    }
    const favoriteCategoryId = [...catCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    return {
      classesThisMonth,
      streakWeeks,
      favoriteCategoryId,
      totalClasses: mine.length,
      studiosVisited: new Set(mine.map((b) => b.studioId)).size,
      creditsSpentThisCycle: walletSummary(state, userId).cycleSpent,
    };
  },

  async getStudioAnalytics(studioId): Promise<StudioAnalytics> {
    await simulate(READ_MS + 100);
    const state = db.get();
    const now = new Date();
    const today = startOfDay(now);

    const sessionsById = new Map(state.sessions.map((s) => [s.id, s]));
    const mine = state.bookings
      .map((b) => ({ b, s: sessionsById.get(b.sessionId) }))
      .filter(
        (x): x is { b: Booking; s: Session } =>
          !!x.s && x.s.studioId === studioId,
      );

    // Bookings per day, last 30 days (by session date, active statuses).
    const bookingsOverTime: TimeSeriesPoint[] = [];
    for (let d = -29; d <= 0; d++) {
      const day = addDays(today, d);
      const next = addDays(day, 1);
      const count = mine.filter((x) => {
        const t = new Date(x.s.startsAt);
        return (
          t >= day &&
          t < next &&
          x.b.status !== "cancelled" &&
          x.b.status !== "late_cancelled"
        );
      }).length;
      bookingsOverTime.push({ label: dayLabel(day), value: count });
    }

    // New vs returning, weekly buckets over the last 4 weeks.
    const firstBookingAt = new Map<string, number>();
    for (const x of mine) {
      const t = new Date(x.b.createdAt).getTime();
      const prev = firstBookingAt.get(x.b.userId);
      if (prev === undefined || t < prev) firstBookingAt.set(x.b.userId, t);
    }
    const newVsReturning: StudioAnalytics["newVsReturning"] = [];
    for (let w = 3; w >= 0; w--) {
      const end = now.getTime() - w * 7 * 86_400_000;
      const start = end - 7 * 86_400_000;
      const weekUsers = new Set(
        mine
          .filter((x) => {
            const t = new Date(x.b.createdAt).getTime();
            return t > start && t <= end;
          })
          .map((x) => x.b.userId),
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

    // Fill rate per day, last 14 days: booked platform spots / released.
    const fillRateByDay: TimeSeriesPoint[] = [];
    for (let d = -13; d <= 0; d++) {
      const day = addDays(today, d);
      const next = addDays(day, 1);
      const daySessions = state.sessions.filter((s) => {
        const t = new Date(s.startsAt);
        return s.studioId === studioId && t >= day && t < next;
      });
      const released = daySessions.reduce(
        (a, s) => a + s.spotsReleasedToPlatform,
        0,
      );
      const booked = daySessions.reduce((a, s) => a + bookedCount(state, s), 0);
      fillRateByDay.push({
        label: dayLabel(day),
        value: released > 0 ? Math.round((booked / released) * 100) : 0,
      });
    }

    // Category performance (last 30 days, active bookings).
    const monthAgo = now.getTime() - 30 * 86_400_000;
    const catMap = new Map<CategoryId, number>();
    for (const x of mine) {
      const t = new Date(x.s.startsAt).getTime();
      if (t < monthAgo || t > now.getTime() + 14 * 86_400_000) continue;
      if (x.b.status === "cancelled" || x.b.status === "late_cancelled") continue;
      const ct = state.classTypes.find((c) => c.id === x.s.classTypeId);
      if (ct) catMap.set(ct.categoryId, (catMap.get(ct.categoryId) ?? 0) + 1);
    }
    const categoryPerformance = [...catMap.entries()]
      .map(([categoryId, bookings]) => ({ categoryId, bookings }))
      .sort((a, b) => b.bookings - a.bookings);

    // KPIs.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const bookingsThisMonth = mine.filter(
      (x) =>
        new Date(x.b.createdAt).getTime() >= monthStart &&
        x.b.status !== "cancelled",
    ).length;
    const done = mine.filter((x) => x.b.status === "completed").length;
    const noShows = mine.filter((x) => x.b.status === "no_show").length;
    const attendanceRate = done + noShows > 0 ? done / (done + noShows) : 1;

    const upcoming = state.sessions.filter((s) => {
      const t = new Date(s.startsAt).getTime();
      return (
        s.studioId === studioId &&
        s.status === "scheduled" &&
        t > now.getTime() &&
        t < now.getTime() + 7 * 86_400_000
      );
    });
    const upReleased = upcoming.reduce(
      (a, s) => a + s.spotsReleasedToPlatform,
      0,
    );
    const upBooked = upcoming.reduce((a, s) => a + bookedCount(state, s), 0);

    const revenueThisMonthEUR = state.payoutEntries
      .filter(
        (p) =>
          p.studioId === studioId &&
          p.status === "confirmed" &&
          monthKey(p.confirmedAt ?? p.createdAt) ===
            monthKey(now.toISOString()),
      )
      .reduce((a, p) => a + p.amountEUR, 0);

    return {
      kpis: {
        bookingsThisMonth,
        attendanceRate,
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

/* ---------------------------------- Demo ----------------------------------- */

const demo: Services["demo"] = {
  async reset() {
    db.reset();
  },
};

export const mockServices: Services = {
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
  demo,
  subscribe: (listener) => db.subscribe(listener),
};
