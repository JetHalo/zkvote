export type VerificationMode = "zkverifyjs-non-aggregation";
export type StatusSource = "zkverifyjs";
export type ProofStatus = "pending" | "includedInBlock" | "finalized" | "error";

export interface ProofEnvelope {
  type: "semaphore";
  proof: string;
  publicSignals: string[];
}

export interface ProofSubmitRequest {
  proofId: string;
  verificationMode: VerificationMode;
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

export interface ProofStatusResponse {
  proofId: string;
  status: ProofStatus;
  rawStatus: string;
  statusSource: StatusSource;
  txHash: string | null;
  blockHash: string | null;
  updatedAt: string;
}

export interface VoteRecord {
  proposalId: string;
  nullifierHash: string;
  choice: string;
  statusSource: StatusSource;
  zkVerifyStatus: ProofStatus;
  txHash: string | null;
  blockHash: string | null;
  timestamp: string;
}

export interface ProposalRecord {
  id: string;
  title: string;
  description: string;
  options: string[];
  nftContract: string;
  snapshotBlock: number;
  startTime: number;
  endTime: number;
  creator: string;
  metadataHash: string;
  optionsHash: string;
  groupRoot: string;
}
