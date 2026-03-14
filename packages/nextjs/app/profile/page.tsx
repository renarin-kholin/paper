"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, CheckCircle2, Globe, Loader2, Twitter, User, X } from "lucide-react";
import { useAccount, useEnsName, useSignMessage } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { generatePaperSubdomain, normalizeUsernameLabel, resolveUsername } from "~~/lib/ens-identity";
import {
  UserProfile,
  fetchProfileFromIPFS,
  getIPFSGatewayUrl,
  uploadImageToIPFS,
  uploadProfileToIPFS,
} from "~~/lib/ipfs";

const defaultProfile: UserProfile = {
  username: "",
  name: "",
  bio: "",
  avatar: undefined,
  coverImage: undefined,
  socialLinks: {},
  updatedAt: Date.now(),
};

export default function ProfilePage() {
  const ENS_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ENS_CHAIN_ID || "11155111");
  const router = useRouter();
  const { address, isConnected, status } = useAccount();
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [initialProfileSnapshot, setInitialProfileSnapshot] = useState(JSON.stringify(defaultProfile));

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: profileCID, isLoading: isContractLoading } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getUserProfileCID" as any,
    args: address ? ([address] as any) : undefined,
  });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Paper" });
  const { signMessageAsync } = useSignMessage();
  const { data: ensName } = useEnsName({
    address,
    chainId: ENS_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const registerEnsSubname = async (ownerAddress: string, usernameLabel: string) => {
    const timestamp = Date.now();
    const message = [
      "Paper ENS subname registration",
      `Username: ${usernameLabel}`,
      `Address: ${ownerAddress.toLowerCase()}`,
      `Timestamp: ${timestamp}`,
    ].join("\n");

    const signature = await signMessageAsync({ message });

    const response = await fetch("/api/ens/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: ownerAddress,
        username: usernameLabel,
        message,
        signature,
        timestamp,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "Failed to register ENS username");
    }

    return result.ensName as string;
  };

  useEffect(() => {
    if (address !== undefined) {
      setIsWalletReady(true);
    }
  }, [address]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isWalletReady) return;
    if (status === "disconnected") {
      router.push("/signup");
    }
  }, [isMounted, isWalletReady, status, router]);

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
            setInitialProfileSnapshot(JSON.stringify(profileData));
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);

      const cid = await uploadImageToIPFS(file);
      setProfile(prev => ({ ...prev, avatar: cid }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      setCoverPreview(objectUrl);

      const cid = await uploadImageToIPFS(file);
      setProfile(prev => ({ ...prev, coverImage: cid }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setCoverPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!address) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const normalizedUsername = normalizeUsernameLabel(profile.username || profile.name);
      const generatedSubdomain = generatePaperSubdomain(address, normalizedUsername);
      let registeredSubdomain = profile.ensSubdomain;

      if (!ensName && normalizedUsername) {
        const requestedEnsName = `${normalizedUsername}.${process.env.NEXT_PUBLIC_PAPER_ENS_PARENT || "paper.eth"}`;
        if (profile.ensSubdomain !== requestedEnsName) {
          registeredSubdomain = await registerEnsSubname(address, normalizedUsername);
        }
      }

      const updatedProfile = {
        ...profile,
        username: normalizedUsername,
        ensSubdomain: ensName ? profile.ensSubdomain : registeredSubdomain || generatedSubdomain,
        updatedAt: Date.now(),
      };
      const cid = await uploadProfileToIPFS(updatedProfile);

      await writeContractAsync({
        functionName: "setUserProfile" as any,
        args: [cid] as any,
      });

      setProfile(updatedProfile);
      setInitialProfileSnapshot(JSON.stringify(updatedProfile));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(profile) !== initialProfileSnapshot;

  const usernamePreview = resolveUsername({
    ensName,
    profile,
    address,
  });

  if (!isWalletReady || isContractLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto mb-4" />
          <p className="text-stone-500">{!isWalletReady ? "Connecting wallet..." : "Loading profile..."}</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 mb-4">Please connect your wallet to view your profile.</p>
          <button onClick={() => router.push("/signup")} className="btn btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

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

        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all flex items-center gap-2"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {coverPreview ? "Change Cover" : "Add Cover"}
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
      </div>

      {/* Avatar */}
      <div className="relative -mt-20 mb-6 pl-4 md:pl-8">
        <div className="relative inline-block">
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
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 bg-stone-900 hover:bg-stone-800 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-105"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
      </div>

      {/* Form */}
      <div className="px-4 md:px-8 pb-12">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-800 font-medium">Profile saved successfully!</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Username</label>
            <input
              type="text"
              placeholder="yourname"
              value={profile.username || ""}
              onChange={e => setProfile(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all outline-none"
              maxLength={24}
            />
            <p className="text-xs text-stone-400 mt-1.5">
              {ensName
                ? "Using your wallet ENS name by default."
                : "Saving will register this as a paper.eth ENS subname."}
            </p>
            <p className="text-xs text-stone-500 mt-1">Resolved username: {usernamePreview}</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Display Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={profile.name}
              onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all outline-none text-lg"
              maxLength={100}
            />
            <p className="text-xs text-stone-400 mt-1.5">{profile.name.length}/100 characters</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Bio</label>
            <textarea
              placeholder="Tell readers about yourself, your expertise, and what you write about..."
              value={profile.bio}
              onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-stone-400 mt-1.5 text-right">{profile.bio.length}/500 characters</p>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">Social Links</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Twitter username"
                  value={profile.socialLinks?.twitter || ""}
                  onChange={e =>
                    setProfile(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                    }))
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all outline-none"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="url"
                  placeholder="Website"
                  value={profile.socialLinks?.website || ""}
                  onChange={e =>
                    setProfile(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, website: e.target.value },
                    }))
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-stone-100">
            <p className="text-sm text-stone-500">{hasChanges ? "You have unsaved changes" : "No changes to save"}</p>
            <button
              onClick={handleSave}
              disabled={isSaving || isUploading || !hasChanges}
              className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
