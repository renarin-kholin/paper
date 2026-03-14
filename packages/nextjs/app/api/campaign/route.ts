import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const AD_CAMPAIGN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AD_CAMPAIGN_CONTRACT_ADDRESS as string;
// const PAPER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS as string;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

const publicClient = createPublicClient({
  transport: http(RPC_URL),
  chain: baseSepolia,
});

const AD_CAMPAIGN_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "articleId", type: "uint256" },
      { internalType: "uint256", name: "durationDays", type: "uint256" },
      { internalType: "uint256", name: "dailyRateWei", type: "uint256" },
      { internalType: "string", name: "imageCID", type: "string" },
      { internalType: "string", name: "linkUrl", type: "string" },
    ],
    name: "createCampaign",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "articleId", type: "uint256" }],
    name: "hasActiveCampaign",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface CampaignRequest {
  articleId: string;
  durationDays: number;
  dailyRateWei: string;
  imageCID: string;
  linkUrl: string;
  txHash?: string; // For x402 payment verification
}

// GET: Return campaign pricing info with x402 headers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  const durationDays = searchParams.get("durationDays");
  const dailyRateWei = searchParams.get("dailyRateWei");

  if (!articleId || !durationDays || !dailyRateWei) {
    return NextResponse.json(
      { error: "Missing required parameters: articleId, durationDays, dailyRateWei" },
      { status: 400 },
    );
  }

  const duration = parseInt(durationDays);
  const dailyRate = BigInt(dailyRateWei);

  if (duration < 1 || duration > 90) {
    return NextResponse.json({ error: "Duration must be between 1 and 90 days" }, { status: 400 });
  }

  if (dailyRate <= 0n) {
    return NextResponse.json({ error: "Daily rate must be positive" }, { status: 400 });
  }

  // Check if article already has active campaign
  try {
    const hasActive = await publicClient.readContract({
      address: AD_CAMPAIGN_CONTRACT_ADDRESS as `0x${string}`,
      abi: AD_CAMPAIGN_ABI,
      functionName: "hasActiveCampaign",
      args: [BigInt(articleId)],
    });

    if (hasActive) {
      return NextResponse.json({ error: "Article already has an active campaign" }, { status: 409 });
    }
  } catch (error) {
    console.error("Error checking active campaign:", error);
    return NextResponse.json({ error: "Failed to check campaign status" }, { status: 500 });
  }

  const totalCost = dailyRate * BigInt(duration);

  // Return 402 Payment Required with x402 headers
  return NextResponse.json(
    {
      articleId,
      durationDays: duration,
      dailyRateWei: dailyRate.toString(),
      totalCost: totalCost.toString(),
      campaignCreated: false,
    },
    {
      status: 402,
      headers: {
        "X-PAYMENT-NETWORK": "base-sepolia",
        "X-PAYMENT-TOKEN": "ETH",
        "X-PAYMENT-TOKEN-ADDRESS": "0x0000000000000000000000000000000000000000",
        "X-PAYMENT-AMOUNT": totalCost.toString(),
        "X-PAYMENT-TO": AD_CAMPAIGN_CONTRACT_ADDRESS,
        "X-PAYMENT-DATA": "", // Contract will handle the call
        "X-X402-VERSION": "0.1",
      },
    },
  );
}

// POST: Create campaign (after payment)
export async function POST(request: NextRequest) {
  try {
    const body: CampaignRequest = await request.json();
    const { articleId, durationDays, dailyRateWei, imageCID, linkUrl, txHash } = body;

    // Validate inputs
    if (!articleId || !durationDays || !dailyRateWei || !imageCID || !linkUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (durationDays < 1 || durationDays > 90) {
      return NextResponse.json({ error: "Duration must be between 1 and 90 days" }, { status: 400 });
    }

    const dailyRate = BigInt(dailyRateWei);
    if (dailyRate <= 0n) {
      return NextResponse.json({ error: "Daily rate must be positive" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(linkUrl);
    } catch {
      return NextResponse.json({ error: "Invalid link URL" }, { status: 400 });
    }

    // If txHash provided, verify the payment
    if (txHash) {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        if (!receipt || receipt.status !== "success") {
          return NextResponse.json({ error: "Transaction not found or failed" }, { status: 400 });
        }

        // Verify transaction was to the AdCampaign contract
        if (receipt.to?.toLowerCase() !== AD_CAMPAIGN_CONTRACT_ADDRESS.toLowerCase()) {
          return NextResponse.json({ error: "Transaction not sent to campaign contract" }, { status: 400 });
        }

        // Extract campaign ID from logs
        const campaignCreatedEvent = receipt.logs.find(
          log =>
            log.address.toLowerCase() === AD_CAMPAIGN_CONTRACT_ADDRESS.toLowerCase() &&
            log.topics[0] === "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", // CampaignCreated event signature placeholder
        );

        if (campaignCreatedEvent) {
          // Campaign already created via direct contract interaction
          return NextResponse.json({
            success: true,
            campaignCreated: true,
            txHash: receipt.transactionHash,
            message: "Campaign created successfully",
          });
        }
      } catch (error) {
        console.error("Error verifying transaction:", error);
        return NextResponse.json({ error: "Failed to verify payment transaction" }, { status: 500 });
      }
    }

    // For non-x402 flow, return instructions to create campaign directly
    return NextResponse.json(
      {
        success: false,
        message: "Please create campaign through the frontend or provide txHash",
        contractAddress: AD_CAMPAIGN_CONTRACT_ADDRESS,
        requiredPayment: (dailyRate * BigInt(durationDays)).toString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json({ error: "Failed to process campaign request" }, { status: 500 });
  }
}
