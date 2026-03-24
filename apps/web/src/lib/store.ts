import type {
  ProofStatus,
  ProofStatusResponse,
  ProposalRecord,
  VoteRecord
} from "@/zk/zkvote/schemas";

interface ProofRecord extends ProofStatusResponse {
  proposalId: string;
  nullifierHash: string;
  choice: string;
  userAddr: string;
}

interface MemoryStore {
  proposals: ProposalRecord[];
  proofs: Map<string, ProofRecord>;
  votes: VoteRecord[];
  usedNullifiers: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __zkvoteStore__: MemoryStore | undefined;
}

function buildDefaultProposals(): ProposalRecord[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: "1",
      title: "是否启动 zkVote 社区试运行",
      description: "投票通过后将开放一周测试网公开试运行。",
      options: ["同意", "反对"],
      nftContract: "0x0000000000000000000000000000000000000001",
      snapshotBlock: 1234567,
      startTime: now - 3600,
      endTime: now + 86400,
      creator: "0x000000000000000000000000000000000000beef",
      metadataHash: "0xmeta",
      optionsHash: "0xoptions",
      groupRoot: "0xgroup"
    }
  ];
}

export function getStore(): MemoryStore {
  if (!global.__zkvoteStore__) {
    global.__zkvoteStore__ = {
      proposals: buildDefaultProposals(),
      proofs: new Map<string, ProofRecord>(),
      votes: [],
      usedNullifiers: new Set<string>()
    };
  }
  return global.__zkvoteStore__;
}

export function updateProofStatus(
  proofId: string,
  status: ProofStatus,
  rawStatus: string,
  txHash: string | null = null,
  blockHash: string | null = null
): ProofRecord | null {
  const store = getStore();
  const record = store.proofs.get(proofId);
  if (!record) return null;
  const previousStatus = record.status;

  record.status = status;
  record.rawStatus = rawStatus;
  record.txHash = txHash;
  record.blockHash = blockHash;
  record.updatedAt = new Date().toISOString();

  if (status === "finalized" && previousStatus !== "finalized") {
    store.votes.push({
      proposalId: record.proposalId,
      nullifierHash: record.nullifierHash,
      choice: record.choice,
      statusSource: "zkverifyjs",
      zkVerifyStatus: "finalized",
      txHash: record.txHash,
      blockHash: record.blockHash,
      timestamp: record.updatedAt
    });
  }

  return record;
}
