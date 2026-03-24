import type { ProofStatus } from "@/domain/types";

export interface ProposalOptionTally {
  option: string;
  votes: number;
}

export function buildOptionTallies(
  options: string[],
  votes: Array<{ option: string; proofStatus?: ProofStatus | string }>
): ProposalOptionTally[] {
  const counts = new Map<string, number>();

  for (const option of options) {
    counts.set(option, 0);
  }

  for (const vote of votes) {
    if (vote.proofStatus && vote.proofStatus !== "finalized") {
      continue;
    }

    if (!counts.has(vote.option)) {
      counts.set(vote.option, 0);
    }

    counts.set(vote.option, (counts.get(vote.option) ?? 0) + 1);
  }

  return options.map((option) => ({
    option,
    votes: counts.get(option) ?? 0
  }));
}
