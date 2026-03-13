"use client";

import { useEffect, useState } from "react";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

interface X402PaymentResult {
  content: string;
  preview: string;
  price: string;
  priceToken: string;
  isPaid: boolean;
}

export function useX402Payment() {
  const { address, isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
  const publicClient = usePublicClient();
  const [isClientReady, setIsClientReady] = useState(false);
  const [client, setClient] = useState<x402Client | null>(null);

  useEffect(() => {
    if (address && walletClient) {
      setIsClientReady(true);
    } else {
      setIsClientReady(false);
      setClient(null);
    }
  }, [address, walletClient]);

  useEffect(() => {
    if (!walletClient || !address || !publicClient) return;

    const x402ClientInstance = new x402Client();
    registerExactEvmScheme(x402ClientInstance, {
      signer: walletClient as never,
    });

    setClient(x402ClientInstance);
  }, [walletClient, address, publicClient]);

  const isReady = isConnected && !isWalletLoading && isClientReady && client !== null;

  const unlockContent = async (articleId: string): Promise<X402PaymentResult | null> => {
    if (!client || !address || !walletClient) {
      console.error("Wallet not connected or client not ready");
      return null;
    }

    try {
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
      const response = await fetchWithPayment(`${baseUrl}/api/article/${articleId}/content`);

      if (response.status === 402) {
        console.error("Payment failed or was rejected");
        return null;
      }

      if (!response.ok) {
        console.error("Failed to fetch content:", response.statusText);
        return null;
      }

      const data = await response.json();
      return data as X402PaymentResult;
    } catch (error) {
      console.error("Payment error:", error);
      return null;
    }
  };

  return {
    unlockContent,
    isReady,
  };
}
