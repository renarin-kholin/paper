"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

interface FollowEvent {
  follower: string;
  followed: string;
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
}

interface UnfollowEvent {
  follower: string;
  followed: string;
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
}

export function useFollowingList() {
  const { address: connectedAddress } = useAccount();
  const [isLoading, setIsLoading] = useState(true);

  const { data: followedEvents } = useScaffoldEventHistory({
    contractName: "Social",
    eventName: "Followed",
    fromBlock: 0n,
    filters: connectedAddress ? { follower: connectedAddress } : undefined,
    enabled: !!connectedAddress,
  });

  const { data: unfollowedEvents } = useScaffoldEventHistory({
    contractName: "Social",
    eventName: "Unfollowed",
    fromBlock: 0n,
    filters: connectedAddress ? { follower: connectedAddress } : undefined,
    enabled: !!connectedAddress,
  });

  const followingSet = useMemo(() => {
    const set = new Set<string>();

    if (followedEvents) {
      for (const event of followedEvents as unknown as FollowEvent[]) {
        if (event.followed) {
          set.add(event.followed.toLowerCase());
        }
      }
    }

    if (unfollowedEvents) {
      for (const event of unfollowedEvents as unknown as UnfollowEvent[]) {
        if (event.followed) {
          set.delete(event.followed.toLowerCase());
        }
      }
    }

    return set;
  }, [followedEvents, unfollowedEvents]);

  useEffect(() => {
    if (followedEvents !== undefined || unfollowedEvents !== undefined) {
      setIsLoading(false);
    }
  }, [followedEvents, unfollowedEvents]);

  return {
    followingSet,
    isLoading,
    followingCount: followingSet.size,
  };
}

export function useFollowerCount(address?: string) {
  const { data: count } = useScaffoldEventHistory({
    contractName: "Social",
    eventName: "Followed",
    fromBlock: 0n,
    filters: address ? { followed: address } : undefined,
    enabled: !!address,
  });

  return useMemo(() => {
    if (!count) return 0;
    return (count as unknown as FollowEvent[]).length;
  }, [count]);
}

export function useFollowingCount(address?: string) {
  const { data: events } = useScaffoldEventHistory({
    contractName: "Social",
    eventName: "Followed",
    fromBlock: 0n,
    filters: address ? { follower: address } : undefined,
    enabled: !!address,
  });

  return useMemo(() => {
    if (!events) return 0;
    return (events as unknown as FollowEvent[]).length;
  }, [events]);
}
