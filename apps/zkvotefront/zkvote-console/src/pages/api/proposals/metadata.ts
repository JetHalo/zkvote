import type { NextApiRequest, NextApiResponse } from "next";
import { getVotingService } from "@/server/bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const title = typeof req.body?.title === "string" ? req.body.title : "";
  const description = typeof req.body?.description === "string" ? req.body.description : "";
  const nftContract = typeof req.body?.nftContract === "string" ? req.body.nftContract : "";
  const snapshotBlock = Number(req.body?.snapshotBlock);
  const startTime = typeof req.body?.startTime === "string" ? req.body.startTime : "";
  const endTime = typeof req.body?.endTime === "string" ? req.body.endTime : "";
  const options = Array.isArray(req.body?.options) ? req.body.options.filter((value): value is string => typeof value === "string") : [];
  const creator = typeof req.body?.creator === "string" ? req.body.creator : "";

  if (!title || !description || !nftContract || !startTime || !endTime || !creator || Number.isNaN(snapshotBlock) || options.length < 2) {
    return res.status(400).json({ error: "INVALID_METADATA_PAYLOAD" });
  }

  try {
    const metadata = await getVotingService().prepareProposalMetadata({
      title,
      description,
      nftContract,
      snapshotBlock,
      startTime,
      endTime,
      options,
      creator
    });

    return res.status(200).json({ metadata });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return res.status(message === "IPFS_NOT_CONFIGURED" ? 503 : 400).json({ error: message });
  }
}
