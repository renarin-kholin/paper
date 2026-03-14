"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, BadgeDollarSign, BookOpenCheck, Sparkles, Wallet } from "lucide-react";
import { getCurrentUser, getPosts } from "~~/lib/store";

export default function DashboardPage() {
  const user = getCurrentUser();
  const userPosts = getPosts().filter(p => p.authorId === user.id);

  const totalEarnings = user.earnings;
  const currentBalance = user.balance;
  const activeAds = userPosts.filter(p => p.adState === "active").length;
  const availableSlots = userPosts.filter(p => p.adState === "available").length;
  const paywalledPosts = userPosts.filter(p => p.isPaywalled).length;
  const totalPostViewsEstimate = userPosts.length * 432;

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 page-fade-in">
      <header className="mb-10 rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-emerald-50 p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">Creator Dashboard</h1>
            <p className="text-stone-500">Track monetization, ad inventory, and story performance in one place.</p>
          </div>
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-emerald-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Revenue mode: Active
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-12">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm lift-on-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Current Balance</h3>
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-2">
            ${currentBalance.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12.5% this month</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm lift-on-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Total Earnings</h3>
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-2">
            ${totalEarnings.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Lifetime revenue</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm lift-on-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Active Ads</h3>
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-2">{activeAds}</div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Currently running</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm lift-on-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Paywalled Posts</h3>
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-2">{paywalledPosts}</div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Premium stories</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 sm:mb-12">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 font-serif mb-4">Ad Inventory</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Open ad slots</span>
              <span className="font-semibold text-stone-900">{availableSlots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Running campaigns</span>
              <span className="font-semibold text-stone-900">{activeAds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Estimated monthly reach</span>
              <span className="font-semibold text-stone-900">~{totalPostViewsEstimate.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 font-serif mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/write" className="rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
              Publish new post
            </Link>
            <Link href="/bookmarks" className="rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
              Review bookmarks
            </Link>
            <Link href="/search" className="rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
              Find sponsors
            </Link>
            <Link href="/profile" className="rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
              Update profile
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Your Posts</h3>
          <Link
            href="/write"
            className="text-sm font-medium text-stone-900 hover:text-stone-600 transition-colors active:scale-95"
          >
            Write new post
          </Link>
        </div>
        <div className="divide-y divide-stone-100">
          {userPosts.length === 0 ? (
            <div className="p-8 text-center text-stone-500">You haven&apos;t written any posts yet.</div>
          ) : (
            userPosts.map(post => (
              <div
                key={post.id}
                className="p-4 sm:p-6 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-lg font-bold text-stone-900 hover:text-stone-600 transition-colors font-serif mb-1 block"
                  >
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    {post.adState !== "disabled" && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${post.adState === "active" ? "bg-stone-900" : post.adState === "available" ? "bg-stone-400" : "bg-stone-300"}`}
                        ></span>
                        {post.adState === "active"
                          ? "Ad Active"
                          : post.adState === "available"
                            ? `Available ($${post.adPrice})`
                            : "Expired"}
                      </span>
                    )}
                  </div>
                </div>
                {post.adState === "active" && post.activeAd && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-stone-900">+$ {post.adPrice}</div>
                    <div className="text-xs text-stone-500">Earned</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
