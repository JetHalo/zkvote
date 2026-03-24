import type { NextApiRequest, NextApiResponse } from "next";
import { getStore, updateProofStatus } from "@/lib/store";
import { fetchZkVerifyStatus } from "@/lib/zkverifyClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const proofId = String(req.query.proofId || "");
  if (!proofId) {
    return res.status(400).json({ error: "MISSING_PROOF_ID" });
  }

  const store = getStore();
  const record = store.proofs.get(proofId);
  if (!record) {
    return res.status(404).json({ error: "PROOF_NOT_FOUND" });
  }

  if (record.status !== "finalized" && process.env.NEXT_PUBLIC_ENABLE_DEV_STATUS_MOCK !== "true") {
    const remote = await fetchZkVerifyStatus(proofId);
    updateProofStatus(proofId, remote.status, remote.rawStatus, remote.txHash, remote.blockHash);
  }

  const fresh = store.proofs.get(proofId);
  if (!fresh) {
    return res.status(404).json({ error: "PROOF_NOT_FOUND" });
  }

  return res.status(200).json(fresh);
}
