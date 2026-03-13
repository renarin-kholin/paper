import React from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { Article } from "~~/hooks/useArticles";

interface ArticleCardProps {
  article: Article;
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <Link href={`/article/${article.id}`}>
          <h2 className="card-title text-lg hover:text-primary transition-colors">{article.title}</h2>
        </Link>
        <div className="flex items-center text-sm text-base-content/60 mt-2">
          <Link href={`/author/${article.author}`} className="flex items-center gap-1 hover:text-primary">
            <Address address={article.author} size="sm" />
          </Link>
          <span className="mx-2">•</span>
          <span>{formatDate(article.createdAt)}</span>
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
