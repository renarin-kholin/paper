import { useEffect, useState } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { fetchFromIPFS } from "~~/lib/ipfs";

export interface Article {
  id: bigint;
  author: string;
  createdAt: bigint;
  title: string;
  cid: string;
}

export interface ArticleWithContent extends Article {
  content: string;
}

/**
 * Get article metadata for a single article by ID
 */
export function useArticleMeta(id: bigint) {
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
    return null;
  }

  // meta is tuple [author, createdAt, title]
  const [author, createdAt, title] = meta;

  return {
    id,
    author: author as string,
    createdAt: createdAt as bigint,
    title: title as string,
    cid,
  };
}

/**
 * Get total article count
 */
export function useArticleCount() {
  return useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });
}

/**
 * Get article with full content from IPFS
 */
export function useArticle(id: bigint) {
  const articleMeta = useArticleMeta(id);
  const [content, setContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      if (!articleMeta?.cid) {
        return;
      }

      setIsLoadingContent(true);
      setError(null);

      try {
        const metadata = await fetchFromIPFS(articleMeta.cid);
        setContent(metadata.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setIsLoadingContent(false);
      }
    }

    loadContent();
  }, [articleMeta?.cid]);

  if (!articleMeta) {
    return {
      article: null,
      isLoading: true,
      error: null,
    };
  }

  return {
    article: {
      ...articleMeta,
      content,
    } as ArticleWithContent,
    isLoading: isLoadingContent,
    error,
  };
}
