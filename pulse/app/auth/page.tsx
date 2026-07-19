"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, User as UserIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LangToggle } from "@/components/shared/lang-toggle";
import { ClientGate } from "@/components/shared/client-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { getServices } from "@/lib/services";
import type { Role } from "@/lib/types";

const DEMO_NAMES: Record<Role, string> = {
  member: "Έλενα Βασιλείου",
  studio_owner: "FORGE Athletic Club",
};

export default function AuthPage() {
  return (
    <ClientGate>
      <Suspense>
        <AuthScreen />
      </Suspense>
    </ClientGate>
  );
}

function AuthScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const preselect = params.get("role");
  const [busy, setBusy] = useState<Role | null>(null);

  const signIn = async (role: Role) => {
    setBusy(role);
    try {
      await getServices().auth.signInAsDemo(role);
      router.push(role === "member" ? "/member/home" : "/studio");
    } finally {
      setBusy(null);
    }
  };

  const cards: {
    role: Role;
    icon: typeof UserIcon;
    title: string;
    desc: string;
    cta: string;
    highlighted: boolean;
  }[] = [
    {
      role: "member",
      icon: UserIcon,
      title: t("auth.memberTitle"),
      desc: t("auth.memberDesc"),
      cta: t("auth.memberCta", { name: DEMO_NAMES.member }),
      highlighted: preselect !== "studio",
    },
    {
      role: "studio_owner",
      icon: Building2,
      title: t("auth.studioTitle"),
      desc: t("auth.studioDesc"),
      cta: t("auth.studioCta", { name: DEMO_NAMES.studio_owner }),
      highlighted: preselect === "studio",
    },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        <LangToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="display text-3xl text-hi sm:text-4xl">
            {t("auth.title")}
          </h1>
          <p className="mt-2 text-mid">{t("auth.sub")}</p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((c, i) => (
            <motion.div
              key={c.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className={
                c.highlighted
                  ? "rounded-lg border border-volt/40 bg-surface p-6 shadow-volt"
                  : "rounded-lg border border-line bg-surface p-6 shadow-card"
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-volt/10 text-volt">
                  <c.icon className="size-5" />
                </div>
                <Badge variant="outline">{t("common.demo")}</Badge>
              </div>
              <h2 className="display mt-4 text-xl text-hi">{c.title}</h2>
              <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-mid">
                {c.desc}
              </p>
              <Button
                className="mt-5 w-full"
                variant={c.highlighted ? "volt" : "surface"}
                loading={busy === c.role}
                disabled={busy !== null}
                onClick={() => signIn(c.role)}
              >
                {c.cta} <ArrowRight />
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-low">{t("auth.note")}</p>
      </main>
    </div>
  );
}
