import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { readContract } from "viem/actions";
import { baseSepolia, foundry } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { ETH_ADDRESS } from "~~/lib/ipfs";

const FALLBACK_LOCAL_PAPER_ADDRESS = deployedContracts[31337]?.Paper?.address;
const PAPERS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS || FALLBACK_LOCAL_PAPER_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const CHAIN =
  RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1") || RPC_URL.includes("0.0.0.0") ? foundry : baseSepolia;

const client = createPublicClient({
  transport: http(RPC_URL),
  chain: CHAIN,
});

async function fetchArticleMetadataFromApi(cid: string, request: NextRequest) {
  const url = `${request.nextUrl.origin}/api/ipfs`;
  const body = new TextEncoder().encode(cid);

  const response = await fetch(url, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "text/plain",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`IPFS API responded ${response.status}`);
  }

  return response.json() as Promise<{ content: string; preview?: string }>;
}

async function getArticlePrice(articleId: string) {
  if (!PAPERS_CONTRACT_ADDRESS) {
    console.error("Paper contract address is not configured.");
    return null;
  }

  const tokenId = BigInt(articleId);

  try {
    const articleCount = (await readContract(client, {
      address: PAPERS_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [],
          name: "articleCount",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "articleCount",
    })) as bigint;

    if (tokenId >= articleCount) {
      return null;
    }

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
  } catch (error) {
    console.error("Error fetching article info:", {
      contract: PAPERS_CONTRACT_ADDRESS,
      rpc: RPC_URL,
      chainId: CHAIN.id,
      articleId,
      error,
    });
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
      const metadata = await fetchArticleMetadataFromApi(cid, request);
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
      const metadata = await fetchArticleMetadataFromApi(cid, request);
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
