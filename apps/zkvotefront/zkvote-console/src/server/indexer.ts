import type { VotingPassRecord } from "@/domain/types";

export interface ChainProposalRecord {
  id: string;
  proposalNumber: string;
  creator: string;
  nftContract: string;
  snapshotBlock: number;
  startTime: string;
  endTime: string;
  metadataHash: string;
  metadataUri: string | null;
  optionsHash: string;
  groupRoot: string;
  txHash: string | null;
  createdAt: string;
}

export interface VotingIndexer {
  listPasses(walletAddress?: string | null): Promise<VotingPassRecord[]>;
  listProposals(): Promise<ChainProposalRecord[]>;
  getProposalById(id: string): Promise<ChainProposalRecord | null>;
}
