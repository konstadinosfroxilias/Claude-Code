"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarX2, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import { computeCreditCost, isPeakHour } from "@/lib/rules/pricing";
import type { ClassType, SessionView, Studio } from "@/lib/types";
import {
  addDays,
  cn,
  formatDay,
  formatTime,
  startOfDay,
} from "@/lib/utils";
import { useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PeakBadge } from "@/components/member/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SchedulePage() {
  const { t, lang } = useI18n();
  const { studio } = useMyStudio();
  const [dayOffset, setDayOffset] = useState(0);
  const [editorTarget, setEditorTarget] = useState<
    { mode: "create" } | { mode: "edit"; view: SessionView } | null
  >(null);

  const day = useMemo(
    () => addDays(startOfDay(new Date()), dayOffset),
    [dayOffset],
  );

  const { data: sessions, loading } = useLiveQuery(
    (svc) =>
      studio
        ? svc.studioAdmin.listSessions(
            studio.id,
            day.toISOString(),
            addDays(day, 1).toISOString(),
          )
        : Promise.resolve([]),
    [studio?.id, dayOffset],
  );

  return (
    <div>
      <PageHeader
        title={t("dashSchedule.title")}
        actions={
          <Button
            variant="volt"
            size="sm"
            onClick={() => setEditorTarget({ mode: "create" })}
          >
            <Plus /> {t("dashSchedule.newSession")}
          </Button>
        }
      />

      {/* Day strip */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {Array.from({ length: 14 }).map((_, i) => {
          const d = addDays(startOfDay(new Date()), i);
          const active = i === dayOffset;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setDayOffset(i)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-volt bg-volt text-volt-ink"
                  : "border-line bg-surface-2 text-mid hover:text-hi",
              )}
            >
              {i === 0
                ? t("common.today")
                : i === 1
                  ? t("common.tomorrow")
                  : formatDay(d.toISOString(), lang)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      ) : (sessions ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={t("studio.noSessions")}
          action={
            <Button
              variant="volt"
              size="sm"
              onClick={() => setEditorTarget({ mode: "create" })}
            >
              <Plus /> {t("dashSchedule.newSession")}
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2"
        >
          {(sessions ?? []).map((v) => {
            const past = new Date(v.session.startsAt).getTime() < Date.now();
            const cancelled = v.session.status === "cancelled";
            return (
              <motion.div
                key={v.session.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                className={cn(
                  "flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3",
                  (past || cancelled) && "opacity-55",
                )}
              >
                <p className="display w-14 shrink-0 text-base text-hi tnum">
                  {formatTime(v.session.startsAt, lang)}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-hi">
                    {v.classType.name}
                    {cancelled && (
                      <Badge variant="bad" className="ml-2">
                        {t("status.cancelled")}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-mid">
                    {v.session.instructor} · {v.session.durationMin}&#8217; ·{" "}
                    {v.session.floorPriceEUR}€ ·{" "}
                    <span className="text-volt tnum">
                      ≈{v.creditCost} cr
                    </span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PeakBadge peak={v.session.peak} />
                    <Badge variant={v.spotsLeft === 0 ? "good" : "neutral"}>
                      {t("dashSchedule.bookedOfReleased", {
                        booked: v.booked,
                        released: v.session.spotsReleasedToPlatform,
                      })}
                    </Badge>
                    <span className="text-[11px] text-low tnum">
                      {t("common.capacity")}: {v.session.capacity}
                    </span>
                  </div>
                </div>
                {!past && !cancelled && (
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label={t("dashSchedule.editSession")}
                    onClick={() => setEditorTarget({ mode: "edit", view: v })}
                  >
                    <Pencil />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {studio && editorTarget && (
        <SessionEditor
          studio={studio}
          target={editorTarget}
          defaultDay={day}
          onClose={() => setEditorTarget(null)}
        />
      )}
    </div>
  );
}

/* ------------------------- Create / edit dialog ------------------------- */

function SessionEditor({
  studio,
  target,
  defaultDay,
  onClose,
}: {
  studio: Studio;
  target: { mode: "create" } | { mode: "edit"; view: SessionView };
  defaultDay: Date;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const editing = target.mode === "edit" ? target.view : null;

  const { data: classTypes } = useLiveQuery(
    (svc) => svc.studioAdmin.listClassTypes(studio.id),
    [studio.id],
  );

  const initialStart = editing ? new Date(editing.session.startsAt) : null;
  const [classTypeId, setClassTypeId] = useState(
    editing?.classType.id ?? "",
  );
  const [date, setDate] = useState(
    toDateInput(initialStart ?? defaultDay),
  );
  const [time, setTime] = useState(
    initialStart ? toTimeInput(initialStart) : "18:00",
  );
  const [instructor, setInstructor] = useState(
    editing?.session.instructor ?? "",
  );
  const [capacity, setCapacity] = useState(
    editing?.session.capacity ?? 12,
  );
  const [released, setReleased] = useState(
    editing?.session.spotsReleasedToPlatform ?? 4,
  );
  const [floorPrice, setFloorPrice] = useState(
    editing?.session.floorPriceEUR ?? studio.defaultFloorPriceEUR,
  );
  const [peak, setPeak] = useState(editing?.session.peak ?? true);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Suggest peak automatically from the chosen time (still overridable).
  useEffect(() => {
    const d = fromInputs(date, time);
    if (d) setPeak(isPeakHour(d));
  }, [date, time]);

  useEffect(() => {
    if (!classTypeId && classTypes && classTypes.length > 0) {
      setClassTypeId(classTypes[0].id);
    }
  }, [classTypes, classTypeId]);

  const classType: ClassType | undefined = classTypes?.find(
    (c) => c.id === classTypeId,
  );
  const creditPreview = computeCreditCost(floorPrice, peak, 0.5);
  const valid =
    !!classType &&
    !!fromInputs(date, time) &&
    capacity > 0 &&
    released > 0 &&
    released <= capacity &&
    floorPrice > 0;

  const save = async () => {
    const startsAt = fromInputs(date, time);
    if (!valid || !startsAt || !classType) return;
    setBusy(true);
    try {
      if (editing) {
        await getServices().studioAdmin.updateSession(editing.session.id, {
          startsAt: startsAt.toISOString(),
          instructor: instructor || editing.session.instructor,
          capacity,
          spotsReleasedToPlatform: released,
          floorPriceEUR: floorPrice,
          peak,
        });
        toast.success(t("dashSchedule.updated"));
      } else {
        await getServices().studioAdmin.createSession({
          studioId: studio.id,
          classTypeId: classType.id,
          startsAt: startsAt.toISOString(),
          durationMin: classType.durationMin,
          instructor: instructor || "—",
          capacity,
          spotsReleasedToPlatform: released,
          floorPriceEUR: floorPrice,
          peak,
        });
        toast.success(t("dashSchedule.created"));
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const cancelSession = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await getServices().studioAdmin.cancelSession(editing.session.id);
      toast.success(t("dashSchedule.sessionCancelled"));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>
          {editing
            ? t("dashSchedule.editSession")
            : t("dashSchedule.newSession")}
        </DialogTitle>

        {confirmCancel ? (
          <div className="mt-4">
            <DialogDescription>
              {t("dashSchedule.cancelSessionBody")}
            </DialogDescription>
            <div className="mt-5 flex gap-2">
              <Button
                variant="surface"
                className="flex-1"
                onClick={() => setConfirmCancel(false)}
              >
                {t("common.back")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={busy}
                onClick={cancelSession}
              >
                <Trash2 /> {t("dashSchedule.cancelSession")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ct">{t("dashSchedule.classType")}</Label>
              <Select
                value={classTypeId}
                onValueChange={setClassTypeId}
                disabled={!!editing}
              >
                <SelectTrigger id="ct">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(classTypes ?? []).map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name} · {ct.durationMin}&#8217;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">{t("common.date")}</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">{t("common.time")}</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructor">{t("common.instructor")}</Label>
              <Input
                id="instructor"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="π.χ. Μαρίνα Κ."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="capacity">{t("common.capacity")}</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="released">
                  {t("dashSchedule.spotsReleased")}
                </Label>
                <Input
                  id="released"
                  type="number"
                  min={1}
                  max={capacity}
                  value={released}
                  onChange={(e) => setReleased(Number(e.target.value))}
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-low">
              {t("dashSchedule.spotsReleasedHint")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="floor">{t("dashSchedule.floorPrice")}</Label>
              <Input
                id="floor"
                type="number"
                min={1}
                step={0.5}
                value={floorPrice}
                onChange={(e) => setFloorPrice(Number(e.target.value))}
              />
              <p className="text-xs leading-relaxed text-low">
                {t("dashSchedule.floorPriceHint")}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-hi">
                  {t("dashSchedule.peakToggle")}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-volt tnum">
                  <Zap className="size-3 fill-current" />
                  {t("dashSchedule.creditPreview", { n: creditPreview })}
                </p>
              </div>
              <Switch checked={peak} onCheckedChange={setPeak} />
            </div>

            <div className="flex gap-2 pt-1">
              {editing && (
                <Button
                  variant="danger"
                  size="icon"
                  aria-label={t("dashSchedule.cancelSession")}
                  onClick={() => setConfirmCancel(true)}
                >
                  <Trash2 />
                </Button>
              )}
              <Button
                variant="volt"
                className="flex-1"
                disabled={!valid}
                loading={busy}
                onClick={save}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fromInputs(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
