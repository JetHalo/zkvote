import { z } from "zod";
import type { AppConfig, Language } from "@/domain/types";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("zkVote"),
  NEXT_PUBLIC_DEFAULT_LANGUAGE: z.enum(["en", "zh"]).default("en"),
  NEXT_PUBLIC_CHAIN_NAME: z.string().default("Horizen Testnet"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().default(2651420),
  NEXT_PUBLIC_RPC_URL: z.string().default("https://horizen-testnet.rpc.caldera.xyz/http"),
  NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: z.string().optional().transform((value) => value || null),
  NEXT_PUBLIC_PROPOSAL_REGISTRY_ADDRESS: z.string().optional().transform((value) => value || null),
  NEXT_PUBLIC_IPFS_GATEWAY_URL: z.string().default("https://ipfs.io/ipfs"),
  NEXT_PUBLIC_ENABLE_DEV_MOCKS: z.string().default("false"),
  DATABASE_URL: z.string().optional(),
  GOLDSKY_SUBGRAPH_URL: z.string().optional(),
  GOLDSKY_API_KEY: z.string().optional(),
  GOLDSKY_RPC_URL: z.string().optional(),
  IPFS_API_URL: z.string().optional(),
  IPFS_API_KEY: z.string().optional(),
  IPFS_API_AUTH_HEADER: z.string().default("Authorization"),
  ZKVERIFY_RPC_URL: z.string().optional(),
  ZKVERIFY_WS_URL: z.string().optional(),
  ZKVERIFY_NETWORK: z.string().default("Volta"),
  ZKVERIFY_MNEMONIC: z.string().optional()
});

type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function getDefaultLanguage(): Language {
  return getServerEnv().NEXT_PUBLIC_DEFAULT_LANGUAGE;
}

export function getPublicAppConfig(): AppConfig {
  const env = getServerEnv();

  return {
    appName: env.NEXT_PUBLIC_APP_NAME,
    defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
    chainName: env.NEXT_PUBLIC_CHAIN_NAME,
    chainId: env.NEXT_PUBLIC_CHAIN_ID,
    rpcUrl: env.NEXT_PUBLIC_RPC_URL,
    nftContractAddress: env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS,
    proposalRegistryAddress: env.NEXT_PUBLIC_PROPOSAL_REGISTRY_ADDRESS,
    ipfsGatewayUrl: env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
    ipfsConfigured: Boolean(env.IPFS_API_URL),
    proofRoute: "zkverifyjs-non-aggregation",
    proofSystem: "groth16",
    proofProtocol: "semaphore",
    serviceMode: env.DATABASE_URL ? "postgresql" : "memory",
    goldskyConfigured: Boolean(env.GOLDSKY_SUBGRAPH_URL),
    zkVerifyConfigured: Boolean(env.ZKVERIFY_RPC_URL && env.ZKVERIFY_WS_URL && env.ZKVERIFY_MNEMONIC)
  };
}

export function isDevMockEnabled(): boolean {
  return getServerEnv().NEXT_PUBLIC_ENABLE_DEV_MOCKS === "true";
}
