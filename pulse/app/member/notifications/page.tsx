"use client";

import { useCurrentUser } from "@/lib/hooks/use-session";
import { NotificationScreen } from "@/components/shared/notification-list";
import { RemindersPanel } from "@/components/member/reminders-panel";

export default function NotificationsPage() {
  const { userId } = useCurrentUser();
  if (!userId) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <RemindersPanel userId={userId} />
      <NotificationScreen userId={userId} />
    </div>
  );
}
