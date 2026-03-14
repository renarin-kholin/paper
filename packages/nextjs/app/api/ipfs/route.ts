import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const providerEnv = (process.env.IPFS_PROVIDER || "auto").toLowerCase();

const resolveProvider = () => {
  if (!isProduction) return "local" as const;
  if (providerEnv === "pinata") return "pinata" as const;
  if (providerEnv === "web3storage" || providerEnv === "web3") return "web3storage" as const;
  if (process.env.PINATA_JWT) return "pinata" as const;
  if (process.env.WEB3_STORAGE_TOKEN) return "web3storage" as const;
  return "local" as const;
};

const uploadToProvider = async (buffer: Buffer, contentType: string, fileName: string) => {
  const provider = resolveProvider();
  const bytes = new Uint8Array(buffer);

  if (provider === "pinata") {
    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: contentType }), fileName);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash as string;
  }

  if (provider === "web3storage") {
    const response = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
        "Content-Type": contentType,
      },
      body: bytes,
    });

    if (!response.ok) {
      throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.cid as string;
  }

  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: contentType }), fileName);

  const response = await fetch("http://127.0.0.1:5001/api/v0/add", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.Hash as string;
};

const fetchFromProvider = async (cid: string) => {
  const provider = resolveProvider();

  if (provider === "pinata") {
    const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
    const response = await fetch(`${gatewayUrl}/${cid}`);

    if (!response.ok) {
      throw new Error(`Pinata fetch failed: ${response.statusText}`);
    }

    return response.text();
  }

  if (provider === "web3storage") {
    const gatewayUrl = process.env.NEXT_PUBLIC_WEB3_STORAGE_GATEWAY || "https://w3s.link/ipfs";
    const response = await fetch(`${gatewayUrl}/${cid}`);

    if (!response.ok) {
      throw new Error(`Web3.Storage fetch failed: ${response.statusText}`);
    }

    return response.text();
  }

  const formData = new FormData();
  formData.append("arg", cid);

  const response = await fetch("http://127.0.0.1:5001/api/v0/cat", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`IPFS fetch failed: ${response.statusText}`);
  }

  return response.text();
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Handle image upload (when action=addImage)
  if (action === "addImage") {
    try {
      const body = await request.arrayBuffer();
      const buffer = Buffer.from(body);

      // Get content type from header or detect from buffer
      const contentType = request.headers.get("content-type") || "application/octet-stream";
      const cid = await uploadToProvider(buffer, contentType, "image");
      return NextResponse.json({ cid, contentType });
    } catch (error) {
      console.error("IPFS image upload error:", error);
      return NextResponse.json({ error: "Failed to upload image to IPFS" }, { status: 500 });
    }
  }

  // Handle upload (when action=add)
  if (action === "add") {
    try {
      const body = await request.arrayBuffer();
      const buffer = Buffer.from(body);
      const cid = await uploadToProvider(buffer, "application/json", "metadata.json");
      return NextResponse.json({ cid });
    } catch (error) {
      console.error("IPFS upload error:", error);
      return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 });
    }
  }

  // Handle fetch (when action=cat)
  try {
    const body = await request.arrayBuffer();
    const decoder = new TextDecoder();
    const cid = decoder.decode(body);

    if (!cid) {
      return NextResponse.json({ error: "CID required" }, { status: 400 });
    }

    const text = await fetchFromProvider(cid);
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("IPFS fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch from IPFS" }, { status: 500 });
  }
}
