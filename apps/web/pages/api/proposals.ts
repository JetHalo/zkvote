import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "@/lib/store";
import type { ProposalRecord } from "@/zk/zkvote/schemas";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === "GET") {
    return res.status(200).json({ proposals: store.proposals });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const payload = req.body as Partial<ProposalRecord>;
  if (!payload.title || !payload.description || !payload.nftContract) {
    return res.status(400).json({ error: "INVALID_PROPOSAL_PAYLOAD" });
  }

  const id = String(store.proposals.length + 1);
  const now = Math.floor(Date.now() / 1000);
  const options = payload.options && payload.options.length > 0 ? payload.options : ["同意", "反对"];
  const optionsHash = `0x${crypto.createHash("sha256").update(options.join("|")).digest("hex")}`;

  const proposal: ProposalRecord = {
    id,
    title: payload.title,
    description: payload.description,
    options,
    nftContract: payload.nftContract,
    snapshotBlock: payload.snapshotBlock ?? 0,
    startTime: payload.startTime ?? now,
    endTime: payload.endTime ?? now + 86400,
    creator: payload.creator ?? "0x0000000000000000000000000000000000000000",
    metadataHash:
      payload.metadataHash ??
      `0x${crypto.createHash("sha256").update(`${payload.title}|${payload.description}`).digest("hex")}`,
    optionsHash,
    groupRoot: payload.groupRoot ?? "0x"
  };

  store.proposals.push(proposal);
  return res.status(201).json({ proposal });
}
