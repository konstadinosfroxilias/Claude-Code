import type { DBState } from "@/lib/mock/db";
import type {
  AppNotification,
  Booking,
  BookingView,
  LocalizedText,
  Session,
  SessionView,
  WalletSummary,
} from "@/lib/types";
import { computeCreditCost } from "@/lib/rules/pricing";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/rules/policy";
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
  };
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
