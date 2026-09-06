"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, Globe, Info, LogOut, RotateCcw, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import { PageHeader } from "@/components/shared/page-header";
import { LangToggle } from "@/components/shared/lang-toggle";
import { Avatar } from "@/components/shared/avatar";
import { GoalInline } from "@/components/member/goal-editor";
import { nudgeMutedLabel } from "@/components/member/habit-nudge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user, userId } = useCurrentUser();
  const [resetting, setResetting] = useState(false);

  const { data: goal } = useLiveQuery(
    (svc) => (userId ? svc.engagement.getGoal(userId) : Promise.resolve(null)),
    [userId],
  );
  const { data: prefs } = useLiveQuery(
    (svc) => (userId ? svc.engagement.getPrefs(userId) : Promise.resolve(null)),
    [userId],
  );

  const resetDemo = async () => {
    setResetting(true);
    await getServices().demo.reset();
    setResetting(false);
    toast.success(t("settings.resetDone"));
  };

  const signOut = async () => {
    await getServices().auth.signOut();
    router.push("/");
  };

  const setNudges = async (on: boolean) => {
    if (!userId) return;
    await getServices().engagement.setPrefs(userId, {
      nudgesEnabled: on,
      ...(on ? {} : { nudgesMutedUntil: undefined }),
    });
    toast(on ? t("nudge.enabled") : t("nudge.disabled"));
  };
  const unmute = async () => {
    if (!userId) return;
    await getServices().engagement.setPrefs(userId, { nudgesMutedUntil: undefined });
    toast(t("nudge.enabled"));
  };

  const mutedLabel = nudgeMutedLabel(prefs?.nudgesMutedUntil, lang, t);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("settings.title")} />

      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <Avatar name={user?.name ?? "?"} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-hi">{user?.name}</p>
              <p className="truncate text-sm text-mid">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut /> {t("common.logout")}
            </Button>
          </CardContent>
        </Card>

        {/* Weekly goal — 1–5, saved on every tap */}
        {userId && goal && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <Target className="size-4.5 text-mid" />
                <p className="font-medium text-hi">{t("goal.settingsLabel")}</p>
              </div>
              <div className="mt-4">
                <GoalInline userId={userId} current={goal.weeklyTarget} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Habit nudges — opt-in, one-tap off, mute state in words */}
        {userId && prefs && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Sparkles className="size-4.5 text-mid" />
                  <div className="min-w-0">
                    <p className="font-medium text-hi">{t("nudge.settingsLabel")}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-mid">
                      {t("nudge.settingsBody")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.nudgesEnabled}
                  onCheckedChange={setNudges}
                  aria-label={t("nudge.settingsLabel")}
                />
              </div>
              {prefs.nudgesEnabled && mutedLabel && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-xs text-mid">
                  <span className="inline-flex items-center gap-1.5">
                    <BellOff className="size-3.5" /> {mutedLabel}
                  </span>
                  <Button size="sm" variant="ghost" onClick={unmute}>
                    {t("nudge.unmute")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="size-4.5 text-mid" />
              <p className="font-medium text-hi">{t("settings.language")}</p>
            </div>
            <LangToggle />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Info className="size-4.5 text-mid" />
              <p className="font-medium text-hi">{t("settings.about")}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mid">
              {t("settings.aboutBody")}
            </p>
            <p className="mt-3 text-xs text-low">
              {APP_NAME} · {t("settings.version")} 0.2.0 · mock
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              loading={resetting}
              onClick={resetDemo}
            >
              <RotateCcw /> {t("settings.resetDemo")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
