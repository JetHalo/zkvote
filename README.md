# zkvote

Anonymous NFT voting scaffold based on zkVerify status tracking.

## Stack

- Next.js (Pages Router)
- TypeScript
- PSE Semaphore JS (browser proof generation)
- Offchain vote tally with zkVerifyJS status source
- Solidity proposal registry (rule locking only, no onchain proof verification)
- PostgreSQL + Goldsky
- Horizen (Base L3) as target chain

## Quick Start

1. `npm install`
2. `cp apps/zkvotefront/zkvote-console/.env.local.example apps/zkvotefront/zkvote-console/.env.local`
3. `cp contracts/.env.example contracts/.env`
4. `npm run db:init --workspace zkvote-console`
5. `npm run dev`

If you do not provide `DATABASE_URL`, the app falls back to the in-memory dev repository. If you do not provide zkVerify envs, proof status falls back to the deterministic local adapter.

## Locked Decisions

- submission mode: `zkverifyjs-non-aggregation`
- verification route: `zkverifyjs-non-aggregation`
- indexer strategy: `hybrid (PostgreSQL + Goldsky)`
- target chain: `Horizen Mainnet (Base L3)`
- nft pass rule: `public mint + transferable`
- proof system: `Semaphore + Groth16 + zkVerifyJS`

See docs in `docs/zkvote`.
