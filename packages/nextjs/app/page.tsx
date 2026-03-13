"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookmarkPlus, MoreHorizontal, Sparkles, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getCurrentUser, getPosts, getUser } from "~~/lib/store";

export default function Home() {
  const posts = getPosts();
  const currentUser = getCurrentUser();
  const [feedTab, setFeedTab] = useState<"for-you" | "following">("for-you");

  const visiblePosts = useMemo(() => {
    if (feedTab === "following") {
      return posts.filter(post => post.authorId === currentUser.id);
    }
    return posts;
  }, [currentUser.id, feedTab, posts]);

  return (
    <div className="flex flex-col lg:flex-row w-full page-fade-in">
      {/* Main Feed */}
      <div className="flex-1 max-w-[680px] px-8 lg:pr-12 py-6 sm:py-8">
        <div className="border-b border-stone-200 mb-8 flex gap-8">
          <button
            className={`pb-4 text-sm font-medium ${feedTab === "for-you" ? "border-b border-stone-900 text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
            onClick={() => setFeedTab("for-you")}
            type="button"
          >
            For you
          </button>
          <button
            className={`pb-4 text-sm font-medium ${feedTab === "following" ? "border-b border-stone-900 text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
            onClick={() => setFeedTab("following")}
            type="button"
          >
            Following
          </button>
        </div>

        <div className="space-y-10">
          {visiblePosts.map(post => {
            const author = getUser(post.authorId);
            return (
              <article key={post.id} className="group flex gap-4 sm:gap-6 items-start page-fade-in">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {author?.avatarUrl && (
                      <Image
                        src={author.avatarUrl}
                        alt={author.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="text-sm font-medium text-stone-900">{author?.name}</span>
                  </div>
                  <Link href={`/post/${post.id}`} className="block mb-2 rounded-md focus-visible:outline-none">
                    <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-1 group-hover:text-stone-700 transition-colors font-serif leading-snug">
                      {post.title}
                    </h2>
                    <div className="text-stone-500 line-clamp-2 leading-relaxed text-sm md:text-base hidden sm:block prose-sm *:m-0">
                      <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                      {post.isPaywalled && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                      {post.adState === "active" && (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                      )}
                      <span>
                        {formatDistanceToNow(new Date(post.createdAt), {
                          addSuffix: false,
                        }).replace("about ", "")}
                      </span>
                      <span>·</span>
                      <span>4 min read</span>
                      {post.adState !== "disabled" && (
                        <>
                          <span>·</span>
                          <span className="bg-stone-100 px-2 py-0.5 rounded-full text-stone-600">
                            {post.adState === "active" ? "Sponsored" : `$${post.adPrice}/day`}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-stone-400">
                      <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="Bookmark post">
                        <BookmarkPlus className="w-5 h-5" />
                      </button>
                      <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="More options">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Thumbnail Placeholder */}
                <div className="w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden lift-on-hover">
                  <Image
                    src={`https://picsum.photos/seed/${post.id}/300/200`}
                    alt={post.title}
                    width={152}
                    height={112}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </article>
            );
          })}

          {visiblePosts.length === 0 && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center text-stone-500">
              No posts in this tab yet.
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden lg:block w-[320px] py-8 border-l border-stone-100 pl-8">
        <div className="sticky top-24 space-y-10">
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-4">Staff Picks</h3>
            <div className="space-y-4">
              {posts.slice(0, 3).map(post => {
                const author = getUser(post.authorId);
                return (
                  <div key={`staff-${post.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {author?.avatarUrl && (
                        <Image
                          src={author.avatarUrl}
                          alt={author.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-xs font-medium text-stone-900">{author?.name}</span>
                    </div>
                    <Link href={`/post/${post.id}`}>
                      <h4 className="text-sm font-bold text-stone-900 hover:text-stone-600 transition-colors font-serif leading-snug">
                        {post.title}
                      </h4>
                    </Link>
                  </div>
                );
              })}
            </div>
            <button className="text-sm text-green-600 hover:text-green-700 mt-4 active:scale-95" type="button">
              See the full list
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-900 mb-4">Recommended topics</h3>
            <div className="flex flex-wrap gap-2">
              {["Technology", "Web3", "Writing", "Design", "Privacy", "AI", "Crypto"].map(topic => (
                <button
                  key={topic}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 transition-colors rounded-full text-sm text-stone-900 active:scale-95"
                  type="button"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
