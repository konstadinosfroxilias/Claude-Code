"use client";

import { useCurrentUser } from "@/lib/hooks/use-session";
import { NotificationScreen } from "@/components/shared/notification-list";

export default function StudioNotificationsPage() {
  const { userId } = useCurrentUser();
  if (!userId) return null;
  return <NotificationScreen userId={userId} />;
}
