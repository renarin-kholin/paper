import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { readContract } from "viem/actions";
import { baseSepolia } from "viem/chains";
import { ETH_ADDRESS, fetchFromIPFS } from "~~/lib/ipfs";

const PAPERS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS as string;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

const client = createPublicClient({
  transport: http(RPC_URL),
  chain: baseSepolia,
});

async function getArticlePrice(articleId: string) {
  const tokenId = BigInt(articleId);

  try {
    const meta = (await readContract(client, {
      address: PAPERS_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
          name: "articleMeta",
          outputs: [
            { internalType: "address", name: "author", type: "address" },
            { internalType: "uint256", name: "createdAt", type: "uint256" },
            { internalType: "string", name: "title", type: "string" },
            { internalType: "uint256", name: "price", type: "uint256" },
            { internalType: "address", name: "priceToken", type: "address" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "articleMeta",
      args: [tokenId],
    })) as [string, bigint, string, bigint, string];

    const cid = (await readContract(client, {
      address: PAPERS_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
          name: "getArticleCID",
          outputs: [{ internalType: "string", name: "", type: "string" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getArticleCID",
      args: [tokenId],
    })) as string;

    return {
      author: meta[0],
      price: meta[3],
      priceToken: meta[4],
      cid,
    };
  } catch {
    console.error("Error fetching article price:", PAPERS_CONTRACT_ADDRESS, RPC_URL);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = id;

  const articleInfo = await getArticlePrice(tokenId);

  if (!articleInfo) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const { author, price, priceToken, cid } = articleInfo;

  // Check if article is free
  if (price === 0n) {
    try {
      const metadata = await fetchFromIPFS(cid);
      return NextResponse.json({
        content: metadata.content,
        preview: metadata.preview || metadata.content.slice(0, 200),
        price: "0",
        priceToken: ETH_ADDRESS,
        isPaid: true,
        author,
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
  }

  // Check for x402 payment authorization header (for AI agents)
  const paymentAuth = request.headers.get("x-payment-authorization");

  if (paymentAuth) {
    // Payment was made - verify and return content
    try {
      const metadata = await fetchFromIPFS(cid);
      return NextResponse.json({
        content: metadata.content,
        preview: metadata.preview || metadata.content.slice(0, 200),
        price: price.toString(),
        priceToken: priceToken === ETH_ADDRESS ? "ETH" : "USDC",
        isPaid: true,
        author,
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
  }

  // Return 402 Payment Required with x402 headers
  const priceInWei = price.toString();
  const tokenSymbol = priceToken === ETH_ADDRESS ? "ETH" : "USDC";

  return NextResponse.json(
    {
      preview: null,
      price: priceInWei,
      priceToken: tokenSymbol,
      isPaid: false,
      author,
      content: null,
    },
    {
      status: 402,
      headers: {
        "X-PAYMENT-NETWORK": "base-sepolia",
        "X-PAYMENT-TOKEN": tokenSymbol,
        "X-PAYMENT-AMOUNT": priceInWei,
        "X-PAYMENT-TO": author,
      },
    },
  );
}
