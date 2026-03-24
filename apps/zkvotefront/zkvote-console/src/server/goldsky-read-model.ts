import type { VotingPassRecord } from "@/domain/types";
import { getPublicAppConfig } from "@/server/env";
import type { GoldskyClient } from "@/server/goldsky";
import { createGoldskyClientFromEnv } from "@/server/goldsky";
import type { ChainProposalRecord, VotingIndexer } from "@/server/indexer";

interface GoldskyPassRow {
  id: string;
  tokenId: string;
  owner: { id: string };
  contractAddress: string;
  mintTxHash: string;
  mintedAtTimestamp: string;
  chainId: string;
}

interface GoldskyProposalRow {
  id: string;
  proposalNumber: string;
  creator: string;
  nftContract: string;
  snapshotBlock: string;
  startTime: string;
  endTime: string;
  metadataHash: string;
  metadataUri: string | null;
  optionsHash: string;
  groupRoot: string;
  txHash: string | null;
  createdAtTimestamp: string;
}

function fromUnixSeconds(value: string): string {
  return new Date(Number(value) * 1000).toISOString();
}

function mapPass(row: GoldskyPassRow): VotingPassRecord {
  return {
    tokenId: row.tokenId,
    ownerAddress: row.owner.id.toLowerCase(),
    mintedAt: fromUnixSeconds(row.mintedAtTimestamp),
    txHash: row.mintTxHash,
    contractAddress: row.contractAddress,
    chainId: Number(row.chainId),
    transferable: true
  };
}

function mapProposal(row: GoldskyProposalRow): ChainProposalRecord {
  return {
    id: row.id,
    proposalNumber: row.proposalNumber,
    creator: row.creator.toLowerCase(),
    nftContract: row.nftContract,
    snapshotBlock: Number(row.snapshotBlock),
    startTime: fromUnixSeconds(row.startTime),
    endTime: fromUnixSeconds(row.endTime),
    metadataHash: row.metadataHash,
    metadataUri: row.metadataUri,
    optionsHash: row.optionsHash,
    groupRoot: row.groupRoot,
    txHash: row.txHash,
    createdAt: fromUnixSeconds(row.createdAtTimestamp)
  };
}

export function createGoldskyReadModel(client: GoldskyClient): VotingIndexer {
  return {
    async listPasses(walletAddress?: string | null) {
      if (walletAddress) {
        const result = await client.query<{ votingPassTokens: GoldskyPassRow[] }>(
          `
            query VotingPassTokensByOwner($owner: String!) {
              votingPassTokens(
                where: { owner_: { id: $owner } }
                orderBy: mintedAtTimestamp
                orderDirection: desc
              ) {
                id
                tokenId
                owner { id }
                contractAddress
                mintTxHash
                mintedAtTimestamp
                chainId
              }
            }
          `,
          { owner: walletAddress.toLowerCase() }
        );

        return result.votingPassTokens.map(mapPass);
      }

      const result = await client.query<{ votingPassTokens: GoldskyPassRow[] }>(
        `
          query VotingPassTokens {
            votingPassTokens(orderBy: mintedAtTimestamp, orderDirection: desc) {
              id
              tokenId
              owner { id }
              contractAddress
              mintTxHash
              mintedAtTimestamp
              chainId
            }
          }
        `
      );

      return result.votingPassTokens.map(mapPass);
    },
    async listProposals() {
      const result = await client.query<{ proposals: GoldskyProposalRow[] }>(
        `
          query Proposals {
            proposals(orderBy: createdAtTimestamp, orderDirection: desc) {
              id
              proposalNumber
              creator
              nftContract
              snapshotBlock
              startTime
              endTime
              metadataHash
              metadataUri
              optionsHash
              groupRoot
              txHash
              createdAtTimestamp
            }
          }
        `
      );

      return result.proposals.map(mapProposal);
    },
    async getProposalById(id: string) {
      const result = await client.query<{ proposals: GoldskyProposalRow[] }>(
        `
          query ProposalById($id: String!) {
            proposals(where: { id: $id }, first: 1) {
              id
              proposalNumber
              creator
              nftContract
              snapshotBlock
              startTime
              endTime
              metadataHash
              metadataUri
              optionsHash
              groupRoot
              txHash
              createdAtTimestamp
            }
          }
        `,
        { id }
      );

      const row = result.proposals[0];
      return row ? mapProposal(row) : null;
    }
  };
}

export function createGoldskyReadModelFromEnv(): VotingIndexer | null {
  const client = createGoldskyClientFromEnv();
  if (!client) {
    return null;
  }

  const config = getPublicAppConfig();
  const readModel = createGoldskyReadModel(client);

  return {
    async listPasses(walletAddress?: string | null) {
      const passes = await readModel.listPasses(walletAddress);
      return passes.map((pass) => ({
        ...pass,
        chainId: pass.chainId || config.chainId,
        contractAddress: pass.contractAddress ?? config.nftContractAddress
      }));
    },
    listProposals: () => readModel.listProposals(),
    getProposalById: (id: string) => readModel.getProposalById(id)
  };
}
