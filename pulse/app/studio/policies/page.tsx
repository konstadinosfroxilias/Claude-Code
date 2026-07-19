"use client";

import { useEffect, useState } from "react";
import { Euro, Eye, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getServices } from "@/lib/services";
import { POLICY } from "@/lib/rules/policy";
import { useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PoliciesPage() {
  const { t } = useI18n();
  const { studio, loading } = useMyStudio();

  const [floorPrice, setFloorPrice] = useState<number>(9);
  const [cutoff, setCutoff] = useState<string>("12");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (studio) {
      setFloorPrice(studio.defaultFloorPriceEUR);
      setCutoff(String(studio.cancellationCutoffHours));
    }
  }, [studio]);

  const save = async () => {
    if (!studio) return;
    setBusy(true);
    try {
      await getServices().studioAdmin.updateStudio(studio.id, {
        defaultFloorPriceEUR: floorPrice,
        cancellationCutoffHours: Number(cutoff),
      });
      toast.success(t("dashPricing.saved"));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !studio) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("dashPricing.title")} />

      <div className="space-y-4">
        {/* Floor price */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="size-4 text-volt" />
              {t("dashPricing.floorTitle")}
            </CardTitle>
            <CardDescription>{t("dashPricing.floorBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="w-36 space-y-1.5">
                <Label htmlFor="floor">{t("dashSchedule.floorPrice")}</Label>
                <Input
                  id="floor"
                  type="number"
                  min={1}
                  step={0.5}
                  value={floorPrice}
                  onChange={(e) => setFloorPrice(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation cutoff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-4 text-volt" />
              {t("dashPricing.cutoffTitle")}
            </CardTitle>
            <CardDescription>
              {t("dashPricing.cutoffBody", {
                fee: POLICY.lateCancelFeeCredits,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-52">
              <Select value={cutoff} onValueChange={setCutoff}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 12, 24].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} {t("dashPricing.hoursBefore")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Visit cap (platform policy, visible) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-volt" />
              {t("dashPricing.capTitle")}
            </CardTitle>
            <CardDescription>
              {t("dashPricing.capBody", {
                cap: POLICY.visitCapPerStudioPerMonth,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: POLICY.visitCapPerStudioPerMonth }).map(
                (_, i) => (
                  <span key={i} className="h-2 w-8 rounded-full bg-volt/70" />
                ),
              )}
              <span className="h-2 w-8 rounded-full bg-surface-3" />
            </div>
          </CardContent>
        </Card>

        {/* Transparency note */}
        <Card>
          <CardHeader className="pb-5">
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-4 text-volt" />
              {t("dashPricing.transparencyTitle")}
            </CardTitle>
            <CardDescription>
              {t("dashPricing.transparencyBody")}
            </CardDescription>
          </CardHeader>
        </Card>

        <Button variant="volt" size="lg" loading={busy} onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
