# Contract Deployment

This repo does not currently include a Foundry deployment script.
Use `forge create` directly.

## Prerequisites

- Foundry installed
- funded deployer wallet on the target chain
- `contracts/.env` created from `contracts/.env.example`

## 1. Prepare env

```bash
cd /Users/jethalo/projects/zkvote
cp contracts/.env.example contracts/.env
```

Fill at least:

```bash
PRIVATE_KEY=your_private_key_without_0x
RPC_URL=https://horizen-testnet.rpc.caldera.xyz/http
CHAIN_ID=2651420
```

## 2. Load env

```bash
cd /Users/jethalo/projects/zkvote/contracts
set -a
source .env
set +a
```

## 3. Check deployer address and balance

```bash
cast wallet address --private-key "$PRIVATE_KEY"
cast balance "$(cast wallet address --private-key "$PRIVATE_KEY")" --rpc-url "$RPC_URL"
```

## 4. Deploy VotingPass

Constructor args:
- `name`
- `symbol`
- `baseTokenURI`

Example:

```bash
forge create src/VotingPass.sol:VotingPass \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --constructor-args "zkVote Pass" "ZKPASS" "ipfs://zkvote-pass/"
```

Copy the deployed address and write it into:

```bash
contracts/.env
apps/zkvotefront/zkvote-console/.env.local
```

Keys:

```bash
NFT_PASS_ADDRESS=0x...
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
```

## 5. Deploy ProposalRegistry

`ProposalRegistry` has no constructor args.
If you deployed it before the `metadataUri` upgrade, redeploy it and update both the frontend env and Goldsky subgraph addresses.

```bash
forge create src/ProposalRegistry.sol:ProposalRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Copy the deployed address and write it into:

```bash
contracts/.env
apps/zkvotefront/zkvote-console/.env.local
```

Keys:

```bash
PROPOSAL_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PROPOSAL_REGISTRY_ADDRESS=0x...
```

## 6. Verify deployment worked

Check token metadata:

```bash
cast call "$NFT_PASS_ADDRESS" "name()(string)" --rpc-url "$RPC_URL"
cast call "$NFT_PASS_ADDRESS" "symbol()(string)" --rpc-url "$RPC_URL"
cast call "$PROPOSAL_REGISTRY_ADDRESS" "nextProposalId()(uint256)" --rpc-url "$RPC_URL"
```

## 7. Optional: test mint from CLI

```bash
cast send "$NFT_PASS_ADDRESS" "mint()" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Then inspect:

```bash
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
cast call "$NFT_PASS_ADDRESS" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC_URL"
cast call "$NFT_PASS_ADDRESS" "ownerOf(uint256)(address)" 1 --rpc-url "$RPC_URL"
```

## 8. Start frontend with deployed addresses

From repo root:

```bash
cd /Users/jethalo/projects/zkvote
npm run dev --workspace zkvote-console -- --hostname 0.0.0.0 --port 3101
```

## 9. Build and deploy the Goldsky subgraph

Goldsky currently lists `Horizen Testnet` with slug `horizen-testnet`, and its official deploy docs use:
- `goldsky login`
- `goldsky subgraph deploy <name>/<version> --path .`

Prepare the checked-in scaffold:

```bash
cd /Users/jethalo/projects/zkvote/subgraphs/zkvote
npm install
npx graph codegen subgraph.yaml
npx graph build subgraph.yaml
goldsky subgraph deploy zkvote-horizen-testnet/1.0.0 --path .
```

After deploy, copy the query endpoint into:

```bash
apps/zkvotefront/zkvote-console/.env.local
```

Key:

```bash
GOLDSKY_SUBGRAPH_URL=https://api.goldsky.com/api/public/<project>/subgraphs/zkvote-horizen-testnet/1.0.0/gn
```

## Notes

- The frontend already uses real contract transactions for minting passes and creating proposals.
- Goldsky is required if you want the app to recover already-minted NFTs and already-created proposals after restart.
- PostgreSQL is required if you want memberships, proofs, votes, and proposal metadata URIs to survive restart.
- `ProposalRegistry` now stores both `metadataHash` and `metadataUri`, so the app can recover proposal copy from `Goldsky + IPFS` even if the database row is missing.
- These commands deploy real contracts; they do not automatically update ABI export files.
