"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Home, Megaphone, Pen, User } from "lucide-react";
import { useAccount, useEnsAvatar, useEnsName } from "wagmi";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bookmarks", label: "Bookmarks", icon: BookMarked },
  { href: "/write", label: "Write", icon: Pen },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/profile", label: "Profile", icon: User },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const ResponsiveNav = () => {
  const pathname = usePathname();
  const { address } = useAccount();
  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: 1,
    query: { enabled: Boolean(ensName) },
  });

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 py-8 pr-8 border-r border-stone-100 sticky top-14 h-[calc(100vh-3.5rem)]">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors active:scale-[0.99] ${
                  active
                    ? "text-stone-900 bg-stone-50 font-medium"
                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.href === "/profile" && ensAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ensAvatar} alt="Profile avatar" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <Icon className="w-6 h-6 stroke-[1.5]" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-5 px-2 py-1.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 active:scale-95 ${
                  active ? "text-stone-900" : "text-stone-600"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.href === "/profile" && ensAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ensAvatar} alt="Profile avatar" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
