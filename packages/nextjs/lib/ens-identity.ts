import type { UserProfile } from "~~/lib/ipfs";

export const PAPER_ENS_PARENT = process.env.NEXT_PUBLIC_PAPER_ENS_PARENT || "paper.eth";

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
