import type { ProofEnvelope } from "./schemas";

interface ProofInput {
  identityPrivateKey: string;
  groupMembers: string[];
  externalNullifier: string;
  signal: string;
}

/**
 * Browser proof generation path.
 * Uses PSE official Semaphore JS packages.
 */
export async function generateProofWithPseJs(
  input: ProofInput
): Promise<ProofEnvelope> {
  const [{ Identity }, { Group }, { generateProof }] = await Promise.all([
    import("@semaphore-protocol/identity"),
    import("@semaphore-protocol/group"),
    import("@semaphore-protocol/proof")
  ]);

  const identity = new Identity(input.identityPrivateKey);
  const identityCommitment = identity.commitment.toString();
  const members = [...input.groupMembers];
  if (!members.includes(identityCommitment)) {
    members.push(identityCommitment);
  }
  const group = new Group(members);
  const fullProof = await generateProof(identity, group, input.externalNullifier, input.signal);

  return {
    type: "semaphore",
    proof: JSON.stringify(fullProof.proof),
    publicSignals: fullProof.publicSignals.map((value: unknown) => String(value))
  };
}
