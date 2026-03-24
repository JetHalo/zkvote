import type { NextApiRequest, NextApiResponse } from "next";
import type { MintPassInput } from "@/domain/types";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const service = getVotingService();

  if (req.method === "GET") {
    const walletAddress = typeof req.query.walletAddress === "string" ? req.query.walletAddress : null;
    const passes = await service.listPasses(walletAddress);
    return res.status(200).json({ passes });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const payload = req.body as Partial<MintPassInput>;
  if (!payload.walletAddress) {
    return res.status(400).json({ error: "WALLET_ADDRESS_REQUIRED" });
  }

  const pass = await service.mintVotingPass({
    walletAddress: payload.walletAddress,
    tokenId: payload.tokenId,
    txHash: payload.txHash,
    contractAddress: payload.contractAddress,
    chainId: payload.chainId
  } satisfies MintPassInput);
  return res.status(201).json({ pass });
}
