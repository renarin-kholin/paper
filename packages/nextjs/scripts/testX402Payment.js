#!/usr/bin/env node

function getArgValue(flag) {
  const eqArg = process.argv.find(item => item.startsWith(`${flag}=`));
  if (eqArg) {
    return eqArg.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function readPaymentHeaders(response) {
  return {
    network: response.headers.get("X-PAYMENT-NETWORK"),
    token: response.headers.get("X-PAYMENT-TOKEN"),
    amount: response.headers.get("X-PAYMENT-AMOUNT"),
    to: response.headers.get("X-PAYMENT-TO"),
  };
}

function printUsage() {
  console.log("Usage (run inside packages/nextjs):");
  console.log("  yarn test:x402 -- --articleId=<id> [--baseUrl=<url>] [--authHeader=<value>]");
  console.log("Example:");
  console.log("  yarn test:x402 -- --articleId=1 --baseUrl=http://localhost:3000");
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init, timeoutMs, stepName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out after ${timeoutMs}ms during ${stepName}: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isPositiveNumericString(value) {
  if (!value) return false;
  if (!/^\d+$/.test(value)) return false;
  return BigInt(value) > 0n;
}

async function main() {
  const articleId = getArgValue("--articleId") || process.env.X402_TEST_ARTICLE_ID || process.env.ARTICLE_ID;

  if (!articleId) {
    printUsage();
    throw new Error("Missing required article id. Provide --articleId=<id>.");
  }

  const baseUrl = getArgValue("--baseUrl") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const authHeader = getArgValue("--authHeader") || process.env.X402_TEST_AUTH_HEADER || "test-x402-authorization";

  const timeoutMs = Number(getArgValue("--timeoutMs") || process.env.X402_TEST_TIMEOUT_MS || "15000");
  const expectedNetwork = getArgValue("--expectedNetwork") || process.env.X402_EXPECTED_NETWORK;
  const expectedTokens = (getArgValue("--expectedTokens") || process.env.X402_EXPECTED_TOKENS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/article/${articleId}/content`;

  console.log(`Testing x402 header-gating flow on ${endpoint}`);
  console.log("Note: this script validates 402 + authorization-header behavior, not cryptographic payment proof.");

  console.log("\n[1/2] Requesting content without payment authorization...");
  const firstResponse = await fetchWithTimeout(endpoint, { method: "GET" }, timeoutMs, "unpaid request");
  const firstBody = await parseResponseBody(firstResponse);

  console.log(`Status: ${firstResponse.status}`);
  if (firstResponse.status !== 402) {
    console.error("Expected 402 Payment Required for unpaid access.");
    console.error("If this article is free, choose a paid article id for this test.");
    console.error("Response:", JSON.stringify(firstBody, null, 2));
    process.exit(1);
  }

  const paymentHeaders = readPaymentHeaders(firstResponse);
  console.log("Payment headers:", paymentHeaders);

  if (
    !paymentHeaders.network ||
    !paymentHeaders.token ||
    !paymentHeaders.to ||
    !isPositiveNumericString(paymentHeaders.amount)
  ) {
    console.error("Missing or invalid x402 payment headers in 402 response.");
    process.exit(1);
  }

  if (expectedNetwork && paymentHeaders.network !== expectedNetwork) {
    console.error(`Expected X-PAYMENT-NETWORK=${expectedNetwork} but got ${paymentHeaders.network}.`);
    process.exit(1);
  }

  if (expectedTokens.length > 0 && !expectedTokens.includes(paymentHeaders.token)) {
    console.error(`Expected X-PAYMENT-TOKEN in [${expectedTokens.join(", ")}] but got ${paymentHeaders.token}.`);
    process.exit(1);
  }

  console.log("\n[2/2] Retrying with x-payment-authorization header...");
  const secondResponse = await fetchWithTimeout(
    endpoint,
    {
      method: "GET",
      headers: {
        "x-payment-authorization": authHeader,
      },
    },
    timeoutMs,
    "paid request",
  );
  const secondBody = await parseResponseBody(secondResponse);

  console.log(`Status: ${secondResponse.status}`);
  if (!secondResponse.ok) {
    console.error("Expected successful paid response after authorization header.");
    console.error("Response:", JSON.stringify(secondBody, null, 2));
    process.exit(1);
  }

  if (!secondBody || typeof secondBody === "string") {
    console.error("Expected JSON response body for paid content request.");
    console.error("Response:", JSON.stringify(secondBody, null, 2));
    process.exit(1);
  }

  if (secondBody.isPaid !== true || typeof secondBody.content !== "string") {
    console.error("Expected isPaid=true and content to be a string after payment authorization.");
    console.error("Response:", JSON.stringify(secondBody, null, 2));
    process.exit(1);
  }

  if (paymentHeaders.to && secondBody.author !== paymentHeaders.to) {
    console.error(`Author mismatch: expected ${paymentHeaders.to}, got ${secondBody.author}.`);
    process.exit(1);
  }

  if (paymentHeaders.amount && secondBody.price !== paymentHeaders.amount) {
    console.error(`Price mismatch: expected ${paymentHeaders.amount}, got ${secondBody.price}.`);
    process.exit(1);
  }

  console.log("Paid response summary:");
  console.log(`- author: ${secondBody.author}`);
  console.log(`- price: ${secondBody.price} ${secondBody.priceToken}`);
  console.log(`- content length: ${secondBody.content.length}`);
  console.log("\nPASS: x402 article content flow succeeded.");
}

main().catch(error => {
  console.error("x402 test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
