"use client";

import { Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { ClassType, Session, Studio } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Deep link that opens the studio page with the booking sheet on this class. */
export function classShareUrl(studioId: string, sessionId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/member/studios/${studioId}/?session=${encodeURIComponent(sessionId)}`;
}

/**
 * "Invite a friend" — Web Share when the browser has it, clipboard otherwise.
 * There is no follower graph, no feed and no ranking behind this: just a link.
 */
export function InviteFriendButton({
  session,
  classType,
  studio,
  size = "sm",
  variant = "ghost",
  className,
}: {
  session: Session;
  classType: ClassType;
  studio: Studio;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const { t, lang } = useI18n();

  const share = async () => {
    const url = classShareUrl(studio.id, session.id);
    const text = t("social.shareText", {
      class: classType.name,
      studio: studio.name,
      time: formatDateTime(session.startsAt, lang),
    });
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: `${classType.name} · ${studio.name}`, text, url });
        toast.success(t("social.shared"));
        return;
      }
    } catch (e) {
      // The member closed the share sheet — not an error.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success(t("social.linkCopied"));
    } catch {
      toast(url);
    }
  };

  return (
    <Button size={size} variant={variant} className={className} onClick={share}>
      <Share2 /> {t("social.invite")}
    </Button>
  );
}

/**
 * "X going" — a light social signal from the session's real booking count.
 * Deliberately not a list of names and never compared to anyone.
 */
export function GoingSignal({
  booked,
  className,
}: {
  booked: number;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-low tnum",
        booked > 0 && "text-mid",
        className,
      )}
    >
      <Users className="size-3" />
      {booked === 0
        ? t("social.goingNone")
        : booked === 1
          ? t("social.goingOne")
          : t("social.going", { n: booked })}
    </span>
  );
}
