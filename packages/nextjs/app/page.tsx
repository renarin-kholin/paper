import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookmarkPlus, MoreHorizontal, Sparkles, Star } from "lucide-react";
import { getPosts, getUser } from "~~/lib/store";

export default function Home() {
  const posts = getPosts();

  return (
    <div className="flex flex-col lg:flex-row w-full">
      {/* Main Feed */}
      <div className="flex-1 max-w-[680px] lg:pr-12 py-8">
        <div className="border-b border-stone-200 mb-8 flex gap-8">
          <button className="pb-4 border-b border-stone-900 text-stone-900 text-sm font-medium">For you</button>
          <button className="pb-4 text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors">
            Following
          </button>
        </div>

        <div className="space-y-10">
          {posts.map(post => {
            const author = getUser(post.authorId);
            return (
              <article key={post.id} className="group flex gap-6 items-start">
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
                  <Link href={`/post/${post.id}`} className="block mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-1 group-hover:text-stone-700 transition-colors font-serif leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-stone-500 line-clamp-2 leading-relaxed text-sm md:text-base hidden sm:block">
                      {post.content.replace(/[#*`]/g, "")}
                    </p>
                  </Link>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-stone-500">
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
                      <button className="hover:text-stone-900 transition-colors">
                        <BookmarkPlus className="w-5 h-5" />
                      </button>
                      <button className="hover:text-stone-900 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Thumbnail Placeholder */}
                <div className="w-[112px] h-[112px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden">
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
            <button className="text-sm text-green-600 hover:text-green-700 mt-4">See the full list</button>
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-900 mb-4">Recommended topics</h3>
            <div className="flex flex-wrap gap-2">
              {["Technology", "Web3", "Writing", "Design", "Privacy", "AI", "Crypto"].map(topic => (
                <button
                  key={topic}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 transition-colors rounded-full text-sm text-stone-900"
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
