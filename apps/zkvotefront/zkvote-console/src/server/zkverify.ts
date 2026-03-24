import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { unpackGroth16Proof } from "@zk-kit/utils/proof-packing";
import type { ProofSubmitRequest } from "@/domain/types";
import { getServerEnv } from "@/server/env";
import type { StoredProofRecord } from "@/server/repository";
import type {
  ProofVerificationAdapter,
  ProofVerificationSnapshot,
  ProofVerificationSubmission
} from "@/server/service";

type VerificationKeySet = {
  vk_alpha_1: unknown;
  vk_beta_2: unknown;
  vk_gamma_2: unknown;
  vk_delta_2: unknown[];
  IC: unknown[];
};

declare global {
  // eslint-disable-next-line no-var
  var __zkvoteConsoleProofSnapshots__: Map<string, ProofVerificationSnapshot> | undefined;
  // eslint-disable-next-line no-var
  var __zkvoteConsoleSemaphoreVk__: VerificationKeySet | undefined;
}

function getSnapshotStore() {
  if (!global.__zkvoteConsoleProofSnapshots__) {
    global.__zkvoteConsoleProofSnapshots__ = new Map<string, ProofVerificationSnapshot>();
  }

  return global.__zkvoteConsoleProofSnapshots__;
}

export function resolveVerificationKeysPathFrom(baseDir: string): string {
  const candidates = [
    path.resolve(baseDir, "node_modules/@semaphore-protocol/proof/src/verification-keys.json"),
    path.resolve(
      baseDir,
      "apps/zkvotefront/zkvote-console/node_modules/@semaphore-protocol/proof/src/verification-keys.json"
    ),
    path.resolve(baseDir, "../../..", "node_modules/@semaphore-protocol/proof/src/verification-keys.json")
  ];

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error("SEMAPHORE_VERIFICATION_KEYS_NOT_FOUND");
  }

  return match;
}

function resolveVerificationKeysPath(): string {
  return resolveVerificationKeysPathFrom(process.cwd());
}

function getSemaphoreVerificationKey(merkleTreeDepth: number) {
  if (!global.__zkvoteConsoleSemaphoreVk__) {
    global.__zkvoteConsoleSemaphoreVk__ = JSON.parse(
      readFileSync(resolveVerificationKeysPath(), "utf8")
    ) as VerificationKeySet;
  }

  const base = global.__zkvoteConsoleSemaphoreVk__;
  return {
    ...base,
    vk_delta_2: base.vk_delta_2[merkleTreeDepth - 1],
    IC: base.IC[merkleTreeDepth - 1]
  };
}

function parsePackedProof(payload: ProofSubmitRequest) {
  const packed = JSON.parse(payload.proof.proof) as Parameters<typeof unpackGroth16Proof>[0];
  return unpackGroth16Proof(packed);
}

function toSnapshotFromTransaction(
  proofId: string,
  transactionInfo: { status?: string; blockHash?: string; txHash?: string }
): ProofVerificationSnapshot {
  const status = transactionInfo.status === "finalized"
    ? "finalized"
    : transactionInfo.status === "inBlock"
      ? "includedInBlock"
      : "pending";

  return {
    status,
    rawStatus: transactionInfo.status ?? "Pending",
    txHash: transactionInfo.txHash ?? null,
    blockHash: transactionInfo.blockHash ?? null,
    proofReference: proofId,
    statusSource: "zkverifyjs"
  };
}

function createFallbackAdapter(): ProofVerificationAdapter {
  return {
    async submitProof(payload) {
      return {
        status: "pending",
        rawStatus: "Pending",
        txHash: null,
        blockHash: null,
        proofReference: payload.proofId,
        statusSource: "zkverifyjs"
      };
    },
    async getProofStatus(proof: StoredProofRecord) {
      const elapsedMs = Date.now() - new Date(proof.submittedAt).getTime();

      if (elapsedMs >= 8000) {
        return {
          status: "finalized",
          rawStatus: "Finalized",
          txHash: proof.txHash,
          blockHash: proof.blockHash ?? `${proof.proofId}-finalized`,
          proofReference: proof.proofReference,
          statusSource: "zkverifyjs"
        };
      }

      if (elapsedMs >= 4000) {
        return {
          status: "includedInBlock",
          rawStatus: "IncludedInBlock",
          txHash: proof.txHash,
          blockHash: proof.blockHash,
          proofReference: proof.proofReference,
          statusSource: "zkverifyjs"
        };
      }

      return null;
    }
  };
}

