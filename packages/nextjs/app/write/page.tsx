"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { SimpleEditor } from "~~/components/tiptap-templates/simple/simple-editor";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { ETH_ADDRESS, uploadToIPFS } from "~~/lib/ipfs";

export default function WritePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adEnabled, setAdEnabled] = useState(false);
  const [adPrice, setAdPrice] = useState("25");
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [accessPrice, setAccessPrice] = useState("5");
  const [showSettings, setShowSettings] = useState(false);

  const parsedAccessPrice = Number(accessPrice);
  const parsedAdPrice = Number(adPrice);
  const plainTextContent = content.replace(/<[^>]*>?/gm, "");

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Paper" });

  const isPublishDisabled =
    !title.trim() ||
    !plainTextContent.trim() ||
    (paywallEnabled && (!Number.isFinite(parsedAccessPrice) || parsedAccessPrice <= 0)) ||
    (adEnabled && (!Number.isFinite(parsedAdPrice) || parsedAdPrice <= 0));

  const handlePublish = async () => {
    if (isPublishDisabled) return;

    try {
      const priceWei = paywallEnabled ? parseEther(accessPrice) : 0n;

      // Keep metadata shape compatible with read paths that expect title/content/price info.
      const cid = await uploadToIPFS({
        name: title,
        description: title,
        content,
        preview: plainTextContent.slice(0, 200),
        author: "",
        createdAt: Date.now(),
        price: priceWei.toString(),
        priceToken: ETH_ADDRESS,
      });

      await writeContractAsync({
        functionName: "publish",
        args: [cid, title, priceWei, ETH_ADDRESS],
      });

      router.push("/");
    } catch (e) {
      console.error(e);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-6 text-center page-fade-in">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-4">Connect to start writing</h1>
        <p className="text-stone-500 mb-8">Connect your wallet to publish on-chain articles.</p>
        <div className="inline-flex">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">Draft in connected wallet</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-stone-500 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100"
            type="button"
            aria-expanded={showSettings}
            aria-controls="post-settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending || isPublishDisabled}
            className="bg-stone-900 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            type="button"
          >
            {isPending ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          id="post-settings"
          className="mb-8 p-6 bg-white border border-stone-200 rounded-2xl shadow-sm page-fade-in"
        >
          <h3 className="text-lg font-bold text-stone-900 mb-4 font-serif">Monetization Settings</h3>
          <div className="space-y-6">
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
                <label className="text-sm font-medium text-stone-900 block mb-2">Access Price (ETH)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={accessPrice}
                    onChange={e => setAccessPrice(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-stone-200 rounded-lg focus:!outline-none focus-visible:!outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all shadow-sm"
                    placeholder="0.001"
                    min="0.0001"
                    step="0.0001"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2">Readers will pay this amount in ETH to unlock your post.</p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-6"></div>

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
                    className="w-full pl-8 pr-4 py-2 border border-stone-200 rounded-lg focus:!outline-none focus-visible:!outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all shadow-sm"
                    placeholder="25.00"
                    min="0.1"
                    step="0.1"
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

      <div className="space-y-6 page-fade-in">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full text-4xl sm:text-5xl font-serif font-bold text-stone-900 placeholder:text-stone-300 !outline-none focus:!outline-none focus-visible:!outline-none bg-transparent transition-colors"
        />

        <div className="relative group min-h-[50vh]">
          <SimpleEditor placeholder="Tell your story..." value={content} onChange={val => setContent(val)} />
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-2">
          <span>{title.trim().length} title chars</span>
          <span>{plainTextContent.trim().length} body chars</span>
        </div>
      </div>
    </div>
  );
}
