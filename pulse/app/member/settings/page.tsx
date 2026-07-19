"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Info, LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { getServices } from "@/lib/services";
import { PageHeader } from "@/components/shared/page-header";
import { LangToggle } from "@/components/shared/lang-toggle";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [resetting, setResetting] = useState(false);

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
              {APP_NAME} · {t("settings.version")} 0.1.0 · mock
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
