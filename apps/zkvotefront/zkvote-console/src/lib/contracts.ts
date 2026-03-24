import { BrowserProvider, Contract, Interface, ZeroAddress } from "ethers";

export const VOTING_PASS_ABI = [
  "function mint() returns (uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
] as const;

export const PROPOSAL_REGISTRY_ABI = [
  "function createProposal(address nftContract, uint256 snapshotBlock, uint256 startTime, uint256 endTime, bytes32 metadataHash, bytes32 optionsHash, string metadataUri) returns (uint256 proposalId)",
  "function nextProposalId() view returns (uint256)",
  "event ProposalCreated(uint256 indexed id, address indexed creator, address indexed nftContract)"
] as const;

async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  if (!globalThis.crypto?.subtle) {
    throw new Error("WEB_CRYPTO_UNAVAILABLE");
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

interface ReceiptLike {
  hash?: string | null;
  logs?: Array<{
    topics?: readonly string[] | string[];
    data?: string;
  }>;
}

function ensureWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("WALLET_NOT_AVAILABLE");
  }

  return window.ethereum;
}

async function getSigner(expectedChainId: number) {
  const provider = new BrowserProvider(ensureWallet() as never);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== expectedChainId) {
    throw new Error("WRONG_CHAIN");
  }

  const signer = await provider.getSigner();
  return { provider, signer };
}

function requireTxHash(receipt: ReceiptLike): string {
  if (!receipt.hash) {
    throw new Error("TRANSACTION_HASH_MISSING");
  }

  return receipt.hash;
}

export function hashProposalOptions(options: string[]): Promise<string> {
  return sha256Text(options.join("|"));
}

export function hashProposalMetadataInput(payload: {
  title: string;
  description: string;
  snapshotBlock: number;
  startTime: string;
  endTime: string;
  options: string[];
  creator: string;
  nftContract: string;
}): Promise<string> {
  return sha256Text(
    JSON.stringify({
      title: payload.title,
      description: payload.description,
      snapshotBlock: payload.snapshotBlock,
      startTime: payload.startTime,
      endTime: payload.endTime,
      options: payload.options,
      creator: payload.creator,
      nftContract: payload.nftContract
    })
  );
}

export function extractMintedPassReceipt(receipt: ReceiptLike): { tokenId: string; txHash: string } {
  const iface = new Interface(VOTING_PASS_ABI);

  for (const log of receipt.logs ?? []) {
    if (!log.topics || !log.data) {
      continue;
    }

    const parsed = iface.parseLog({
      topics: [...log.topics],
      data: log.data
    });

    if (parsed?.name === "Transfer" && String(parsed.args.from).toLowerCase() === ZeroAddress) {
      return {
        tokenId: parsed.args.tokenId.toString(),
        txHash: requireTxHash(receipt)
      };
    }
  }

  throw new Error("TOKEN_ID_NOT_FOUND");
}

export function extractProposalCreatedReceipt(receipt: ReceiptLike): { proposalId: string; txHash: string } {
  const iface = new Interface(PROPOSAL_REGISTRY_ABI);

  for (const log of receipt.logs ?? []) {
    if (!log.topics || !log.data) {
      continue;
    }

    const parsed = iface.parseLog({
      topics: [...log.topics],
      data: log.data
    });

    if (parsed?.name === "ProposalCreated") {
      return {
        proposalId: `ZKP-${parsed.args.id.toString()}`,
        txHash: requireTxHash(receipt)
      };
    }
  }

  throw new Error("PROPOSAL_ID_NOT_FOUND");
}

export async function mintVotingPassOnchain(input: {
  contractAddress: string;
  expectedChainId: number;
}) {
  const { signer } = await getSigner(input.expectedChainId);
  const contract = new Contract(input.contractAddress, VOTING_PASS_ABI, signer);
  const tx = await contract.mint();
  const receipt = await tx.wait();

  return extractMintedPassReceipt(receipt);
}

export async function createProposalOnchain(input: {
  proposalRegistryAddress: string;
  expectedChainId: number;
  title: string;
  description: string;
  nftContract: string;
  snapshotBlock: number;
  startTime: string;
  endTime: string;
  options: string[];
  creator: string;
  metadataHash: string;
  metadataUri: string | null;
}) {
  const { signer } = await getSigner(input.expectedChainId);
  const contract = new Contract(input.proposalRegistryAddress, PROPOSAL_REGISTRY_ABI, signer);

  const optionsHash = await hashProposalOptions(input.options);

  const tx = await contract.createProposal(
    input.nftContract,
    BigInt(input.snapshotBlock),
    BigInt(Math.floor(new Date(input.startTime).getTime() / 1000)),
    BigInt(Math.floor(new Date(input.endTime).getTime() / 1000)),
    input.metadataHash,
    optionsHash,
    input.metadataUri ?? ""
  );

  const receipt = await tx.wait();
  const created = extractProposalCreatedReceipt(receipt);

  return {
    ...created,
    metadataHash: input.metadataHash,
    metadataUri: input.metadataUri ?? null,
    optionsHash
  };
}
