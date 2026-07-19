"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StudioCard } from "@/components/member/studio-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { t } = useI18n();
  const { userId } = useCurrentUser();

  const { data: favorites, loading } = useLiveQuery(
    (svc) =>
      userId ? svc.catalog.listFavorites(userId) : Promise.resolve([]),
    [userId],
  );

  return (
    <div>
      <PageHeader title={t("favorites.title")} />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : (favorites ?? []).length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("favorites.empty")}
          hint={t("favorites.emptyHint")}
          action={
            <Button asChild variant="volt" size="sm">
              <Link href="/member/explore">{t("bookings.explore")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(favorites ?? []).map((studio) => (
            <StudioCard key={studio.id} studio={studio} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
