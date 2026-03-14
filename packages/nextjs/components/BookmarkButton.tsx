"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type BookmarkButtonProps = {
  articleId: bigint;
  className?: string;
};

export function BookmarkButton({ articleId, className = "" }: BookmarkButtonProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [bookmarked, setBookmarked] = useState(false);

  const { data: hasBookmarked, refetch: refetchHasBookmarked } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "hasBookmarked",
    args: [address, articleId],
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Social" });

  useEffect(() => {
    setBookmarked(Boolean(hasBookmarked));
  }, [hasBookmarked]);

  const onToggleBookmark = async () => {
    if (!address) {
      router.push("/signup");
      return;
    }

    try {
      if (bookmarked) {
        setBookmarked(false);
        await writeContractAsync({
          functionName: "unbookmarkArticle",
          args: [articleId],
        });
      } else {
        setBookmarked(true);
        await writeContractAsync({
          functionName: "bookmarkArticle",
          args: [articleId],
        });
      }
      await refetchHasBookmarked();
    } catch (error) {
      console.error("Bookmark action failed", error);
      setBookmarked(Boolean(hasBookmarked));
    }
  };

  return (
    <button
      className={`hover:text-stone-900 active:scale-95 transition-colors ${bookmarked ? "text-stone-900" : "text-stone-400"} ${className}`}
      type="button"
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark post"}
      onClick={onToggleBookmark}
      disabled={isPending}
    >
      {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
    </button>
  );
}
