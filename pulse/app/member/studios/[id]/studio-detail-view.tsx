"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarX2,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type { SessionView } from "@/lib/types";
import { addDays, cn, formatDay, formatEUR, startOfDay } from "@/lib/utils";
import { CoverArt } from "@/components/shared/cover-art";
import { MapView } from "@/components/shared/map-view";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SessionRow } from "@/components/member/session-row";
import { BookingSheet } from "@/components/member/booking-sheet";
import { RatingChip } from "@/components/member/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function StudioDetailView({ id }: { id: string }) {
  const { t, pick, lang } = useI18n();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [dayOffset, setDayOffset] = useState(0);
  const [bookingTarget, setBookingTarget] = useState<SessionView | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const day = useMemo(() => addDays(startOfDay(new Date()), dayOffset), [dayOffset]);

  const { data: studio, loading } = useLiveQuery(
    (svc) => svc.catalog.getStudio(id),
    [id],
  );
  const { data: neighborhoods } = useLiveQuery(
    (svc) => svc.catalog.listNeighborhoods(),
    [],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );
  const { data: sessions, loading: loadingSessions } = useLiveQuery(
    (svc) => svc.catalog.listStudioSessions(id, day.toISOString()),
    [id, dayOffset],
  );
  const { data: capStatus } = useLiveQuery(
    (svc) =>
      userId
        ? svc.booking.visitCapStatus(userId, id)
        : Promise.resolve(null),
    [userId, id],
  );
  const { data: reviews } = useLiveQuery(
    (svc) => svc.reviews.listForStudio(id),
    [id],
  );
  const { data: wallet } = useLiveQuery(
    (svc) => (userId ? svc.wallet.getSummary(userId) : Promise.resolve(null)),
    [userId],
  );
  const { data: isFav, refetch: refetchFav } = useLiveQuery(
    (svc) =>
      userId ? svc.catalog.isFavorite(userId, id) : Promise.resolve(false),
    [userId, id],
  );

  if (loading || !studio) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 sm:h-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const nb = neighborhoods?.find((n) => n.id === studio.neighborhoodId);

  const toggleFav = async () => {
    if (!userId) return;
    const nowFav = await getServices().catalog.toggleFavorite(userId, id);
    refetchFav();
    toast(nowFav ? t("favorites.added") : t("favorites.removed"));
  };

  const upcomingSessions = (sessions ?? []).filter(
    (v) => new Date(v.session.startsAt).getTime() > Date.now(),
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Hero */}
      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-xl">
        <CoverArt
          categoryId={studio.categoryIds[0]}
          seed={studio.artSeed}
          label={studio.name}
          className="h-60 sm:h-80"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent" />
        </CoverArt>

        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t("common.back")}
          className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform hover:scale-105 sm:left-4 sm:top-4 sm:size-9"
        >
          <ArrowLeft className="size-4.5" />
        </button>
        <button
          type="button"
          onClick={toggleFav}
          aria-label={t("nav.favorites")}
          aria-pressed={!!isFav}
          className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform hover:scale-105 sm:right-4 sm:top-4 sm:size-9"
        >
          <Heart
            className={cn(
              "size-4.5",
              isFav ? "fill-bad text-bad" : "text-white/90",
            )}
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {studio.featured && <Badge variant="volt">PULSE Choice</Badge>}
            {studio.categoryIds.map((catId) => {
              const cat = categories?.find((c) => c.id === catId);
              return cat ? (
                <Badge key={catId} variant="neutral" className="bg-black/40 text-white/85 backdrop-blur-sm">
                  {pick(cat.name)}
                </Badge>
              ) : null;
            })}
          </div>
          <h1 className="display mt-2 text-3xl text-white sm:text-4xl">
            {studio.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
            <RatingChip
              rating={studio.rating}
              count={studio.reviewCount}
              className="text-white"
            />
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {nb ? pick(nb.name) : ""} · {studio.address}
            </span>
          </div>
        </div>
      </div>

      {/* Visit cap — anti-cannibalization, front and center */}
      {capStatus && (
        <div
          className={cn(
            "mt-5 flex items-center gap-4 rounded-lg border p-4",
            capStatus.reached
              ? "border-warn/35 bg-warn/8"
              : "border-line bg-surface",
          )}
        >
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              capStatus.reached
                ? "bg-warn/15 text-warn"
                : "bg-volt/10 text-volt",
            )}
          >
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-hi">
              {capStatus.reached
                ? t("studio.visitsCapReached")
                : t("studio.visitsUsed", {
                    used: capStatus.used,
                    cap: capStatus.cap,
                  })}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-mid">
              {t("studio.capExplainer", { cap: capStatus.cap })}
            </p>
          </div>
          <div className="hidden gap-1 sm:flex" aria-hidden>
            {Array.from({ length: capStatus.cap }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 w-6 rounded-full",
                  i < capStatus.used
                    ? capStatus.reached
                      ? "bg-warn"
                      : "bg-volt"
                    : "bg-surface-3",
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {/* Schedule */}
          <section>
            <h2 className="display mb-3 text-lg text-hi">
              {t("studio.schedule")}
            </h2>
            <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = addDays(startOfDay(new Date()), i);
                const active = i === dayOffset;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOffset(i)}
                    aria-pressed={active}
                    className={cn(
                      "h-11 shrink-0 rounded-xl border px-3.5 text-sm font-medium transition-colors sm:h-auto sm:py-2",
                      active
                        ? "border-volt bg-volt text-volt-ink"
                        : "border-line bg-surface-2 text-mid hover:text-hi",
                    )}
                  >
                    {i === 0
                      ? t("common.today")
                      : i === 1
                        ? t("common.tomorrow")
                        : formatDay(d.toISOString(), lang)}
                  </button>
                );
              })}
            </div>

            {loadingSessions ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[72px]" />
                ))}
              </div>
            ) : upcomingSessions.length === 0 &&
              (sessions ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title={t("studio.noSessions")}
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {(dayOffset === 0 ? upcomingSessions : (sessions ?? [])).map(
                  (v) => (
                    <SessionRow
                      key={v.session.id}
                      view={v}
                      onBook={setBookingTarget}
                    />
                  ),
                )}
                {dayOffset === 0 && upcomingSessions.length === 0 && (
                  <EmptyState
                    icon={CalendarX2}
                    title={t("studio.noSessions")}
                    className="py-8"
                  />
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-low">
              {t("studio.cancellationPolicy", {
                hours: studio.cancellationCutoffHours,
              })}{" "}
              · {t("studio.earnsPerVisit", { price: formatEUR(studio.defaultFloorPriceEUR, lang) })}
            </p>
          </section>

          {/* Reviews */}
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="display text-lg text-hi">{t("studio.reviews")}</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviewOpen(true)}
              >
                <Star /> {t("studio.writeReview")}
              </Button>
            </div>
            <div className="space-y-3">
              {(reviews ?? []).slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={r.authorName} className="size-8 text-[10px]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-hi">
                        {r.authorName}
                      </p>
                      <div
                        className="mt-0.5 flex gap-0.5"
                        aria-label={`${r.rating}/5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "size-3",
                              i < r.rating
                                ? "fill-warn text-warn"
                                : "text-line-strong",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-low tnum">
                      {formatDay(r.createdAt, lang)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-mid">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: about, amenities, map */}
        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="display text-base text-hi">{t("studio.about")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-mid">
              {pick(studio.description)}
            </p>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-low">
              {t("studio.amenities")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {studio.amenities.map((a) => (
                <Badge key={a} variant="outline" size="md">
                  {t(`amenity.${a}`)}
                </Badge>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-line">
            <MapView
              center={{ lat: studio.lat, lng: studio.lng }}
              zoom={15}
              className="h-56 w-full"
              markers={[
                {
                  id: studio.id,
                  lat: studio.lat,
                  lng: studio.lng,
                  label: studio.name,
                  sub: studio.address,
                },
              ]}
            />
            <p className="flex items-center gap-1.5 bg-surface px-4 py-3 text-xs text-mid">
              <MapPin className="size-3.5 text-volt" /> {studio.address}
            </p>
          </section>
        </aside>
      </div>

      {userId && (
        <BookingSheet
          view={bookingTarget}
          userId={userId}
          balance={wallet?.balance ?? 0}
          onClose={() => setBookingTarget(null)}
        />
      )}

      {userId && (
        <ReviewDialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          studioId={id}
          userId={userId}
        />
      )}
    </motion.div>
  );
}

function ReviewDialog({
  open,
  onClose,
  studioId,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  studioId: string;
  userId: string;
}) {
  const { t, lang } = useI18n();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await getServices().reviews.add({
        studioId,
        userId,
        rating,
        text: text.trim(),
        lang,
      });
      toast.success(t("studio.reviewSubmitted"));
      setText("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{t("studio.writeReview")}</DialogTitle>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              aria-label={`${i + 1}/5`}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "size-7",
                  i < rating ? "fill-warn text-warn" : "text-line-strong",
                )}
              />
            </button>
          ))}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("studio.reviewPlaceholder")}
          className="mt-4"
          rows={4}
        />
        <Button
          variant="volt"
          className="mt-4 w-full"
          loading={busy}
          disabled={!text.trim()}
          onClick={submit}
        >
          {t("common.confirm")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
