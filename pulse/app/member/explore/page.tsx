"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutGrid, Map as MapIcon, SearchX, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import type { CategoryId, CityId, StudioFilter } from "@/lib/types";
import { StudioCard } from "@/components/member/studio-card";
import { MapView } from "@/components/shared/map-view";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const { t, pick } = useI18n();
  const params = useSearchParams();
  const { userId } = useCurrentUser();

  const [view, setView] = useState<"list" | "map">("list");
  const [cityId, setCityId] = useState<CityId>("thessaloniki");
  const [neighborhoodId, setNeighborhoodId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<CategoryId | "all">(
    (params.get("category") as CategoryId) || "all",
  );
  const [maxCredits, setMaxCredits] = useState<string>("any");
  const [availableToday, setAvailableToday] = useState(
    params.get("today") === "1",
  );
  const query = params.get("q") ?? "";

  const filter: StudioFilter = {
    cityId,
    neighborhoodId: neighborhoodId === "all" ? undefined : neighborhoodId,
    categoryId: categoryId === "all" ? undefined : categoryId,
    maxCredits: maxCredits === "any" ? undefined : Number(maxCredits),
    availableToday: availableToday || undefined,
    query: query || undefined,
  };

  const { data: cities } = useLiveQuery((svc) => svc.catalog.listCities(), []);
  const { data: neighborhoods } = useLiveQuery(
    (svc) => svc.catalog.listNeighborhoods(cityId),
    [cityId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );
  const { data: studios, loading } = useLiveQuery(
    (svc) => svc.catalog.listStudios(filter),
    [
      cityId,
      neighborhoodId,
      categoryId,
      maxCredits,
      availableToday,
      query,
    ],
  );

  const city = cities?.find((c) => c.id === cityId);

  return (
    <div>
      <PageHeader
        title={t("explore.title")}
        sub={
          studios ? t("explore.results", { n: studios.length }) : undefined
        }
        actions={
          <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
            {(
              [
                ["list", LayoutGrid, t("explore.list")],
                ["map", MapIcon, t("explore.map")],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-medium transition-colors sm:h-8 sm:px-3",
                  view === key
                    ? "bg-surface-3 text-hi"
                    : "text-mid hover:text-hi",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={cityId}
            onValueChange={(v) => {
              setCityId(v as CityId);
              setNeighborhoodId("all");
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("common.city")} />
            </SelectTrigger>
            <SelectContent>
              {(cities ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {pick(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={neighborhoodId} onValueChange={setNeighborhoodId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("common.neighborhood")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {(neighborhoods ?? []).map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {pick(n.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={maxCredits} onValueChange={setMaxCredits}>
            <SelectTrigger className="w-44">
              <Zap className="size-3.5 text-volt" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t("explore.anyCredits")}</SelectItem>
              {[4, 5, 6, 8].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("explore.maxCredits", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setAvailableToday((v) => !v)}
            aria-pressed={availableToday}
            className={cn(
              "h-11 rounded-xl border px-3.5 text-sm font-medium transition-colors sm:h-10",
              availableToday
                ? "border-volt/40 bg-volt/10 text-volt"
                : "border-line bg-surface-2 text-mid hover:text-hi",
            )}
          >
            {t("explore.availableTodayFilter")}
          </button>
        </div>

        {/* Category chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <CategoryChip
            active={categoryId === "all"}
            label={t("common.all")}
            onClick={() => setCategoryId("all")}
          />
          {(categories ?? []).map((cat) => (
            <CategoryChip
              key={cat.id}
              active={categoryId === cat.id}
              label={pick(cat.name)}
              onClick={() => setCategoryId(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      {view === "map" ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <MapView
            center={{ lat: city?.lat ?? 40.6264, lng: city?.lng ?? 22.9484 }}
            zoom={city?.zoom ?? 13}
            className="h-[60dvh] w-full"
            markers={(studios ?? []).map((s) => ({
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              label: s.name,
              sub: s.address,
              href: `/member/studios/${s.id}`,
            }))}
          />
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : (studios ?? []).length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("explore.noResults")}
          hint={t("explore.noResultsHint")}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {(studios ?? []).map((studio) => (
            <motion.div
              key={studio.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}
            >
              <StudioCard studio={studio} userId={userId} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors sm:h-auto sm:px-3.5 sm:py-1.5",
        active
          ? "border-volt bg-volt text-volt-ink"
          : "border-line bg-surface-2 text-mid hover:text-hi",
      )}
    >
      {label}
    </button>
  );
}
