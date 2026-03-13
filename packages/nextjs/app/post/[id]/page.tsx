"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { type ArticleMetadata, ETH_ADDRESS, fetchFromIPFS } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

export default function PostPage() {
  const params = useParams();
  const tokenId = BigInt(params.id as string);
  const { address } = useAccount();

  const [content, setContent] = useState<ArticleMetadata | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

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
    args: address ? ([tokenId, address] as any) : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, isPending: isUnlocking } = useScaffoldWriteContract({ contractName: "Paper" });

  useEffect(() => {
    if (!cid) return;

    let active = true;
    setContentError(null);

    fetchFromIPFS(cid)
      .then(result => {
        if (active) setContent(result);
      })
      .catch(error => {
        if (!active) return;
        setContentError(error instanceof Error ? error.message : "Unable to load content");
      });

    return () => {
      active = false;
    };
  }, [cid]);

  const [author, createdAt, title, price, priceToken] = useMemo(() => {
    return (meta || ["", 0n, "", 0n, ETH_ADDRESS]) as ArticleMetaTuple;
  }, [meta]);

  const isAuthor = Boolean(address && author && address.toLowerCase() === author.toLowerCase());
  const isPaid = Boolean(hasPaid);
  const showPaywall = price > 0n && !isAuthor && !isPaid;
  const canPayWithEth = priceToken.toLowerCase() === ETH_ADDRESS.toLowerCase();

  const handleUnlock = async () => {
    if (!canPayWithEth) return;

    try {
      await writeContractAsync({
        functionName: "payArticle",
        args: [tokenId],
        value: price,
      });
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

  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12 page-fade-in">
      <header className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-8 leading-tight">{title}</h1>

        <div className="flex items-center gap-4 pb-8 border-b border-stone-100">
          <div>
            <div className="font-medium text-stone-900">
              {author.slice(0, 6)}...{author.slice(-4)}
            </div>
            <div className="text-sm text-stone-500 flex items-center gap-2">
              <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
              <span>·</span>
              <span>4 min read</span>
            </div>
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
                disabled={isUnlocking || !canPayWithEth}
                className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 text-lg active:scale-95"
                type="button"
              >
                {isUnlocking
                  ? "Processing..."
                  : canPayWithEth
                    ? `Unlock for ${price.toString()} wei`
                    : "Unsupported token"}
              </button>
            </div>
          </>
        ) : (
          <ReactMarkdown>{articleBody || "Content could not be loaded."}</ReactMarkdown>
        )}
      </div>

      {contentError && <p className="text-sm text-red-600">{contentError}</p>}
    </article>
  );
}
