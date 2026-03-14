import type { UserProfile } from "~~/lib/ipfs";
import { createPublicClient, http, namehash } from "viem";
import { baseSepolia, mainnet, sepolia } from "viem/chains";

export const PAPER_ENS_PARENT = process.env.NEXT_PUBLIC_PAPER_ENS_PARENT || "paper.eth";

const RESOLVER_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "addr",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ENS_REGISTRY_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const UNIVERSAL_RESOLVER_ADDRESS = "0x74E20Bd2A1fE2cd5C60418f891B51B89eb2909E5";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

const ENS_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ENS_CHAIN_ID || "11155111");

const getEnsChain = () => {
  if (ENS_CHAIN_ID === mainnet.id) return mainnet;
  if (ENS_CHAIN_ID === sepolia.id) return sepolia;
  if (ENS_CHAIN_ID === baseSepolia.id) return baseSepolia;
  return baseSepolia;
};

const ensClient = createPublicClient({
  chain: getEnsChain(),
  transport: http(ENS_CHAIN_ID === baseSepolia.id ? BASE_SEPOLIA_RPC : (process.env.ENS_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com")),
});

const getRegistryAddress = () => {
  // ENS Registry is at the same address across Ethereum and Base
  return ENS_REGISTRY_ADDRESS;
};

export async function resolveEnsAddress(name: string): Promise<string | null> {
  try {
    const node = namehash(name);
    const registryAddress = getRegistryAddress();

    // Try Universal Resolver first (only on Ethereum networks)
    if (ENS_CHAIN_ID !== baseSepolia.id) {
      try {
        const result = await ensClient.readContract({
          address: UNIVERSAL_RESOLVER_ADDRESS,
          abi: RESOLVER_ABI,
          functionName: "addr",
          args: [node],
        });
        if (result && result !== "0x0000000000000000000000000000000000000000") {
          return result as string;
        }
      } catch {
        // Fall back to registry
      }
    }

    // Fall back to ENS Registry
    const owner = await ensClient.readContract({
      address: registryAddress,
      abi: ENS_REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    });

    if (owner && owner !== "0x0000000000000000000000000000000000000000") {
      // Get resolver and then address
      const resolverAddr = await ensClient.readContract({
        address: registryAddress,
        abi: ENS_REGISTRY_ABI,
        functionName: "resolver",
        args: [node],
      });

      if (resolverAddr && resolverAddr !== "0x0000000000000000000000000000000000000000") {
        try {
          const resolvedAddr = await ensClient.readContract({
            address: resolverAddr as string,
            abi: RESOLVER_ABI,
            functionName: "addr",
            args: [node],
          });
          return resolvedAddr as string;
        } catch {
          // Ignore
        }
      }
      return owner as string;
    }

    return null;
  } catch (error) {
    console.error("ENS resolution error:", error);
    return null;
  }
}

const slugifyLabel = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
};

export const normalizeUsernameLabel = (value?: string | null) => {
  if (!value) return "";
  return slugifyLabel(value).slice(0, 24);
};

export const buildPaperSubdomain = (label: string) => {
  return `${label}.${PAPER_ENS_PARENT}`;
};

export const generatePaperSubdomain = (address: string, preferredName?: string) => {
  const suffix = address.slice(2, 8).toLowerCase();
  const baseFromName = normalizeUsernameLabel(preferredName).slice(0, 24);

  if (baseFromName) {
    return buildPaperSubdomain(baseFromName);
  }

  return buildPaperSubdomain(`writer-${suffix}`);
};

export const resolveUsername = ({
  ensName,
  profile,
  address,
}: {
  ensName?: string | null;
  profile?: UserProfile | null;
  address?: string;
}) => {
  if (ensName) return ensName;
  if (profile?.ensSubdomain) return profile.ensSubdomain;
  if (address) return generatePaperSubdomain(address, profile?.username || profile?.name);
  return `writer.${PAPER_ENS_PARENT}`;
};
