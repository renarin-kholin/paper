"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, CheckCircle2, Globe, Loader2, Twitter, User, X } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  UserProfile,
  fetchProfileFromIPFS,
  getIPFSGatewayUrl,
  uploadImageToIPFS,
  uploadProfileToIPFS,
} from "~~/lib/ipfs";

const defaultProfile: UserProfile = {
  name: "",
  bio: "",
  avatar: undefined,
  coverImage: undefined,
  socialLinks: {},
  updatedAt: Date.now(),
};

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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

  useEffect(() => {
    if (address !== undefined) {
      setIsWalletReady(true);
    }
  }, [address]);

  useEffect(() => {
    if (isWalletReady && !isConnected) {
      router.push("/signup");
    }
  }, [isWalletReady, isConnected, router]);

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
      const updatedProfile = { ...profile, updatedAt: Date.now() };
      const cid = await uploadProfileToIPFS(updatedProfile);

      await writeContractAsync({
        functionName: "setUserProfile" as any,
        args: [cid] as any,
      });

      setProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    profile.name ||
    profile.bio ||
    profile.avatar ||
    profile.coverImage ||
    profile.socialLinks?.twitter ||
    profile.socialLinks?.website;

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
