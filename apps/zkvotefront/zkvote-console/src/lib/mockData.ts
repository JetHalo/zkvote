import type { ProposalRecord, VoteRecord } from "@/domain/types";

const BASE_PROPOSAL = {
  nftContract: "0x0000000000000000000000000000000000000001",
  creator: "0x000000000000000000000000000000000000beef",
  metadataHash: "0xmeta",
  metadataUri: null,
  optionsHash: "0xoptions",
  groupRoot: "0xgroup",
  txHash: null,
  startTime: "2026-03-01 00:00 UTC",
  createdAt: "2026-03-01T00:00:00.000Z"
} as const;

export const mockProposals: ProposalRecord[] = [
  {
    ...BASE_PROPOSAL,
    id: "ZKP-12",
    title: "Upgrade Observability Pipeline for Proof Lifecycle Tracking",
    description:
      "Introduce structured telemetry across the proof lifecycle — from browser-side generation through includedInBlock to finalized — enabling real-time monitoring of proof throughput, latency percentiles, and error classification without exposing voter identity.",
    status: "active",
    totalVotes: 1847,
    finalizedVotes: 1203,
    optionTallies: [
      { option: "For", votes: 782 },
      { option: "Against", votes: 356 },
      { option: "Abstain", votes: 65 }
    ],
    endTime: "2026-03-15 18:00 UTC",
    snapshotBlock: 18923456,
    options: ["For", "Against", "Abstain"],
    nftSource: "Voting Pass NFT",
    eligible: true,
    voted: true,
    turnout: 65.1
  },
  {
    ...BASE_PROPOSAL,
    id: "ZKP-11",
    title: "Enforce Tally Consistency Gate for Finalized Proofs Only",
    description:
      "Restrict the governance tally to only count votes whose ZK proofs have reached finalized status via zkVerifyJS, ensuring deterministic and auditable vote counting while excluding pending and includedInBlock states.",
    status: "active",
    totalVotes: 923,
    finalizedVotes: 687,
    optionTallies: [
      { option: "For", votes: 401 },
      { option: "Against", votes: 286 }
    ],
    endTime: "2026-03-12 12:00 UTC",
    snapshotBlock: 18920112,
    options: ["For", "Against"],
    nftSource: "Voting Pass NFT",
    eligible: true,
    voted: false,
    turnout: 74.4
  },
  {
    ...BASE_PROPOSAL,
    id: "ZKP-10",
    title: "Community Treasury Allocation — Developer Incentive Program Q2",
    description:
      "Allocate 500,000 ZKV from the community treasury for Q2 developer incentives, covering SDK integration grants, documentation bounties, and ecosystem tooling development to expand the zkVote developer ecosystem.",
    status: "ended",
    totalVotes: 3201,
    finalizedVotes: 3201,
    optionTallies: [
      { option: "For", votes: 2441 },
      { option: "Against", votes: 612 },
      { option: "Abstain", votes: 148 }
    ],
    endTime: "2026-02-28 18:00 UTC",
    snapshotBlock: 18901234,
    options: ["For", "Against", "Abstain"],
    nftSource: "Voting Pass NFT",
    eligible: true,
    voted: true,
    turnout: 82.3
  },
  {
    ...BASE_PROPOSAL,
    id: "ZKP-13",
    title: "Introduce Privacy-Preserving Vote Weight Decay Mechanism",
    description:
      "Apply a time-based weight decay curve to voting passes inactive for over 6 months, incentivizing continuous governance participation while maintaining anonymous credential validity through the existing nullifier scheme.",
    status: "upcoming",
    totalVotes: 0,
    finalizedVotes: 0,
    optionTallies: [
      { option: "For", votes: 0 },
      { option: "Against", votes: 0 },
      { option: "Defer", votes: 0 }
    ],
    endTime: "2026-03-20 00:00 UTC",
    snapshotBlock: 18930000,
    options: ["For", "Against", "Defer"],
    nftSource: "Voting Pass NFT",
    eligible: true,
    voted: false,
    turnout: 0
  },
  {
    ...BASE_PROPOSAL,
    id: "ZKP-09",
    title: "Revise Snapshot Eligibility Window to 72-Hour Rolling Basis",
    description:
      "Modify the snapshotBlock eligibility rule from a single fixed block to a 72-hour rolling window, allowing late minters within the window to participate while preserving the deterministic eligibility guarantee.",
    status: "ended",
    totalVotes: 2104,
    finalizedVotes: 2104,
    optionTallies: [
      { option: "For", votes: 1139 },
      { option: "Against", votes: 965 }
    ],
    endTime: "2026-02-20 12:00 UTC",
    snapshotBlock: 18895000,
    options: ["For", "Against"],
    nftSource: "Voting Pass NFT",
    eligible: false,
    voted: false,
    turnout: 71.8
  },
  {
    ...BASE_PROPOSAL,
    id: "ZKP-14",
    title: "Add State Transition Logging for Proof Status Changes",
    description:
      "Implement an append-only log for each proof status transition (pending → includedInBlock → finalized / error), enabling post-hoc audit of proof lifecycle without compromising voter anonymity or linking votes to addresses.",
    status: "active",
    totalVotes: 412,
    finalizedVotes: 198,
    optionTallies: [
      { option: "For", votes: 126 },
      { option: "Against", votes: 58 },
      { option: "Abstain", votes: 14 }
    ],
    endTime: "2026-03-18 06:00 UTC",
    snapshotBlock: 18925000,
    options: ["For", "Against", "Abstain"],
    nftSource: "Voting Pass NFT",
    eligible: true,
    voted: false,
    turnout: 48.1
  }
];

