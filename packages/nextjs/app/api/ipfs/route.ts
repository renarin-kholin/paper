import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Handle upload (when action=add)
  if (action === "add") {
    try {
      const body = await request.arrayBuffer();
      const buffer = Buffer.from(body);

      // Upload to local IPFS node (server-side, no CORS)
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

    // Use POST to /api/v0/cat with form data
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
