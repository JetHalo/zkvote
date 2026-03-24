import crypto from "node:crypto";
import { mockMyVotes, mockProposals } from "@/lib/mockData";
import type {
  CreateProposalInput,
  MembershipRecord,
  ProposalRecord,
  VoteRecord,
  VotingPassRecord
} from "@/domain/types";
import { getPublicAppConfig } from "@/server/env";
import { buildOptionTallies } from "@/server/option-tallies";
import type { ProofSubmissionResult, StoredProofRecord, VotingRepository } from "@/server/repository";

interface MemoryStore {
  proposals: ProposalRecord[];
  proofs: Map<string, StoredProofRecord>;
  votes: VoteRecord[];
  memberships: Map<string, MembershipRecord>;
  passes: VotingPassRecord[];
  usedNullifiers: Set<string>;
  nextProposalSequence: number;
  nextTokenId: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __zkvoteConsoleMemoryStore__: MemoryStore | undefined;
}

function shaHex(value: string): string {
  return `0x${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function toUtcDisplay(value: string): string {
  return value.replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC");
}

function nowIso(): string {
  return new Date().toISOString();
}

function proposalIdNumber(id: string): number {
  const numeric = Number(id.replace(/\D+/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseDisplayDate(value: string): number {
  const normalized = value.includes("UTC") ? value.replace(" UTC", "Z").replace(" ", "T") : value;
  return new Date(normalized).getTime();
}

function deriveProposalStatus(record: ProposalRecord): ProposalRecord["status"] {
  const now = Date.now();
  const start = parseDisplayDate(record.startTime);
  const end = parseDisplayDate(record.endTime);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

function seedProposals(): ProposalRecord[] {
  return mockProposals.map((proposal) => ({
    ...proposal,
    nftContract: getPublicAppConfig().nftContractAddress ?? "0x0000000000000000000000000000000000000001",
    creator: "0x000000000000000000000000000000000000beef",
    metadataHash: shaHex(`${proposal.title}|${proposal.description}`),
    metadataUri: null,
    optionsHash: shaHex(proposal.options.join("|")),
    groupRoot: shaHex(`${proposal.id}|group-root`),
    txHash: null,
    startTime: proposal.status === "upcoming" ? "2026-03-19 00:00 UTC" : "2026-03-01 00:00 UTC",
    createdAt: "2026-03-01T00:00:00.000Z"
  }));
}

function seedVotes(): VoteRecord[] {
  return mockMyVotes.map((vote, index) => ({
    ...vote,
    updatedAt: vote.submittedAt,
    txHash: `0xvote${String(index + 1).padStart(60, "0")}`,
    walletAddress: "0x7a3f00000000000000000000000000000000e91b"
  }));
}

function seedProofs(votes: VoteRecord[]): Map<string, StoredProofRecord> {
  const proposals = seedProposals();
  const config = getPublicAppConfig();

  return new Map(
    votes.map((vote) => {
      const proposal = proposals.find((item) => item.id === vote.proposalId || vote.proposalTitle.includes(item.id));
      const proof: StoredProofRecord = {
        proofId: vote.proofId,
        proposalId: proposal?.id ?? vote.proposalId,
        proposalTitle: proposal?.title ?? vote.proposalTitle,
        walletAddress: vote.walletAddress,
        nullifierHash: vote.nullifierHash,
        txHash: vote.txHash,
        blockHash: vote.proofStatus === "finalized" ? shaHex(vote.proofId) : null,
        rawStatus: vote.proofStatus,
        status: vote.proofStatus,
        statusSource: vote.statusSource,
        submittedAt: vote.submittedAt,
        updatedAt: vote.updatedAt,
        selectedOption: vote.option,
        proofReference: vote.proofId,
        businessDomain: "zkvote",
        appId: "zkvote-console",
        chainId: config.chainId,
        timestamp: Math.floor(new Date(vote.submittedAt).getTime() / 1000)
      };

      return [vote.proofId, proof];
    })
  );
}

function buildInitialStore(): MemoryStore {
  const proposals = seedProposals();
  const votes = seedVotes();

  return {
    proposals,
    proofs: seedProofs(votes),
    votes,
    memberships: new Map<string, MembershipRecord>(),
    passes: [],
    usedNullifiers: new Set(votes.map((vote) => vote.nullifierHash)),
    nextProposalSequence: Math.max(...proposals.map((item) => proposalIdNumber(item.id)), 0) + 1,
    nextTokenId: 1
  };
}

function getStore(): MemoryStore {
  if (!global.__zkvoteConsoleMemoryStore__) {
    global.__zkvoteConsoleMemoryStore__ = buildInitialStore();
  }

  return global.__zkvoteConsoleMemoryStore__;
}

function membershipKey(proposalId: string, walletAddress: string): string {
  return `${proposalId.toLowerCase()}::${walletAddress.toLowerCase()}`;
}

function hasVotingPass(walletAddress?: string | null): boolean {
  if (!walletAddress) return false;
  const normalized = walletAddress.toLowerCase();
  return getStore().passes.some((pass) => pass.ownerAddress.toLowerCase() === normalized);
}

function hasWalletVoted(proposalId: string, walletAddress?: string | null): boolean {
  if (!walletAddress) return false;
  const normalized = walletAddress.toLowerCase();
  return getStore().votes.some(
    (vote) => vote.proposalId === proposalId && vote.walletAddress.toLowerCase() === normalized
  );
}

function appendVoteFromProof(record: StoredProofRecord): void {
  const store = getStore();
  const exists = store.votes.some((vote) => vote.proofId === record.proofId);
  if (exists) return;

  const proposal = store.proposals.find((item) => item.id === record.proposalId);
  const vote: VoteRecord = {
    proposalId: record.proposalId,
    proposalTitle: proposal ? `${proposal.id}: ${proposal.title}` : record.proposalTitle,
    option: record.selectedOption,
    proofStatus: "finalized",
    proofId: record.proofId,
    nullifierHash: record.nullifierHash,
    submittedAt: record.submittedAt,
    updatedAt: record.updatedAt,
    statusSource: record.statusSource,
    txHash: record.txHash,
    walletAddress: record.walletAddress
  };

  store.votes.unshift(vote);
  if (proposal) {
    proposal.totalVotes += 1;
    proposal.finalizedVotes += 1;
    proposal.optionTallies = buildOptionTallies(
      proposal.options,
      store.votes
        .filter((vote) => vote.proposalId === proposal.id)
        .map((vote) => ({ option: vote.option, proofStatus: vote.proofStatus }))
    );
    proposal.turnout = Number(
      Math.min(100, (proposal.finalizedVotes / Math.max(1, proposal.finalizedVotes + 300)) * 100).toFixed(1)
    );
    proposal.voted = true;
  }
}

export function createMemoryVotingRepository(): VotingRepository {
  return {
    async listProposals(walletAddress?: string | null) {
      return getStore().proposals.map((proposal) => ({
        ...proposal,
        status: deriveProposalStatus(proposal),
        optionTallies: buildOptionTallies(
          proposal.options,
          getStore()
            .votes.filter((vote) => vote.proposalId === proposal.id)
            .map((vote) => ({ option: vote.option, proofStatus: vote.proofStatus }))
        ),
        eligible: walletAddress ? hasVotingPass(walletAddress) : proposal.eligible,
        voted: walletAddress ? hasWalletVoted(proposal.id, walletAddress) : proposal.voted
      }));
    },
    async getProposalById(id: string, walletAddress?: string | null) {
      const proposal = (await this.listProposals(walletAddress)).find((item) => item.id === id);
      return proposal ?? null;
    },
    async listVotes(walletAddress?: string | null) {
      if (!walletAddress) {
        return getStore().votes;
      }

      const normalized = walletAddress.toLowerCase();
      return getStore().votes.filter((vote) => vote.walletAddress.toLowerCase() === normalized);
    },
    async listPasses(walletAddress?: string | null) {
      if (!walletAddress) return getStore().passes;
      const normalized = walletAddress.toLowerCase();
      return getStore().passes.filter((pass) => pass.ownerAddress.toLowerCase() === normalized);
    },
    async mintVotingPass(input) {
      const store = getStore();
      const config = getPublicAppConfig();
      const tokenId = input.tokenId ?? String(store.nextTokenId++);
      const providedTokenId = input.tokenId ? Number(input.tokenId) : null;
      if (providedTokenId && Number.isFinite(providedTokenId)) {
        store.nextTokenId = Math.max(store.nextTokenId, providedTokenId + 1);
      }
      const pass: VotingPassRecord = {
        tokenId,
        ownerAddress: input.walletAddress,
        mintedAt: nowIso(),
        txHash: input.txHash ?? shaHex(`${input.walletAddress}|${tokenId}|mint`),
        contractAddress: input.contractAddress ?? config.nftContractAddress,
        chainId: input.chainId ?? config.chainId,
        transferable: true
      };

      store.passes.unshift(pass);
      return pass;
    },
    async createProposal(input: CreateProposalInput) {
      const store = getStore();
      const id = input.proposalId ?? `ZKP-${store.nextProposalSequence++}`;
      const providedProposalNumber = input.proposalId ? proposalIdNumber(input.proposalId) : null;
      if (providedProposalNumber && Number.isFinite(providedProposalNumber)) {
        store.nextProposalSequence = Math.max(store.nextProposalSequence, providedProposalNumber + 1);
      }
      const metadataHash = input.metadataHash || shaHex(`${input.title}|${input.description}|${id}`);
      const optionsHash = input.optionsHash || shaHex(input.options.join("|"));
      const createdAt = nowIso();
      const proposal: ProposalRecord = {
        id,
        title: input.title,
        description: input.description,
        status: deriveProposalStatus({
          id,
          title: input.title,
          description: input.description,
          status: "upcoming",
          totalVotes: 0,
          finalizedVotes: 0,
          optionTallies: input.options.map((option) => ({ option, votes: 0 })),
          endTime: toUtcDisplay(new Date(input.endTime).toISOString()),
          startTime: toUtcDisplay(new Date(input.startTime).toISOString()),
          snapshotBlock: input.snapshotBlock,
          options: input.options,
          nftSource: "Voting Pass NFT",
          eligible: false,
          voted: false,
          turnout: 0,
          nftContract: input.nftContract,
          creator: input.creator,
          metadataHash,
          metadataUri: input.metadataUri ?? null,
          optionsHash,
          groupRoot: input.groupRoot || "0x",
          txHash: input.txHash ?? shaHex(`${id}|${createdAt}|proposal`),
          createdAt
        }),
        totalVotes: 0,
        finalizedVotes: 0,
        optionTallies: input.options.map((option) => ({ option, votes: 0 })),
        endTime: toUtcDisplay(new Date(input.endTime).toISOString()),
        startTime: toUtcDisplay(new Date(input.startTime).toISOString()),
        snapshotBlock: input.snapshotBlock,
        options: input.options,
        nftSource: "Voting Pass NFT",
        eligible: hasVotingPass(input.creator),
        voted: false,
        turnout: 0,
        nftContract: input.nftContract,
        creator: input.creator,
        metadataHash,
        metadataUri: input.metadataUri ?? null,
        optionsHash,
        groupRoot: input.groupRoot || "0x",
        txHash: input.txHash ?? shaHex(`${id}|${createdAt}|proposal`),
        createdAt
      };

      store.proposals.unshift(proposal);
      return proposal;
    },
    async registerMembership(proposalId: string, walletAddress: string, identityCommitment: string) {
      const store = getStore();
      const key = membershipKey(proposalId, walletAddress);
      const existing = store.memberships.get(key);
      if (existing) {
        return existing;
      }

      const groupMembers = Array.from(
        new Set([
          ...Array.from(store.memberships.values())
            .filter((item) => item.proposalId === proposalId)
            .flatMap((item) => item.groupMembers),
          identityCommitment
        ])
      );

      const membership: MembershipRecord = {
        proposalId,
        walletAddress,
        identityCommitment,
        groupMembers,
        groupRoot: shaHex(groupMembers.join("|")),
        registeredAt: nowIso()
      };

      store.memberships.set(key, membership);
      const proposal = store.proposals.find((item) => item.id === proposalId);
      if (proposal && (proposal.groupRoot === "0x" || proposal.groupRoot.length === 0)) {
        proposal.groupRoot = membership.groupRoot;
      }

      return membership;
    },
    async submitProof(payload, submission?: ProofSubmissionResult | null) {
      const store = getStore();
      const proposal = store.proposals.find((item) => item.id === payload.proposalId);
      if (!proposal) {
        throw new Error("PROPOSAL_NOT_FOUND");
      }

      if (store.usedNullifiers.has(payload.nullifierHash)) {
        const existing = Array.from(store.proofs.values()).find((proof) => proof.nullifierHash === payload.nullifierHash);

        if (!existing || existing.status !== "error") {
          throw new Error("DUPLICATE_NULLIFIER");
        }

        store.proofs.delete(existing.proofId);
      } else {
        store.usedNullifiers.add(payload.nullifierHash);
      }

      const proofRecord: StoredProofRecord = {
        proofId: payload.proofId,
        proposalId: payload.proposalId,
        proposalTitle: proposal.title,
        walletAddress: payload.userAddr,
        nullifierHash: payload.nullifierHash,
        txHash: submission?.txHash ?? shaHex(`${payload.proofId}|tx`),
        blockHash: submission?.blockHash ?? null,
        rawStatus: submission?.rawStatus ?? "Pending",
        status: submission?.status ?? "pending",
        statusSource: submission?.statusSource ?? "zkverifyjs",
        submittedAt: nowIso(),
        updatedAt: nowIso(),
        selectedOption: payload.choice,
        proofReference: submission?.proofReference ?? payload.proofId,
        businessDomain: payload.businessDomain,
        appId: payload.appId,
        chainId: payload.chainId,
        timestamp: payload.timestamp
      };

      store.proofs.set(payload.proofId, proofRecord);
      if (proofRecord.status === "finalized") {
        appendVoteFromProof(proofRecord);
      }

      return proofRecord;
    },
    async getProofStatus(proofId: string) {
      return getStore().proofs.get(proofId) ?? null;
    },
    async saveProofStatus(proof: StoredProofRecord) {
      const store = getStore();
      store.proofs.set(proof.proofId, proof);
      if (proof.status === "finalized") {
        appendVoteFromProof(proof);
      }

      return proof;
    }
  };
}
