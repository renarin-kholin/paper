"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Home, Megaphone, Pen, User } from "lucide-react";
import { useAccount, useEnsAvatar, useEnsName } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { fetchProfileFromIPFS, getIPFSGatewayUrl, UserProfile } from "~~/lib/ipfs";

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
  const ENS_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ENS_CHAIN_ID || "11155111");
  const { data: ensName } = useEnsName({
    address,
    chainId: ENS_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: ENS_CHAIN_ID,
    query: { enabled: Boolean(ensName) },
  });

  const { data: profileCID } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getUserProfileCID" as any,
    args: address ? ([address] as any) : undefined,
    query: { enabled: Boolean(address) },
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ipfsAvatar, setIpfsAvatar] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const cid = typeof profileCID === "string" ? profileCID : "";

    if (!cid) {
      setProfile(null);
      setIpfsAvatar(null);
      return;
    }

    fetchProfileFromIPFS(cid)
      .then(data => {
        if (!active) return;
        setProfile(data);
        if (data.avatar) {
          setIpfsAvatar(getIPFSGatewayUrl(data.avatar));
        }
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
        setIpfsAvatar(null);
      });

    return () => {
      active = false;
    };
  }, [profileCID]);

  const avatar = ensAvatar || ipfsAvatar;

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
                {item.href === "/profile" && avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Profile avatar" className="h-6 w-6 rounded-full object-cover" />
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
                {item.href === "/profile" && avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Profile avatar" className="h-5 w-5 rounded-full object-cover" />
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
