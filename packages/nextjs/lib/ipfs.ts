// Token addresses
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
export const USDC_ADDRESS = ""; // TBD - not yet supported

// Minimum prices
export const MIN_ETH_PRICE = "100000000000000"; // 0.0001 ETH
export const MIN_USDC_PRICE = "10000"; // 0.01 USDC (6 decimals) - not yet supported

// IPFS Gateway URL - can be configured via env var for custom gateways
export const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/";

export interface ArticleMetadata {
  name: string;
  description: string;
  content: string;
  preview: string; // First 200 chars
  author: string;
  createdAt: number;
  price: string; // Price in wei (or USDC units)
  priceToken: string; // ETH_ADDRESS or USDC_ADDRESS
  image?: string;
}

export async function uploadToIPFS(data: ArticleMetadata): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(jsonString);

  // Use server-side API route to avoid CORS
  const response = await fetch("/api/ipfs?action=add", {
    method: "POST",
    body: buffer,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.cid;
}

export async function fetchFromIPFS<CID extends string>(cid: CID): Promise<ArticleMetadata> {
  // Use server-side API route with POST to avoid CORS
  const encoder = new TextEncoder();
  const body = encoder.encode(cid);

  const response = await fetch("/api/ipfs", {
    method: "POST",
    body: body,
    headers: {
      "Content-Type": "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`IPFS fetch failed: ${response.statusText}`);
  }

  return response.json() as Promise<ArticleMetadata>;
}

export function getIPFSGatewayUrl(cid: string): string {
  return `${IPFS_GATEWAY_URL}${cid}`;
}
