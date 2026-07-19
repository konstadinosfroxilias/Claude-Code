"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarRange,
  ClipboardList,
  Euro,
  Eye,
  LayoutDashboard,
  LogOut,
  Settings2,
  Store,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/shared/avatar";
import { LangToggle } from "@/components/shared/lang-toggle";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { getServices } from "@/lib/services";
import { cn } from "@/lib/utils";

const NAV: { href: string; icon: typeof LayoutDashboard; key: TranslationKey }[] = [
  { href: "/studio", icon: LayoutDashboard, key: "dash.overview" },
  { href: "/studio/schedule", icon: CalendarRange, key: "dash.schedule" },
  { href: "/studio/roster", icon: ClipboardList, key: "dash.roster" },
  { href: "/studio/payouts", icon: Euro, key: "dash.payouts" },
  { href: "/studio/analytics", icon: BarChart3, key: "dash.analytics" },
];

const SECONDARY: { href: string; icon: typeof Store; key: TranslationKey }[] = [
  { href: "/studio/profile", icon: Store, key: "dash.profile" },
  { href: "/studio/policies", icon: Settings2, key: "dash.policies" },
];

export function StudioShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, userId } = useCurrentUser();

  const { data: studio } = useLiveQuery(
    (svc) =>
      userId ? svc.studioAdmin.getMyStudio(userId) : Promise.resolve(null),
    [userId],
  );
  const { data: unread } = useLiveQuery(
    (svc) =>
      userId ? svc.notifications.unreadCount(userId) : Promise.resolve(0),
    [userId],
  );

  const isActive = (href: string) =>
    href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);

  const signOut = async () => {
    await getServices().auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/40 p-4 lg:flex">
        <Logo href="/studio" />
        {studio && (
          <p className="mt-1.5 truncate pl-[18px] text-xs font-medium text-low">
            {studio.name}
          </p>
        )}
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              active={isActive(item.href)}
              icon={item.icon}
              label={t(item.key)}
            />
          ))}
          <div className="my-3 h-px bg-line" />
          {SECONDARY.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              active={isActive(item.href)}
              icon={item.icon}
              label={t(item.key)}
            />
          ))}
          <div className="flex-1" />
          <LangToggle className="mb-3 self-start" />
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5">
            <Avatar name={user?.name ?? "?"} className="size-8 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-hi">
                {user?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label={t("common.logout")}
              className="rounded-lg p-1.5 text-low transition-colors hover:bg-surface-2 hover:text-bad"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4">
            <div className="lg:hidden">
              <Logo href="/studio" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/member/home"
                className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-mid transition-colors hover:border-line-strong hover:text-hi sm:flex"
              >
                <Eye className="size-3.5" /> {t("dash.memberApp")}
              </Link>
              <Link
                href="/studio/notifications"
                aria-label={t("notif.title")}
                className="relative flex size-9 items-center justify-center rounded-xl text-mid transition-colors hover:bg-surface-2 hover:text-hi"
              >
                <Bell className="size-4.5" />
                {(unread ?? 0) > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-volt" />
                )}
              </Link>
              <div className="lg:hidden">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      aria-label={t("nav.settings")}
                      className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-volt"
                    >
                      <Avatar
                        name={user?.name ?? "?"}
                        className="size-8 text-[10px]"
                      />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="z-50 w-52 rounded-xl border border-line bg-surface-2 p-1.5 shadow-pop"
                    >
                      {SECONDARY.map((item) => (
                        <DropdownMenu.Item key={item.href} asChild>
                          <Link
                            href={item.href}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mid outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-hi"
                          >
                            <item.icon className="size-4" /> {t(item.key)}
                          </Link>
                        </DropdownMenu.Item>
                      ))}
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/member/home"
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mid outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-hi"
                        >
                          <Eye className="size-4" /> {t("dash.memberApp")}
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1 h-px bg-line" />
                      <div className="px-3 py-2">
                        <LangToggle />
                      </div>
                      <DropdownMenu.Separator className="my-1 h-px bg-line" />
                      <DropdownMenu.Item
                        onSelect={signOut}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-bad outline-none data-[highlighted]:bg-bad/10"
                      >
                        <LogOut className="size-4" /> {t("common.logout")}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-5xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-volt" : "text-low hover:text-mid",
                )}
              >
                <item.icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SideLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-volt/10 text-volt"
          : "text-mid hover:bg-surface-2 hover:text-hi",
      )}
    >
      <Icon className="size-4.5" strokeWidth={active ? 2.3 : 2} />
      {label}
    </Link>
  );
}
