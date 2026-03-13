"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { NextPage } from "next";
import ReactMarkdown from "react-markdown";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useEthPayment, useHasPaid } from "~~/hooks/useEthPayment";
import { ETH_ADDRESS, fetchFromIPFS } from "~~/lib/ipfs";

interface ArticleData {
  title: string;
  content: string;
  preview: string;
  author: string;
  createdAt: bigint;
  price: bigint;
  priceToken: string;
}

const ArticlePage: NextPage = () => {
  const params = useParams();
  const id = BigInt(params.id as string);
  const { address, isConnected } = useAccount();
  const { payForArticle, isPending } = useEthPayment();

  // Get article data from contract
  const { data: meta, isLoading: metaLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [id],
  });

  const { data: cid, isLoading: cidLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [id],
  });

  // Check if user has already paid
  const { data: hasPaidData } = useHasPaid(id, address);

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewOnly, setShowPreviewOnly] = useState(true);

  // Parse meta - now has 5 elements: [author, createdAt, title, price, priceToken]
  const metaArray = meta as unknown as [string, bigint, string, bigint, string];
  const [author, createdAt, title, price, priceToken] = metaArray || ["", 0n, "", 0n, ETH_ADDRESS];

  useEffect(() => {
    async function loadContent() {
      if (!cid) return;

      setContentLoading(true);
      setError(null);

      try {
        const metadata = await fetchFromIPFS(cid);

        const priceValue = (price as bigint) || 0n;
        const isFree = priceValue === 0n;

        setArticle({
          title: (title as string) || "",
          content: metadata.content,
          preview: metadata.preview || (metadata.content ? metadata.content.slice(0, 200) : ""),
          author: (author as string) || "",
          createdAt: (createdAt as bigint) || 0n,
          price: (price as bigint) || 0n,
          priceToken: (priceToken as string) || ETH_ADDRESS,
        });

        // Show full content for free articles, or if user has paid
        if (isFree) {
          setShowPreviewOnly(false);
        } else if (hasPaidData) {
          setShowPreviewOnly(false);
        } else {
          setShowPreviewOnly(true);
        }
      } catch (err) {
        console.error("Error loading article:", err);
        setError("Failed to load article content");
      } finally {
        setContentLoading(false);
      }
    }

    if (cid && meta) {
      loadContent();
    }
  }, [cid, meta, price, hasPaidData]);

  const handlePayment = async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet to unlock");
      return;
    }

    setError(null);

    try {
      const result = await payForArticle(id, price, priceToken);

      if (result.success) {
        // Transaction successful, reveal content
        setShowPreviewOnly(false);
      } else {
        setError(result.error || "Payment failed. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("Payment failed. Please try again.");
    }
  };

  const isLoading = metaLoading || cidLoading || contentLoading;
  const isFree = !article?.price || article.price === 0n;
  const hasUserPaid = hasPaidData === true;
  const showPaywall = article && !isFree && !hasUserPaid && showPreviewOnly;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!meta || !cid) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Article Not Found</h2>
        <p className="text-base-content/60 mt-2">This article does not exist.</p>
        <Link href="/" className="btn btn-primary mt-4">
          Go Home
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(Number(createdAt || 0n) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatPrice = (price: bigint, token: string) => {
    if (price === 0n) return "Free";
    if (token === ETH_ADDRESS || token === "0x0000000000000000000000000000000000000000") {
      return `${Number(price) / 1e18} ETH`;
    }
    return `${Number(price) / 1e6} USDC`;
  };

  const isEthPayment = priceToken === ETH_ADDRESS || priceToken === "0x0000000000000000000000000000000000000000";

  return (
    <article className="max-w-3xl mx-auto">
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="flex items-center text-base-content/60">
          <Link href={`/author/${author}`} className="font-mono hover:text-primary transition-colors">
            {String(author).slice(0, 6)}...{String(author).slice(-4)}
          </Link>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
          {article && article.price > 0n && (
            <>
              <span className="mx-2">•</span>
              <span className="badge badge-primary">{formatPrice(article.price, article.priceToken)}</span>
            </>
          )}
        </div>
      </header>

      {/* Content Section */}
      {showPaywall ? (
        <div className="relative">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{article.preview}</ReactMarkdown>
          </div>

          {/* Paywall Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-base-100 to-transparent pointer-events-none"></div>

          <div className="bg-base-200 rounded-lg p-6 text-center mt-4">
            <h3 className="text-xl font-bold mb-2">🔒 Paid Article</h3>
            <p className="mb-4">
              This article costs <strong>{formatPrice(article.price, article.priceToken)}</strong> to read
            </p>

            {!isConnected ? (
              <p className="text-base-content/60">Connect your wallet to unlock</p>
            ) : (
              <button onClick={handlePayment} className="btn btn-primary" disabled={isPending}>
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {isEthPayment ? "Confirming ETH Payment..." : "Confirming USDC Payment..."}
                  </>
                ) : (
                  `Unlock for ${formatPrice(article.price, article.priceToken)}`
                )}
              </button>
            )}

            {error && <p className="text-error text-sm mt-2">{error}</p>}

            <p className="text-xs text-base-content/40 mt-2">Payment goes directly to the author</p>
          </div>
        </div>
      ) : (
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown>{article?.content || ""}</ReactMarkdown>
        </div>
      )}

      <footer className="mt-12 pt-8 border-t border-base-content/20">
        <div className="flex items-center justify-between">
          <Link href="/" className="btn btn-ghost btn-sm">
            ← Back to Articles
          </Link>
          <div className="text-sm text-base-content/40">Article NFT ID: #{id.toString()}</div>
        </div>
      </footer>
    </article>
  );
};

export default ArticlePage;
