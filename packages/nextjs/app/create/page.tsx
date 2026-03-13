"use client";

import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Editor } from "~~/components/Editor";
import { usePublishArticle } from "~~/hooks/usePublishArticle";

const CreatePage: NextPage = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { publish, isLoading, isMining, error } = usePublishArticle();

  const handlePublish = async (title: string, content: string, price: string, priceToken: string) => {
    const tokenId = await publish({ title, content, price, priceToken });
    if (tokenId !== undefined) {
      router.push("/");
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
        <p className="text-base-content/60">Please connect your wallet to publish an article.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Write an Article</h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <Editor onSubmit={handlePublish} isLoading={isLoading || isMining} />
    </div>
  );
};

export default CreatePage;
