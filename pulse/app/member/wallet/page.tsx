"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Zap } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import { POLICY } from "@/lib/rules/policy";
import type { CreditTransaction } from "@/lib/types";
import { cn, formatDateTime, formatDay, formatEUR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function WalletPage() {
  const { t, lang } = useI18n();
  const { userId } = useCurrentUser();
  const [topUpOpen, setTopUpOpen] = useState(false);

  const { data: wallet, loading } = useLiveQuery(
    (svc) => (userId ? svc.wallet.getSummary(userId) : Promise.resolve(null)),
    [userId],
  );
  const { data: txs, loading: loadingTxs } = useLiveQuery(
    (svc) =>
      userId ? svc.wallet.listTransactions(userId) : Promise.resolve([]),
    [userId],
  );
  const { data: studios } = useLiveQuery(
    (svc) => svc.catalog.listStudios(),
    [],
  );

  const studioName = useMemo(() => {
    const map = new Map((studios ?? []).map((s) => [s.id, s.name]));
    return (id?: string) => (id ? (map.get(id) ?? "") : "");
  }, [studios]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("wallet.title")} />

      {/* Balance hero */}
      {loading || !wallet ? (
        <Skeleton className="h-44" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grain relative overflow-hidden rounded-xl border border-volt/25 bg-gradient-to-br from-surface-2 via-surface to-surface p-6"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-volt/10 blur-3xl"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-mid">
            {t("wallet.balance")}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="display flex items-center gap-2 text-5xl text-hi">
              <Zap className="size-8 fill-volt text-volt" />
              <span className="tnum">{wallet.balance}</span>
            </p>
            <Button variant="volt" size="sm" onClick={() => setTopUpOpen(true)}>
              <Plus /> {t("wallet.topUp")}
            </Button>
          </div>
          {wallet.pendingSpends > 0 && (
            <p className="mt-1.5 text-xs text-warn">
              {t("wallet.pending", { n: wallet.pendingSpends })}
            </p>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-mid">
              <span>
                {t("wallet.cycleUsage")} · {wallet.cycleSpent}/
                {wallet.cycleGranted}
              </span>
              <span className="tnum">
                {t("wallet.cycleRenews", {
                  date: formatDay(wallet.cycleEndsAt, lang),
                })}
              </span>
            </div>
            <Progress
              value={wallet.cycleSpent}
              max={Math.max(wallet.cycleGranted, 1)}
              className="mt-2"
            />
          </div>
        </motion.div>
      )}

      {/* History */}
      <section className="mt-8">
        <h2 className="display mb-3 text-lg text-hi">{t("wallet.history")}</h2>
        {loadingTxs ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (txs ?? []).length === 0 ? (
          <EmptyState icon={Receipt} title={t("wallet.emptyHistory")} />
        ) : (
          <div className="space-y-2">
            {(txs ?? []).map((tx) => (
              <TxRow key={tx.id} tx={tx} studioName={studioName(tx.studioId)} />
            ))}
          </div>
        )}
      </section>

      {userId && (
        <TopUpDialog
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          userId={userId}
        />
      )}
    </div>
  );
}

function TxRow({
  tx,
  studioName,
}: {
  tx: CreditTransaction;
  studioName: string;
}) {
  const { t, lang } = useI18n();
  const positive = tx.delta > 0;
  const reversed = tx.status === "reversed";
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3",
        reversed && "opacity-55",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          positive ? "bg-good/10 text-good" : "bg-surface-3 text-mid",
        )}
      >
        {positive ? (
          <ArrowDownLeft className="size-4" />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-hi">
          {t(`txn.${tx.reason}`, { studio: studioName })}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-low tnum">
          {formatDateTime(tx.createdAt, lang)}
          {tx.status === "pending" && (
            <Badge variant="warn">{t("txn.status.pending")}</Badge>
          )}
          {reversed && (
            <Badge variant="neutral">{t("txn.status.reversed")}</Badge>
          )}
        </p>
      </div>
      <span
        className={cn(
          "display text-lg tnum",
          reversed
            ? "text-low line-through"
            : positive
              ? "text-good"
              : "text-hi",
        )}
      >
        {positive ? "+" : ""}
        {tx.delta}
      </span>
    </div>
  );
}

function TopUpDialog({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const { t, lang } = useI18n();
  const [busyPack, setBusyPack] = useState<string | null>(null);

  const buy = async (packId: string, credits: number) => {
    setBusyPack(packId);
    try {
      await getServices().wallet.topUp(userId, packId);
      toast.success(t("wallet.topUpSuccess", { n: credits }));
      onClose();
    } finally {
      setBusyPack(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{t("wallet.topUpTitle")}</DialogTitle>
        <DialogDescription>{t("wallet.topUpSub")}</DialogDescription>
        <div className="mt-5 space-y-2.5">
          {POLICY.topUpPacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={busyPack !== null}
              onClick={() => buy(pack.id, pack.credits)}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-left transition-all hover:border-volt/40 hover:bg-surface-3 disabled:opacity-50"
            >
              <span className="flex items-center gap-2.5">
                <Zap className="size-4 fill-volt text-volt" />
                <span className="font-bold text-hi tnum">
                  {pack.credits} {t("common.credits")}
                </span>
              </span>
              <span className="text-sm font-semibold text-mid tnum">
                {busyPack === pack.id
                  ? t("wallet.processing")
                  : t("wallet.buyFor", {
                      price: formatEUR(pack.priceEUR, lang),
                    })}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-low">
          {t("wallet.mockPaymentNote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
