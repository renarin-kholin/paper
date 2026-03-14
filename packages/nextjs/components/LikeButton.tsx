"use client";

import { useState } from "react";
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

  const { data: likeCount } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "likeCount" as any,
    args: [articleId] as any,
  });

  const { data: hasLiked } = useScaffoldReadContract({
    contractName: "Social",
    functionName: "hasLiked" as any,
    args: connectedAddress && articleId ? ([articleId, connectedAddress] as any) : undefined,
    query: { enabled: Boolean(connectedAddress && articleId) },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Social" });

  const handleClick = async () => {
    if (!isConnected) {
      router.push("/signup");
      return;
    }

    try {
      setIsAnimating(true);
      if (hasLiked) {
        await writeContractAsync({
          functionName: "unlikeArticle" as any,
          args: [articleId] as any,
        });
      } else {
        await writeContractAsync({
          functionName: "likeArticle" as any,
          args: [articleId] as any,
        });
      }
    } catch (err) {
      console.error("Like action failed:", err);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const count = likeCount ? Number(likeCount) : 0;
  const isLiked = Boolean(hasLiked);

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
      {showCount && count > 0 && <span className="text-sm font-medium">{count}</span>}
    </button>
  );
}
