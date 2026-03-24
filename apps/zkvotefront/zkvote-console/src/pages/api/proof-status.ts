import type { NextApiRequest, NextApiResponse } from "next";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const proofId = typeof req.query.proofId === "string" ? req.query.proofId : "";
  if (!proofId) {
    return res.status(400).json({ error: "MISSING_PROOF_ID" });
  }

  const proof = await getVotingService().getProofStatus(proofId);
  if (!proof) {
    return res.status(404).json({ error: "PROOF_NOT_FOUND" });
  }

  return res.status(200).json({ proof });
}
