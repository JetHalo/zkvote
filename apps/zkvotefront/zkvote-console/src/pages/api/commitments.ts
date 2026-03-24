import type { NextApiRequest, NextApiResponse } from "next";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const proposalId = typeof req.body?.proposalId === "string" ? req.body.proposalId : "";
  const walletAddress = typeof req.body?.walletAddress === "string" ? req.body.walletAddress : "";
  const identityCommitment = typeof req.body?.identityCommitment === "string" ? req.body.identityCommitment : "";

  if (!proposalId || !walletAddress || !identityCommitment) {
    return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
  }

  try {
    const membership = await getVotingService().registerMembership(proposalId, walletAddress, identityCommitment);
    return res.status(200).json({ membership });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return res.status(message === "NFT_PASS_REQUIRED" ? 403 : 400).json({ error: message });
  }
}
