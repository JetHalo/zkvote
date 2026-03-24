import type {
  CreateProposalInput,
  MembershipRecord,
  MintPassInput,
  ProofSubmitRequest,
  ProposalRecord,
  VoteRecord,
  VotingPassRecord
} from "@/domain/types";
import type { ChainProposalRecord, VotingIndexer } from "@/server/indexer";
import { buildOptionTallies } from "@/server/option-tallies";
import type { ProofSubmissionResult, StoredProofRecord, VotingRepository } from "@/server/repository";

export interface ProposalMetadataPayload {
  title: string;
  description: string;
  snapshotBlock: number;
  startTime: string;
  endTime: string;
  options: string[];
  creator: string;
  nftContract: string;
}

export interface ProposalMetadataReference {
  cid: string;
  uri: string;
  hash: string;
  payload?: ProposalMetadataPayload;
}

export interface ProposalMetadataStore {
  storeProposalMetadata(payload: ProposalMetadataPayload): Promise<ProposalMetadataReference>;
  getProposalMetadata(uri: string): Promise<ProposalMetadataPayload | null>;
}

export interface ProofVerificationSnapshot extends ProofSubmissionResult {}

export interface ProofVerificationSubmission extends ProofSubmissionResult {
  finalResult?: Promise<ProofVerificationSnapshot>;
}

