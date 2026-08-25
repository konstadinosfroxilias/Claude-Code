"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ClipboardList, UserX } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type { RosterEntry } from "@/lib/types";
import {
  addDays,
  cn,
  formatDay,
  formatEUR,
  formatTime,
  startOfDay,
} from "@/lib/utils";
import { useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/shared/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RosterPage() {
  return (
    <Suspense>
      <Roster />
    </Suspense>
  );
}

function Roster() {
  const { t, lang } = useI18n();
  const params = useSearchParams();
  const { studio } = useMyStudio();
  const [sessionId, setSessionId] = useState<string>(
    params.get("session") ?? "",
  );

  // Sessions from yesterday through +7 days for the picker.
  const { data: sessions } = useLiveQuery(
    (svc) => {
      if (!studio) return Promise.resolve([]);
      const from = addDays(startOfDay(new Date()), -1);
      return svc.studioAdmin.listSessions(
        studio.id,
        from.toISOString(),
        addDays(from, 9).toISOString(),
      );
    },
    [studio?.id],
  );

  // Default: the session closest to "now".
  useEffect(() => {
    if (sessionId || !sessions || sessions.length === 0) return;
    const now = Date.now();
    const best = [...sessions].sort(
      (a, b) =>
        Math.abs(new Date(a.session.startsAt).getTime() - now) -
        Math.abs(new Date(b.session.startsAt).getTime() - now),
    )[0];
    setSessionId(best.session.id);
  }, [sessions, sessionId]);

  const selected = sessions?.find((s) => s.session.id === sessionId);

  const { data: roster, loading: loadingRoster } = useLiveQuery(
    (svc) =>
      sessionId
        ? svc.studioAdmin.getRoster(sessionId)
        : Promise.resolve([]),
    [sessionId],
  );

  const visibleRoster = useMemo(
    () =>
      (roster ?? []).filter(
        (r) => r.booking.status !== "cancelled",
      ),
    [roster],
  );

  const checkIn = async (entry: RosterEntry) => {
    try {
      await getServices().booking.checkIn(entry.booking.id);
      toast.success(
        t("dashRoster.checkedInToast", {
          name: entry.memberName.split(" ")[0],
          price: formatEUR(entry.booking.payoutEUR, lang),
        }),
      );
    } catch {
      toast.error(t("common.retry"));
    }
  };

  const noShow = async (entry: RosterEntry) => {
    try {
      await getServices().booking.markNoShow(entry.booking.id);
      toast(
        t("dashRoster.noShowToast", {
          name: entry.memberName.split(" ")[0],
        }),
      );
    } catch {
      toast.error(t("common.retry"));
    }
  };

  return (
    <div>
      <PageHeader title={t("dashRoster.title")} />

      <div className="max-w-md">
        <Select value={sessionId} onValueChange={setSessionId}>
          <SelectTrigger aria-label={t("dashRoster.pickSession")}>
            <SelectValue placeholder={t("dashRoster.pickSession")} />
          </SelectTrigger>
          <SelectContent>
            {(sessions ?? [])
              .filter((s) => s.session.status !== "cancelled")
              .map((s) => (
                <SelectItem key={s.session.id} value={s.session.id}>
                  {formatDay(s.session.startsAt, lang)} ·{" "}
                  {formatTime(s.session.startsAt, lang)} · {s.classType.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-mid">
          <Badge variant="volt">
            {t("dashSchedule.bookedOfReleased", {
              booked: selected.booked,
              released: selected.session.spotsReleasedToPlatform,
            })}
          </Badge>
          {selected.waitlistCount > 0 && (
            <Badge variant="info">
              {t("waitlist.count", { n: selected.waitlistCount })}
            </Badge>
          )}
          <span className="tnum">
            {t("dashRoster.earning", {
              price: formatEUR(selected.session.floorPriceEUR, lang),
            })}
          </span>
        </div>
      )}

      <div className="mt-5">
        {loadingRoster ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        ) : visibleRoster.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("dashRoster.emptyRoster")}
          />
        ) : (
          <motion.div layout className="space-y-2">
            <AnimatePresence initial={false}>
              {visibleRoster.map((entry) => (
                <motion.div
                  key={entry.booking.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <RosterRow
                    entry={entry}
                    onCheckIn={() => checkIn(entry)}
                    onNoShow={() => noShow(entry)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function RosterRow({
  entry,
  onCheckIn,
  onNoShow,
}: {
  entry: RosterEntry;
  onCheckIn: () => void;
  onNoShow: () => void;
}) {
  const { t, lang } = useI18n();
  const status = entry.booking.status;
  const actionable = status === "reserved";

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-4 py-3",
        status === "checked_in" || status === "completed"
          ? "border-good/25 bg-good/5"
          : status === "no_show"
            ? "border-bad/20 bg-bad/5 opacity-70"
            : status === "late_cancelled"
              ? "border-line bg-surface opacity-55"
              : "border-line bg-surface",
      )}
    >
      <Avatar name={entry.memberName} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">
          {entry.memberName}
        </p>
        <p className="mt-0.5 text-xs text-low tnum">
          −{entry.booking.creditCost} {t("common.creditsShort")} · +
          {formatEUR(entry.booking.payoutEUR, lang)}
        </p>
      </div>

      {status === "checked_in" || status === "completed" ? (
        <Badge variant="good" size="md">
          <Check /> {t("dashRoster.statusCheckedIn")}
        </Badge>
      ) : status === "no_show" ? (
        <Badge variant="bad" size="md">
          {t("dashRoster.statusNoShow")}
        </Badge>
      ) : status === "late_cancelled" ? (
        <Badge variant="warn" size="md">
          {t("status.late_cancelled")}
        </Badge>
      ) : (
        actionable && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="volt"
              onClick={onCheckIn}
              aria-label={`${t("dashRoster.checkIn")} — ${entry.memberName}`}
            >
              <Check /> {t("dashRoster.checkIn")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onNoShow}
              aria-label={`${t("dashRoster.noShow")} — ${entry.memberName}`}
            >
              <UserX /> {t("dashRoster.noShow")}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
