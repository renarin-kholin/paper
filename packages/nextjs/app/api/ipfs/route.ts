import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Handle upload (when action=add)
  if (action === "add") {
    try {
      const body = await request.arrayBuffer();
      const buffer = Buffer.from(body);

      if (isProduction) {
        // Upload to Pinata (production)
        const formData = new FormData();
        formData.append("file", new Blob([buffer], { type: "application/json" }), "metadata.json");

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
        return NextResponse.json({ cid: result.IpfsHash });
      }

      // Upload to local IPFS node (development)
      const formData = new FormData();
      formData.append("file", new Blob([buffer], { type: "application/json" }), "metadata.json");

      const response = await fetch("http://127.0.0.1:5001/api/v0/add", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return NextResponse.json({ cid: result.Hash });
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

    if (isProduction) {
      // Use Pinata gateway (production)
      const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
      const response = await fetch(`${gatewayUrl}/${cid}`);

      if (!response.ok) {
        throw new Error(`Pinata fetch failed: ${response.statusText}`);
      }

      const text = await response.text();
      return NextResponse.json(JSON.parse(text));
    }

    // Use local IPFS node (development)
    const formData = new FormData();
    formData.append("arg", cid);

    const response = await fetch("http://127.0.0.1:5001/api/v0/cat", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`);
    }

    // Return the raw text content
    const text = await response.text();
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("IPFS fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch from IPFS" }, { status: 500 });
  }
}
