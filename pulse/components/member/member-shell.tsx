"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Compass,
  Heart,
  House,
  LogOut,
  Settings,
  Sparkles,
  User as UserIcon,
  Wallet as WalletIcon,
  Zap,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/shared/avatar";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { getServices } from "@/lib/services";
import { cn } from "@/lib/utils";

const TABS: { href: string; icon: typeof House; key: TranslationKey }[] = [
  { href: "/member/home", icon: House, key: "nav.home" },
  { href: "/member/explore", icon: Compass, key: "nav.explore" },
  { href: "/member/bookings", icon: CalendarCheck, key: "nav.bookings" },
  { href: "/member/wallet", icon: WalletIcon, key: "nav.wallet" },
  { href: "/member/profile", icon: UserIcon, key: "nav.profile" },
];

export function MemberShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, userId } = useCurrentUser();

  const { data: wallet } = useLiveQuery(
    (svc) => (userId ? svc.wallet.getSummary(userId) : Promise.resolve(null)),
    [userId],
  );
  const { data: unread } = useLiveQuery(
    (svc) =>
      userId ? svc.notifications.unreadCount(userId) : Promise.resolve(0),
    [userId],
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const signOut = async () => {
    await getServices().auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Logo href="/member/home" />

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {TABS.slice(0, 4).map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(tab.href)
                    ? "bg-surface-2 text-hi"
                    : "text-mid hover:text-hi",
                )}
              >
                {t(tab.key)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/member/wallet"
              className="tap flex h-11 items-center gap-1.5 rounded-full border border-volt/30 bg-volt/10 px-3 text-sm font-bold text-volt transition-colors hover:bg-volt/20 sm:h-8"
              aria-label={t("wallet.balance")}
            >
              <Zap className="size-3.5 fill-current" />
              <span className="tnum">{wallet?.balance ?? "–"}</span>
            </Link>

            <Link
              href="/member/notifications"
              aria-label={t("notif.title")}
              className="relative flex size-11 items-center justify-center rounded-xl text-mid transition-colors hover:bg-surface-2 hover:text-hi sm:size-9"
            >
              <Bell className="size-4.5" />
              {(unread ?? 0) > 0 && (
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-volt sm:right-1.5 sm:top-1.5" />
              )}
            </Link>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label={t("nav.profile")}
                  className="flex size-11 items-center justify-center rounded-full outline-none transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-volt sm:size-8"
                >
                  <Avatar name={user?.name ?? "?"} className="size-8" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-56 rounded-xl border border-line bg-surface-2 p-1.5 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-hi">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs text-low">{user?.email}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  {(
                    [
                      ["/member/profile", UserIcon, "nav.profile"],
                      ["/member/favorites", Heart, "nav.favorites"],
                      ["/member/subscription", Sparkles, "nav.subscription"],
                      ["/member/settings", Settings, "nav.settings"],
                    ] as [string, typeof UserIcon, TranslationKey][]
                  ).map(([href, Icon, key]) => (
                    <DropdownMenu.Item key={href} asChild>
                      <Link
                        href={href}
                        className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mid outline-none transition-colors hover:bg-surface-3 hover:text-hi data-[highlighted]:bg-surface-3 data-[highlighted]:text-hi sm:min-h-0"
                      >
                        <Icon className="size-4" /> {t(key)}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  <DropdownMenu.Item
                    onSelect={signOut}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-bad outline-none transition-colors data-[highlighted]:bg-bad/10 sm:min-h-0"
                  >
                    <LogOut className="size-4" /> {t("common.logout")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:pb-12">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-volt" : "text-low hover:text-mid",
                )}
              >
                <tab.icon
                  className={cn("size-5", active && "drop-shadow-[0_0_6px_rgb(200_241_63/0.5)]")}
                  strokeWidth={active ? 2.4 : 2}
                />
                {t(tab.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
