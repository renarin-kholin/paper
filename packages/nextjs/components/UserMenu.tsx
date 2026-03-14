"use client";

import { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, CircleDot, Loader2, User, Wallet } from "lucide-react";
import { hardhat } from "viem/chains";
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";
import { FaucetButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { resolveUsername } from "~~/lib/ens-identity";
import { UserProfile, fetchProfileFromIPFS } from "~~/lib/ipfs";

export const UserMenu = () => {
  const { isConnected, chain, address } = useAccount();
  const { disconnect } = useDisconnect();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: 1,
    query: { enabled: Boolean(ensName) },
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const { data: profileCID } = useScaffoldReadContract({
    contractName: "Paper",
    functionName: "getUserProfileCID" as any,
    args: address ? ([address] as any) : undefined,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    let active = true;
    const cid = typeof profileCID === "string" ? profileCID : "";

    if (!cid) {
      setProfile(null);
      return;
    }

    fetchProfileFromIPFS(cid)
      .then(data => {
        if (!active) return;
        setProfile(data);
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
      });

    return () => {
      active = false;
    };
  }, [profileCID]);

  const username = resolveUsername({
    ensName,
    profile,
    address,
  });

  useOutsideClick(menuRef, () => {
    menuRef.current?.removeAttribute("open");
  });

  return (
    <details ref={menuRef} className="relative group">
      <summary className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden hover:bg-stone-300 active:scale-[0.98] list-none cursor-pointer border border-stone-300/60">
        {ensAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ensAvatar} alt="Profile avatar" className="h-full w-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-stone-500" />
        )}
        <ChevronDown className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-white border border-stone-300 p-[2px] text-stone-500" />
      </summary>

      <div className="absolute right-0 mt-3 w-[300px] rounded-xl border border-stone-200 bg-white p-3 shadow-[0_10px_22px_-18px_rgba(0,0,0,0.3)] wallet-ui z-30 origin-top-right transition-all duration-200 page-fade-in">
        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Wallet</div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm text-stone-700">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>{isConnected ? "Connected account" : "Connect wallet"}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isConnected ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"
              }`}
            >
              <CircleDot className="h-3 w-3" />
              {isConnected ? "Online" : "Offline"}
            </span>
          </div>
          {isConnected && (
            <div className="mb-2 rounded-md bg-white/80 px-2 py-1 text-xs text-stone-500 border border-stone-200">
              {username}
            </div>
          )}

          <ConnectButton.Custom>
            {({ mounted, account, chain, openConnectModal, openAccountModal, openChainModal }) => {
              const connected = mounted && account && chain;

              if (!mounted) {
                return (
                  <button type="button" className="btn btn-secondary btn-sm w-full opacity-70" disabled>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                      Loading wallet...
                    </span>
                  </button>
                );
              }

              if (!connected) {
                return (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-full hover:scale-[1.01] active:scale-[0.99]"
                    onClick={openConnectModal}
                  >
                    Connect Wallet
                  </button>
                );
              }

              return (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm w-full justify-between"
                    onClick={openAccountModal}
                  >
                    <span>Wallet Details</span>
                    <span className="text-[11px] text-stone-500">{account.displayName}</span>
                  </button>

                  {chain.unsupported ? (
                    <button type="button" className="btn btn-error btn-sm w-full" onClick={openChainModal}>
                      Switch to supported network
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm w-full justify-between"
                      onClick={openChainModal}
                    >
                      <span>Network</span>
                      <span className="text-[11px] text-stone-500">{chain.name}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-full text-error"
                    onClick={() => disconnect()}
                  >
                    Disconnect
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>

        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-2">
          <div className="mb-2 flex items-center justify-between text-sm text-stone-700">
            <Wallet className="h-4 w-4" />
            <span>Faucet</span>
            {chain?.id === hardhat.id ? (
              <span className="text-[11px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">Local</span>
            ) : (
              <span className="text-[11px] rounded-full bg-stone-200 text-stone-600 px-2 py-0.5">Off</span>
            )}
          </div>
          {chain?.id === hardhat.id ? (
            <FaucetButton />
          ) : (
            <p className="text-xs text-stone-500">Available on local Hardhat network only.</p>
          )}
        </div>
      </div>
    </details>
  );
};
