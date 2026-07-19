"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type { AmenityId, CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { StudioCard } from "@/components/member/studio-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const ALL_AMENITIES: AmenityId[] = [
  "showers",
  "lockers",
  "towels",
  "parking",
  "wifi",
  "water",
  "ac",
  "shop",
];

export default function StudioProfilePage() {
  const { t, pick } = useI18n();
  const { studio, loading } = useMyStudio();
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [descEl, setDescEl] = useState("");
  const [descEn, setDescEn] = useState("");
  const [amenities, setAmenities] = useState<AmenityId[]>([]);
  const [categoryIds, setCategoryIds] = useState<CategoryId[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (studio) {
      setName(studio.name);
      setAddress(studio.address);
      setDescEl(studio.description.el);
      setDescEn(studio.description.en);
      setAmenities(studio.amenities);
      setCategoryIds(studio.categoryIds);
    }
  }, [studio]);

  const toggleAmenity = (a: AmenityId) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  const toggleCategory = (c: CategoryId) =>
    setCategoryIds((prev) =>
      prev.includes(c)
        ? prev.length > 1
          ? prev.filter((x) => x !== c)
          : prev
        : [...prev, c],
    );

  const save = async () => {
    if (!studio) return;
    setBusy(true);
    try {
      await getServices().studioAdmin.updateStudio(studio.id, {
        name: name.trim() || studio.name,
        address: address.trim() || studio.address,
        description: { el: descEl, en: descEn },
        amenities,
        categoryIds,
      });
      toast.success(t("dashProfile.saved"));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !studio) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("dashProfile.title")} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("dashProfile.nameLabel")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">{t("dashProfile.addressLabel")}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descEl">{t("dashProfile.descriptionEl")}</Label>
            <Textarea
              id="descEl"
              value={descEl}
              onChange={(e) => setDescEl(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descEn">{t("dashProfile.descriptionEn")}</Label>
            <Textarea
              id="descEn"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("dashProfile.categoriesLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).map((cat) => (
                <ToggleChip
                  key={cat.id}
                  active={categoryIds.includes(cat.id)}
                  label={pick(cat.name)}
                  onClick={() => toggleCategory(cat.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("dashProfile.amenitiesLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_AMENITIES.map((a) => (
                <ToggleChip
                  key={a}
                  active={amenities.includes(a)}
                  label={t(`amenity.${a}`)}
                  onClick={() => toggleAmenity(a)}
                />
              ))}
            </div>
          </div>

          <Button variant="volt" size="lg" loading={busy} onClick={save}>
            {t("common.save")}
          </Button>
        </div>

        {/* Live preview as members see it */}
        <aside>
          <Card className="border-dashed">
            <CardContent>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-low">
                {t("dashProfile.preview")}
              </p>
              <StudioCard
                studio={{
                  ...studio,
                  name,
                  address,
                  description: { el: descEl, en: descEn },
                  amenities,
                  categoryIds,
                }}
                userId={null}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ToggleChip({
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
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-volt bg-volt/15 text-volt"
          : "border-line bg-surface-2 text-mid hover:text-hi",
      )}
    >
      {label}
    </button>
  );
}
