import type { NextApiRequest, NextApiResponse } from "next";
import type { CreateProposalInput } from "@/domain/types";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const service = getVotingService();

  if (req.method === "GET") {
    const walletAddress = typeof req.query.walletAddress === "string" ? req.query.walletAddress : null;
    const proposals = await service.listProposals(walletAddress);
    return res.status(200).json({ proposals });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const payload = req.body as Partial<CreateProposalInput>;
  if (!payload.title || !payload.description || !payload.nftContract || !payload.creator) {
    return res.status(400).json({ error: "INVALID_PROPOSAL_PAYLOAD" });
  }

  if (!payload.startTime || !payload.endTime || !payload.snapshotBlock || !payload.options?.length) {
    return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
  }

  try {
    const proposal = await service.createProposal({
      proposalId: payload.proposalId,
      title: payload.title,
      description: payload.description,
      nftContract: payload.nftContract,
      snapshotBlock: Number(payload.snapshotBlock),
      metadataHash: payload.metadataHash,
      metadataUri: payload.metadataUri,
      startTime: payload.startTime,
      endTime: payload.endTime,
      options: payload.options,
      optionsHash: payload.optionsHash,
      groupRoot: payload.groupRoot,
      txHash: payload.txHash,
      creator: payload.creator
    } satisfies CreateProposalInput);

    return res.status(201).json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return res.status(message === "NFT_PASS_REQUIRED" ? 403 : 400).json({ error: message });
  }
}