export interface ProofVerificationAdapter {
  submitProof(payload: ProofSubmitRequest): Promise<ProofVerificationSubmission | null>;
  getProofStatus(proof: StoredProofRecord): Promise<ProofVerificationSnapshot | null>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toUtcDisplay(value: string): string {
  return value.replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC");
}

function parseDisplayDate(value: string): number {
  const normalized = value.includes("UTC") ? value.replace(" UTC", "Z").replace(" ", "T") : value;
  return new Date(normalized).getTime();
}

function deriveProposalStatus(startTime: string, endTime: string): ProposalRecord["status"] {
  const now = Date.now();
  const start = parseDisplayDate(startTime);
  const end = parseDisplayDate(endTime);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

function mergePassRecords(chainPasses: VotingPassRecord[], storedPasses: VotingPassRecord[]): VotingPassRecord[] {
  const byTokenId = new Map<string, VotingPassRecord>();

  for (const pass of storedPasses) {
    byTokenId.set(pass.tokenId, pass);
  }

  for (const pass of chainPasses) {
    byTokenId.set(pass.tokenId, pass);
  }

  return Array.from(byTokenId.values()).sort(
    (left, right) => new Date(right.mintedAt).getTime() - new Date(left.mintedAt).getTime()
  );
}

function mergeProposalRecord(
  chainProposal: ChainProposalRecord,
  storedProposal: ProposalRecord | undefined,
  recoveredMetadata: ProposalMetadataPayload | null,
  walletHasPass: boolean
): ProposalRecord {
  const startTime = toUtcDisplay(chainProposal.startTime);
  const endTime = toUtcDisplay(chainProposal.endTime);
  const fallbackTitle = `Proposal ${chainProposal.id}`;
  const fallbackDescription = "On-chain proposal detected, but metadata is unavailable in the application database.";
  const resolvedMetadataUri = storedProposal?.metadataUri ?? chainProposal.metadataUri ?? null;

  return {
    id: chainProposal.id,
    title: storedProposal?.title ?? recoveredMetadata?.title ?? fallbackTitle,
    description:
      storedProposal?.description ??
      recoveredMetadata?.description ??
      fallbackDescription,
    status: deriveProposalStatus(startTime, endTime),
    totalVotes: storedProposal?.totalVotes ?? 0,
    finalizedVotes: storedProposal?.finalizedVotes ?? 0,
    optionTallies:
      storedProposal?.optionTallies ??
      buildOptionTallies(storedProposal?.options ?? recoveredMetadata?.options ?? [], []),
    startTime,
    endTime,
    snapshotBlock: chainProposal.snapshotBlock,
    options: storedProposal?.options ?? recoveredMetadata?.options ?? [],
    nftSource: storedProposal?.nftSource ?? "Voting Pass NFT",
    eligible: walletHasPass,
    voted: storedProposal?.voted ?? false,
    turnout: storedProposal?.turnout ?? 0,
    nftContract: chainProposal.nftContract,
    creator: chainProposal.creator,
    metadataHash: chainProposal.metadataHash,
    metadataUri: resolvedMetadataUri,
    optionsHash: chainProposal.optionsHash,
    groupRoot: chainProposal.groupRoot,
    txHash: chainProposal.txHash ?? storedProposal?.txHash ?? null,
    createdAt: chainProposal.createdAt
  };
}

function applyVerificationSnapshot(
  proof: StoredProofRecord,
  snapshot: ProofVerificationSnapshot
): StoredProofRecord {
  return {
    ...proof,
    status: snapshot.status,
    rawStatus: snapshot.rawStatus,
    txHash: snapshot.txHash ?? proof.txHash,
    blockHash: snapshot.blockHash ?? proof.blockHash,
    proofReference: snapshot.proofReference ?? proof.proofReference,
    statusSource: snapshot.statusSource,
    updatedAt: nowIso()
  };
}

function shouldExposeStoredProposalInIndexedMode(proposal: ProposalRecord): boolean {
  return Boolean(proposal.txHash || proposal.metadataUri);
}

export function createVotingService(deps: {
  repository: VotingRepository;
  metadataStore: ProposalMetadataStore | null;
  verifier: ProofVerificationAdapter | null;
  indexer?: VotingIndexer | null;
}) {
  const { repository, metadataStore, verifier, indexer = null } = deps;

  async function recoverChainProposalMetadata(
    chainProposal: ChainProposalRecord,
    storedProposal: ProposalRecord | undefined
  ): Promise<ProposalMetadataPayload | null> {
    if (storedProposal || !metadataStore || !chainProposal.metadataUri) {
      return null;
    }

    try {
      return await metadataStore.getProposalMetadata(chainProposal.metadataUri);
    } catch {
      return null;
    }
  }

  async function listPassesWithIndexer(walletAddress?: string | null): Promise<VotingPassRecord[]> {
    const [storedPasses, chainPasses] = await Promise.all([
      repository.listPasses(walletAddress),
      indexer ? indexer.listPasses(walletAddress) : Promise.resolve([])
    ]);

    return mergePassRecords(chainPasses, storedPasses);
  }

  async function walletHasPass(walletAddress?: string | null): Promise<boolean> {
    if (!walletAddress) {
      return false;
    }

    const passes = await listPassesWithIndexer(walletAddress);
    return passes.length > 0;
  }

  return {
    async listProposals(walletAddress?: string | null): Promise<ProposalRecord[]> {
      const [storedProposals, chainProposals, hasPass] = await Promise.all([
        repository.listProposals(walletAddress),
        indexer ? indexer.listProposals() : Promise.resolve([]),
        walletHasPass(walletAddress)
      ]);

      if (!indexer) {
        return storedProposals;
      }

      const storedById = new Map(storedProposals.map((proposal) => [proposal.id, proposal]));
      const merged = await Promise.all(
        chainProposals.map(async (proposal) =>
          mergeProposalRecord(
            proposal,
            storedById.get(proposal.id),
            await recoverChainProposalMetadata(proposal, storedById.get(proposal.id)),
            hasPass
          )
        )
      );
      const seenIds = new Set(merged.map((proposal) => proposal.id));

      for (const proposal of storedProposals) {
        if (!seenIds.has(proposal.id) && shouldExposeStoredProposalInIndexedMode(proposal)) {
          merged.push({
            ...proposal,
            eligible: walletAddress ? hasPass : proposal.eligible
          });
        }
      }

      return merged.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    },
    async getProposalById(id: string, walletAddress?: string | null): Promise<ProposalRecord | null> {
      const [storedProposal, chainProposal, hasPass] = await Promise.all([
        repository.getProposalById(id, walletAddress),
        indexer ? indexer.getProposalById(id) : Promise.resolve(null),
        walletHasPass(walletAddress)
      ]);

      if (!indexer || !chainProposal) {
        return storedProposal;
      }

      return mergeProposalRecord(
        chainProposal,
        storedProposal ?? undefined,
        await recoverChainProposalMetadata(chainProposal, storedProposal ?? undefined),
        hasPass
      );
    },
    listVotes(walletAddress?: string | null): Promise<VoteRecord[]> {
      return repository.listVotes(walletAddress);
    },
    listPasses(walletAddress?: string | null): Promise<VotingPassRecord[]> {
      return listPassesWithIndexer(walletAddress);
    },
    mintVotingPass(input: MintPassInput): Promise<VotingPassRecord> {
      return repository.mintVotingPass(input);
    },
    async prepareProposalMetadata(payload: ProposalMetadataPayload): Promise<ProposalMetadataReference> {
      if (!metadataStore) {
        throw new Error("IPFS_NOT_CONFIGURED");
      }

      return metadataStore.storeProposalMetadata(payload);
    },
    async createProposal(input: CreateProposalInput): Promise<ProposalRecord> {
      if (!(await walletHasPass(input.creator))) {
        throw new Error("NFT_PASS_REQUIRED");
      }

      let metadataHash = input.metadataHash;
      let metadataUri = input.metadataUri ?? null;

      if (metadataStore && !metadataUri) {
        const stored = await metadataStore.storeProposalMetadata({
          title: input.title,
          description: input.description,
          snapshotBlock: input.snapshotBlock,
          startTime: input.startTime,
          endTime: input.endTime,
          options: input.options,
          creator: input.creator,
          nftContract: input.nftContract
        });

        metadataHash = metadataHash ?? stored.hash;
        metadataUri = stored.uri;
      }

      return repository.createProposal({
        ...input,
        metadataHash,
        metadataUri
      });
    },
    registerMembership(
      proposalId: string,
      walletAddress: string,
      identityCommitment: string
    ): Promise<MembershipRecord> {
      return (async () => {
        if (!(await walletHasPass(walletAddress))) {
          throw new Error("NFT_PASS_REQUIRED");
        }

        return repository.registerMembership(proposalId, walletAddress, identityCommitment);
      })();
    },
    async submitProof(payload: ProofSubmitRequest): Promise<StoredProofRecord> {
      const submission = verifier ? await verifier.submitProof(payload) : null;
      const proof = await repository.submitProof(payload, submission);

      if (submission?.finalResult) {
        void submission.finalResult
          .then(async (snapshot) => {
            const current = await repository.getProofStatus(proof.proofId);
            if (!current || current.status === "finalized" || current.status === "error") {
              return;
            }

            await repository.saveProofStatus(applyVerificationSnapshot(current, snapshot));
          })
          .catch(async (error) => {
            const current = await repository.getProofStatus(proof.proofId);
            if (!current || current.status === "finalized") {
              return;
            }

            await repository.saveProofStatus({
              ...current,
              status: "error",
              rawStatus: error instanceof Error ? error.message : "ZKVERIFY_SUBMISSION_FAILED",
              updatedAt: nowIso()
            });
          });
      }

      return proof;
    },
    async getProofStatus(proofId: string): Promise<StoredProofRecord | null> {
      const proof = await repository.getProofStatus(proofId);
      if (!proof) {
        return null;
      }

      if (!verifier || proof.status === "finalized" || proof.status === "error") {
        return proof;
      }

      const snapshot = await verifier.getProofStatus(proof);
      if (!snapshot) {
        return proof;
      }

      const nextProof = applyVerificationSnapshot(proof, snapshot);
      return repository.saveProofStatus(nextProof);
    }
  };
}

export type { ProofSubmissionResult, StoredProofRecord, VotingRepository } from "@/server/repository";
