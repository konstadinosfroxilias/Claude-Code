"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientGate } from "@/components/shared/client-gate";
import { MemberShell } from "@/components/member/member-shell";
import { useSessionStore } from "@/lib/stores/session";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientGate>
      <Guard>{children}</Guard>
    </ClientGate>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  const { userId, role } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    if (!userId) router.replace("/auth");
    else if (role === "studio_owner") router.replace("/studio");
  }, [userId, role, router]);

  if (!userId || role === "studio_owner") return null;
  return <MemberShell>{children}</MemberShell>;
}
