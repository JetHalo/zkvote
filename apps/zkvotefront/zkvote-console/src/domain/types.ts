export type Language = "en" | "zh";
export type ProposalStatus = "active" | "ended" | "upcoming";
export type ProofStatus = "pending" | "includedInBlock" | "finalized" | "error";
export type StatusSource = "zkverifyjs";

export interface ProposalRecord {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  totalVotes: number;
  finalizedVotes: number;
  optionTallies: { option: string; votes: number }[];
  endTime: string;
  startTime: string;
  snapshotBlock: number;
  options: string[];
  nftSource: string;
  eligible: boolean;
  voted: boolean;
  turnout: number;
  nftContract: string;
  creator: string;
  metadataHash: string;
  metadataUri: string | null;
  optionsHash: string;
  groupRoot: string;
  txHash: string | null;
  createdAt: string;
}

export interface VotingPassRecord {
  tokenId: string;
  ownerAddress: string;
  mintedAt: string;
  txHash: string;
  contractAddress: string | null;
  chainId: number;
  transferable: true;
}

export interface VoteRecord {
  proposalId: string;
  proposalTitle: string;
  option: string;
  proofStatus: ProofStatus;
  proofId: string;
  nullifierHash: string;
  submittedAt: string;
  updatedAt: string;
  statusSource: StatusSource;
  txHash: string | null;
  walletAddress: string;
}

export interface ProofStatusResponse {
  proofId: string;
  proposalId: string;
  nullifierHash: string;
  txHash: string | null;
  blockHash: string | null;
  rawStatus: string;
  status: ProofStatus;
  statusSource: StatusSource;
  submittedAt: string;
  updatedAt: string;
  selectedOption: string;
}

export interface MembershipRecord {
  proposalId: string;
  walletAddress: string;
  identityCommitment: string;
  groupMembers: string[];
  groupRoot: string;
  registeredAt: string;
}

export interface CreateProposalInput {
  proposalId?: string;
  title: string;
  description: string;
  nftContract: string;
  snapshotBlock: number;
  metadataHash?: string;
  metadataUri?: string | null;
  startTime: string;
  endTime: string;
  options: string[];
  optionsHash?: string;
  groupRoot?: string;
  txHash?: string | null;
  creator: string;
}

export interface MintPassInput {
  walletAddress: string;
  tokenId?: string;
  txHash?: string;
  contractAddress?: string | null;
  chainId?: number;
}

export interface ProofEnvelope {
  type: "semaphore";
  proof: string;
  publicSignals: string[];
  merkleTreeDepth: number;
}

export interface ProofSubmitRequest {
  proofId: string;
  businessDomain: string;
  appId: string;
  userAddr: string;
  proposalId: string;
  choice: string;
  nullifierHash: string;
  chainId: number;
  timestamp: number;
  proof: ProofEnvelope;
}

export interface AppConfig {
  appName: string;
  defaultLanguage: Language;
  chainName: string;
  chainId: number;
  rpcUrl: string;
  nftContractAddress: string | null;
  proposalRegistryAddress: string | null;
  ipfsGatewayUrl: string;
  ipfsConfigured: boolean;
  proofRoute: "zkverifyjs-non-aggregation";
  proofSystem: "groth16";
  proofProtocol: "semaphore";
  serviceMode: "memory" | "postgresql";
  goldskyConfigured: boolean;
  zkVerifyConfigured: boolean;
}
