"use client";

import { Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ETH_ADDRESS } from "~~/lib/ipfs";

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useEthPayment() {
  const { address, isConnected } = useAccount();
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const payForArticle = async (articleId: bigint, price: bigint, priceToken: string): Promise<PaymentResult> => {
    if (!address || !isConnected) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const isEth = priceToken === ETH_ADDRESS || priceToken === "0x0000000000000000000000000000000000000000";

      if (isEth) {
        // ETH payment
        writeContract({
          address: process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS as Address,
          abi: [
            {
              inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
              name: "payArticle",
              outputs: [],
              stateMutability: "payable",
              type: "function",
            },
          ],
          functionName: "payArticle",
          args: [articleId],
          value: price,
        });
      } else {
        // USDC payment - need to approve first, then pay
        writeContract({
          address: process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS as Address,
          abi: [
            {
              inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
              name: "payArticle",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "payArticle",
          args: [articleId],
        });
      }

      // Wait for transaction
      return new Promise(resolve => {
        const checkConfirm = setInterval(() => {
          if (isConfirmed) {
            clearInterval(checkConfirm);
            resolve({ success: true, txHash: hash });
          }
          if (writeError) {
            clearInterval(checkConfirm);
            resolve({ success: false, error: writeError.message });
          }
        }, 1000);

        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(checkConfirm);
          if (!isConfirmed) {
            resolve({ success: false, error: "Transaction timeout" });
          }
        }, 60000);
      });
    } catch (error) {
      console.error("Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  };

  return {
    payForArticle,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    writeError,
  };
}

// Custom hook to check if user has paid for article
export function useHasPaid(articleId: bigint, userAddress: string | undefined) {
  return useReadContract({
    address: process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS as Address,
    abi: [
      {
        inputs: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "address", name: "user", type: "address" },
        ],
        name: "hasPaidForArticle",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasPaidForArticle",
    args: [articleId, (userAddress || "0x0000000000000000000000000000000000000000") as Address],
    query: {
      enabled: !!articleId && !!userAddress,
    },
  });
}
