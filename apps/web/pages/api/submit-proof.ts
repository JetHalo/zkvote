import type { NextApiRequest, NextApiResponse } from "next";
import { buildStatement } from "@/lib/statement";
import { getStore, updateProofStatus } from "@/lib/store";
import type { ProofSubmitRequest } from "@/zk/zkvote/schemas";

function isValidSubmitBody(body: ProofSubmitRequest): string | null {
  if (body.verificationMode !== "zkverifyjs-non-aggregation") {
    return "UNSUPPORTED_MODE";
  }
  if (!body.proofId || !body.nullifierHash || !body.proposalId || !body.choice) {
    return "MISSING_REQUIRED_FIELDS";
  }
  if (!body.businessDomain || !body.appId || !body.userAddr) {
    return "INVALID_BINDING_FIELDS";
  }
  if (!body.proof || !body.proof.proof || !Array.isArray(body.proof.publicSignals)) {
    return "INVALID_PROOF_PAYLOAD";
  }
  return null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const body = req.body as ProofSubmitRequest & { witness?: unknown };
  if (body.witness !== undefined) {
    return res.status(400).json({ error: "WITNESS_NOT_ALLOWED_SERVER_SIDE" });
  }

  const validationError = isValidSubmitBody(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const store = getStore();
  if (store.usedNullifiers.has(body.nullifierHash)) {
    return res.status(409).json({ error: "DUPLICATE_NULLIFIER" });
  }
  store.usedNullifiers.add(body.nullifierHash);

  const statement = buildStatement({
    businessDomain: body.businessDomain,
    appId: body.appId,
    proposalId: body.proposalId,
    choice: body.choice,
    userAddr: body.userAddr,
    chainId: body.chainId,
    timestamp: body.timestamp,
    nullifierHash: body.nullifierHash
  });

  store.proofs.set(body.proofId, {
    proofId: body.proofId,
    proposalId: body.proposalId,
    nullifierHash: body.nullifierHash,
    choice: body.choice,
    userAddr: body.userAddr,
    status: "pending",
    rawStatus: "pending",
    statusSource: "zkverifyjs",
    txHash: null,
    blockHash: null,
    updatedAt: new Date().toISOString()
  });

  const shouldMock = process.env.NEXT_PUBLIC_ENABLE_DEV_STATUS_MOCK === "true";
  if (shouldMock) {
    setTimeout(() => {
      updateProofStatus(body.proofId, "includedInBlock", "included_in_block", `0xtx_${body.proofId}`, null);
    }, 1500);

    setTimeout(() => {
      updateProofStatus(
        body.proofId,
        "finalized",
        "finalized",
        `0xtx_${body.proofId}`,
        `0xblock_${body.proofId}`
      );
    }, 3500);
  }

  return res.status(200).json({
    proofId: body.proofId,
    status: "pending",
    statusSource: "zkverifyjs",
    statement,
    message: shouldMock
      ? "Proof accepted. Dev mock status transitions enabled."
      : "Proof accepted. Poll /api/proof-status for zkVerifyJS lifecycle updates."
  });
}
