# zkVote Goldsky Subgraph

This subgraph indexes the chain facts that the app must be able to recover after restart:

- `VotingPass.Transfer`
- `ProposalRegistry.ProposalCreated`
- `ProposalRegistry.GroupRootSet`
- `Proposal.metadataUri` so proposal bodies can be recovered from IPFS

## Files

- `schema.graphql`: indexed entities
- `subgraph.yaml`: manifest and data sources
- `src/voting-pass.ts`: token mint/transfer handlers
- `src/proposal-registry.ts`: proposal creation and group root handlers

## Before Deploying

1. update `source.address` for both contracts if you redeployed them
2. update `startBlock` to the deployment block for each contract
3. keep the network slug aligned with the Goldsky-supported chain

## Local Validation

```bash
cd /Users/jethalo/projects/zkvote/subgraphs/zkvote
npm install
npx graph codegen subgraph.yaml
npx graph build subgraph.yaml
```

## Goldsky Deploy

```bash
goldsky login
goldsky subgraph deploy zkvote-horizen-testnet/1.0.0 --path /Users/jethalo/projects/zkvote/subgraphs/zkvote
```

After deploy, copy the query endpoint into:

```bash
/Users/jethalo/projects/zkvote/apps/zkvotefront/zkvote-console/.env.local
```

Key:

```bash
GOLDSKY_SUBGRAPH_URL=https://api.goldsky.com/api/public/<project>/subgraphs/zkvote-horizen-testnet/1.0.0/gn
```
