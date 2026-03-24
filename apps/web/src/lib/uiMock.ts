import type { ProposalRecord, VoteRecord } from "@/zk/zkvote/schemas";

export type ProposalViewStatus = "eligible" | "ongoing" | "ended";

export interface ProposalUiRecord extends ProposalRecord {
  viewStatus: ProposalViewStatus;
  voted: boolean;
  countdown: string;
  participants: number;
}

export const DEMO_CHAIN = "Base Sepolia";

export const DEMO_PROPOSALS: ProposalUiRecord[] = [
  {
    id: "4012",
    title: "社区金库治理方案：引入多链流动性激励",
    description:
      "本提案建议将金库预算分阶段用于 L2 流动性池激励。投票资格基于 NFT 快照，匿名证明通过 zkVerifyJS 生命周期状态确认。",
    options: ["赞成", "反对", "弃权"],
    nftContract: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    snapshotBlock: 19204152,
    startTime: 1765213200,
    endTime: 1765472400,
    creator: "0x5D39...A8F2",
    metadataHash: "bafybeif6xj25m5te6xkci2t2myjzk6gr6ydl2wn2uufbwq6s2oa67j2u4q",
    optionsHash: "0x62d86a7f8feeb43a2fb7b8a4f5ab7ad0e8faec9a11a3224af9ad6d9af0f5fbbd",
    groupRoot: "0x0",
    viewStatus: "eligible",
    voted: true,
    countdown: "2d 14h 35m",
    participants: 1240
  },
  {
    id: "4011",
    title: "zkVerify 接入优化：状态查询与前端可观测性升级",
    description:
      "统一 proof-status 返回字段，提升 pending/includedInBlock/finalized/error 的可观测性，减少前端误判。",
    options: ["赞成", "反对"],
    nftContract: "0x2F8b524f6A9A40f9e90f9DA8dB6B3D7b1391dA0F",
    snapshotBlock: 19198320,
    startTime: 1765152000,
    endTime: 1765368000,
    creator: "0x4A72...89CE",
    metadataHash: "bafybeib5p5y4k3m5xgdc42wqdzvuhv5ggf4bxg4szqqis5jkd3i3f4prr4",
    optionsHash: "0x2f48a80cfd4afddcb5d93c6fa71fce52ec6e8cd7735f301f3fcd2da7cccb8b0b",
    groupRoot: "0x0",
    viewStatus: "ongoing",
    voted: false,
    countdown: "0d 05h 12m",
    participants: 890
  },
  {
    id: "4010",
    title: "生态集成计划：治理结果发布规范化",
    description:
      "提案通过后仅发布聚合统计，不公开身份映射。新增历史页审计字段，便于社区验证计票一致性。",
    options: ["赞成", "反对", "延后"],
    nftContract: "0x8ef8A3d22f6eDd4316FbcB6d62D4FecD8363D9ea",
    snapshotBlock: 19190300,
    startTime: 1765000800,
    endTime: 1765087200,
    creator: "0x7e19...12d4",
    metadataHash: "bafybeidab7y4zov6hjswu67ehjly7iifx67mwb4yedgk2x6vcepr7og6hi",
    optionsHash: "0xb966a1166229a0fd145222c24eb87fcc2fbc0c9964601f8ba56a8d2e65a91293",
    groupRoot: "0x0",
    viewStatus: "ended",
    voted: false,
    countdown: "已结束",
    participants: 1502
  }
];

export const DEMO_VOTES: VoteRecord[] = [
  {
    proposalId: "4012",
    nullifierHash: "0x7a2f6a51cc31d9cb4e1f8dc101bd6d21f8f2c55e02beaf5d9de7d2e19cf7f8d1",
    choice: "赞成",
    statusSource: "zkverifyjs",
    zkVerifyStatus: "finalized",
    txHash: "0x7a2fe6674ab9de31d288f3e61b0ccfd3cb66e504f50a202176acd95b36d9f8d1",
    blockHash: "0x5ff117cd12a128f45d1c79b6e75f90c5af4a727f0bb6f9a6bce77e2687f43df1",
    timestamp: "2026-02-09 14:30"
  },
  {
    proposalId: "4011",
    nullifierHash: "0x3e1a930dcf2872ef389f9dd194af0483c16a3654cb1f8a9b883b67198ba0a90b",
    choice: "弃权",
    statusSource: "zkverifyjs",
    zkVerifyStatus: "includedInBlock",
    txHash: "0x3e1a934dd137ff34d5312ac7ce12c991ad6a1863d9639b4ad5f1b6e87a13a90b",
    blockHash: "0x1d25b1e2d16c5bfa01b3a5a9cc5f5ad4f2b3322dc0a10391840e5cd62f9c4b60",
    timestamp: "2026-02-08 09:15"
  },
  {
    proposalId: "3999",
    nullifierHash: "0xf6ec9a1d41f8b48de0a252f825504438ddba6f3651371f7b0ef3812db5e3a0ab",
    choice: "反对",
    statusSource: "zkverifyjs",
    zkVerifyStatus: "error",
    txHash: null,
    blockHash: null,
    timestamp: "2026-02-06 11:00"
  }
];

export const DEMO_NFTS = [
  {
    tokenId: "29481023",
    mintedAt: "2026-02-09 10:20",
    title: "Voting Pass #2948"
  },
  {
    tokenId: "29481107",
    mintedAt: "2026-02-05 17:46",
    title: "Voting Pass #2949"
  }
];

export function getProposalById(id: string): ProposalUiRecord | null {
  return DEMO_PROPOSALS.find((item) => item.id === id) ?? null;
}

export function statusLabel(status: ProposalViewStatus): string {
  if (status === "eligible") return "可投";
  if (status === "ongoing") return "进行中";
  return "已结束";
}
