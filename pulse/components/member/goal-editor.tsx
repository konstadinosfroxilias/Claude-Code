"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getServices } from "@/lib/services";
import { GOAL_DEFAULT, GOAL_MAX, GOAL_MIN } from "@/lib/rules/engagement";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 1–5 classes a week. The stepper never goes past 5 and the copy points at
 * 2–4 — the app suggests less, never more.
 */
export function GoalStepper({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        size="icon"
        variant="surface"
        aria-label={t("goal.decrease")}
        disabled={value <= GOAL_MIN}
        onClick={() => onChange(Math.max(GOAL_MIN, value - 1))}
      >
        <Minus />
      </Button>
      <div className="min-w-16 text-center">
        <p className="display text-3xl leading-none text-hi tnum">{value}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-low">
          {t("goal.classesPerWeek")}
        </p>
      </div>
      <Button
        size="icon"
        variant="surface"
        aria-label={t("goal.increase")}
        disabled={value >= GOAL_MAX}
        onClick={() => onChange(Math.min(GOAL_MAX, value + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}

/** Inline editor (settings / profile): saves on every tap, no modal. */
export function GoalInline({
  userId,
  current,
}: {
  userId: string;
  current: number;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);

  const save = async (n: number) => {
    setValue(n);
    try {
      await getServices().engagement.setGoal(userId, n);
      toast.success(t("goal.saved"));
    } catch {
      toast.error(t("common.retry"));
    }
  };

  return (
    <div>
      <GoalStepper value={value} onChange={save} />
      <p className="mt-3 text-xs leading-relaxed text-low">
        {t("goal.gentleHint")} {t("goal.restNote")}
      </p>
    </div>
  );
}

/** Modal editor used from the home card. */
export function GoalEditorDialog({
  userId,
  open,
  current,
  onClose,
}: {
  userId: string;
  open: boolean;
  current: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(current || GOAL_DEFAULT);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setValue(current || GOAL_DEFAULT);
  }, [open, current]);

  const save = async () => {
    setBusy(true);
    try {
      await getServices().engagement.setGoal(userId, value);
      toast.success(t("goal.saved"));
      onClose();
    } catch {
      toast.error(t("common.retry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{t("goal.editTitle")}</DialogTitle>
        <DialogDescription>{t("goal.editBody")}</DialogDescription>
        <div className="mt-6 flex justify-center">
          <GoalStepper value={value} onChange={setValue} />
        </div>
        <p className="mt-5 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs leading-relaxed text-mid">
          {t("goal.restNote")}
        </p>
        <Button
          variant="volt"
          size="lg"
          className="mt-5 w-full"
          loading={busy}
          onClick={save}
        >
          {t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
