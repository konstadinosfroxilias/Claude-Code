"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import type { Plan } from "@/lib/types";
import { cn, formatDay, formatEUR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SubscriptionPage() {
  const { t, pick, lang } = useI18n();
  const { userId } = useCurrentUser();
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: plans, loading } = useLiveQuery(
    (svc) => svc.subscriptions.listPlans(),
    [],
  );
  const { data: sub } = useLiveQuery(
    (svc) =>
      userId
        ? svc.subscriptions.getMySubscription(userId)
        : Promise.resolve(null),
    [userId],
  );
  const { data: invoices } = useLiveQuery(
    (svc) =>
      userId ? svc.subscriptions.listInvoices(userId) : Promise.resolve([]),
    [userId],
  );

  const changePlan = async () => {
    if (!userId || !pendingPlan) return;
    setBusy(true);
    try {
      await getServices().subscriptions.changePlan(userId, pendingPlan.id);
      toast.success(t("sub.changed", { plan: pick(pendingPlan.name) }));
      setPendingPlan(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("sub.title")} sub={t("sub.noLockIn")} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(plans ?? []).map((plan, i) => {
            const current = sub?.planId === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  "relative flex flex-col rounded-lg border p-5",
                  current
                    ? "border-volt/50 bg-surface shadow-volt"
                    : "border-line bg-surface shadow-card",
                )}
              >
                {plan.highlight && !current && (
                  <Badge
                    variant="volt"
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2"
                  >
                    <Sparkles /> {t("sub.popular")}
                  </Badge>
                )}
                {current && (
                  <Badge
                    variant="volt"
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2"
                  >
                    <BadgeCheck /> {t("sub.currentPlan")}
                  </Badge>
                )}
                <h3 className="display text-xl text-hi">{pick(plan.name)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-mid">
                  {pick(plan.blurb)}
                </p>
                <p className="display mt-4 text-3xl text-hi tnum">
                  {formatEUR(plan.priceEUR, lang)}
                  <span className="text-sm font-normal text-low">
                    {t("common.perMonth")}
                  </span>
                </p>
                <p className="mt-1 text-sm font-semibold text-volt tnum">
                  {t("sub.perCycle", { n: plan.creditsPerCycle })}
                </p>
                <div className="flex-1" />
                <Button
                  className="mt-5 w-full"
                  variant={current ? "surface" : "volt"}
                  disabled={current}
                  onClick={() => setPendingPlan(plan)}
                >
                  {current
                    ? t("sub.currentPlan")
                    : t("sub.switchTo", { plan: pick(plan.name) })}
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      {sub && (
        <p className="mt-4 text-center text-xs text-low tnum">
          {t("wallet.cycleRenews", { date: formatDay(sub.cycleEnd, lang) })}
        </p>
      )}

      {/* Billing history */}
      <section className="mt-10">
        <h2 className="display mb-3 text-lg text-hi">
          {t("sub.billingHistory")}
        </h2>
        <div className="space-y-2">
          {(invoices ?? []).map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-surface-3 text-mid">
                <Receipt className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-hi">
                  {pick(inv.label)}
                </p>
                <p className="text-xs text-low tnum">
                  {formatDay(inv.issuedAt, lang)}
                </p>
              </div>
              <Badge variant="good">{t("txn.status.confirmed")}</Badge>
              <span className="text-sm font-semibold text-hi tnum">
                {formatEUR(inv.amountEUR, lang)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={!!pendingPlan}
        onOpenChange={(o) => !o && setPendingPlan(null)}
      >
        <DialogContent>
          <DialogTitle>{t("sub.changeTitle")}</DialogTitle>
          <DialogDescription>{t("sub.changeBody")}</DialogDescription>
          {pendingPlan && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
              <p className="font-semibold text-hi">{pick(pendingPlan.name)}</p>
              <p className="mt-1 text-sm text-volt tnum">
                {t("sub.perCycle", { n: pendingPlan.creditsPerCycle })} ·{" "}
                {formatEUR(pendingPlan.priceEUR, lang)}
                {t("common.perMonth")}
              </p>
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              variant="surface"
              className="flex-1"
              onClick={() => setPendingPlan(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="volt"
              className="flex-1"
              loading={busy}
              onClick={changePlan}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
