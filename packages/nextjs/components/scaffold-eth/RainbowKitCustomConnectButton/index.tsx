"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Balance } from "@scaffold-ui/components";
import { Address } from "viem";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();

  return (
    <div className="wallet-ui">
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, mounted }) => {
          const connected = mounted && account && chain;
          const blockExplorerAddressLink = account
            ? getBlockExplorerAddressLink(targetNetwork, account.address)
            : undefined;

          return (
            <>
              {(() => {
                if (!mounted) {
                  return (
                    <button
                      className="btn btn-secondary btn-sm opacity-70 pointer-events-none animate-pulse"
                      type="button"
                    >
                      Loading wallet...
                    </button>
                  );
                }

                if (!connected) {
                  return (
                    <button
                      className="btn btn-primary btn-sm hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openConnectModal}
                      type="button"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported || chain.id !== targetNetwork.id) {
                  return <WrongNetworkDropdown />;
                }

                return (
                  <>
                    <div className="flex flex-col items-center mr-2 rounded-lg px-2 py-1 bg-stone-50 border border-stone-200">
                      <Balance
                        address={account.address as Address}
                        style={{
                          minHeight: "0",
                          height: "auto",
                          fontSize: "0.8em",
                        }}
                      />
                      <span className="text-xs" style={{ color: networkColor }}>
                        {chain.name}
                      </span>
                    </div>
                    <AddressInfoDropdown
                      address={account.address as Address}
                      displayName={account.displayName}
                      ensAvatar={account.ensAvatar}
                      blockExplorerAddressLink={blockExplorerAddressLink}
                    />
                    <AddressQRCodeModal address={account.address as Address} modalId="qrcode-modal" />
                    <RevealBurnerPKModal />
                  </>
                );
              })()}
            </>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
};
