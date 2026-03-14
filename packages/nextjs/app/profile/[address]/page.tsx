"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookmarkPlus, Globe, Loader2, Star, Twitter, User, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { FollowButton } from "~~/components/FollowButton";
import { LikeButton } from "~~/components/LikeButton";
import { TipButton } from "~~/components/TipButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useFollowerCount, useFollowingCount } from "~~/hooks/scaffold-eth/useFollowingList";
import { UserProfile, calculateReadTime, fetchFromIPFS, fetchProfileFromIPFS, getIPFSGatewayUrl } from "~~/lib/ipfs";

type ArticleMetaTuple = [string, bigint, string, bigint, string];

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

function AuthorPostCard({ id }: { id: bigint }) {
  const [preview, setPreview] = useState("");
  const [readTime, setReadTime] = useState<number | null>(null);

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

  useEffect(() => {
    if (!cid) return;
    let active = true;
    fetchFromIPFS(cid)
      .then(data => {
        if (!active) return;
        const normalizedPreview = toPreviewText(data.preview || data.description || data.content || "");
        setPreview(normalizedPreview.slice(0, 220));
        if (data.content) {
          setReadTime(calculateReadTime(data.content));
        }
      })
      .catch(() => {
        if (!active) return;
        setPreview("");
      });
    return () => {
      active = false;
    };
  }, [cid]);

  if (!meta || !cid) {
    return (
      <article className="group flex gap-4 sm:gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="h-6 w-3/4 mb-2 bg-stone-100 rounded" />
          <div className="h-4 w-full bg-stone-100 rounded" />
        </div>
      </article>
    );
  }

  const [, , title, price] = meta as ArticleMetaTuple;
  const isPaywalled = price > 0n;

  return (
    <article className="group flex gap-4 sm:gap-6 items-start page-fade-in">
      <div className="flex-1 min-w-0">
        <Link href={`/post/${id.toString()}`} className="block mb-2 rounded-md focus-visible:outline-none">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-1 group-hover:text-stone-700 transition-colors font-serif leading-snug">
            {title}
          </h2>
          <div className="text-stone-500 line-clamp-2 leading-relaxed text-sm md:text-base hidden sm:block prose-sm *:m-0">
            {preview || "Read this on-chain article."}
          </div>
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            {isPaywalled && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
            <LikeButton articleId={id} />
            <span>{readTime ?? 1} min read</span>
          </div>
          <div className="flex items-center gap-3 text-stone-400">
            <button className="hover:text-stone-900 active:scale-95" type="button" aria-label="Bookmark post">
              <BookmarkPlus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="w-[100px] h-[96px] sm:w-[152px] sm:h-[112px] shrink-0 bg-stone-100 rounded-sm overflow-hidden lift-on-hover">
        <Image
          src={`https://picsum.photos/seed/${id.toString()}/300/200`}
          alt={title}
          width={152}
          height={112}
          className="w-full h-full object-cover"
        />
      </div>
    </article>
  );
}

function FollowStats({ address }: { address: string }) {
  const followerCount = useFollowerCount(address);
  const followingCount = useFollowingCount(address);

  return (
    <div className="flex items-center gap-4 text-sm text-stone-500">
      <div className="flex items-center gap-1">
        <Users className="w-4 h-4" />
        <span className="font-medium">{followerCount}</span>
        <span>Followers</span>
      </div>
      <span>·</span>
      <div className="flex items-center gap-1">
        <span className="font-medium">{followingCount}</span>
        <span>Following</span>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const address = params?.address as string;
  const { address: connectedAddress } = useAccount();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = connectedAddress?.toLowerCase() === address?.toLowerCase();

  const { data: profileCID, isLoading: isContractLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getUserProfileCID" as any,
    args: address ? ([address] as any) : undefined,
  });

  const { data: articleIdsData } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getArticlesByAuthor" as any,
    args: address ? ([address] as any) : undefined,
  });

  const articleIds = useMemo(() => {
    if (!articleIdsData) return [];
    const data = articleIdsData as unknown;
    if (!Array.isArray(data)) return [];
    return (data as bigint[]).reverse();
  }, [articleIdsData]);

  useEffect(() => {
    async function loadProfile() {
      if (!address || isContractLoading) {
        return;
      }

      try {
        if (profileCID) {
          const cid = profileCID as unknown as string;
          if (cid && cid.length > 0) {
            const profileData = await fetchProfileFromIPFS(cid);
            setProfile(profileData);
            if (profileData.avatar) {
              setAvatarPreview(getIPFSGatewayUrl(profileData.avatar));
            }
            if (profileData.coverImage) {
              setCoverPreview(getIPFSGatewayUrl(profileData.coverImage));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (address && !isContractLoading) {
      loadProfile();
    }
  }, [profileCID, address, isContractLoading]);

  if (!address) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-stone-500">Invalid address</p>
      </div>
    );
  }

  if (isContractLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const displayName = profile?.name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const displayBio = profile?.bio || "This author hasn't added a bio yet.";

  return (
    <div className="max-w-3xl mx-auto page-fade-in">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-gradient-to-r from-stone-200 to-stone-300 mb-16">
        {coverPreview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-rose-50" />
        )}
      </div>

      {/* Avatar */}
      <div className="relative -mt-20 mb-6 pl-4 md:pl-8">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-stone-100 border-4 border-white shadow-xl">
          {avatarPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-stone-100">
              <User className="w-12 h-12 text-stone-400" />
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-8 pb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">{displayName}</h1>
            <p className="text-stone-600 text-lg mb-3">{displayBio}</p>
            <FollowStats address={address} />
          </div>
          {!isOwnProfile && (
            <div className="flex items-center gap-2">
              <TipButton authorAddress={address} />
              <FollowButton targetAddress={address} />
            </div>
          )}
          {isOwnProfile && (
            <Link
              href="/profile"
              className="bg-stone-100 hover:bg-stone-200 text-stone-900 px-6 py-2.5 rounded-full font-medium transition-all"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {/* Social Links */}
        {(profile?.socialLinks?.twitter || profile?.socialLinks?.website) && (
          <div className="flex items-center gap-4 text-stone-500">
            {profile?.socialLinks?.twitter && (
              <a
                href={`https://twitter.com/${profile.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-stone-900 transition-colors"
              >
                <Twitter className="w-5 h-5" />
                <span>@{profile.socialLinks.twitter}</span>
              </a>
            )}
            {profile?.socialLinks?.website && (
              <a
                href={profile.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-stone-900 transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span>{profile.socialLinks.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Articles Section */}
      <div className="border-t border-stone-100 mt-8">
        <div className="px-4 md:px-8 py-6">
          <h2 className="text-xl font-bold text-stone-900 mb-6">
            {articleIds.length} {articleIds.length === 1 ? "Story" : "Stories"}
          </h2>

          {articleIds.length > 0 ? (
            <div className="space-y-10">
              {articleIds.map(id => (
                <AuthorPostCard key={id.toString()} id={id} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center text-stone-500">
              No stories published yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
