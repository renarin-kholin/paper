import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  type ArticleMetadata,
  ETH_ADDRESS,
  MIN_ETH_PRICE,
  MIN_USDC_PRICE,
  USDC_ADDRESS,
  uploadToIPFS,
} from "~~/lib/ipfs";

interface PublishArticleParams {
  title: string;
  content: string;
  price: string;
  priceToken: string;
}

interface PublishArticleResult {
  publish: (params: PublishArticleParams) => Promise<bigint | undefined>;
  isLoading: boolean;
  isMining: boolean;
  error: string | null;
}

export function usePublishArticle(): PublishArticleResult {
  const { address } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract("Paper");
  const [isLoading, setIsLoading] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async ({ title, content, price, priceToken }: PublishArticleParams): Promise<bigint | undefined> => {
    if (!address) {
      setError("Wallet not connected");
      return undefined;
    }

    if (!title.trim()) {
      setError("Title is required");
      return undefined;
    }

    if (!content.trim()) {
      setError("Content is required");
      return undefined;
    }

    // Validate price
    const priceBigInt = BigInt(price);
    if (priceToken === ETH_ADDRESS) {
      if (priceBigInt !== 0n && priceBigInt < BigInt(MIN_ETH_PRICE)) {
        setError(`Minimum price is ${MIN_ETH_PRICE} wei`);
        return undefined;
      }
    } else if (priceToken === USDC_ADDRESS) {
      if (priceBigInt !== 0n && priceBigInt < BigInt(MIN_USDC_PRICE)) {
        setError(`Minimum USDC price is ${MIN_USDC_PRICE} (6 decimals)`);
        return undefined;
      }
    }

    setIsLoading(true);
    setIsMining(false);
    setError(null);

    try {
      // Step 1: Upload metadata to IPFS
      console.log("📤 Uploading to IPFS...");

      // Create preview (first 200 chars)
      const preview = content.slice(0, 200);

      const metadata: ArticleMetadata = {
        name: title,
        description: `Article on Paper`,
        content,
        preview,
        author: address,
        createdAt: Math.floor(Date.now() / 1000),
        price,
        priceToken,
      };

      const cid = await uploadToIPFS(metadata);
      console.log("✅ IPFS upload successful, CID:", cid);

      if (!cid) {
        throw new Error("Failed to get CID from IPFS");
      }

      // Step 2: Call the smart contract to publish
      console.log("⛽ Calling contract...");
      setIsMining(true);

      const txHash = await writeContractAsync({
        functionName: "publish",

        args: [cid, title, priceBigInt, priceToken] as any,
      });

      if (!txHash) {
        throw new Error("Transaction failed or was rejected");
      }

      console.log("✅ Transaction submitted! Hash:", txHash);

      // Transaction successful - the homepage will refetch and show the article
      return undefined;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish article";
      setError(errorMessage);
      console.error("❌ Publish error:", err);
      return undefined;
    } finally {
      setIsLoading(false);
      setIsMining(false);
    }
  };

  return {
    publish,
    isLoading,
    isMining,
    error,
  };
}
