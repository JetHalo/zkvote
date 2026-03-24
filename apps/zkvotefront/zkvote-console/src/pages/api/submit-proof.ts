import type { NextApiRequest, NextApiResponse } from "next";
import type { ProofSubmitRequest } from "@/domain/types";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const payload = req.body as Partial<ProofSubmitRequest>;
  if (
    !payload.proofId ||
    !payload.businessDomain ||
    !payload.appId ||
    !payload.userAddr ||
    !payload.proposalId ||
    !payload.choice ||
    !payload.nullifierHash ||
    !payload.proof
  ) {
    return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
  }

  try {
    const proof = await getVotingService().submitProof(payload as ProofSubmitRequest);
    return res.status(200).json({ proof });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return res.status(400).json({ error: message });
  }
}
