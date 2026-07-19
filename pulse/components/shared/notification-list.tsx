"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BellOff,
  CalendarCheck2,
  CheckCheck,
  Euro,
  Megaphone,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn, relativeParts } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const KIND_ICON: Record<NotificationKind, typeof Wallet> = {
  booking: CalendarCheck2,
  wallet: Wallet,
  payout: Euro,
  system: Megaphone,
};

export function NotificationScreen({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { data: items, loading } = useLiveQuery(
    (svc) => svc.notifications.list(userId),
    [userId],
  );

  const markAll = () => getServices().notifications.markAllRead(userId);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("notif.title")}
        actions={
          (items ?? []).some((n) => !n.read) ? (
            <Button size="sm" variant="ghost" onClick={markAll}>
              <CheckCheck /> {t("notif.markAll")}
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (items ?? []).length === 0 ? (
        <EmptyState icon={BellOff} title={t("notif.empty")} />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-2"
        >
          {(items ?? []).map((n) => (
            <motion.div
              key={n.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <NotificationRow item={n} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const { t, pick } = useI18n();
  const Icon = KIND_ICON[item.kind];
  const rel = relativeParts(item.createdAt);
  const relLabel =
    rel.days > 0
      ? `${rel.days}${t("common.days")}`
      : rel.hours > 0
        ? `${rel.hours}${t("common.hours")}`
        : `${Math.max(1, rel.minutes)}${t("common.minutes")}`;

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors",
        item.read
          ? "border-line bg-surface"
          : "border-volt/25 bg-volt/5 hover:border-volt/40",
        item.href && "cursor-pointer",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          item.read ? "bg-surface-3 text-mid" : "bg-volt/15 text-volt",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            item.read ? "font-medium text-mid" : "font-semibold text-hi",
          )}
        >
          {pick(item.title)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-low">
          {pick(item.body)}
        </p>
      </div>
      <span className="mt-0.5 shrink-0 text-[11px] text-low tnum">
        {relLabel} {t("common.ago")}
      </span>
      {!item.read && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-volt" aria-hidden />
      )}
    </div>
  );

  const markRead = () => {
    if (!item.read) getServices().notifications.markRead(item.id);
  };

  return item.href ? (
    <Link href={item.href} onClick={markRead} className="block">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={markRead} className="block w-full text-left">
      {inner}
    </button>
  );
}
