"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { Article } from "~~/hooks/useArticles";

// Single article card - fetches its own data
function ArticleCardItem({ id }: { id: bigint }) {
  const { data: meta, error: metaError } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [id],
  });

  const { data: cid, error: cidError } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [id],
  });

  // Debug: Show errors
  if (metaError || cidError) {
    return (
      <div className="card bg-base-100 shadow-md border border-error">
        <div className="card-body">
          <p className="text-error">Error loading article #{id.toString()}</p>
          <p className="text-xs text-error/70">{metaError?.message || cidError?.message}</p>
        </div>
      </div>
    );
  }

  if (!meta || !cid) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="skeleton h-6 w-3/4"></div>
          <div className="skeleton h-4 w-1/2 mt-2"></div>
        </div>
      </div>
    );
  }

  // meta is tuple [author, createdAt, title]
  const [author, createdAt, title] = meta;

  const article: Article = {
    id,
    author: author as string,
    createdAt: createdAt as bigint,
    title: title as string,
    cid,
  };

  const formattedDate = new Date(Number(article.createdAt) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <Link href={`/article/${article.id}`} className="card-title text-lg hover:text-primary transition-colors">
          {article.title}
        </Link>
        <div className="flex items-center text-sm text-base-content/60 mt-2">
          <Link href={`/author/${article.author}`} className="flex items-center gap-1 hover:text-primary">
            {article.author.slice(0, 6)}...{article.author.slice(-4)}
          </Link>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
        </div>
        <div className="card-actions justify-end mt-4">
          <Link href={`/article/${article.id}`} className="btn btn-primary btn-sm">
            Read More
          </Link>
        </div>
      </div>
    </div>
  );
}

const Home: NextPage = () => {
  const {
    data: articleCount,
    isLoading: countLoading,
    refetch,
  } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Force refetch when component mounts

  useEffect(() => {
    if (mounted) {
      refetch();
    }
  }, [mounted]);

  const count = articleCount ? Number(articleCount) : 0;

  if (!mounted || countLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Paper</h1>
          <p className="text-base-content/60 mt-2">Decentralized publishing on the blockchain</p>
        </div>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Paper</h1>
        <p className="text-base-content/60 mt-2">Decentralized publishing on the blockchain</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Latest Articles</h2>
        {count === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/60 text-lg">No articles yet.</p>
            <p className="text-base-content/40 mt-2">Be the first to publish an article!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }, (_, i) => BigInt(count - 1 - i)).map(id => (
              <ArticleCardItem key={id.toString()} id={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
