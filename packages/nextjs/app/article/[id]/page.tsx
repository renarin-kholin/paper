"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { fetchFromIPFS } from "~~/lib/ipfs";

interface ArticleData {
  title: string;
  content: string;
  author: string;
  createdAt: bigint;
}

const ArticlePage: NextPage = () => {
  const params = useParams();
  const id = BigInt(params.id as string);

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

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      if (!cid) return;

      setContentLoading(true);
      setError(null);

      try {
        // meta is tuple [author, createdAt, title]
        const [author, createdAt, title] = meta || [];
        const metadata = await fetchFromIPFS(cid);
        setArticle({
          title: title as string || "",
          content: metadata.content,
          author: author as string || "",
          createdAt: createdAt as bigint || 0n,
        });
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
  }, [cid, meta]);

  const isLoading = metaLoading || cidLoading || contentLoading;

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

  // meta is tuple [author, createdAt, title]
  const [author, createdAt, title] = meta || [];
  const formattedDate = new Date(Number(createdAt) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          <Link
            href={`/author/${author}`}
            className="font-mono hover:text-primary transition-colors"
          >
            {String(author).slice(0, 6)}...{String(author).slice(-4)}
          </Link>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
        </div>
      </header>

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown>{article?.content || ""}</ReactMarkdown>
      </div>

      <footer className="mt-12 pt-8 border-t border-base-content/20">
        <div className="flex items-center justify-between">
          <Link href="/" className="btn btn-ghost btn-sm">
            ← Back to Articles
          </Link>
          <div className="text-sm text-base-content/40">
            Article NFT ID: #{id.toString()}
          </div>
        </div>
      </footer>
    </article>
  );
};

export default ArticlePage;
