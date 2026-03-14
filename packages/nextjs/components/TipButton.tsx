"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { fetchPriceFromUniswap } from "~~/utils/scaffold-eth/fetchPriceFromUniswap";

interface TipButtonProps {
  articleId?: bigint;
  authorAddress: string;
  className?: string;
}

const USD_AMOUNTS = [1, 5, 10];

export function TipButton({ articleId, authorAddress, className = "" }: TipButtonProps) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "Paper" });

  const [isOpen, setIsOpen] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  const isOwnProfile = connectedAddress?.toLowerCase() === authorAddress?.toLowerCase();

  useEffect(() => {
    async function loadPrice() {
      try {
        const price = await fetchPriceFromUniswap(targetNetwork);
        setEthPrice(price);
      } catch (err) {
        console.error("Failed to fetch ETH price:", err);
        setEthPrice(3000);
      } finally {
        setIsLoadingPrice(false);
      }
    }
    loadPrice();
  }, [targetNetwork]);

  const usdToEth = (usd: number): string => {
    if (ethPrice <= 0) return "0";
    return (usd / ethPrice).toFixed(6);
  };

  const handleTip = async (usdAmount: number) => {
    if (!isConnected) {
      router.push("/signup");
      return;
    }

    const ethAmount = usdToEth(usdAmount);
    const weiValue = BigInt(Math.ceil(parseFloat(ethAmount) * 1e18));

    try {
      if (articleId) {
        await writeContractAsync({
          functionName: "tipAuthor" as any,
          args: [articleId] as any,
          value: weiValue,
        });
      } else {
        await writeContractAsync({
          functionName: "tipUser" as any,
          args: [authorAddress] as any,
          value: weiValue,
        });
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Tip failed:", err);
    }
  };

  const handleCustomTip = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) return;
    await handleTip(amount);
  };

  if (isOwnProfile) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full font-medium transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
        aria-label="Tip"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
        <span>Tip</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-stone-200 p-4 z-50 min-w-[200px]">
          <p className="text-sm font-semibold text-stone-900 mb-3">Send a tip</p>

          {isLoadingPrice ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {USD_AMOUNTS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => handleTip(amount)}
                    className="flex flex-col items-center p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
                  >
                    <span className="text-lg font-bold text-stone-900">${amount}</span>
                    <span className="text-xs text-stone-500">{usdToEth(amount)} ETH</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-stone-200 pt-3">
                <p className="text-xs text-stone-500 mb-2">Custom amount (USD)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={handleCustomTip}
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
                {customAmount && (
                  <p className="text-xs text-stone-500 mt-1">= {usdToEth(parseFloat(customAmount))} ETH</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
