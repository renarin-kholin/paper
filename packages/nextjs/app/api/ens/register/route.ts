import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  namehash,
  toBytes,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { normalizeUsernameLabel } from "~~/lib/ens-identity";

const ENS_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "node", type: "bytes32" },
      { internalType: "bytes32", name: "label", type: "bytes32" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "resolver", type: "address" },
      { internalType: "uint64", name: "ttl", type: "uint64" },
    ],
    name: "setSubnodeRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const RESOLVER_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "addr",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "node", type: "bytes32" },
      { internalType: "address", name: "a", type: "address" },
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "node", type: "bytes32" },
      { internalType: "string", name: "newName", type: "string" },
    ],
    name: "setName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ENS_REGISTRY_ADDRESS =
  (process.env.ENS_REGISTRY_ADDRESS as `0x${string}` | undefined) || "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ENS_PUBLIC_RESOLVER_ADDRESS = process.env.ENS_PUBLIC_RESOLVER_ADDRESS as `0x${string}` | undefined;
const ENS_SUBNAME_REGISTRAR_PRIVATE_KEY = process.env.ENS_SUBNAME_REGISTRAR_PRIVATE_KEY as `0x${string}` | undefined;
const PAPER_ENS_PARENT = process.env.NEXT_PUBLIC_PAPER_ENS_PARENT || "paper.eth";
const ENS_CHAIN_ID = Number(process.env.ENS_CHAIN_ID || "11155111");
const ENS_RPC_URL =
  process.env.ENS_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const AUTH_WINDOW_MS = 5 * 60 * 1000;

const chain = ENS_CHAIN_ID === mainnet.id ? mainnet : sepolia;

const zeroAddress = "0x0000000000000000000000000000000000000000";

const assertTxSuccess = (status: string, step: string) => {
  if (status !== "success") {
    throw new Error(`ENS registration failed at step: ${step}`);
  }
};

const ensureConfig = () => {
  if (!ENS_PUBLIC_RESOLVER_ADDRESS) {
    throw new Error("ENS_PUBLIC_RESOLVER_ADDRESS is not configured");
  }
  if (!ENS_SUBNAME_REGISTRAR_PRIVATE_KEY) {
    throw new Error("ENS_SUBNAME_REGISTRAR_PRIVATE_KEY is not configured");
  }
};

const getRegistrarPrivateKey = (): `0x${string}` => {
  const raw = process.env.ENS_SUBNAME_REGISTRAR_PRIVATE_KEY;
  if (!raw) {
    throw new Error("ENS_SUBNAME_REGISTRAR_PRIVATE_KEY is not configured");
  }

  // Allow common env formats: with/without 0x, and accidental wrapping quotes.
  const normalized = raw.trim().replace(/^['\"]|['\"]$/g, "");
  const hex = normalized.startsWith("0x") ? normalized : `0x${normalized}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENS_SUBNAME_REGISTRAR_PRIVATE_KEY must be a 32-byte hex string");
  }

  return hex as `0x${string}`;
};

export async function POST(request: NextRequest) {
  try {
    ensureConfig();

    const body = await request.json();
    const address = body?.address as string | undefined;
    const username = body?.username as string | undefined;
    const message = body?.message as string | undefined;
    const signature = body?.signature as `0x${string}` | undefined;
    const timestamp = Number(body?.timestamp);

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!message || !signature || Number.isNaN(timestamp)) {
      return NextResponse.json({ error: "Missing signature payload" }, { status: 400 });
    }

    if (Math.abs(Date.now() - timestamp) > AUTH_WINDOW_MS) {
      return NextResponse.json({ error: "Signature expired. Please try again." }, { status: 401 });
    }

    const expectedMessage = [
      "Paper ENS subname registration",
      `Username: ${username}`,
      `Address: ${address.toLowerCase()}`,
      `Timestamp: ${timestamp}`,
    ].join("\n");

    if (message !== expectedMessage) {
      return NextResponse.json({ error: "Invalid signature message" }, { status: 401 });
    }

    const isValidSignature = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const label = normalizeUsernameLabel(username);
    if (!label || label.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters after normalization" },
        { status: 400 },
      );
    }

    const fullName = `${label}.${PAPER_ENS_PARENT}`;
    const parentNode = namehash(PAPER_ENS_PARENT);
    const node = namehash(fullName);
    const labelHash = keccak256(toBytes(label));

    const publicClient = createPublicClient({ chain, transport: http(ENS_RPC_URL) });

    const existingOwner = (await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    })) as string;

    if (existingOwner !== zeroAddress && existingOwner.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const existingResolver = (await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    })) as string;

    const account = privateKeyToAccount(getRegistrarPrivateKey());
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(ENS_RPC_URL),
    });

    let resolverToUse = existingResolver as `0x${string}`;

    if (existingOwner === zeroAddress) {
      const registerHash = await walletClient.writeContract({
        account,
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: "setSubnodeRecord",
        args: [parentNode, labelHash, address, ENS_PUBLIC_RESOLVER_ADDRESS!, 0n],
      });

      const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
      assertTxSuccess(registerReceipt.status, "setSubnodeRecord");
      resolverToUse = ENS_PUBLIC_RESOLVER_ADDRESS!;
    }

    if (existingOwner !== zeroAddress && existingResolver === zeroAddress) {
      return NextResponse.json(
        { error: "ENS subname exists but has no resolver set. Please set a resolver and try again." },
        { status: 409 },
      );
    }

    const currentResolvedAddress = (await publicClient.readContract({
      address: resolverToUse,
      abi: RESOLVER_ABI,
      functionName: "addr",
      args: [node],
    })) as string;

    const currentResolvedName = (await publicClient.readContract({
      address: resolverToUse,
      abi: RESOLVER_ABI,
      functionName: "name",
      args: [node],
    })) as string;

    if (currentResolvedAddress.toLowerCase() !== address.toLowerCase()) {
      const setAddrHash = await walletClient.writeContract({
        account,
        address: resolverToUse,
        abi: RESOLVER_ABI,
        functionName: "setAddr",
        args: [node, address],
      });
      const setAddrReceipt = await publicClient.waitForTransactionReceipt({ hash: setAddrHash });
      assertTxSuccess(setAddrReceipt.status, "setAddr");
    }

    if (currentResolvedName !== fullName) {
      const setNameHash = await walletClient.writeContract({
        account,
        address: resolverToUse,
        abi: RESOLVER_ABI,
        functionName: "setName",
        args: [node, fullName],
      });
      const setNameReceipt = await publicClient.waitForTransactionReceipt({ hash: setNameHash });
      assertTxSuccess(setNameReceipt.status, "setName");
    }

    return NextResponse.json({
      ensName: fullName,
      label,
      owner: address,
      network: chain.name,
    });
  } catch (error) {
    console.error("ENS subname registration failed:", error);

    const message = error instanceof Error ? error.message : "Failed to register ENS subname";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
