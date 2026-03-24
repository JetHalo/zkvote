# zkvote Circuit Intake

## Circuit Strategy

- primary language decision: `Noir` (factory default)
- implementation choice for this case: `no custom circuit in repo`
- proof generation path: `PSE official Semaphore JS`

## Why

- 本项目目标是匿名投票产品落地，优先复用 Semaphore 官方证明流程。
- 不在本仓库维护自定义电路，减少电路维护与 trusted setup 成本。

## Public Inputs

- merkleRoot
- nullifierHash
- externalNullifier (proposalId hash)
- signalHash (choice hash)

## Business Binding Envelope

- businessDomain
- appId
- userAddr
- chainId
- timestamp
