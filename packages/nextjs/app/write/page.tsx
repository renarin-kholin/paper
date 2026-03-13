"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Settings } from "lucide-react";
import { addPost, getCurrentUser } from "~~/lib/store";

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adEnabled, setAdEnabled] = useState(false);
  const [adPrice, setAdPrice] = useState("25");
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [accessPrice, setAccessPrice] = useState("5");
  const [showSettings, setShowSettings] = useState(false);

  const handlePublish = () => {
    if (!title.trim() || !content.trim()) return;

    const user = getCurrentUser();
    const newPost = {
      id: `post-${Date.now()}`,
      title,
      content,
      authorId: user.id,
      createdAt: new Date().toISOString(),
      adState: adEnabled ? "available" : "disabled",
      adPrice: adEnabled ? parseFloat(adPrice) : undefined,
      isPaywalled: paywallEnabled,
      accessPrice: paywallEnabled ? parseFloat(accessPrice) : undefined,
    } as const;

    addPost(newPost);
    router.push(`/post/${newPost.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">Draft in {getCurrentUser().name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-stone-500 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handlePublish}
            disabled={!title.trim() || !content.trim()}
            className="bg-stone-900 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-8 p-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-4 font-serif">Monetization Settings</h3>
          <div className="space-y-6">
            {/* Paywall Settings */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-stone-900 block">Paywall this post</label>
                <p className="text-sm text-stone-500">Require readers to pay to access the full content.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={paywallEnabled}
                  onChange={e => setPaywallEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>

            {paywallEnabled && (
              <div className="pt-4 border-t border-stone-100">
                <label className="text-sm font-medium text-stone-900 block mb-2">Access Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                  <input
                    type="number"
                    value={accessPrice}
                    onChange={e => setAccessPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                    placeholder="5.00"
                    min="1"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2">Readers will pay this amount to unlock your post.</p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-6"></div>

            {/* Ad Settings */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-stone-900 block">Enable Ad Space</label>
                <p className="text-sm text-stone-500">Allow sponsors to buy an ad slot on this post.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={adEnabled}
                  onChange={e => setAdEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>

            {adEnabled && (
              <div className="pt-4 border-t border-stone-100">
                <label className="text-sm font-medium text-stone-900 block mb-2">Daily Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                  <input
                    type="number"
                    value={adPrice}
                    onChange={e => setAdPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                    placeholder="25.00"
                    min="1"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  Sponsors can buy this space directly using crypto or fiat. You keep 100% of the earnings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full text-5xl font-serif font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none bg-transparent"
        />

        <div className="relative group">
          <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
            <button className="p-2 text-stone-400 hover:text-stone-900 rounded-full border border-stone-200 hover:border-stone-400 bg-white transition-all">
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
          <textarea
            placeholder="Tell your story..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full min-h-[50vh] text-xl text-stone-800 placeholder:text-stone-300 focus:outline-none resize-none bg-transparent leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
