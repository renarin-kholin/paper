import deployedContracts from "~~/contracts/deployedContracts";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const baseSepoliaPaperAddress = process.env.NEXT_PUBLIC_PAPER_CONTRACT_ADDRESS;
const paperAbi = deployedContracts[31337]?.Paper?.abi;

const externalContracts: GenericContractsDeclaration = {};

if (baseSepoliaPaperAddress && paperAbi) {
  externalContracts[84532] = {
    Paper: {
      address: baseSepoliaPaperAddress,
      abi: paperAbi,
    },
  };
}

export default externalContracts satisfies GenericContractsDeclaration;
