import type { NextApiRequest, NextApiResponse } from "next";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) {
    return res.status(400).json({ error: "MISSING_PROPOSAL_ID" });
  }

  const walletAddress = typeof req.query.walletAddress === "string" ? req.query.walletAddress : null;
  const proposal = await getVotingService().getProposalById(id, walletAddress);
  if (!proposal) {
    return res.status(404).json({ error: "PROPOSAL_NOT_FOUND" });
  }

  return res.status(200).json({ proposal });
}
