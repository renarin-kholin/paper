// Token addresses
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
export const USDC_ADDRESS = ""; // TBD - not yet supported

// Minimum prices
export const MIN_ETH_PRICE = "100000000000000"; // 0.0001 ETH
export const MIN_USDC_PRICE = "10000"; // 0.01 USDC (6 decimals) - not yet supported

// IPFS Gateway URL - can be configured via env var for custom gateways
export const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs";

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
  adSpace?: {
    enabled: boolean;
    dailyPriceUsd: number;
  };
}

export interface UserProfile {
  name: string;
  bio: string;
  avatar?: string; // IPFS CID for image
  coverImage?: string; // IPFS CID for image
  socialLinks?: {
    twitter?: string;
    website?: string;
  };
  updatedAt: number;
}

export interface Comment {
  author: string;
  body: string;
  createdAt: number;
}

const WORDS_PER_MINUTE = 200;

export function calculateReadTime(content: string): number {
  if (!content) return 1;

  const plainText = content
    .replace(/<[^>]*>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-\d.\s]+/gm, "")
    .replace(/[*_~]/g, "");

  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
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
  return `${IPFS_GATEWAY_URL}/${cid}`;
}

export function resolveIPFSUrl(value?: string): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return getIPFSGatewayUrl(value);
}

export async function uploadProfileToIPFS(data: UserProfile): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(jsonString);

  const response = await fetch("/api/ipfs?action=add", {
    method: "POST",
    body: buffer,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`IPFS profile upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.cid;
}

export async function fetchProfileFromIPFS<CID extends string>(cid: CID): Promise<UserProfile> {
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
    throw new Error(`IPFS profile fetch failed: ${response.statusText}`);
  }

  return response.json() as Promise<UserProfile>;
}

export async function uploadImageToIPFS(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const response = await fetch("/api/ipfs?action=addImage", {
    method: "POST",
    body: arrayBuffer,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload image");
  }

  const result = await response.json();
  return result.cid;
}

export async function uploadCommentToIPFS(data: Comment): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(jsonString);

  const response = await fetch("/api/ipfs?action=add", {
    method: "POST",
    body: buffer,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`IPFS comment upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.cid;
}

export async function fetchCommentFromIPFS<CID extends string>(cid: CID): Promise<Comment> {
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
    throw new Error(`IPFS comment fetch failed: ${response.statusText}`);
  }

  return response.json() as Promise<Comment>;
}
