import type { ProofEnvelope } from "@/domain/types";
import { keccak256 } from "ethers/crypto";
import { toBeHex } from "ethers/utils";

const STORAGE_KEY = "zkvote-console.identity-secret";

export interface AnonymousIdentity {
  secret: string;
  commitment: string;
}

export function hashSemaphorePublicInput(value: string): string {
  return (BigInt(keccak256(toBeHex(value, 32))) >> 8n).toString();
}

export function buildSemaphorePublicSignals(input: {
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
}): string[] {
  return [
    input.merkleTreeRoot,
    input.nullifier,
    hashSemaphorePublicInput(input.message),
    hashSemaphorePublicInput(input.scope)
  ];
}

function randomSecret(): string {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getOrCreateAnonymousIdentity(): Promise<AnonymousIdentity> {
  if (typeof window === "undefined") {
    throw new Error("IDENTITY_REQUIRES_BROWSER");
  }

  let secret = window.localStorage.getItem(STORAGE_KEY);
  if (!secret) {
    secret = randomSecret();
    window.localStorage.setItem(STORAGE_KEY, secret);
  }

  const { Identity } = await import("@semaphore-protocol/identity");
  const identity = new Identity(secret);

  return {
    secret,
    commitment: identity.commitment.toString()
  };
}

export async function generateSemaphoreVoteProof(input: {
  identitySecret: string;
  groupMembers: string[];
  proposalId: string;
  choice: string;
}): Promise<{ proof: ProofEnvelope; nullifierHash: string }> {
  const [{ Identity }, { Group }, { generateProof }] = await Promise.all([
    import("@semaphore-protocol/identity"),
    import("@semaphore-protocol/group"),
    import("@semaphore-protocol/proof")
  ]);

  const identity = new Identity(input.identitySecret);
  const members = [...input.groupMembers];
  if (!members.includes(identity.commitment.toString())) {
    members.push(identity.commitment.toString());
  }

  const group = new Group(members);
  const fullProof = await generateProof(identity, group, input.proposalId, input.choice);

  return {
    proof: {
      type: "semaphore",
      proof: JSON.stringify(fullProof.points),
      publicSignals: buildSemaphorePublicSignals({
        merkleTreeRoot: String(fullProof.merkleTreeRoot),
        nullifier: String(fullProof.nullifier),
        message: String(fullProof.message),
        scope: String(fullProof.scope)
      }),
      merkleTreeDepth: fullProof.merkleTreeDepth
    },
    nullifierHash: String(fullProof.nullifier)
  };
}
