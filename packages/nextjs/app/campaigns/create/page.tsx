"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, DollarSign, ExternalLink, Upload } from "lucide-react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { fetchFromIPFS, uploadImageToIPFS } from "~~/lib/ipfs";
import { notification } from "~~/utils/scaffold-eth";

function CreateCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleIdParam = searchParams.get("articleId");
  const { isConnected } = useAccount();

  const [articleId, setArticleId] = useState<string>(articleIdParam || "");
  const [articleTitle, setArticleTitle] = useState<string>("");
  const [dailyRateUsd, setDailyRateUsd] = useState<number>(0);
  const [isRateFromArticle, setIsRateFromArticle] = useState<boolean>(false);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string>("");
  const [imageCid, setImageCID] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch article metadata
  const { data: articleMeta } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [BigInt(articleId || "0")],
    query: { enabled: articleId !== "" },
  });

  const { data: articleCID } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [BigInt(articleId || "0")],
    query: { enabled: articleId !== "" },
  });

  // Check if article has active campaign
  const { data: hasActiveCampaign } = useScaffoldReadContract({
    contractName: "AdCampaigns",
    functionName: "hasActiveCampaign",
    args: [BigInt(articleId || "0")],
    query: { enabled: articleId !== "" },
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "AdCampaigns",
  });

  // Fetch article content to get ad space info
  useEffect(() => {
    if (!articleCID) return;

    fetchFromIPFS(articleCID)
      .then(data => {
        setArticleTitle(data.name || "");
        if (data.adSpace?.enabled && data.adSpace?.dailyPriceUsd) {
          setDailyRateUsd(data.adSpace.dailyPriceUsd);
          setIsRateFromArticle(true);
        } else {
          // No ad space configured, set default rate
          setDailyRateUsd(10);
          setIsRateFromArticle(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch article:", err);
        // On error, set default rate
        setDailyRateUsd(10);
        setIsRateFromArticle(false);
      });
  }, [articleCID]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      notification.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notification.error("Image must be less than 5MB");
      return;
    }

    setAdImage(file);
    setAdImagePreview(URL.createObjectURL(file));
  };

  const handleUploadImage = async () => {
    if (!adImage) return;

    setIsUploading(true);
    try {
      const cid = await uploadImageToIPFS(adImage);
      setImageCID(cid);
      notification.success("Image uploaded to IPFS!");
    } catch (error) {
      console.error("Upload error:", error);
      notification.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!isConnected) {
      notification.error("Please connect your wallet");
      return;
    }

    if (articleId === "") {
      notification.error("Please enter an article ID");
      return;
    }

    if (!imageCid) {
      notification.error("Please upload an ad image first");
      return;
    }

    if (!linkUrl) {
      notification.error("Please enter a link URL");
      return;
    }

    if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      notification.error("Link URL must start with http:// or https://");
      return;
    }

    if (durationDays < 1 || durationDays > 90) {
      notification.error("Duration must be between 1 and 90 days");
      return;
    }

    if (!dailyRateUsd || dailyRateUsd <= 0) {
      notification.error("Please set a valid daily rate (must be greater than $0)");
      return;
    }

    setIsCreating(true);
    try {
      // Convert USD to ETH (simplified - in production you'd use an oracle)
      // Assuming 1 ETH = $2000 for this demo
      const ethPrice = 2000;
      const dailyRateEth = dailyRateUsd / ethPrice;
      const dailyRateWei = parseEther(dailyRateEth.toString());
      const totalCost = dailyRateWei * BigInt(durationDays);

      await writeContractAsync({
        functionName: "createCampaign",
        args: [BigInt(articleId), BigInt(durationDays), dailyRateWei, imageCid, linkUrl],
        value: totalCost,
      });

      notification.success("Campaign created successfully!");
      router.push("/campaigns");
    } catch (error) {
      console.error("Campaign creation error:", error);
      notification.error("Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const totalCost = dailyRateUsd * durationDays;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 page-fade-in">
      <div className="mb-6">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900">
          <ArrowLeft className="w-4 h-4" />
          Back to campaigns
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-stone-900 mb-8">Create Ad Campaign</h1>

      {/* Article Selection */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Article</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Article ID</label>
            <input
              type="number"
              value={articleId}
              onChange={e => setArticleId(e.target.value)}
              placeholder="Enter article ID"
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            />
          </div>

          {articleTitle && (
            <div className="p-4 bg-stone-50 rounded-lg">
              <p className="text-sm text-stone-500 mb-1">Article Title</p>
              <p className="font-medium text-stone-900">{articleTitle}</p>
              {isRateFromArticle && dailyRateUsd > 0 && (
                <p className="text-sm text-green-600 mt-2">✓ Ad Space Configured: ${dailyRateUsd}/day</p>
              )}
              {!isRateFromArticle && (
                <p className="text-sm text-amber-600 mt-2">⚠️ No ad space configured - set rate manually below</p>
              )}
            </div>
          )}

          {hasActiveCampaign && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">⚠️ This article already has an active campaign</p>
            </div>
          )}
        </div>
      </div>

      {/* Ad Creative */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Ad Creative</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Ad Image</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-900 file:text-white hover:file:bg-stone-800"
              />
              {adImagePreview && (
                <div className="relative w-full h-48 bg-stone-100 rounded-lg overflow-hidden">
                  <Image src={adImagePreview} alt="Ad preview" fill className="object-contain" />
                </div>
              )}
              {adImage && !imageCid && (
                <button
                  onClick={handleUploadImage}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:bg-stone-400"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Upload to IPFS"}
                </button>
              )}
              {imageCid && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">✓ Image uploaded: {imageCid}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Link URL</label>
            <div className="relative">
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 pl-10 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              />
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Duration & Pricing */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Duration & Pricing</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Daily Rate (USD/day) {isRateFromArticle && <span className="text-green-600">✓ From Article</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={dailyRateUsd}
                onChange={e => setDailyRateUsd(Math.max(0.01, parseFloat(e.target.value) || 0))}
                className="w-full px-4 py-2 pl-10 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder="10.00"
              />
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {isRateFromArticle
                ? "Rate set by article author. You can adjust if negotiated differently."
                : "Set the daily advertising rate for this campaign."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Campaign Duration (1-90 days)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={e => setDurationDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 pl-10 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              />
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Daily Rate:</span>
              <span className="font-medium text-stone-900">${dailyRateUsd}/day</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Duration:</span>
              <span className="font-medium text-stone-900">{durationDays} days</span>
            </div>
            <div className="h-px bg-stone-200 my-2" />
            <div className="flex justify-between">
              <span className="font-semibold text-stone-900">Total Cost:</span>
              <span className="font-bold text-stone-900 text-lg">${totalCost.toFixed(2)}</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              ≈ {(totalCost / 2000).toFixed(6)} ETH (assuming 1 ETH = $2000)
            </p>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex gap-4">
        <button
          onClick={handleCreateCampaign}
          disabled={
            !isConnected ||
            !imageCid ||
            !linkUrl ||
            articleId === "" ||
            isCreating ||
            hasActiveCampaign ||
            !dailyRateUsd ||
            dailyRateUsd <= 0
          }
          className="flex-1 px-6 py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? "Creating Campaign..." : `Create Campaign ($${totalCost.toFixed(2)})`}
        </button>
      </div>

      {!isConnected && (
        <p className="text-sm text-stone-500 text-center mt-4">Connect your wallet to create a campaign</p>
      )}
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          <div className="h-8 w-48 bg-stone-100 rounded animate-pulse mb-8" />
          <div className="h-64 bg-stone-100 rounded animate-pulse" />
        </div>
      }
    >
      <CreateCampaignContent />
    </Suspense>
  );
}
