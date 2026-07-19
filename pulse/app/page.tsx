"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Eye, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LangToggle } from "@/components/shared/lang-toggle";
import { ClientGate } from "@/components/shared/client-gate";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session";

const NEIGHBORHOOD_STRIP = [
  "Κέντρο",
  "Καλαμαριά",
  "Τούμπα",
  "Άνω Πόλη",
  "Πυλαία",
  "Κολωνάκι",
  "Γκάζι",
  "Γλυφάδα",
  "Νέο Ψυχικό",
];

const CATEGORY_STRIP = [
  "Reformer Pilates",
  "CrossFit",
  "Boxing",
  "Muay Thai",
  "EMS",
  "Yoga",
  "HIIT",
];

export default function LandingPage() {
  return (
    <ClientGate>
      <Landing />
    </ClientGate>
  );
}

function Landing() {
  const { t } = useI18n();
  const { userId, role } = useSessionStore();
  const appHref =
    userId && role === "studio_owner"
      ? "/studio"
      : userId
        ? "/member/home"
        : null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-56 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, #c8f13f55, #c8f13f11 60%, transparent)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <LangToggle />
          {appHref && (
            <Button asChild size="sm" variant="outline">
              <Link href={appHref}>
                {t("landing.enter")} <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20">
        <section className="pt-14 sm:pt-24">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="display max-w-3xl text-5xl leading-[1.02] text-hi sm:text-7xl"
          >
            {t("landing.headline1")}
            <br />
            <span className="text-volt">{t("landing.headline2")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-mid sm:text-lg"
          >
            {t("landing.sub")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild variant="volt" size="lg">
              <Link href="/auth?role=member">
                {t("landing.ctaMember")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="surface" size="lg">
              <Link href="/auth?role=studio">
                <Building2 /> {t("landing.ctaStudio")}
              </Link>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-14 grid max-w-lg grid-cols-3 gap-6"
          >
            {[
              ["22", t("landing.statStudios")],
              ["2", t("landing.statCities")],
              ["450+", t("landing.statClasses")],
            ].map(([num, label]) => (
              <div key={label}>
                <dd className="display text-3xl text-hi">{num}</dd>
                <dt className="mt-1 text-xs uppercase tracking-wider text-low">
                  {label}
                </dt>
              </div>
            ))}
          </motion.dl>
        </section>

        <section aria-hidden className="mt-16 space-y-2">
          <Strip items={CATEGORY_STRIP} />
          <Strip items={NEIGHBORHOOD_STRIP} slow />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: t("landing.pillarFlexTitle"),
              body: t("landing.pillarFlexBody"),
            },
            {
              icon: ShieldCheck,
              title: t("landing.pillarCapTitle"),
              body: t("landing.pillarCapBody"),
            },
            {
              icon: Eye,
              title: t("landing.pillarTransparencyTitle"),
              body: t("landing.pillarTransparencyBody"),
            },
          ].map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.55 }}
              className="rounded-lg border border-line bg-surface p-6 shadow-card"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-volt/10 text-volt">
                <p.icon className="size-5" />
              </div>
              <h3 className="display mt-4 text-lg text-hi">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mid">{p.body}</p>
            </motion.div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-line py-6 text-center text-xs text-low">
        PULSE · {t("auth.note")}
      </footer>
    </div>
  );
}

function Strip({ items, slow }: { items: string[]; slow?: boolean }) {
  const row = [...items, ...items];
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className={slow ? "marquee-slow flex shrink-0 gap-2 pr-2" : "marquee flex shrink-0 gap-2 pr-2"}>
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="whitespace-nowrap rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-mid"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
