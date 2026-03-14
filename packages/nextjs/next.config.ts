import type { NextConfig } from "next";

const gatewayUrls = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY,
  process.env.NEXT_PUBLIC_PINATA_GATEWAY,
  process.env.NEXT_PUBLIC_WEB3_STORAGE_GATEWAY,
  "https://ipfs.io/ipfs",
  "https://gateway.pinata.cloud/ipfs",
  "https://w3s.link/ipfs",
].filter(Boolean) as string[];

const gatewayHostnames = Array.from(
  new Set(
    gatewayUrls
      .map(url => {
        try {
          return new URL(url).hostname;
        } catch {
          return null;
        }
      })
      .filter((hostname): hostname is string => Boolean(hostname)),
  ),
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      ...gatewayHostnames.map(hostname => ({
        protocol: "https" as const,
        hostname,
      })),
    ],
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

const isIpfs = process.env.NEXT_PUBLIC_IPFS_BUILD === "true";

if (isIpfs) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

module.exports = nextConfig;
