"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  ChartBarIcon,
  HomeIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
    icon: <HomeIcon className="h-4 w-4" />,
  },
  {
    label: "Write",
    href: "/write",
    icon: <PencilSquareIcon className="h-4 w-4" />,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <ChartBarIcon className="h-4 w-4" />,
  },
  {
    label: "Campaigns",
    href: "/campaigns",
    icon: <MegaphoneIcon className="h-4 w-4" />,
  },
  {
    label: "Creator Signup",
    href: "/signup",
    icon: <UserPlusIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1336px] items-center justify-between px-4">
        <div className="flex items-center gap-3 lg:gap-6">
          <details className="relative lg:hidden" ref={burgerMenuRef}>
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-stone-700 hover:bg-stone-100">
              <Bars3Icon className="h-5 w-5" />
            </summary>
            <ul
              className="absolute left-0 top-11 z-30 w-56 space-y-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <HeaderMenuLinks />
            </ul>
          </details>

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-lg font-bold text-white">
              P
            </div>
            <div className="leading-tight">
              <div className="font-serif text-xl font-bold tracking-tight text-stone-900">Paper</div>
              <div className="hidden text-[10px] uppercase tracking-wide text-stone-500 md:block">
                Decentralized Publishing
              </div>
            </div>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            <HeaderMenuLinks />
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden rounded-full border border-stone-300 px-3 py-1 text-stone-600 md:inline-flex">
            {targetNetwork.name}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">BitGo Custody</span>
        </div>
      </div>
    </header>
  );
};
