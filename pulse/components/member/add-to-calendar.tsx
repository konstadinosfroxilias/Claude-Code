"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { BookingView } from "@/lib/types";
import {
  downloadICS,
  googleCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar/ics";
import { Button } from "@/components/ui/button";

function toEvent(view: BookingView, note: string): CalendarEvent {
  const { booking, session, classType, studio } = view;
  return {
    uid: booking.id,
    title: `${classType.name} · ${studio.name}`,
    description: `${note}\n\n${classType.name} — ${session.instructor}\nPULSE · ${booking.qrToken}`,
    location: `${studio.name}, ${studio.address}`,
    startsAt: session.startsAt,
    durationMin: session.durationMin,
  };
}

/** .ics download + Google Calendar link — both real and fully client-side. */
export function AddToCalendar({ view }: { view: BookingView }) {
  const { t } = useI18n();
  const event = toEvent(view, t("calendar.eventNote"));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="ghost">
          <CalendarPlus /> {t("calendar.add")}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-xl border border-line bg-surface-2 p-1.5 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item
            onSelect={() => {
              downloadICS(event, `pulse-${view.booking.id}`);
              toast.success(t("calendar.downloaded"));
            }}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mid outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-hi sm:min-h-0"
          >
            <Download className="size-4" /> {t("calendar.ics")}
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mid outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-hi sm:min-h-0"
            >
              <ExternalLink className="size-4" /> {t("calendar.google")}
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
