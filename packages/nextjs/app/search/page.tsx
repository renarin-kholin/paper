"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { Search as SearchIcon, Star } from "lucide-react";
import { getAddress, isAddress } from "viem";
import { useEnsAddress, useEnsName } from "wagmi";
import { BookmarkButton } from "~~/components/BookmarkButton";
import { LikeButton } from "~~/components/LikeButton";
import { SearchPageSkeleton } from "~~/components/LoadingStates";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculateReadTime, fetchFromIPFS, resolveIPFSUrl } from "~~/lib/ipfs";

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

function SearchResultCard({
  id,
  query,
  onMatchChange,
}: {
  id: bigint;
  query: string;
  onMatchChange: (id: bigint, isMatch: boolean) => void;
}) {
  const [preview, setPreview] = useState("");
  const [readTime, setReadTime] = useState<number | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

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
        setThumbnail(resolveIPFSUrl(data.image));
      })
      .catch(() => {
        if (!active) return;
        setPreview("");
        setThumbnail(null);
      });
    return () => {
      active = false;
    };
  }, [cid]);

  const [author, createdAt, title, price] = (meta || ["", 0n, "", 0n, ""]) as ArticleMetaTuple;
  const isPaywalled = price > 0n;
  const matchesQuery =
    Boolean(meta && cid) && (!query || `${title} ${preview} ${author}`.toLowerCase().includes(query));

  useEffect(() => {
    onMatchChange(id, matchesQuery);
  }, [id, matchesQuery, onMatchChange]);

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

  if (!matchesQuery) return null;

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
            <BookmarkButton articleId={id} />
          </div>
        </div>
      </div>
      <div className="w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden lift-on-hover">
        <Image
          src={thumbnail || `https://picsum.photos/seed/${id.toString()}/300/200`}
          alt={title}
          width={152}
          height={112}
          className="w-full h-full object-cover"
        />
      </div>
    </article>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase().trim();
  const isEnsQuery = query.endsWith(".eth");
  const addressQuery = isAddress(query) ? getAddress(query) : undefined;

  const { data: ensResolvedAddress } = useEnsAddress({
    name: isEnsQuery ? query : undefined,
    chainId: 1,
    query: { enabled: isEnsQuery },
  });

  const discoveredAddress = addressQuery || ensResolvedAddress || undefined;

  const { data: discoveredEnsName } = useEnsName({
    address: discoveredAddress,
    chainId: 1,
    query: { enabled: Boolean(discoveredAddress) },
  });

  const { data: articleCount } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });

  const count = articleCount ? Number(articleCount) : 0;
  const allPostIds = Array.from({ length: count }, (_, i) => BigInt(count - 1 - i));
  const [matchMap, setMatchMap] = useState<Record<string, boolean>>({});

  const handleMatchChange = (id: bigint, isMatch: boolean) => {
    setMatchMap(prev => {
      const key = id.toString();
      if (prev[key] === isMatch) return prev;
      return { ...prev, [key]: isMatch };
    });
  };

  const filteredCount = useMemo(() => {
    if (!query) return allPostIds.length;
    return allPostIds.filter(id => matchMap[id.toString()]).length;
  }, [allPostIds, matchMap, query]);

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
          {filteredCount} {filteredCount === 1 ? "result" : "results"}
        </p>
      </div>

      {discoveredAddress && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">User match</p>
          <Link
            href={`/profile/${discoveredEnsName || discoveredAddress}`}
            className="inline-flex items-center gap-2 text-stone-900 hover:text-stone-600"
          >
            <span className="font-medium">{discoveredEnsName || "ENS/Address profile"}</span>
            <Address address={discoveredAddress} onlyEnsOrAddress disableAddressLink size="base" />
          </Link>
        </div>
      )}

      {allPostIds.length > 0 && filteredCount > 0 ? (
        <div className="space-y-10">
          {allPostIds.map(id => (
            <SearchResultCard key={id.toString()} id={id} query={query} onMatchChange={handleMatchChange} />
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

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
