import { Inter, Lora } from "next/font/google";
import Link from "next/link";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import { Bell, Edit } from "lucide-react";
import type { Metadata } from "next";
import { ResponsiveNav } from "~~/components/ResponsiveNav";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { SearchBar } from "~~/components/SearchBar";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { UserMenu } from "~~/components/UserMenu";
import "~~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Paper - Monetize Your Words",
  description: "A decentralized publishing protocol for permissionless monetization",
  icons: [{ rel: "icon", url: "/logo.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Paper." />
      </head>
      <body className="font-sans bg-white text-stone-900 min-h-screen flex flex-col" suppressHydrationWarning>
        <ThemeProvider forcedTheme="light">
          <ScaffoldEthAppWithProviders>
            <header className="border-b border-stone-100 bg-white sticky top-0 z-20">
              <div className="max-w-[1336px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-white/90">
                <div className="flex items-center gap-4">
                  <Link
                    href="/"
                    className="font-serif text-3xl font-bold tracking-tighter text-stone-900 active:scale-[0.98]"
                  >
                    Paper
                  </Link>
                  <SearchBar />
                </div>
                <div className="flex items-center gap-6">
                  <Link
                    href="/write"
                    className="hidden md:flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Write
                  </Link>
                  <button className="text-stone-500 hover:text-stone-900 transition-colors" type="button">
                    <Bell className="w-5 h-5" />
                  </button>
                  <UserMenu />
                </div>
              </div>
            </header>

            <div className="flex-1 max-w-[1336px] w-full mx-auto px-3 sm:px-4 flex pb-20 lg:pb-0">
              <ResponsiveNav />

              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
