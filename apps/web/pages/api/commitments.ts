import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "@/lib/store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const proposalId = String(req.query.proposalId || "");
  const store = getStore();

  const votes = proposalId
    ? store.votes.filter((vote) => vote.proposalId === proposalId)
    : store.votes;

  return res.status(200).json({
    strategy: "sqlite",
    proposalId: proposalId || null,
    count: votes.length,
    votes
  });
}
