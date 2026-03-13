import React from "react";
import Link from "next/link";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <footer className="border-t border-stone-200 bg-white px-4 py-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
        <p className="m-0 text-stone-500">Paper: ERC-721 posts, x402 paywalls, BitGo custody wallets.</p>
        <div className="flex items-center gap-4 text-stone-600">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Feed
          </Link>
          <Link href="/write" className="hover:text-stone-900 transition-colors">
            Publish
          </Link>
          <Link href="/dashboard" className="hover:text-stone-900 transition-colors">
            Creator Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
};
