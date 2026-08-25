"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useGeo, useGeoStore } from "@/lib/stores/geo";
import { Button } from "@/components/ui/button";

/**
 * Soft primer shown BEFORE the native geolocation prompt.
 *
 * `navigator.geolocation.getCurrentPosition` is never called cold — it only
 * runs when the member taps "Enable" here. "Not now" is remembered, so the
 * primer doesn't reappear on every visit.
 */
export function GeoPrimer({ className }: { className?: string }) {
  const { t } = useI18n();
  const { shouldPrime, pending, request, dismissPrimer } = useGeo();

  const enable = async () => {
    await request();
    // `request` resolves after the native prompt settles, so the store now
    // holds the real answer.
    const { status } = useGeoStore.getState();
    if (status === "granted") toast.success(t("geo.enabled"));
    else if (status === "denied") toast(t("geo.denied"));
  };

  return (
    <AnimatePresence>
      {shouldPrime && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          <div className="relative flex gap-3.5 rounded-lg border border-line bg-surface p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-volt/10 text-volt">
              <MapPin className="size-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-sm font-semibold text-hi">
                {t("geo.primerTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-mid">
                {t("geo.primerBody")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="volt"
                  loading={pending}
                  onClick={enable}
                >
                  {pending ? t("geo.locating") : t("geo.enable")}
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissPrimer}>
                  {t("geo.notNow")}
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPrimer}
              aria-label={t("geo.notNow")}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-lg text-low transition-colors hover:bg-surface-2 hover:text-hi"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
