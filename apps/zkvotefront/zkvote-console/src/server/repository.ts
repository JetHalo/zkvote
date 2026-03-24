import type {
  CreateProposalInput,
  MembershipRecord,
  MintPassInput,
  ProofStatus,
  ProofStatusResponse,
  ProofSubmitRequest,
  ProposalRecord,
  StatusSource,
  VoteRecord,
  VotingPassRecord
} from "@/domain/types";

export interface StoredProofRecord extends ProofStatusResponse {
  walletAddress: string;
  proposalTitle: string;
  proofReference: string | null;
  businessDomain: string;
  appId: string;
  chainId: number;
  timestamp: number;
}

export interface ProofSubmissionResult {
  status: ProofStatus;
  rawStatus: string;
  txHash: string | null;
  blockHash: string | null;
  proofReference: string | null;
  statusSource: StatusSource;
}

export interface VotingRepository {
  listProposals(walletAddress?: string | null): Promise<ProposalRecord[]>;
  getProposalById(id: string, walletAddress?: string | null): Promise<ProposalRecord | null>;
  listVotes(walletAddress?: string | null): Promise<VoteRecord[]>;
  listPasses(walletAddress?: string | null): Promise<VotingPassRecord[]>;
  mintVotingPass(input: MintPassInput): Promise<VotingPassRecord>;
  createProposal(input: CreateProposalInput): Promise<ProposalRecord>;
  registerMembership(proposalId: string, walletAddress: string, identityCommitment: string): Promise<MembershipRecord>;
  submitProof(payload: ProofSubmitRequest, submission?: ProofSubmissionResult | null): Promise<StoredProofRecord>;
  getProofStatus(proofId: string): Promise<StoredProofRecord | null>;
  saveProofStatus(proof: StoredProofRecord): Promise<StoredProofRecord>;
}
