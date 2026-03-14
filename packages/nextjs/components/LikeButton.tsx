"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface LikeButtonProps {
  articleId: bigint;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({ articleId, className = "", showCount = true }: LikeButtonProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastAction, setLastAction] = useState<"like" | "unlike" | null>(null);

  const { data: likeCount } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "likeCount" as any,
    args: [articleId] as any,
  });

  const { data: hasLiked, refetch: refetchHasLiked } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "hasLiked" as any,
    args: connectedAddress && articleId ? ([articleId, connectedAddress] as any) : undefined,
    query: { enabled: Boolean(connectedAddress && articleId) },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Social" });

  const optimisticLiked = lastAction === "like" ? true : lastAction === "unlike" ? false : undefined;
  const isLiked = optimisticLiked !== undefined ? optimisticLiked : Boolean(hasLiked);

  useEffect(() => {
    if (lastAction) {
      refetchHasLiked();
    }
  }, [lastAction, refetchHasLiked]);

  const handleClick = async () => {
    if (!isConnected) {
      router.push("/signup");
      return;
    }

    try {
      setIsAnimating(true);
      if (isLiked) {
        setLastAction("unlike");
        await writeContractAsync({
          functionName: "unlikeArticle" as any,
          args: [articleId] as any,
        });
        setLastAction(null);
      } else {
        setLastAction("like");
        await writeContractAsync({
          functionName: "likeArticle" as any,
          args: [articleId] as any,
        });
        setLastAction(null);
      }
    } catch (err: any) {
      console.error("Like action failed:", err);
      setLastAction(null);
      if (err?.message?.includes("already liked")) {
        setLastAction("like");
      } else if (err?.message?.includes("not liked")) {
        setLastAction("unlike");
      }
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const count = likeCount ? Number(likeCount) : 0;
  const displayCount = lastAction === "like" ? count + 1 : lastAction === "unlike" ? count - 1 : count;

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`
        flex items-center gap-1.5 transition-all active:scale-95
        ${isLiked ? "text-red-500" : "text-stone-400 hover:text-red-500"}
        ${isAnimating ? "scale-125" : ""}
        ${className}
      `}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <Heart className={`w-5 h-5 transition-all ${isLiked ? "fill-current" : ""} ${isAnimating ? "scale-125" : ""}`} />
      {showCount && displayCount > 0 && <span className="text-sm font-medium">{displayCount}</span>}
    </button>
  );
}
