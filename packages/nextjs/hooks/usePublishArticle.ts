import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-eth";
import { uploadToIPFS, type ArticleMetadata } from "~~/lib/ipfs";

interface PublishArticleParams {
  title: string;
  content: string;
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
  const transactor = useTransactor();
  const [isLoading, setIsLoading] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async ({ title, content }: PublishArticleParams): Promise<bigint | undefined> => {
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

    setIsLoading(true);
    setIsMining(false);
    setError(null);

    try {
      // Step 1: Upload metadata to IPFS
      console.log("📤 Uploading to IPFS...");
      const metadata: ArticleMetadata = {
        name: title,
        description: `Article on Paper`,
        content,
        author: address,
        createdAt: Math.floor(Date.now() / 1000),
      };

      const cid = await uploadToIPFS(metadata);
      console.log("✅ IPFS upload successful, CID:", cid);

      if (!cid) {
        throw new Error("Failed to get CID from IPFS");
      }

      // Step 2: Call the smart contract to publish
      console.log("⛽ Calling contract...");
      setIsMining(true);

      // Use writeContractAsync directly since transactor expects exact return type
      const txHash = await writeContractAsync({
        functionName: "publish",
        args: [cid, title],
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
