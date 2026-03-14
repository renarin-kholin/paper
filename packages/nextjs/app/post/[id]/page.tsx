"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CommentSection } from "../../../components/CommentSection";
import { Address } from "@scaffold-ui/components";
import { Lock, Megaphone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { parseAbi } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { BookmarkButton } from "~~/components/BookmarkButton";
import { LikeButton } from "~~/components/LikeButton";
import { TipButton } from "~~/components/TipButton";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { type ArticleMetadata, ETH_ADDRESS, calculateReadTime, fetchFromIPFS, resolveIPFSUrl } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

export default function PostPage() {
  const params = useParams();
  const tokenId = BigInt(params.id as string);
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [content, setContent] = useState<ArticleMetadata | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const { data: meta, isLoading: metaLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [tokenId],
  });

  const { data: cid, isLoading: cidLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [tokenId],
  });

  const { data: hasPaid } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "hasPaidForArticle",
    args: [tokenId, address] as const,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, isPending: isUnlocking } = useScaffoldWriteContract({ contractName: "Paper" });
  const { writeContractAsync: writeErc20Async, isPending: isApproving } = useWriteContract();
  const { data: paperContract } = useDeployedContractInfo({ contractName: "Paper" });

  const { data: usdcToken } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "usdcToken",
  });

  const [author, createdAt, title, price, priceToken] = useMemo(() => {
    return (meta || ["", 0n, "", 0n, ETH_ADDRESS]) as ArticleMetaTuple;
  }, [meta]);

  const isAuthor = Boolean(address && author && address.toLowerCase() === author.toLowerCase());
  const isPaid = Boolean(hasPaid);
  const showPaywall = price > 0n && !isAuthor && !isPaid;
  const canPayWithEth = priceToken.toLowerCase() === ETH_ADDRESS.toLowerCase();
  const canPayWithUsdc = Boolean(
    usdcToken && typeof usdcToken === "string" && priceToken.toLowerCase() === usdcToken.toLowerCase(),
  );

  useEffect(() => {
    if (!cid) return;

    let active = true;
    setContentError(null);

    const loadContent = async () => {
      if (showPaywall) {
        try {
          const response = await fetch(`/api/article/${tokenId.toString()}/content`);
          const payload = await response.json();
          if (!active) return;

          setContent({
            name: title,
            description: title,
            content: payload.preview || "This article is paywalled.",
            preview: payload.preview || "",
            author,
            createdAt: Number(createdAt) * 1000,
            price: price.toString(),
            priceToken,
          });
          setThumbnail(null);
          return;
        } catch (error) {
          if (!active) return;
          setContentError(error instanceof Error ? error.message : "Unable to load preview");
          return;
        }
      }

      fetchFromIPFS(cid)
        .then(result => {
          if (active) {
            setContent(result);
            setThumbnail(resolveIPFSUrl(result.image));
          }
        })
        .catch(error => {
          if (!active) return;
          setContentError(error instanceof Error ? error.message : "Unable to load content");
          setThumbnail(null);
        });
    };

    loadContent();

    return () => {
      active = false;
    };
  }, [author, cid, createdAt, price, priceToken, showPaywall, title, tokenId]);

  const readTime = useMemo(() => {
    return content?.content ? calculateReadTime(content.content) : 1;
  }, [content]);

  const handleUnlock = async () => {
    try {
      if (canPayWithEth) {
        await writeContractAsync({
          functionName: "payArticle",
          args: [tokenId],
          value: price,
        });
        return;
      }

      if (canPayWithUsdc && usdcToken && paperContract?.address && publicClient) {
        const approveHash = await writeErc20Async({
          address: usdcToken,
          abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
          functionName: "approve",
          args: [paperContract.address, price],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await writeContractAsync({
          functionName: "payArticle",
          args: [tokenId],
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (metaLoading || cidLoading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-stone-500">Loading post...</div>;
  }

  if (!meta || !cid) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-stone-500">Post not found</div>;
  }

  const articleBody = content?.content || "";
  const adSpace = content?.adSpace;

  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12 page-fade-in">
      <header className="mb-12">
        {thumbnail && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-stone-200">
            <Image src={thumbnail} alt={title} width={1200} height={630} className="h-auto w-full object-cover" />
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-8 leading-tight">{title}</h1>

        <div className="flex items-center justify-between pb-8 border-b border-stone-100">
          <div>
            <Link
              href={`/profile/${author}`}
              className="font-medium text-stone-900 hover:text-stone-600 transition-colors"
            >
              <Address address={author} onlyEnsOrAddress disableAddressLink size="base" />
            </Link>
            <div className="text-sm text-stone-500 flex items-center gap-2">
              <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
              <span>·</span>
              <span>{readTime} min read</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LikeButton articleId={tokenId} showCount={true} />
            <BookmarkButton articleId={tokenId} />
            <TipButton authorAddress={author} />
          </div>
        </div>
      </header>

      <div className="prose prose-stone prose-base sm:prose-lg max-w-none mb-16 font-serif leading-relaxed text-stone-800 relative">
        {showPaywall ? (
          <>
            <div className="h-64 overflow-hidden relative">
              <ReactMarkdown>{articleBody || "This article is paywalled."}</ReactMarkdown>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border border-stone-200 rounded-2xl shadow-lg text-center z-10 transform translate-y-1/2">
              <div className="w-12 h-12 bg-stone-100 text-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2 font-serif">Unlock this story</h3>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">
                Support the author directly to read the full story.
              </p>
              <button
                onClick={handleUnlock}
                disabled={isUnlocking || isApproving || (!canPayWithEth && !canPayWithUsdc)}
                className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 text-lg active:scale-95"
                type="button"
              >
                {isUnlocking || isApproving
                  ? "Processing..."
                  : canPayWithEth
                    ? `Unlock for ${price.toString()} wei`
                    : canPayWithUsdc
                      ? `Unlock with USDC (${price.toString()})`
                      : "Unsupported token"}
              </button>
            </div>
          </>
        ) : (
          <ReactMarkdown>{articleBody || "Content could not be loaded."}</ReactMarkdown>
        )}
      </div>

      {adSpace?.enabled && (
        <section className="mb-12 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <Megaphone className="h-4 w-4" />
            Ad Space
          </div>
          <h3 className="mb-2 text-xl font-semibold text-stone-900">Sponsor this story</h3>
          <p className="text-stone-600">
            Reserve this placement for ${adSpace.dailyPriceUsd}/day and reach engaged readers.
          </p>
          <div className="mt-4">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
            >
              Create Campaign
            </Link>
          </div>
        </section>
      )}

      <CommentSection articleId={tokenId} />

      {contentError && <p className="text-sm text-red-600">{contentError}</p>}
    </article>
  );
}
