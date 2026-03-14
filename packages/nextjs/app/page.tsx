"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { BookmarkPlus, MoreHorizontal, Star } from "lucide-react";
import { useAccount } from "wagmi";
import { LikeButton } from "~~/components/LikeButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculateReadTime, fetchFromIPFS } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

const toPreviewText = (raw?: string) => {
  if (!raw) return "";

  // Support markdown and html-like content, then collapse whitespace for stable line clamping.
  const noHtml = raw.replace(/<[^>]*>/g, " ");
  const noMarkdown = noHtml
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-\d.\s]+/gm, "")
    .replace(/[*_~]/g, "");

  return noMarkdown.replace(/\s+/g, " ").trim();
};

function PostCard({ id }: { id: bigint }) {
  const [preview, setPreview] = useState("");
  const [readTime, setReadTime] = useState<number | null>(null);

  const { data: meta } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [id],
  });

  const { data: cid } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [id],
  });

  useEffect(() => {
    if (!cid) return;

    let active = true;
    fetchFromIPFS(cid)
      .then(data => {
        if (!active) return;
        const normalizedPreview = toPreviewText(data.preview || data.description || data.content || "");
        setPreview(normalizedPreview.slice(0, 220));
        if (data.content) {
          setReadTime(calculateReadTime(data.content));
        }
      })
      .catch(() => {
        if (!active) return;
        setPreview("");
      });

    return () => {
      active = false;
    };
  }, [cid]);

  if (!meta || !cid) {
    return (
      <article className="group flex gap-4 sm:gap-6 items-start page-fade-in">
        <div className="flex-1 min-w-0">
          <div className="h-6 w-3/4 mb-2 bg-stone-100 rounded" />
          <div className="h-4 w-full bg-stone-100 rounded" />
        </div>
      </article>
    );
  }

  const [author, createdAt, title, price] = meta as ArticleMetaTuple;
  const isPaywalled = price > 0n;

  return (
    <article className="group flex gap-4 sm:gap-6 items-start page-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={`/profile/${author}`}
            className="text-sm font-medium text-stone-900 hover:text-stone-600 transition-colors"
          >
            <Address address={author} onlyEnsOrAddress disableAddressLink size="base" />
          </Link>
        </div>
        <Link href={`/post/${id.toString()}`} className="block mb-2 rounded-md focus-visible:outline-none">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-1 group-hover:text-stone-700 transition-colors font-serif leading-snug">
            {title}
          </h2>
          <div className="text-stone-500 line-clamp-2 leading-relaxed text-sm md:text-base hidden sm:block prose-sm *:m-0">
            {preview || "Read this on-chain article."}
          </div>
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            {isPaywalled && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
            <LikeButton articleId={id} />
            <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
            <span>·</span>
            <span>{readTime ?? 1} min read</span>
          </div>
          <div className="flex items-center gap-3 text-stone-400">
            <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="Bookmark post">
              <BookmarkPlus className="w-5 h-5" />
            </button>
            <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="More options">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden lift-on-hover">
        <Image
          src={`https://picsum.photos/seed/${id.toString()}/300/200`}
          alt={title}
          width={152}
          height={112}
          className="w-full h-full object-cover"
        />
      </div>
    </article>
  );
}

export default function Home() {
  const { address } = useAccount();
  const [feedTab, setFeedTab] = useState<"for-you" | "following">("for-you");

  const { data: articleCount } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });

  const count = articleCount ? Number(articleCount) : 0;
  const postIds = Array.from({ length: count }, (_, i) => BigInt(count - 1 - i));

  const visibleIds = useMemo(() => {
    if (feedTab === "for-you" || !address) return postIds;
    return postIds;
  }, [address, feedTab, postIds]);

  return (
    <div className="flex flex-col lg:flex-row w-full page-fade-in">
      <div className="flex-1 max-w-[680px] px-8 lg:pr-12 py-6 sm:py-8">
        <div className="border-b border-stone-200 mb-8 flex gap-8">
          <button
            className={`pb-4 text-sm font-medium ${feedTab === "for-you" ? "border-b border-stone-900 text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
            onClick={() => setFeedTab("for-you")}
            type="button"
          >
            For you
          </button>
          <button
            className={`pb-4 text-sm font-medium ${feedTab === "following" ? "border-b border-stone-900 text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
            onClick={() => setFeedTab("following")}
            type="button"
          >
            Following
          </button>
        </div>

        <div className="space-y-10">
          {visibleIds.map(id => (
            <PostCard key={id.toString()} id={id} />
          ))}

          {visibleIds.length === 0 && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center text-stone-500">
              No posts yet. Be the first to publish!
            </div>
          )}
        </div>
      </div>

      <aside className="hidden lg:block w-[320px] py-8 border-l border-stone-100 pl-8">
        <div className="sticky top-24 space-y-10">
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-4">Recommended topics</h3>
            <div className="flex flex-wrap gap-2">
              {["Technology", "Web3", "Writing", "Design", "Privacy", "AI", "Crypto"].map(topic => (
                <button
                  key={topic}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 transition-colors rounded-full text-sm text-stone-900 active:scale-95"
                  type="button"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
