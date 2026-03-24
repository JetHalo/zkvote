import { getServerEnv } from "@/server/env";
import { createProposalMetadataStoreFromEnv } from "@/server/ipfs";
import { createGoldskyReadModelFromEnv } from "@/server/goldsky-read-model";
import { createMemoryVotingRepository } from "@/server/memory-repository";
import { createPostgresVotingRepository } from "@/server/postgres-repository";
import { createVotingService } from "@/server/service";
import { createProofVerificationAdapterFromEnv } from "@/server/zkverify";

type VotingService = ReturnType<typeof createVotingService>;

declare global {
  // eslint-disable-next-line no-var
  var __zkvoteConsoleService__: VotingService | undefined;
}

export function getVotingService(): VotingService {
  if (!global.__zkvoteConsoleService__) {
    const env = getServerEnv();
    const repository = env.DATABASE_URL ? createPostgresVotingRepository() : createMemoryVotingRepository();

    global.__zkvoteConsoleService__ = createVotingService({
      repository,
      metadataStore: createProposalMetadataStoreFromEnv(),
      verifier: createProofVerificationAdapterFromEnv(),
      indexer: createGoldskyReadModelFromEnv()
    });
  }

  return global.__zkvoteConsoleService__;
}
