"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, Info, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getCurrentUser, getPost, getUser, unlockPost, updatePost } from "~~/lib/store";

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState(() => getPost(postId));
  const author = post ? getUser(post.authorId) : null;
  const currentUser = getCurrentUser();
  const [hasUnlocked, setHasUnlocked] = useState(() => currentUser.unlockedPosts?.includes(postId));

  const [isSponsoring, setIsSponsoring] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!post || !author) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-stone-500">Post not found</div>;
  }

  const isAuthor = currentUser.id === post.authorId;
  const showPaywall = post.isPaywalled && !isAuthor && !hasUnlocked;

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      const success = unlockPost(currentUser.id, post.id, post.accessPrice || 0);
      if (success) {
        setHasUnlocked(true);
      } else {
        alert("Insufficient balance to unlock this post.");
        setIsUnlocking(false);
        return;
      }
      setIsUnlocking(false);
    }, 1000);
  };

  const handleSponsor = () => {
    setIsSponsoring(true);
    // Simulate payment and ad placement
    setTimeout(() => {
      updatePost(postId, {
        adState: "active",
        activeAd: {
          id: `ad-${Date.now()}`,
          title: "Your Ad Here",
          description: "This is a sponsored message placed by you.",
          url: "https://example.com",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day
        },
      });
      setPost(getPost(postId));
      setIsSponsoring(false);
    }, 1500);
  };

  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12 page-fade-in">
      <header className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-8 leading-tight">{post.title}</h1>

        <div className="flex items-center gap-4 pb-8 border-b border-stone-100">
          {author.avatarUrl && (
            <Image
              src={author.avatarUrl}
              alt={author.name}
              width={48}
              height={48}
              className="rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <div className="font-medium text-stone-900">{author.name}</div>
            <div className="text-sm text-stone-500 flex items-center gap-2">
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <span>·</span>
              <span>4 min read</span>
            </div>
          </div>
        </div>
      </header>

      <div className="prose prose-stone prose-base sm:prose-lg max-w-none mb-16 font-serif leading-relaxed text-stone-800 relative">
        {showPaywall ? (
          <>
            <div className="h-64 overflow-hidden relative">
              <ReactMarkdown>{post.content}</ReactMarkdown>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border border-stone-200 rounded-2xl shadow-lg text-center z-10 transform translate-y-1/2">
              <div className="w-12 h-12 bg-stone-100 text-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2 font-serif">Unlock this story</h3>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">
                Support {author.name} directly to read the full story and get access to all their premium content.
              </p>
              <button
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 text-lg active:scale-95"
                type="button"
              >
                {isUnlocking ? "Processing..." : `Unlock for $${post.accessPrice?.toFixed(2)}`}
              </button>
            </div>
          </>
        ) : (
          <ReactMarkdown>{post.content}</ReactMarkdown>
        )}
      </div>

      {!showPaywall && post.adState !== "disabled" && (
        <div className="mt-16 pt-8 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Sponsored Space</h3>
            <Info className="w-4 h-4 text-stone-300" />
          </div>

          {post.adState === "available" && (
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-stone-900 mb-2 font-serif">Sponsor this post</h4>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">
                Reach {author.name}&apos;s audience directly. Your ad will be displayed here for 24 hours.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleSponsor}
                  disabled={isSponsoring}
                  className="bg-stone-900 text-white px-6 py-2.5 rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  type="button"
                >
                  {isSponsoring ? "Processing..." : `Buy for $${post.adPrice}`}
                </button>
                <div className="text-xs text-stone-400 font-mono bg-stone-100 px-3 py-1.5 rounded-md">
                  API: POST /api/ads/{post.id}
                </div>
              </div>
            </div>
          )}

          {post.adState === "active" && post.activeAd && (
            <a
              href={post.activeAd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-white group"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                      Sponsored
                    </span>
                    <span className="text-xs text-stone-400">
                      Expires{" "}
                      {formatDistanceToNow(new Date(post.activeAd.expiresAt!), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-700 transition-colors font-serif">
                    {post.activeAd.title}
                  </h4>
                  <p className="text-stone-600">{post.activeAd.description}</p>
                </div>
                {post.activeAd.imageUrl && (
                  <div className="shrink-0">
                    <Image
                      src={post.activeAd.imageUrl}
                      alt={post.activeAd.title}
                      width={120}
                      height={80}
                      className="rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </a>
          )}
        </div>
      )}
    </article>
  );
}