export const mockMyVotes: VoteRecord[] = [
  {
    proposalId: "ZKP-12",
    proposalTitle: "ZKP-12: Upgrade Observability Pipeline for Proof Lifecycle Tracking",
    option: "For",
    proofStatus: "finalized",
    proofId: "0xabc123def456789abcdef0123456789abcdef01",
    nullifierHash: "0x9f2e8a71c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
    submittedAt: "2026-03-08 14:32 UTC",
    updatedAt: "2026-03-08 14:32 UTC",
    statusSource: "zkverifyjs",
    txHash: "0xvote000000000000000000000000000000000000000000000000000000000001",
    walletAddress: "0x7a3f00000000000000000000000000000000e91b"
  },
  {
    proposalId: "ZKP-11",
    proposalTitle: "ZKP-11: Enforce Tally Consistency Gate for Finalized Proofs Only",
    option: "Against",
    proofStatus: "includedInBlock",
    proofId: "0xdef789abc0123456789abcdef0123456789abcd",
    nullifierHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    submittedAt: "2026-03-08 15:01 UTC",
    updatedAt: "2026-03-08 15:01 UTC",
    statusSource: "zkverifyjs",
    txHash: "0xvote000000000000000000000000000000000000000000000000000000000002",
    walletAddress: "0x7a3f00000000000000000000000000000000e91b"
  },
  {
    proposalId: "ZKP-10",
    proposalTitle: "ZKP-10: Community Treasury Allocation — Developer Incentive Program Q2",
    option: "For",
    proofStatus: "finalized",
    proofId: "0x456789abcdef0123456789abcdef0123456789ab",
    nullifierHash: "0xc0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9",
    submittedAt: "2026-02-26 09:15 UTC",
    updatedAt: "2026-02-26 09:15 UTC",
    statusSource: "zkverifyjs",
    txHash: "0xvote000000000000000000000000000000000000000000000000000000000003",
    walletAddress: "0x7a3f00000000000000000000000000000000e91b"
  },
  {
    proposalId: "ZKP-12",
    proposalTitle: "ZKP-12: Upgrade Observability Pipeline for Proof Lifecycle Tracking",
    option: "For",
    proofStatus: "error",
    proofId: "0x789abcdef0123456789abcdef0123456789abcde",
    nullifierHash: "0xe2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
    submittedAt: "2026-03-07 22:45 UTC",
    updatedAt: "2026-03-07 22:45 UTC",
    statusSource: "zkverifyjs",
    txHash: "0xvote000000000000000000000000000000000000000000000000000000000004",
    walletAddress: "0x7a3f00000000000000000000000000000000e91b"
  }
];

export const mockProposalResults: Record<string, { option: string; finalizedCount: number; pendingCount: number }[]> = {
  "ZKP-12": [
    { option: "For", finalizedCount: 782, pendingCount: 145 },
    { option: "Against", finalizedCount: 356, pendingCount: 89 },
    { option: "Abstain", finalizedCount: 65, pendingCount: 12 }
  ],
  "ZKP-11": [
    { option: "For", finalizedCount: 521, pendingCount: 98 },
    { option: "Against", finalizedCount: 166, pendingCount: 42 }
  ],
  "ZKP-10": [
    { option: "For", finalizedCount: 2456, pendingCount: 0 },
    { option: "Against", finalizedCount: 612, pendingCount: 0 },
    { option: "Abstain", finalizedCount: 133, pendingCount: 0 }
  ]
};
