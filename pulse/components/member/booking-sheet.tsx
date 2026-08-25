"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { animate, motion } from "framer-motion";
import { AlertTriangle, Check, ShieldAlert, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditChip, PeakBadge } from "@/components/member/bits";
import { useI18n } from "@/lib/i18n";
import { getServices, ServiceError } from "@/lib/services";
import type { BookingEligibility, SessionView } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Animated integer — rolls from `from` to `to` (the credit-deduction beat). */
function NumberRoll({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const controls = animate(from, to, {
      duration: 0.9,
      delay: 0.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to]);
  return <span className="tnum">{value}</span>;
}

export function BookingSheet({
  view,
  userId,
  balance,
  onClose,
}: {
  view: SessionView | null;
  userId: string;
  balance: number;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [eligibility, setEligibility] = useState<BookingEligibility | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false);
  // Balance snapshot taken at confirm time — drives the deduction animation.
  const [roll, setRoll] = useState<{ from: number; to: number } | null>(null);

  const sessionId = view?.session.id;
  useEffect(() => {
    setEligibility(null);
    setBooked(false);
    if (!sessionId) return;
    let alive = true;
    getServices()
      .booking.checkEligibility(userId, sessionId)
      .then((el) => {
        if (alive) setEligibility(el);
      })
      .catch(() => {
        if (alive) onClose();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId]);

  const joinWaitlist = async () => {
    if (!view) return;
    setBusy(true);
    try {
      const entry = await getServices().booking.joinWaitlist(
        userId,
        view.session.id,
      );
      toast.success(t("waitlist.joined"), {
        description: t("waitlist.position", { n: entry.position }),
      });
      onClose();
    } catch (e) {
      const code = e instanceof ServiceError ? e.code : "unknown";
      toast.error(
        code === "already_waitlisted"
          ? t("waitlist.errAlready")
          : code === "not_full"
            ? t("waitlist.errNotFull")
            : code === "insufficient_credits"
              ? t("booking.errCredits")
              : code === "visit_cap"
                ? t("booking.errCap")
                : t("common.retry"),
      );
    } finally {
      setBusy(false);
    }
  };

  const leaveWaitlist = async () => {
    if (!view) return;
    setBusy(true);
    try {
      await getServices().booking.leaveWaitlist(userId, view.session.id);
      toast(t("waitlist.left"));
      onClose();
    } catch {
      toast.error(t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!view || !eligibility?.ok) return;
    setBusy(true);
    const from = balance;
    try {
      await getServices().booking.reserve(userId, view.session.id);
      setRoll({ from, to: from - view.creditCost });
      setBooked(true);
    } catch (e) {
      const code = e instanceof ServiceError ? e.code : "unknown";
      const msg =
        code === "full"
          ? t("booking.errFull")
          : code === "insufficient_credits"
            ? t("booking.errCredits")
            : code === "visit_cap"
              ? t("booking.errCap")
              : code === "already_booked"
                ? t("booking.errAlready")
                : t("common.retry");
      toast.error(msg);
      // refresh eligibility so the sheet reflects reality
      getServices()
        .booking.checkEligibility(userId, view.session.id)
        .then(setEligibility)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  if (!view) return null;
  const { session, classType, studio, creditCost } = view;
  const cap = eligibility?.capStatus;

  return (
    <Dialog open={!!view} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {booked ? (
          /* ---------------- Success ---------------- */
          <div className="flex flex-col items-center py-4 text-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="flex size-16 items-center justify-center rounded-full bg-volt text-volt-ink shadow-volt"
            >
              <Check className="size-8" strokeWidth={3} />
            </motion.div>
            <DialogTitle className="mt-5">{t("booking.booked")}</DialogTitle>
            <DialogDescription>{t("booking.bookedBody")}</DialogDescription>

            <div className="mt-5 w-full rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-sm font-semibold text-hi">{classType.name}</p>
              <p className="mt-0.5 text-xs text-mid">
                {studio.name} · {formatDateTime(session.startsAt, lang)}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs uppercase tracking-wide text-low">
                  {t("home.balance")}
                </span>
                <span className="display flex items-center gap-1.5 text-xl text-volt">
                  <Zap className="size-4 fill-current" />
                  {roll && <NumberRoll from={roll.from} to={roll.to} />}
                </span>
              </div>
            </div>

            <div className="mt-5 flex w-full gap-2">
              <Button variant="surface" className="flex-1" onClick={onClose}>
                {t("common.close")}
              </Button>
              <Button asChild variant="volt" className="flex-1">
                <Link href="/member/bookings" onClick={onClose}>
                  {t("booking.viewBooking")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* ---------------- Review ---------------- */
          <>
            <DialogTitle>{t("booking.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {formatDateTime(session.startsAt, lang)}
            </DialogDescription>

            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-hi">{classType.name}</p>
                  <p className="mt-0.5 text-sm text-mid">{studio.name}</p>
                  <p className="mt-0.5 text-xs text-low">
                    {session.instructor} · {session.durationMin}&#8217;
                  </p>
                </div>
                <PeakBadge peak={session.peak} />
              </div>

              <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-mid">{t("booking.creditCost")}</span>
                  <CreditChip cost={creditCost} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mid">{t("home.balance")}</span>
                  <span className="tnum font-semibold text-hi">{balance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mid">{t("booking.balanceAfter")}</span>
                  <span className="tnum font-semibold text-hi">
                    {balance - creditCost}
                  </span>
                </div>
              </div>
            </div>

            {/* Visit-cap meter — the anti-cannibalization rule, always visible */}
            {cap && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                <span className="text-xs text-mid">
                  {t("studio.visitsUsed", { used: cap.used, cap: cap.cap })}
                </span>
                <div className="flex gap-1" aria-hidden>
                  {Array.from({ length: cap.cap }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 w-5 rounded-full",
                        i < cap.used ? "bg-volt" : "bg-surface-3",
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Full, but joinable: explain the hold instead of showing an error. */}
            {eligibility?.canJoinWaitlist && (
              <div className="mt-3 flex gap-3 rounded-xl border border-info/30 bg-info/8 p-4 text-sm text-info">
                <Users className="size-4.5 shrink-0" />
                <div>
                  <p className="font-semibold">{t("waitlist.full")}</p>
                  <p className="mt-1 font-normal opacity-90">
                    {t("waitlist.explainer", { n: creditCost })}
                  </p>
                </div>
              </div>
            )}

            {eligibility?.waitlistPosition !== undefined && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-info/30 bg-info/8 px-4 py-3 text-sm text-info">
                <span className="font-semibold">
                  {t("waitlist.position", { n: eligibility.waitlistPosition })}
                </span>
                <Users className="size-4" />
              </div>
            )}

            {eligibility &&
              !eligibility.ok &&
              !eligibility.canJoinWaitlist &&
              eligibility.waitlistPosition === undefined && (
              <div
                className={cn(
                  "mt-3 flex gap-3 rounded-xl border p-4 text-sm",
                  eligibility.reason === "visit_cap"
                    ? "border-warn/30 bg-warn/8 text-warn"
                    : "border-bad/30 bg-bad/8 text-bad",
                )}
              >
                {eligibility.reason === "visit_cap" ? (
                  <ShieldAlert className="size-4.5 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4.5 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">
                    {eligibility.reason === "full" && t("booking.errFull")}
                    {eligibility.reason === "insufficient_credits" &&
                      t("booking.errCredits")}
                    {eligibility.reason === "visit_cap" && t("booking.errCap")}
                    {eligibility.reason === "already_booked" &&
                      t("booking.errAlready")}
                    {eligibility.reason === "in_past" && t("booking.errPast")}
                  </p>
                  {eligibility.reason === "visit_cap" && (
                    <p className="mt-1 font-normal opacity-90">
                      {t("booking.capBlockedBody")}
                    </p>
                  )}
                  {eligibility.reason === "insufficient_credits" && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="mt-2 border-bad/40 text-bad hover:border-bad hover:text-bad"
                    >
                      <Link href="/member/wallet" onClick={onClose}>
                        {t("booking.topUpCta")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {eligibility?.waitlistPosition !== undefined ? (
              <Button
                variant="surface"
                size="lg"
                className="mt-5 w-full"
                loading={busy}
                onClick={leaveWaitlist}
              >
                {t("waitlist.leave")}
              </Button>
            ) : eligibility?.canJoinWaitlist ? (
              <Button
                variant="volt"
                size="lg"
                className="mt-5 w-full"
                loading={busy}
                onClick={joinWaitlist}
              >
                <Users />
                {t("waitlist.joinCta")}
              </Button>
            ) : (
              <Button
                variant="volt"
                size="lg"
                className="mt-5 w-full"
                disabled={!eligibility?.ok}
                loading={busy || !eligibility}
                onClick={confirm}
              >
                <Zap className="fill-current" />
                {t("booking.confirmCta", { n: creditCost })}
              </Button>
            )}
            <p className="mt-3 text-center text-xs text-low">
              {t("studio.cancellationPolicy", {
                hours: studio.cancellationCutoffHours,
              })}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
