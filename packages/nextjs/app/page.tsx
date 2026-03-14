"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { ArrowRight, Star, Users } from "lucide-react";
import { useReadContracts } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculateReadTime, fetchFromIPFS, resolveIPFSUrl } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

type LoadedArticle = {
  id: bigint;
  author: string;
  createdAt: bigint;
  title: string;
  price: bigint;
  preview: string;
  readTime: number;
  image: string | null;
};

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

function useArticleData(articleId?: bigint) {
  const [article, setArticle] = useState<LoadedArticle | null>(null);

  const hasId = articleId !== undefined;

  const { data: meta } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleMeta",
    args: [articleId ?? 0n],
    query: { enabled: hasId },
  });

  const { data: cid } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticleCID",
    args: [articleId ?? 0n],
    query: { enabled: hasId },
  });

  useEffect(() => {
    if (articleId === undefined || !meta || !cid) {
      setArticle(null);
      return;
    }

    const [author, createdAt, title, price] = meta as ArticleMetaTuple;
    let active = true;

    fetchFromIPFS(cid)
      .then(data => {
        if (!active) return;

        const normalizedPreview = toPreviewText(data.preview || data.description || data.content || "");

        setArticle({
          id: articleId,
          author,
          createdAt,
          title,
          price,
          preview: normalizedPreview.slice(0, 220),
          readTime: data.content ? calculateReadTime(data.content) : 1,
          image: resolveIPFSUrl(data.image),
        });
      })
      .catch(() => {
        if (!active) return;

        setArticle({
          id: articleId,
          author,
          createdAt,
          title,
          price,
          preview: "Read this on-chain article on Paper.",
          readTime: 1,
          image: null,
        });
      });

    return () => {
      active = false;
    };
  }, [articleId, cid, meta]);

  return article;
}

function FeaturedArticle({ articleId }: { articleId: bigint }) {
  const article = useArticleData(articleId);

  if (!article) {
    return (
      <article className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="h-5 w-28 rounded bg-stone-100" />
        <div className="mt-4 h-10 w-3/4 rounded bg-stone-100" />
        <div className="mt-3 h-4 w-full rounded bg-stone-100" />
        <div className="mt-2 h-4 w-5/6 rounded bg-stone-100" />
      </article>
    );
  }

  const publishedDate = new Date(Number(article.createdAt) * 1000).toLocaleDateString();
  const isPaywalled = article.price > 0n;

  return (
    <article className="grid overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
      <div className="p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Featured article</p>
        <h2 className="mt-3 font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">{article.title}</h2>
        <p className="mt-4 text-base leading-relaxed text-stone-600">{article.preview}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <Address address={article.author} size="base" onlyEnsOrAddress disableAddressLink />
          <span>·</span>
          <span>{publishedDate}</span>
          <span>·</span>
          <span>{article.readTime} min read</span>
          {isPaywalled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              Members only
            </span>
          )}
        </div>

        <Link
          href={`/post/${article.id.toString()}`}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Read article
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative min-h-56 bg-stone-100 sm:min-h-72">
        <Image
          src={article.image || `https://picsum.photos/seed/article-${article.id.toString()}/900/700`}
          alt={article.title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
      </div>
    </article>
  );
}

export default function Home() {
  const { data: articleCount } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "articleCount",
  });
  const { data: paperContract } = useDeployedContractInfo({ contractName: "Paper" });

  const countBigInt = articleCount ?? 0n;
  const featuredId = countBigInt > 0n ? countBigInt - 1n : undefined;
  const countLabel = countBigInt.toString();

  const candidateAuthorIds = useMemo(() => {
    const ids: bigint[] = [];
    let pointer = countBigInt > 1n ? countBigInt - 2n : -1n;

    while (pointer >= 0n && ids.length < 12) {
      ids.push(pointer);
      pointer -= 1n;
    }

    return ids;
  }, [countBigInt]);

  const { data: candidateAuthorMetas, isLoading: isAuthorsLoading } = useReadContracts({
    contracts: paperContract
      ? candidateAuthorIds.map(id => ({
          address: paperContract.address,
          abi: paperContract.abi,
          functionName: "articleMeta",
          args: [id],
        }))
      : [],
    query: {
      enabled: Boolean(paperContract && candidateAuthorIds.length > 0),
    },
  });

  const suggestedAuthors = useMemo(() => {
    const uniqueAuthors: string[] = [];
    const seenAuthors = new Set<string>();

    for (const metaResult of candidateAuthorMetas ?? []) {
      const tuple = metaResult.result as ArticleMetaTuple | undefined;
      const author = tuple?.[0];
      if (!author) continue;

      const normalized = author.toLowerCase();
      if (seenAuthors.has(normalized)) continue;

      seenAuthors.add(normalized);
      uniqueAuthors.push(author);

      if (uniqueAuthors.length === 4) break;
    }

    return uniqueAuthors;
  }, [candidateAuthorMetas]);

  return (
    <div className="page-fade-in py-6 sm:py-8">
      <section className="rounded-[2rem] border border-stone-200 bg-stone-50 px-6 py-10 sm:px-10 sm:py-14">
        <div className="max-w-3xl border-l-4 border-stone-900 pl-5 sm:pl-6">
          <h1 className="mt-5 font-serif text-4xl leading-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Write articles.
            <span className="block text-stone-500">Own your audience and revenue.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Paper is a decentralized publishing platform for thoughtful long-form articles. Publish with verifiable
            ownership and monetize without platform lock-in.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600">
            {countLabel} article{countBigInt === 1n ? "" : "s"} published
          </p>
        </div>
      </section>

      {featuredId !== undefined ? (
        <section className="mt-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">Featured article</h2>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:bg-stone-800"
            >
              View more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-start">
            <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:sticky lg:top-24">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
                <Users className="h-4 w-4" />
                Suggested authors
              </p>
              <ul className="mt-3 space-y-2">
                {suggestedAuthors.length > 0 ? (
                  suggestedAuthors.map(author => (
                    <li
                      key={author}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                    >
                      <Link
                        href={`/profile/${author}`}
                        className="inline-flex max-w-full items-center hover:text-stone-900"
                      >
                        <Address address={author} onlyEnsOrAddress disableAddressLink size="base" />
                      </Link>
                    </li>
                  ))
                ) : isAuthorsLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <li
                      key={`author-skeleton-${idx}`}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2"
                    >
                      <div className="h-4 w-28 rounded bg-stone-100" />
                    </li>
                  ))
                ) : (
                  <li className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
                    More authors will appear as new articles are published.
                  </li>
                )}
              </ul>
            </aside>

            <FeaturedArticle articleId={featuredId} />
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-stone-200 bg-stone-50 p-10 text-center">
          <h2 className="font-serif text-3xl text-stone-900">No articles yet</h2>
          <p className="mt-3 text-stone-600">Be the first writer to publish an article on Paper.</p>
          <Link href="/write" className="btn btn-neutral rounded-full px-6 mt-6">
            Publish first article
          </Link>
        </section>
      )}
    </div>
  );
}
