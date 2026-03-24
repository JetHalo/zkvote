import type { NextApiRequest, NextApiResponse } from "next";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const walletAddress = typeof req.query.walletAddress === "string" ? req.query.walletAddress : null;
  const votes = await getVotingService().listVotes(walletAddress);
  return res.status(200).json({ votes });
}
