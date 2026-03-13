import React from "react";
import { ArticleCard } from "./ArticleCard";
import type { Article } from "~~/hooks/useArticles";

interface ArticleListProps {
  articles: Article[];
  isLoading?: boolean;
}

export function ArticleList({ articles, isLoading }: ArticleListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60 text-lg">No articles yet.</p>
        <p className="text-base-content/40 mt-2">Be the first to publish an article!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map(article => (
        <ArticleCard key={article.id.toString()} article={article} />
      ))}
    </div>
  );
}
