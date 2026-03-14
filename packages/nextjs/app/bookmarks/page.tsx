"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { BookmarkX, Star } from "lucide-react";
import { useAccount } from "wagmi";
import { BookmarkButton } from "~~/components/BookmarkButton";
import { LikeButton } from "~~/components/LikeButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculateReadTime, fetchFromIPFS, resolveIPFSUrl } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

function BookmarkedPostCard({ id }: { id: bigint }) {
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
        const plainPreview = (data.preview || data.description || data.content || "").replace(/<[^>]*>/g, " ").trim();
        setPreview(plainPreview.slice(0, 220));
        setReadTime(data.content ? calculateReadTime(data.content) : 1);
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

  if (!meta || !cid) {
    return <div className="h-24 rounded-xl bg-stone-100 animate-pulse" />;
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
          <BookmarkButton articleId={id} />
        </div>
      </div>
      <div className="w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden lift-on-hover">
        {thumbnail ? (
          <Image src={thumbnail} alt={title} width={152} height={112} className="w-full h-full object-cover" />
        ) : (
          <Image
            src={`https://picsum.photos/seed/${id.toString()}/300/200`}
            alt={title}
            width={152}
            height={112}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </article>
  );
}

export default function BookmarksPage() {
  const { address } = useAccount();
  const { data: bookmarkedIdsData, isLoading } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "getBookmarks",
    args: [address],
    query: { enabled: Boolean(address) },
  });

  const uniqueIds = useMemo(() => {
    const bookmarkedIds = (bookmarkedIdsData as bigint[] | undefined) || [];
    const seen = new Set<string>();
    return bookmarkedIds.filter(id => {
      const key = id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bookmarkedIdsData]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 page-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Bookmarks</h1>
        <p className="text-stone-500 mt-1">{uniqueIds.length} saved stories</p>
      </div>

      {!address ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-10 text-center text-stone-500">
          Connect your wallet to view on-chain bookmarks.
        </div>
      ) : isLoading ? (
        <div className="h-24 rounded-xl bg-stone-100 animate-pulse" />
      ) : uniqueIds.length > 0 ? (
        <div className="space-y-10">
          {uniqueIds.map(id => (
            <BookmarkedPostCard key={id.toString()} id={id} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-10 text-center text-stone-500">
          <BookmarkX className="mx-auto mb-4 w-10 h-10 text-stone-300" />
          <p>No bookmarked stories yet.</p>
        </div>
      )}
    </div>
  );
}
