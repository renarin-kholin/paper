"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookmarkPlus, Search as SearchIcon, Sparkles, Star } from "lucide-react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { fetchFromIPFS } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

const toPreviewText = (raw?: string) => {
  if (!raw) return "";
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

function SearchResultCard({ id }: { id: bigint }) {
  const [preview, setPreview] = useState("");

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
      <article className="group flex gap-4 sm:gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="h-6 w-3/4 mb-2 bg-stone-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-stone-100 rounded animate-pulse" />
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
            {author.slice(0, 6)}...{author.slice(-4)}
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
            {isPaywalled && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
            <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
            <span>·</span>
            <span>4 min read</span>
          </div>
          <div className="flex items-center gap-3 text-stone-400">
            <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="Bookmark post">
              <BookmarkPlus className="w-5 h-5" />
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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase().trim();

  const { data: articleCount } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });

  const count = articleCount ? Number(articleCount) : 0;
  const allPostIds = Array.from({ length: count }, (_, i) => BigInt(count - 1 - i));

  const filteredIds = useMemo(() => {
    if (!query) return allPostIds;
    return allPostIds;
  }, [allPostIds, query]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 page-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 text-stone-600 mb-2">
          <SearchIcon className="w-5 h-5" />
          <span>Search results for</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-900">
          {searchParams.get("q") ? `"${searchParams.get("q")}"` : "Search"}
        </h1>
        <p className="text-stone-500 mt-1">
          {filteredIds.length} {filteredIds.length === 1 ? "result" : "results"}
        </p>
      </div>

      {filteredIds.length > 0 ? (
        <div className="space-y-10">
          {filteredIds.map(id => (
            <SearchResultCard key={id.toString()} id={id} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
          <SearchIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">No articles found</h3>
          <p className="text-stone-500">Try different keywords or check your spelling.</p>
          <Link href="/" className="inline-block mt-4 text-stone-900 hover:underline">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
