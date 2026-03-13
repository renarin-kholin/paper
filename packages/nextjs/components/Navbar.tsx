"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Write" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar bg-base-100 shadow-md shadow-secondary sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl">
            📝 Paper
          </Link>
          <ul className="menu menu-horizontal px-1 gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link href={href} className={isActive ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex-none">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </nav>
  );
}
