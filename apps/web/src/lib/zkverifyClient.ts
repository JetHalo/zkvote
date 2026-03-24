import type { ProofStatus } from "@/zk/zkvote/schemas";

export interface ZkVerifyStatusResult {
  status: ProofStatus;
  rawStatus: string;
  txHash: string | null;
  blockHash: string | null;
}

/**
 * Adapter placeholder for zkVerifyJS SDK polling.
 * Integrate the official SDK call in this function using server-only env vars.
 */
export async function fetchZkVerifyStatus(
  proofId: string
): Promise<ZkVerifyStatusResult> {
  void proofId;
  return {
    status: "pending",
    rawStatus: "pending",
    txHash: null,
    blockHash: null
  };
}
