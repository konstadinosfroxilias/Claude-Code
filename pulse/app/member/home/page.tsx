"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarPlus, QrCode, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { formatDateTime } from "@/lib/utils";
import type { SessionView } from "@/lib/types";
import { StudioCard } from "@/components/member/studio-card";
import { SessionRow } from "@/components/member/session-row";
import { BookingSheet } from "@/components/member/booking-sheet";
import { NearYouSection } from "@/components/member/near-you";
import { GoalCard } from "@/components/member/goal-card";
import { NudgeCard, NudgePrimer, useActiveNudge } from "@/components/member/habit-nudge";
import { RoutineCard } from "@/components/member/routine-card";
import { TrySomethingNew } from "@/components/member/try-something-new";
import { GeoPrimer } from "@/components/shared/geo-primer";
import { CoverArt } from "@/components/shared/cover-art";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function HomePage() {
  const { t, pick, lang } = useI18n();
  const router = useRouter();
  const { user, userId } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [bookingTarget, setBookingTarget] = useState<SessionView | null>(null);

  const { data: wallet } = useLiveQuery(
    (svc) => (userId ? svc.wallet.getSummary(userId) : Promise.resolve(null)),
    [userId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );
  const { data: featured, loading: loadingFeatured } = useLiveQuery(
    (svc) => svc.catalog.listStudios(),
    [],
  );
  const { data: today, loading: loadingToday } = useLiveQuery(
    (svc) =>
      svc.catalog.listOpenSessions({
        cityId: "thessaloniki",
        dayISO: new Date().toISOString(),
        limit: 6,
      }),
    [],
  );
  const { data: myBookings } = useLiveQuery(
    (svc) =>
      userId ? svc.booking.listMyBookings(userId) : Promise.resolve([]),
    [userId],
  );

  const nextBooking = useMemo(() => {
    const now = Date.now();
    return (myBookings ?? [])
      .filter(
        (b) =>
          b.booking.status === "reserved" &&
          new Date(b.session.startsAt).getTime() > now,
      )
      .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))[0];
  }, [myBookings]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("home.greetingMorning")
      : hour < 19
        ? t("home.greetingAfternoon")
        : t("home.greetingEvening");
  const firstName = user?.name.split(" ")[0] ?? "";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/member/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={rise}>
        <h1 className="display text-2xl text-hi sm:text-3xl">
          {greeting}, {firstName}
        </h1>
      </motion.div>

      {/* Search */}
      <motion.form
        variants={rise}
        onSubmit={submitSearch}
        className="relative mt-4"
        role="search"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-low" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("home.searchPlaceholder")}
          className="h-11 pl-10"
          aria-label={t("common.search")}
        />
      </motion.form>

      {/* Next class / CTA */}
      <motion.div variants={rise} className="mt-5">
        {nextBooking ? (
          <Link
            href="/member/bookings"
            className="group flex items-center gap-4 overflow-hidden rounded-lg border border-volt/25 bg-gradient-to-r from-volt/12 to-transparent p-4 transition-colors hover:border-volt/50"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-volt text-volt-ink">
              <QrCode className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
                {t("home.nextClass")}
              </p>
              <p className="truncate font-semibold text-hi">
                {nextBooking.classType.name} · {nextBooking.studio.name}
              </p>
              <p className="text-xs text-mid tnum">
                {formatDateTime(nextBooking.session.startsAt, lang)}
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-volt transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4">
            <div>
              <p className="font-semibold text-hi">{t("home.noUpcoming")}</p>
              <p className="text-sm text-mid">{t("home.bookSomething")}</p>
            </div>
            <Button asChild variant="volt" size="sm">
              <Link href="/member/explore">
                <CalendarPlus /> {t("nav.explore")}
              </Link>
            </Button>
          </div>
        )}
      </motion.div>

      {/* Weekly goal — consistency, never appearance */}
      {userId && (
        <motion.div variants={rise} className="mt-4">
          <GoalCard userId={userId} />
        </motion.div>
      )}

      {/* Habit layer: opt-in primer, then this week's nudge OR the routine card */}
      {userId && (
        <motion.div variants={rise} className="mt-4 space-y-4">
          <NudgePrimer userId={userId} />
          <HabitSlot userId={userId} onBook={setBookingTarget} />
        </motion.div>
      )}

      {/* Location primer — shown before any native prompt */}
      <motion.div variants={rise} className="mt-4">
        <GeoPrimer />
      </motion.div>

      {/* Near you, starting soon — the wake-up → book flow */}
      {userId && (
        <motion.div variants={rise} className="mt-8">
          <NearYouSection userId={userId} onBook={setBookingTarget} />
        </motion.div>
      )}

      {/* Try something new — variety, entirely optional */}
      {userId && (
        <motion.div variants={rise} className="mt-8">
          <TrySomethingNew userId={userId} onBook={setBookingTarget} />
        </motion.div>
      )}

      {/* Categories */}
      <motion.section variants={rise} className="mt-8">
        <SectionHead title={t("home.categories")} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {(categories ?? []).map((cat) => (
            <Link
              key={cat.id}
              href={`/member/explore?category=${cat.id}`}
              className="group relative w-32 shrink-0 overflow-hidden rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-volt"
            >
              <CoverArt
                categoryId={cat.id}
                seed={cat.palette + 11}
                className="h-20 transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6 text-xs font-semibold text-white">
                {pick(cat.name)}
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Featured studios */}
      <motion.section variants={rise} className="mt-8">
        <SectionHead
          title={t("home.featured")}
          href="/member/explore"
          hrefLabel={t("common.seeAll")}
        />
        {loadingFeatured ? (
          <RailSkeleton />
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {(featured ?? [])
              .filter((s) => s.featured)
              .map((studio) => (
                <StudioCard
                  key={studio.id}
                  studio={studio}
                  userId={userId}
                  className="w-64 shrink-0"
                />
              ))}
          </div>
        )}
      </motion.section>

      {/* Available today */}
      <motion.section variants={rise} className="mt-8">
        <SectionHead
          title={t("home.availableToday")}
          href="/member/explore?today=1"
          hrefLabel={t("common.seeAll")}
        />
        {loadingToday ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(today ?? []).map((v) => (
              <SessionRow
                key={v.session.id}
                view={v}
                showStudio
                onBook={setBookingTarget}
              />
            ))}
          </div>
        )}
      </motion.section>

      {userId && (
        <BookingSheet
          view={bookingTarget}
          userId={userId}
          balance={wallet?.balance ?? 0}
          onClose={() => setBookingTarget(null)}
        />
      )}
    </motion.div>
  );
}

/**
 * One habit card at a time: the week's nudge when the member opted in and
 * one applies, otherwise the standing "your routine" suggestion.
 */
function HabitSlot({
  userId,
  onBook,
}: {
  userId: string;
  onBook: (view: SessionView) => void;
}) {
  const nudge = useActiveNudge(userId);
  return nudge ? (
    <NudgeCard userId={userId} onBook={onBook} />
  ) : (
    <RoutineCard userId={userId} onBook={onBook} />
  );
}

function SectionHead({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="display text-lg text-hi">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex h-11 shrink-0 items-center gap-1 pl-2 text-sm font-medium text-volt hover:text-volt-bright sm:h-auto sm:pl-0"
        >
          {hrefLabel} <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function RailSkeleton() {
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-56 w-64 shrink-0" />
      ))}
    </div>
  );
}