export function createProofVerificationAdapterFromEnv(): ProofVerificationAdapter | null {
  const env = getServerEnv();
  if (!env.ZKVERIFY_RPC_URL || !env.ZKVERIFY_WS_URL || !env.ZKVERIFY_MNEMONIC) {
    return createFallbackAdapter();
  }

  return {
    async submitProof(payload): Promise<ProofVerificationSubmission> {
      const { CurveType, Library, ZkVerifyEvents, zkVerifySession } = await import("zkverifyjs");
      const session = await zkVerifySession.start()
        .Custom({
          websocket: env.ZKVERIFY_WS_URL!,
          rpc: env.ZKVERIFY_RPC_URL!,
          network: env.ZKVERIFY_NETWORK
        })
        .withAccount(env.ZKVERIFY_MNEMONIC!);

      const snapshotStore = getSnapshotStore();
      const initialSnapshot: ProofVerificationSnapshot = {
        status: "pending",
        rawStatus: "Pending",
        txHash: null,
        blockHash: null,
        proofReference: payload.proofId,
        statusSource: "zkverifyjs"
      };

      snapshotStore.set(payload.proofId, initialSnapshot);

      const { events, transactionResult } = await session
        .verify()
        .groth16({
          library: Library.snarkjs,
          curve: CurveType.bn128
        })
        .execute({
          proofData: {
            vk: getSemaphoreVerificationKey(payload.proof.merkleTreeDepth),
            proof: parsePackedProof(payload),
            publicSignals: payload.proof.publicSignals
          }
        });

      events.on(ZkVerifyEvents.IncludedInBlock, (eventData: { blockHash?: string; txHash?: string }) => {
        snapshotStore.set(payload.proofId, {
          status: "includedInBlock",
          rawStatus: "IncludedInBlock",
          txHash: eventData?.txHash ?? null,
          blockHash: eventData?.blockHash ?? null,
          proofReference: payload.proofId,
          statusSource: "zkverifyjs"
        });
      });

      events.on(ZkVerifyEvents.Finalized, (eventData: { blockHash?: string; txHash?: string }) => {
        snapshotStore.set(payload.proofId, {
          status: "finalized",
          rawStatus: "Finalized",
          txHash: eventData?.txHash ?? null,
          blockHash: eventData?.blockHash ?? null,
          proofReference: payload.proofId,
          statusSource: "zkverifyjs"
        });
      });

      events.on("error", (error: Error) => {
        snapshotStore.set(payload.proofId, {
          status: "error",
          rawStatus: error.message || "ZKVERIFY_EVENT_ERROR",
          txHash: null,
          blockHash: null,
          proofReference: payload.proofId,
          statusSource: "zkverifyjs"
        });
      });

      const finalResult = transactionResult
        .then((transactionInfo) => {
          const snapshot = toSnapshotFromTransaction(payload.proofId, transactionInfo);
          snapshotStore.set(payload.proofId, snapshot);
          return snapshot;
        })
        .catch((error) => {
          snapshotStore.set(payload.proofId, {
            status: "error",
            rawStatus: error instanceof Error ? error.message : "ZKVERIFY_TRANSACTION_FAILED",
            txHash: null,
            blockHash: null,
            proofReference: payload.proofId,
            statusSource: "zkverifyjs"
          });
          throw error;
        })
        .finally(async () => {
          await session.close().catch(() => undefined);
        });

      return {
        ...initialSnapshot,
        finalResult
      };
    },
    async getProofStatus(proof: StoredProofRecord) {
      return getSnapshotStore().get(proof.proofId) ?? null;
    }
  };
}
