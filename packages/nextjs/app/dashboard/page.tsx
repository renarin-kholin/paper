"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, DollarSign, Wallet } from "lucide-react";
import { getCurrentUser, getPosts } from "~~/lib/store";

export default function DashboardPage() {
  const user = getCurrentUser();
  const userPosts = getPosts().filter(p => p.authorId === user.id);

  const totalEarnings = user.earnings;
  const currentBalance = user.balance;

  return (
    <div className="max-w-4xl mx-auto py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">Dashboard</h1>
        <p className="text-stone-500">Manage your earnings and ad spaces.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Current Balance</h3>
          </div>
          <div className="text-4xl font-serif font-bold text-stone-900 mb-2">${currentBalance.toFixed(2)}</div>
          <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12.5% this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Total Earnings</h3>
          </div>
          <div className="text-4xl font-serif font-bold text-stone-900 mb-2">${totalEarnings.toFixed(2)}</div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Lifetime revenue</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Active Ads</h3>
          </div>
          <div className="text-4xl font-serif font-bold text-stone-900 mb-2">
            {userPosts.filter(p => p.adState === "active").length}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Currently running</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Your Posts</h3>
          <Link href="/write" className="text-sm font-medium text-stone-900 hover:text-stone-600 transition-colors">
            Write new post
          </Link>
        </div>
        <div className="divide-y divide-stone-100">
          {userPosts.length === 0 ? (
            <div className="p-8 text-center text-stone-500">You haven&apos;t written any posts yet.</div>
          ) : (
            userPosts.map(post => (
              <div key={post.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
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
