"use client";

import type { LucideIcon } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import type { Studio } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** The signed-in owner's studio — every dashboard page starts here. */
export function useMyStudio(): {
  studio: Studio | null;
  loading: boolean;
  ownerId: string | null;
} {
  const { userId } = useCurrentUser();
  const { data, loading } = useLiveQuery(
    (svc) =>
      userId ? svc.studioAdmin.getMyStudio(userId) : Promise.resolve(null),
    [userId],
  );
  return { studio: data ?? null, loading, ownerId: userId };
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-28" />;
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        accent
          ? "border-volt/30 bg-gradient-to-br from-volt/12 to-transparent"
          : "border-line bg-surface shadow-card",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-low">
          {label}
        </p>
        <Icon className={cn("size-4", accent ? "text-volt" : "text-low")} />
      </div>
      <p className="display mt-2.5 text-2xl text-hi tnum sm:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-mid">{sub}</p>}
    </div>
  );
}
