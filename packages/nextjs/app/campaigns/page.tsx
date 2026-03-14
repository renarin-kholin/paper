"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, Plus, TrendingUp } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { fetchFromIPFS, resolveIPFSUrl } from "~~/lib/ipfs";
import type { Campaign } from "~~/lib/ipfs";

function CampaignCard({ campaignId }: { campaignId: bigint }) {
  const [articleTitle, setArticleTitle] = useState<string>("");
  const [adImageUrl, setAdImageUrl] = useState<string>("");

  const { data: campaign } = useScaffoldReadContract({
    contractName: "AdCampaigns",
    functionName: "getCampaign",
    args: [campaignId],
  });

  const { data: articleCID } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [campaign?.articleId || 0n],
    query: { enabled: campaign?.articleId !== undefined },
  });

  useEffect(() => {
    if (!articleCID) return;

    fetchFromIPFS(articleCID)
      .then(data => {
        setArticleTitle(data.name || "Untitled Article");
      })
      .catch(err => {
        console.error("Failed to fetch article:", err);
        setArticleTitle("Unknown Article");
      });
  }, [articleCID]);

  useEffect(() => {
    if (campaign?.imageCid) {
      setAdImageUrl(resolveIPFSUrl(campaign.imageCid) || "");
    }
  }, [campaign?.imageCid]);

  if (!campaign) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-32 bg-stone-100 rounded mb-4" />
        <div className="h-40 bg-stone-100 rounded mb-4" />
        <div className="h-4 w-full bg-stone-100 rounded" />
      </div>
    );
  }

  const startDate = new Date(Number(campaign.startTime) * 1000);
  const endDate = new Date(Number(campaign.endTime) * 1000);
  const now = Date.now();
  const isActive = campaign.active && now < Number(campaign.endTime) * 1000;
  const durationMs = Number(campaign.endTime - campaign.startTime) * 1000;
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  const daysRemaining = isActive ? Math.ceil((Number(campaign.endTime) * 1000 - now) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                isActive ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"
              }`}
            >
              {isActive ? "Active" : "Ended"}
            </span>
            {isActive && (
              <span className="text-xs text-stone-500">
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-stone-900 mb-1">Campaign #{campaignId.toString()}</h3>
          <Link
            href={`/post/${campaign.articleId.toString()}`}
            className="text-sm text-stone-600 hover:text-stone-900 hover:underline"
          >
            {articleTitle}
          </Link>
        </div>
      </div>

      {/* Ad Preview */}
      <div className="mb-4 rounded-lg border border-stone-200 overflow-hidden bg-stone-50">
        {adImageUrl ? (
          <div className="relative w-full h-48">
            <Image src={adImageUrl} alt="Ad creative" fill className="object-contain" />
          </div>
        ) : (
          <div className="w-full h-48 flex items-center justify-center">
            <p className="text-stone-400">Loading image...</p>
          </div>
        )}
      </div>

      {/* Campaign Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <ExternalLink className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <a
            href={campaign.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-600 hover:text-stone-900 hover:underline break-all"
          >
            {campaign.linkUrl}
          </a>
        </div>

        <div className="flex items-center gap-2 text-stone-600">
          <CalendarDays className="w-4 h-4 text-stone-400" />
          <span>
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </span>
        </div>

        <div className="pt-3 border-t border-stone-200 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-stone-500 mb-1">Duration</p>
            <p className="font-semibold text-stone-900">
              {durationDays} day{durationDays !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 mb-1">Total Paid</p>
            <p className="font-semibold text-stone-900">{formatEther(campaign.totalPaid)} ETH</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CampaignsPage() {
  const { address, isConnected } = useAccount();
  const [campaignIds, setCampaignIds] = useState<bigint[]>([]);

  const { data: userCampaigns } = useScaffoldReadContract({
    contractName: "AdCampaigns",
    functionName: "getCampaignsByAdvertiser",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: { enabled: address !== undefined },
  });

  useEffect(() => {
    if (userCampaigns) {
      setCampaignIds([...userCampaigns]);
    }
  }, [userCampaigns]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 page-fade-in">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-stone-900 mb-4">My Ad Campaigns</h1>
          <p className="text-stone-600 mb-6">Connect your wallet to view your advertising campaigns</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 page-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-stone-900">My Ad Campaigns</h1>
          <Link
            href="/campaigns/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        </div>
        <p className="text-stone-600">Manage your advertising campaigns and track performance</p>
      </div>

      {/* Campaigns List */}
      {campaignIds.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Your Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaignIds.map(id => (
              <CampaignCard key={id.toString()} campaignId={id} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl border border-stone-200 bg-stone-50">
          <div className="mb-4">
            <TrendingUp className="w-12 h-12 text-stone-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">No campaigns yet</h3>
          <p className="text-stone-500 mb-6">Create your first advertising campaign to reach engaged readers</p>
          <Link
            href="/campaigns/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Campaign
          </Link>
        </div>
      )}
    </div>
  );
}
