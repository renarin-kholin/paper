"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface FollowButtonProps {
  targetAddress: string;
  className?: string;
}

export function FollowButton({ targetAddress, className = "" }: FollowButtonProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const [isHovering, setIsHovering] = useState(false);

  const { data: isFollowing } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "isFollowing" as any,
    args: connectedAddress && targetAddress ? ([connectedAddress, targetAddress] as any) : undefined,
    query: { enabled: Boolean(connectedAddress && targetAddress) },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Paper" });

  const isOwnProfile = connectedAddress?.toLowerCase() === targetAddress?.toLowerCase();

  const handleClick = async () => {
    if (!isConnected) {
      router.push("/signup");
      return;
    }

    try {
      if (isFollowing) {
        await writeContractAsync({
          functionName: "unfollow" as any,
          args: [targetAddress] as any,
        });
      } else {
        await writeContractAsync({
          functionName: "follow" as any,
          args: [targetAddress] as any,
        });
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    }
  };

  if (isOwnProfile) {
    return null;
  }

  const buttonText = isPending ? "..." : isHovering && isFollowing ? "Unfollow" : isFollowing ? "Following" : "Follow";

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        px-6 py-2.5 rounded-full font-medium transition-all
        ${
          isFollowing
            ? isHovering
              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              : "bg-stone-900 text-white hover:bg-stone-800"
            : "bg-stone-900 text-white hover:bg-stone-800"
        }
        disabled:opacity50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {buttonText}
    </button>
  );
}
