import crypto from "node:crypto";

interface StatementInput {
  businessDomain: string;
  appId: string;
  proposalId: string;
  choice: string;
  userAddr: string;
  chainId: number;
  timestamp: number;
  nullifierHash: string;
}

export function buildStatement(input: StatementInput): string {
  const ordered = [
    input.businessDomain.trim(),
    input.appId.trim(),
    input.proposalId.trim(),
    input.choice.trim(),
    input.userAddr.toLowerCase(),
    String(input.chainId),
    String(input.timestamp),
    input.nullifierHash.trim()
  ].join("|");

  return `0x${crypto.createHash("sha256").update(ordered).digest("hex")}`;
}
