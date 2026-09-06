"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, MapPin, QrCode, ScanLine, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type {
  BookingStatus,
  BookingView,
  CancellationQuote,
  WaitlistView,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CoverArt } from "@/components/shared/cover-art";
import { CreditChip } from "@/components/member/bits";
import { AddToCalendar } from "@/components/member/add-to-calendar";
import { InviteFriendButton } from "@/components/member/share-class";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_VARIANT: Record<
  BookingStatus,
  "volt" | "good" | "neutral" | "warn" | "bad"
> = {
  reserved: "volt",
  checked_in: "good",
  completed: "good",
  cancelled: "neutral",
  late_cancelled: "warn",
  no_show: "bad",
};

export default function BookingsPage() {
  const { t, lang } = useI18n();
  const { userId } = useCurrentUser();
  const [qrTarget, setQrTarget] = useState<BookingView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingView | null>(null);

  const { data: bookings, loading } = useLiveQuery(
    (svc) =>
      userId ? svc.booking.listMyBookings(userId) : Promise.resolve([]),
    [userId],
  );
  const { data: waitlist } = useLiveQuery(
    (svc) =>
      userId ? svc.booking.listMyWaitlist(userId) : Promise.resolve([]),
    [userId],
  );

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = bookings ?? [];
    return {
      upcoming: all
        .filter(
          (b) =>
            b.booking.status === "reserved" &&
            new Date(b.session.startsAt).getTime() > now,
        )
        .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt)),
      past: all.filter(
        (b) =>
          b.booking.status !== "reserved" ||
          new Date(b.session.startsAt).getTime() <= now,
      ),
    };
  }, [bookings]);

  const simulateCheckIn = async (b: BookingView) => {
    try {
      await getServices().booking.checkIn(b.booking.id);
      setQrTarget(null);
      toast.success(t("bookings.checkinToast"));
    } catch {
      toast.error(t("common.retry"));
    }
  };

  return (
    <div>
      <PageHeader title={t("bookings.title")} />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            {t("bookings.upcoming")}
            {upcoming.length > 0 && (
              <span className="ml-1.5 rounded-full bg-volt px-1.5 text-[10px] font-bold text-volt-ink tnum">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">{t("bookings.past")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loading ? (
            <ListSkeleton />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title={t("bookings.emptyUpcoming")}
              hint={t("bookings.emptyUpcomingHint")}
              action={
                <Button asChild variant="volt" size="sm">
                  <Link href="/member/explore">{t("bookings.explore")}</Link>
                </Button>
              }
            />
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence initial={false}>
                {upcoming.map((b) => (
                  <motion.div
                    key={b.booking.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                  >
                    <UpcomingCard
                      view={b}
                      onQr={() => setQrTarget(b)}
                      onCancel={() => setCancelTarget(b)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Waitlisted classes — no credits charged yet */}
          {waitlist && waitlist.length > 0 && (
            <div className="mt-6">
              <h2 className="display mb-3 text-sm uppercase tracking-wide text-low">
                {t("waitlist.badge")}
              </h2>
              <motion.div layout className="space-y-2">
                <AnimatePresence initial={false}>
                  {waitlist.map((w) => (
                    <motion.div
                      key={w.entry.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                    >
                      <WaitlistCard view={w} userId={userId} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {loading ? (
            <ListSkeleton />
          ) : past.length === 0 ? (
            <EmptyState icon={ScanLine} title={t("bookings.emptyPast")} />
          ) : (
            <div className="space-y-2">
              {past.map((b) => (
                <PastRow key={b.booking.id} view={b} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR dialog */}
      <Dialog open={!!qrTarget} onOpenChange={(o) => !o && setQrTarget(null)}>
        <DialogContent>
          {qrTarget && (
            <div className="flex flex-col items-center text-center">
              <DialogTitle>{t("bookings.showQr")}</DialogTitle>
              <DialogDescription>{t("bookings.qrHint")}</DialogDescription>
              <motion.div
                initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className="mt-5 rounded-2xl bg-white p-5 shadow-pop"
              >
                <QRCodeSVG
                  value={`pulse:checkin:${qrTarget.booking.qrToken}`}
                  size={196}
                  level="M"
                  fgColor="#0a0b0e"
                  bgColor="#ffffff"
                />
              </motion.div>
              <p className="mt-3 text-xs text-low tnum">
                {qrTarget.booking.qrToken}
              </p>
              <div className="mt-4 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <p className="font-semibold text-hi">
                  {qrTarget.classType.name}
                </p>
                <p className="mt-0.5 text-xs text-mid">
                  {qrTarget.studio.name} ·{" "}
                  {formatDateTime(qrTarget.session.startsAt, lang)}
                </p>
              </div>
              <Button
                variant="volt"
                className="mt-4 w-full"
                onClick={() => simulateCheckIn(qrTarget)}
              >
                <ScanLine /> {t("bookings.simulateCheckin")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <CancelDialog
        view={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}

function WaitlistCard({
  view,
  userId,
}: {
  view: WaitlistView;
  userId: string | null;
}) {
  const { t, lang } = useI18n();
  const { entry, session, classType, studio } = view;
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await getServices().booking.leaveWaitlist(userId, session.id);
      toast(t("waitlist.left"));
    } catch {
      toast.error(t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-info/25 bg-info/5 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
        <Users className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">
          {classType.name}
          <span className="font-normal text-mid"> · {studio.name}</span>
        </p>
        <p className="mt-0.5 text-xs text-low tnum">
          {formatDateTime(session.startsAt, lang)}
        </p>
      </div>
      <Badge variant="info">
        {t("waitlist.position", { n: entry.position })}
      </Badge>
      <Button size="sm" variant="ghost" loading={busy} onClick={leave}>
        {t("waitlist.leave")}
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

function UpcomingCard({
  view,
  onQr,
  onCancel,
}: {
  view: BookingView;
  onQr: () => void;
  onCancel: () => void;
}) {
  const { t, lang } = useI18n();
  const { booking, session, classType, studio } = view;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className="flex">
        <CoverArt
          categoryId={classType.categoryId}
          seed={studio.artSeed}
          className="w-24 shrink-0 sm:w-32"
        />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="display text-base text-hi">{classType.name}</p>
              <Link
                href={`/member/studios/${studio.id}`}
                className="mt-0.5 inline-flex min-h-11 items-center gap-1 text-sm text-mid hover:text-volt sm:min-h-0"
              >
                <MapPin className="size-3" /> {studio.name}
              </Link>
              <p className="mt-1 text-sm font-medium text-volt tnum">
                {formatDateTime(session.startsAt, lang)}
              </p>
            </div>
            <CreditChip cost={booking.creditCost} size="sm" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="volt" onClick={onQr}>
              <QrCode /> {t("bookings.showQr")}
            </Button>
            <AddToCalendar view={view} />
            <InviteFriendButton session={session} classType={classType} studio={studio} />
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X /> {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PastRow({ view }: { view: BookingView }) {
  const { t, lang } = useI18n();
  const { booking, session, classType, studio } = view;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">
          {classType.name}
          <span className="font-normal text-mid"> · {studio.name}</span>
        </p>
        <p className="mt-0.5 text-xs text-low tnum">
          {formatDateTime(session.startsAt, lang)}
        </p>
      </div>
      <Badge variant={STATUS_VARIANT[booking.status]}>
        {t(`status.${booking.status}`)}
      </Badge>
      <span
        className={cn(
          "text-sm font-semibold tnum",
          booking.status === "cancelled" ? "text-low line-through" : "text-mid",
        )}
      >
        −{booking.creditCost}
      </span>
    </div>
  );
}

function CancelDialog({
  view,
  onClose,
}: {
  view: BookingView | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [busy, setBusy] = useState(false);

  // fetch quote when opened
  const bookingId = view?.booking.id;
  useEffect(() => {
    setQuote(null);
    if (bookingId) {
      getServices()
        .booking.quoteCancellation(bookingId)
        .then(setQuote)
        .catch(() => undefined);
    }
  }, [bookingId]);

  const confirm = async () => {
    if (!view) return;
    setBusy(true);
    try {
      const res = await getServices().booking.cancel(view.booking.id);
      toast(
        res.late
          ? t("bookings.lateCancelled", { fee: res.feeCredits })
          : t("bookings.cancelled"),
      );
      onClose();
    } catch {
      toast.error(t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!view} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{t("bookings.cancelTitle")}</DialogTitle>
        {quote && (
          <DialogDescription
            className={cn(quote.late && "text-warn")}
          >
            {quote.late
              ? t("bookings.cancelLate", {
                  hours: quote.cutoffHours,
                  refund: quote.refundCredits,
                  fee: quote.feeCredits,
                })
              : t("bookings.cancelFree", {
                  hours: quote.cutoffHours,
                  credits: quote.refundCredits,
                })}
          </DialogDescription>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="surface" className="flex-1" onClick={onClose}>
            {t("bookings.keepBooking")}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy || !quote}
            onClick={confirm}
          >
            {t("bookings.confirmCancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
