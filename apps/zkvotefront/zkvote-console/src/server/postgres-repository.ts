import crypto from "node:crypto";
import type { PoolClient } from "pg";
import type {
  CreateProposalInput,
  MembershipRecord,
  ProposalRecord,
  VoteRecord,
  VotingPassRecord
} from "@/domain/types";
import { getPublicAppConfig } from "@/server/env";
import { buildOptionTallies } from "@/server/option-tallies";
import { getPostgresPool, withPostgresTransaction } from "@/server/postgres";
import type { ProofSubmissionResult, StoredProofRecord, VotingRepository } from "@/server/repository";

function shaHex(value: string): string {
  return `0x${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function toUtcDisplay(value: string): string {
  return value.replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC");
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseDisplayDate(value: string): number {
  const normalized = value.includes("UTC") ? value.replace(" UTC", "Z").replace(" ", "T") : value;
  return new Date(normalized).getTime();
}

function deriveProposalStatus(record: ProposalRecord): ProposalRecord["status"] {
  const now = Date.now();
  const start = parseDisplayDate(record.startTime);
  const end = parseDisplayDate(record.endTime);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

function normalizeAddress(value?: string | null): string | null {
  return value ? value.toLowerCase() : null;
}

function mapProposalRow(
  row: Record<string, unknown>,
  eligible: boolean,
  voted: boolean,
  optionTallies: ProposalRecord["optionTallies"]
): ProposalRecord {
  const proposal: ProposalRecord = {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    status: "upcoming",
    totalVotes: Number(row.total_votes),
    finalizedVotes: Number(row.finalized_votes),
    optionTallies,
    startTime: toUtcDisplay(new Date(String(row.start_time)).toISOString()),
    endTime: toUtcDisplay(new Date(String(row.end_time)).toISOString()),
    snapshotBlock: Number(row.snapshot_block),
    options: Array.isArray(row.options_json) ? row.options_json.map(String) : [],
    nftSource: String(row.nft_source),
    eligible,
    voted,
    turnout: Number(row.turnout),
    nftContract: String(row.nft_contract),
    creator: String(row.creator),
    metadataHash: String(row.metadata_hash),
    metadataUri: row.metadata_uri ? String(row.metadata_uri) : null,
    optionsHash: String(row.options_hash),
    groupRoot: String(row.group_root),
    txHash: row.tx_hash ? String(row.tx_hash) : null,
    createdAt: new Date(String(row.created_at)).toISOString()
  };

  proposal.status = deriveProposalStatus(proposal);
  return proposal;
}

function mapPassRow(row: Record<string, unknown>): VotingPassRecord {
  return {
    tokenId: String(row.token_id),
    ownerAddress: String(row.owner_address),
    mintedAt: new Date(String(row.minted_at)).toISOString(),
    txHash: String(row.tx_hash),
    contractAddress: row.contract_address ? String(row.contract_address) : null,
    chainId: Number(row.chain_id),
    transferable: true
  };
}

function mapVoteRow(row: Record<string, unknown>): VoteRecord {
  return {
    proposalId: String(row.proposal_id),
    proposalTitle: String(row.proposal_title),
    option: String(row.option),
    proofStatus: row.proof_status as VoteRecord["proofStatus"],
    proofId: String(row.proof_id),
    nullifierHash: String(row.nullifier_hash),
    submittedAt: new Date(String(row.submitted_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    statusSource: row.status_source as VoteRecord["statusSource"],
    txHash: row.tx_hash ? String(row.tx_hash) : null,
    walletAddress: String(row.wallet_address)
  };
}

function mapProofRow(row: Record<string, unknown>): StoredProofRecord {
  return {
    proofId: String(row.proof_id),
    proposalId: String(row.proposal_id),
    proposalTitle: String(row.proposal_title),
    walletAddress: String(row.wallet_address),
    nullifierHash: String(row.nullifier_hash),
    txHash: row.tx_hash ? String(row.tx_hash) : null,
    blockHash: row.block_hash ? String(row.block_hash) : null,
    rawStatus: String(row.raw_status),
    status: row.status as StoredProofRecord["status"],
    statusSource: row.status_source as StoredProofRecord["statusSource"],
    submittedAt: new Date(String(row.submitted_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    selectedOption: String(row.selected_option),
    proofReference: row.proof_reference ? String(row.proof_reference) : null,
    businessDomain: String(row.business_domain),
    appId: String(row.app_id),
    chainId: Number(row.chain_id),
    timestamp: Number(row.submitted_timestamp)
  };
}

async function hasVotingPass(walletAddress?: string | null, client?: PoolClient): Promise<boolean> {
  if (!walletAddress) {
    return false;
  }

  const queryable = client ?? getPostgresPool();
  const result = await queryable.query(
    "select 1 from voting_passes where lower(owner_address) = lower($1) limit 1",
    [walletAddress]
  );

  return result.rowCount > 0;
}

async function votedProposalIds(walletAddress?: string | null, client?: PoolClient): Promise<Set<string>> {
  if (!walletAddress) {
    return new Set();
  }

  const queryable = client ?? getPostgresPool();
  const result = await queryable.query(
    "select proposal_id from votes where lower(wallet_address) = lower($1)",
    [walletAddress]
  );

  return new Set(result.rows.map((row) => String(row.proposal_id)));
}

async function loadOptionTalliesByProposalIds(
  proposalRows: Array<Record<string, unknown>>,
  client?: PoolClient
): Promise<Map<string, ProposalRecord["optionTallies"]>> {
  if (proposalRows.length === 0) {
    return new Map();
  }

  const proposalIds = proposalRows.map((row) => String(row.id));
  const queryable = client ?? getPostgresPool();
  const groupedVotes = await queryable.query<{ proposal_id: string; option: string; proof_status: string }>(
    `select proposal_id, option, proof_status
       from votes
      where proposal_id = any($1::text[])`,
    [proposalIds]
  );

  const votesByProposal = new Map<string, Array<{ option: string; proofStatus: string }>>();

  for (const row of groupedVotes.rows) {
    const bucket = votesByProposal.get(row.proposal_id) ?? [];
    bucket.push({ option: row.option, proofStatus: row.proof_status });
    votesByProposal.set(row.proposal_id, bucket);
  }

  return new Map(
    proposalRows.map((row) => [
      String(row.id),
      buildOptionTallies(
        Array.isArray(row.options_json) ? row.options_json.map(String) : [],
        votesByProposal.get(String(row.id)) ?? []
      )
    ])
  );
}

async function nextProposalId(client: PoolClient): Promise<string> {
  const result = await client.query<{ next_id: string }>(
    "select coalesce(max(nullif(regexp_replace(id, '\\D', '', 'g'), '')::bigint), 0) + 1 as next_id from proposals"
  );

  return `ZKP-${result.rows[0]?.next_id ?? "1"}`;
}

async function updateProposalVoteCounters(client: PoolClient, proposalId: string): Promise<void> {
  const current = await client.query<{ finalized_votes: number }>(
    "select finalized_votes from proposals where id = $1",
    [proposalId]
  );

  const nextFinalizedVotes = Number(current.rows[0]?.finalized_votes ?? 0) + 1;
  const turnout = Number(Math.min(100, (nextFinalizedVotes / Math.max(1, nextFinalizedVotes + 300)) * 100).toFixed(1));

  await client.query(
    `update proposals
        set total_votes = total_votes + 1,
            finalized_votes = finalized_votes + 1,
            turnout = $2
      where id = $1`,
    [proposalId, turnout]
  );
}

export function createPostgresVotingRepository(): VotingRepository {
  return {
    async listProposals(walletAddress?: string | null) {
      const [proposalsResult, eligible, votedIds] = await Promise.all([
        getPostgresPool().query("select * from proposals order by created_at desc"),
        hasVotingPass(walletAddress),
        votedProposalIds(walletAddress)
      ]);
      const optionTallies = await loadOptionTalliesByProposalIds(proposalsResult.rows);

      return proposalsResult.rows.map((row) =>
        mapProposalRow(
          row,
          walletAddress ? eligible : false,
          walletAddress ? votedIds.has(String(row.id)) : false,
          optionTallies.get(String(row.id)) ?? []
        )
      );
    },
    async getProposalById(id: string, walletAddress?: string | null) {
      const [proposalResult, eligible, votedIds] = await Promise.all([
        getPostgresPool().query("select * from proposals where id = $1 limit 1", [id]),
        hasVotingPass(walletAddress),
        votedProposalIds(walletAddress)
      ]);

      const row = proposalResult.rows[0];
      if (!row) {
        return null;
      }

      const optionTallies = await loadOptionTalliesByProposalIds([row]);
      return mapProposalRow(
        row,
        walletAddress ? eligible : false,
        walletAddress ? votedIds.has(id) : false,
        optionTallies.get(id) ?? []
      );
    },
    async listVotes(walletAddress?: string | null) {
      const result = walletAddress
        ? await getPostgresPool().query(
            "select * from votes where lower(wallet_address) = lower($1) order by submitted_at desc",
            [walletAddress]
          )
        : await getPostgresPool().query("select * from votes order by submitted_at desc");

      return result.rows.map(mapVoteRow);
    },
    async listPasses(walletAddress?: string | null) {
      const result = walletAddress
        ? await getPostgresPool().query(
            "select * from voting_passes where lower(owner_address) = lower($1) order by minted_at desc",
            [walletAddress]
          )
        : await getPostgresPool().query("select * from voting_passes order by minted_at desc");

      return result.rows.map(mapPassRow);
    },
    async mintVotingPass(input) {
      const config = getPublicAppConfig();
      const mintedAt = nowIso();
      const txHash = input.txHash ?? shaHex(`${input.walletAddress}|mint|${Date.now()}`);
      const contractAddress = input.contractAddress ?? config.nftContractAddress;
      const chainId = input.chainId ?? config.chainId;
      const result = input.tokenId
        ? await getPostgresPool().query(
            `insert into voting_passes (token_id, owner_address, minted_at, tx_hash, contract_address, chain_id, transferable)
             overriding system value
             values ($1, $2, $3, $4, $5, $6, true)
             returning *`,
            [input.tokenId, input.walletAddress, mintedAt, txHash, contractAddress, chainId]
          )
        : await getPostgresPool().query(
            `insert into voting_passes (owner_address, minted_at, tx_hash, contract_address, chain_id, transferable)
             values ($1, $2, $3, $4, $5, true)
             returning *`,
            [input.walletAddress, mintedAt, txHash, contractAddress, chainId]
          );

      return mapPassRow(result.rows[0]);
    },
    async createProposal(input: CreateProposalInput) {
      return withPostgresTransaction(async (client) => {
        const id = input.proposalId ?? (await nextProposalId(client));
        const createdAt = nowIso();
        const metadataHash = input.metadataHash ?? shaHex(`${input.title}|${input.description}|${id}`);
        const optionsHash = input.optionsHash ?? shaHex(input.options.join("|"));
        const txHash = input.txHash ?? shaHex(`${id}|${createdAt}|proposal`);

        const result = await client.query(
          `insert into proposals (
             id, title, description, total_votes, finalized_votes, start_time, end_time, snapshot_block,
             options_json, nft_source, turnout, nft_contract, creator, metadata_hash, metadata_uri,
             options_hash, group_root, tx_hash, created_at
           )
           values (
             $1, $2, $3, 0, 0, $4, $5, $6, $7::jsonb, 'Voting Pass NFT', 0, $8, $9, $10, $11, $12, $13, $14, $15
           )
           returning *`,
          [
            id,
            input.title,
            input.description,
            input.startTime,
            input.endTime,
            input.snapshotBlock,
            JSON.stringify(input.options),
            input.nftContract,
            input.creator,
            metadataHash,
            input.metadataUri ?? null,
            optionsHash,
            input.groupRoot ?? "0x",
            txHash,
            createdAt
          ]
        );

        return mapProposalRow(
          result.rows[0],
          true,
          false,
          input.options.map((option) => ({ option, votes: 0 }))
        );
      });
    },
    async registerMembership(proposalId: string, walletAddress: string, identityCommitment: string) {
      return withPostgresTransaction(async (client) => {
        const existing = await client.query(
          "select * from memberships where proposal_id = $1 and lower(wallet_address) = lower($2) limit 1",
          [proposalId, walletAddress]
        );

        const commitments = await client.query<{ identity_commitment: string }>(
          "select identity_commitment from memberships where proposal_id = $1 order by registered_at asc",
          [proposalId]
        );

        const groupMembers = Array.from(
          new Set([...commitments.rows.map((row) => row.identity_commitment), identityCommitment])
        );
        const groupRoot = shaHex(groupMembers.join("|"));

        if (existing.rows[0]) {
          return {
            proposalId,
            walletAddress,
            identityCommitment: String(existing.rows[0].identity_commitment),
            groupMembers,
            groupRoot,
            registeredAt: new Date(String(existing.rows[0].registered_at)).toISOString()
          } satisfies MembershipRecord;
        }

        const inserted = await client.query(
          `insert into memberships (proposal_id, wallet_address, identity_commitment, group_root, registered_at)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [proposalId, walletAddress, identityCommitment, groupRoot, nowIso()]
        );

        await client.query(
          "update proposals set group_root = $2 where id = $1 and (group_root = '0x' or group_root = '')",
          [proposalId, groupRoot]
        );

        return {
          proposalId,
          walletAddress,
          identityCommitment: String(inserted.rows[0].identity_commitment),
          groupMembers,
          groupRoot,
          registeredAt: new Date(String(inserted.rows[0].registered_at)).toISOString()
        } satisfies MembershipRecord;
      });
    },
    async submitProof(payload, submission?: ProofSubmissionResult | null) {
      const submittedAt = nowIso();
      const proposalResult = await getPostgresPool().query(
        "select id, title from proposals where id = $1 limit 1",
        [payload.proposalId]
      );
      const proposal = proposalResult.rows[0];
      if (!proposal) {
        throw new Error("PROPOSAL_NOT_FOUND");
      }

      try {
        const result = await getPostgresPool().query(
          `insert into proofs (
             proof_id, proposal_id, proposal_title, wallet_address, nullifier_hash, tx_hash, block_hash,
             raw_status, status, status_source, submitted_at, updated_at, selected_option, proof_reference,
             business_domain, app_id, chain_id, submitted_timestamp
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12, $13, $14, $15, $16, $17)
           returning *`,
          [
            payload.proofId,
            payload.proposalId,
            String(proposal.title),
            payload.userAddr,
            payload.nullifierHash,
            submission?.txHash ?? null,
            submission?.blockHash ?? null,
            submission?.rawStatus ?? "Pending",
            submission?.status ?? "pending",
            submission?.statusSource ?? "zkverifyjs",
            submittedAt,
            payload.choice,
            submission?.proofReference ?? payload.proofId,
            payload.businessDomain,
            payload.appId,
            payload.chainId,
            payload.timestamp
          ]
        );

        const proof = mapProofRow(result.rows[0]);
        if (proof.status === "finalized") {
          return this.saveProofStatus(proof);
        }

        return proof;
      } catch (error) {
        if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23505") {
          const existingResult = await getPostgresPool().query(
            "select * from proofs where nullifier_hash = $1 limit 1",
            [payload.nullifierHash]
          );
          const existing = existingResult.rows[0];

          if (existing?.status === "error") {
            const recycled = await getPostgresPool().query(
              `update proofs
                  set proof_id = $2,
                      proposal_id = $3,
                      proposal_title = $4,
                      wallet_address = $5,
                      tx_hash = $6,
                      block_hash = $7,
                      raw_status = $8,
                      status = $9,
                      status_source = $10,
                      submitted_at = $11,
                      updated_at = $11,
                      selected_option = $12,
                      proof_reference = $13,
                      business_domain = $14,
                      app_id = $15,
                      chain_id = $16,
                      submitted_timestamp = $17
                where nullifier_hash = $1
                returning *`,
              [
                payload.nullifierHash,
                payload.proofId,
                payload.proposalId,
                String(proposal.title),
                payload.userAddr,
                submission?.txHash ?? null,
                submission?.blockHash ?? null,
                submission?.rawStatus ?? "Pending",
                submission?.status ?? "pending",
                submission?.statusSource ?? "zkverifyjs",
                submittedAt,
                payload.choice,
                submission?.proofReference ?? payload.proofId,
                payload.businessDomain,
                payload.appId,
                payload.chainId,
                payload.timestamp
              ]
            );

            return mapProofRow(recycled.rows[0]);
          }

          throw new Error("DUPLICATE_NULLIFIER");
        }

        throw error;
      }
    },
    async getProofStatus(proofId: string) {
      const result = await getPostgresPool().query("select * from proofs where proof_id = $1 limit 1", [proofId]);
      const row = result.rows[0];
      return row ? mapProofRow(row) : null;
    },
    async saveProofStatus(proof: StoredProofRecord) {
      return withPostgresTransaction(async (client) => {
        const updated = await client.query(
          `update proofs
              set tx_hash = $2,
                  block_hash = $3,
                  raw_status = $4,
                  status = $5,
                  status_source = $6,
                  updated_at = $7,
                  proof_reference = $8
            where proof_id = $1
            returning *`,
          [
            proof.proofId,
            proof.txHash,
            proof.blockHash,
            proof.rawStatus,
            proof.status,
            proof.statusSource,
            proof.updatedAt,
            proof.proofReference
          ]
        );

        const nextProof = mapProofRow(updated.rows[0]);

        if (nextProof.status === "finalized") {
          const existingVote = await client.query("select 1 from votes where proof_id = $1 limit 1", [nextProof.proofId]);
          if (existingVote.rowCount === 0) {
            await client.query(
              `insert into votes (
                 proof_id, proposal_id, proposal_title, option, proof_status, nullifier_hash,
                 submitted_at, updated_at, status_source, tx_hash, wallet_address
               )
               values ($1, $2, $3, $4, 'finalized', $5, $6, $7, $8, $9, $10)`,
              [
                nextProof.proofId,
                nextProof.proposalId,
                `${nextProof.proposalId}: ${nextProof.proposalTitle}`,
                nextProof.selectedOption,
                nextProof.nullifierHash,
                nextProof.submittedAt,
                nextProof.updatedAt,
                nextProof.statusSource,
                nextProof.txHash,
                nextProof.walletAddress
              ]
            );

            await updateProposalVoteCounters(client, nextProof.proposalId);
          }
        }

        return nextProof;
      });
    }
  };
}
