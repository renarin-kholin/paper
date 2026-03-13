"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { Article } from "~~/hooks/useArticles";

function ArticleCardItem({ id, authorFilter }: { id: bigint; authorFilter: string }) {
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

  // Filter by author
  if (String(author).toLowerCase() !== authorFilter.toLowerCase()) {
    return null;
  }

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

const AuthorPage: NextPage = () => {
  const params = useParams();
  const authorAddress = (params.address as string)?.toLowerCase() || "";

  const { data: articleCount, isLoading: countLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = articleCount ? Number(articleCount) : 0;

  if (!mounted || countLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Author Profile</h1>
          <div className="skeleton h-8 w-48 mx-auto"></div>
        </div>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  const articleIds = Array.from({ length: count }, (_, i) => BigInt(count - 1 - i));

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Author Profile</h1>
        <div className="font-mono bg-base-200 px-4 py-2 rounded-lg inline-block">
          {authorAddress.slice(0, 6)}...{authorAddress.slice(-4)}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Articles
        </h2>
        
        {count === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/60 text-lg">No articles yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articleIds.map((id) => (
              <ArticleCardItem key={id.toString()} id={id} authorFilter={authorAddress} />
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="btn btn-ghost">
          ← Back to All Articles
        </Link>
      </div>
    </div>
  );
};

export default AuthorPage;
