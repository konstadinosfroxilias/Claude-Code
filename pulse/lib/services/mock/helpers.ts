import type { DBState } from "@/lib/mock/db";
import type {
  AppNotification,
  Booking,
  BookingView,
  LocalizedText,
  Session,
  SessionView,
  VisitCapStatus,
  WaitlistEntry,
  WaitlistView,
  WalletSummary,
} from "@/lib/types";
import { computeCreditCost } from "@/lib/rules/pricing";
import {
  ACTIVE_BOOKING_STATUSES,
  countVisitsInWindow,
  POLICY,
} from "@/lib/rules/policy";
import { uid } from "@/lib/utils";

/** Typed failure the UI can map to i18n copy. */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ServiceError";
  }
}

/** Small artificial latency so loading states are honest (skeletons show). */
export function simulate(ms: number): Promise<void> {
  const jitter = ms * (0.7 + Math.random() * 0.6);
  return new Promise((r) => setTimeout(r, jitter));
}
export const READ_MS = 160;
export const WRITE_MS = 240;

export function isActiveBooking(b: Booking): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(b.status);
}

/** Platform spots currently taken on a session. */
export function bookedCount(db: DBState, s: Session): number {
  const real = db.bookings.filter(
    (b) => b.sessionId === s.id && isActiveBooking(b),
  ).length;
  return s.seedBooked + real;
}

export function toSessionView(db: DBState, s: Session): SessionView | null {
  const classType = db.classTypes.find((c) => c.id === s.classTypeId);
  const studio = db.studios.find((st) => st.id === s.studioId);
  if (!classType || !studio) return null;
  const booked = bookedCount(db, s);
  const released = s.spotsReleasedToPlatform;
  return {
    session: s,
    classType,
    studio,
    booked,
    spotsLeft: Math.max(0, released - booked),
    creditCost: computeCreditCost(
      s.floorPriceEUR,
      s.peak,
      released > 0 ? Math.min(1, booked / released) : 1,
    ),
    waitlistCount: (db.waitlist ?? []).filter((w) => w.sessionId === s.id)
      .length,
  };
}

export function toWaitlistView(
  db: DBState,
  entry: WaitlistEntry,
): WaitlistView | null {
  const session = db.sessions.find((s) => s.id === entry.sessionId);
  if (!session) return null;
  const classType = db.classTypes.find((c) => c.id === session.classTypeId);
  const studio = db.studios.find((st) => st.id === entry.studioId);
  if (!classType || !studio) return null;
  return { entry, session, classType, studio };
}

/** Re-number a session's queue 1..n after someone joins or leaves. */
export function renumberWaitlist(db: DBState, sessionId: string): void {
  db.waitlist
    .filter((w) => w.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((w, i) => {
      w.position = i + 1;
    });
}

export function toBookingView(db: DBState, b: Booking): BookingView | null {
  const session = db.sessions.find((s) => s.id === b.sessionId);
  if (!session) return null;
  const classType = db.classTypes.find((c) => c.id === session.classTypeId);
  const studio = db.studios.find((st) => st.id === b.studioId);
  if (!classType || !studio) return null;
  return { booking: b, session, classType, studio };
}

export function walletSummary(db: DBState, userId: string): WalletSummary {
  const txs = db.creditTxs.filter((t) => t.userId === userId);
  let balance = 0;
  let pendingSpends = 0;
  for (const t of txs) {
    if (t.status === "reversed") continue;
    balance += t.delta;
    if (t.status === "pending" && t.delta < 0) pendingSpends += -t.delta;
  }
  const sub = db.subscriptions.find(
    (s) => s.userId === userId && s.status === "active",
  );
  const cycleStart = sub ? new Date(sub.cycleStart).getTime() : 0;
  const cycleSpent = txs
    .filter(
      (t) =>
        t.delta < 0 &&
        t.status !== "reversed" &&
        new Date(t.createdAt).getTime() >= cycleStart,
    )
    .reduce((acc, t) => acc + -t.delta, 0);
  return {
    balance,
    pendingSpends,
    cycleGranted: sub?.creditsPerCycle ?? 0,
    cycleSpent,
    cycleEndsAt: sub?.cycleEnd ?? new Date().toISOString(),
  };
}

/** The member's visit-cap position at a studio (see countVisitsInWindow). */
export function capStatusFor(
  db: DBState,
  userId: string,
  studioId: string,
  atSessionStart?: Date,
): VisitCapStatus {
  const cap = POLICY.visitCapPerStudioPerMonth;
  const starts = db.bookings
    .filter(
      (b) =>
        b.userId === userId && b.studioId === studioId && isActiveBooking(b),
    )
    .map((b) => db.sessions.find((x) => x.id === b.sessionId)?.startsAt)
    .filter((x): x is string => !!x);
  // One rule for both display and enforcement: omitting the session start
  // just anchors the window at "now".
  const used = countVisitsInWindow(starts, atSessionStart ?? new Date());
  return { used: Math.min(used, cap), cap, reached: used >= cap };
}

/**
 * The session as a view IF this member could book it right now: scheduled,
 * in the future, a platform spot left, under the cap, affordable and not
 * already held. Used by suggestions so we never suggest something the
 * booking sheet would then refuse.
 */
export function bookableView(
  db: DBState,
  userId: string,
  s: Session,
  now: Date = new Date(),
): SessionView | null {
  if (s.status !== "scheduled") return null;
  const start = new Date(s.startsAt);
  if (start.getTime() <= now.getTime() + 30 * 60_000) return null;
  const view = toSessionView(db, s);
  if (!view || view.spotsLeft <= 0) return null;
  if (
    db.bookings.some(
      (b) => b.sessionId === s.id && b.userId === userId && isActiveBooking(b),
    )
  )
    return null;
  if (capStatusFor(db, userId, s.studioId, start).reached) return null;
  if (walletSummary(db, userId).balance < view.creditCost) return null;
  return view;
}

export function pushNotification(
  db: DBState,
  input: {
    userId: string;
    kind: AppNotification["kind"];
    title: LocalizedText;
    body: LocalizedText;
    href?: string;
  },
): void {
  db.notifications.unshift({
    id: uid("nt"),
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  });
}
