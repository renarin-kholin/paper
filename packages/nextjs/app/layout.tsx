import { Inter, Lora } from "next/font/google";
import Link from "next/link";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import { BarChart2, Bell, BookOpen, Edit, Home, Search, User } from "lucide-react";
import type { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
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
  description: "A Medium clone with built-in ad space monetization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-white text-stone-900 min-h-screen flex flex-col" suppressHydrationWarning>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>
            <header className="border-b border-stone-100 bg-white sticky top-0 z-20">
              <div className="max-w-[1336px] mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/" className="font-serif text-3xl font-bold tracking-tighter text-stone-900">
                    Paper
                  </Link>
                  <div className="hidden md:flex items-center bg-stone-50 rounded-full px-4 py-2.5 ml-4">
                    <Search className="w-4 h-4 text-stone-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search"
                      className="bg-transparent border-none outline-none text-sm w-56 placeholder:text-stone-400"
                    />
                  </div>
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
                  <Link
                    href="/signup"
                    className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden"
                  >
                    <User className="w-5 h-5 text-stone-500" />
                  </Link>
                </div>
              </div>
            </header>

            <div className="flex-1 max-w-[1336px] w-full mx-auto px-4 flex">
              <aside className="hidden lg:flex flex-col w-64 py-8 pr-8 border-r border-stone-100 sticky top-14 h-[calc(100vh-3.5rem)]">
                <nav className="flex flex-col gap-1">
                  <Link
                    href="/"
                    className="flex items-center gap-4 px-4 py-3 text-stone-900 bg-stone-50 rounded-full font-medium"
                  >
                    <Home className="w-6 h-6 stroke-[1.5]" />
                    Home
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-4 px-4 py-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors"
                  >
                    <BarChart2 className="w-6 h-6 stroke-[1.5]" />
                    Stats
                  </Link>
                  <Link
                    href="/write"
                    className="flex items-center gap-4 px-4 py-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors"
                  >
                    <BookOpen className="w-6 h-6 stroke-[1.5]" />
                    Stories
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center gap-4 px-4 py-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors"
                  >
                    <User className="w-6 h-6 stroke-[1.5]" />
                    Profile
                  </Link>
                </nav>
              </aside>

              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
