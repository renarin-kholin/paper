export interface ArticleMetadata {
  name: string;
  description: string;
  content: string;
  author: string;
  createdAt: number;
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
  return `https://ipfs.io/ipfs/${cid}`;
}
