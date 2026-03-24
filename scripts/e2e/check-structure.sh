#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

required=(
  "$ROOT/apps/web"
  "$ROOT/circuits"
  "$ROOT/contracts"
  "$ROOT/docs"
  "$ROOT/scripts"
  "$ROOT/apps/web/pages/api/submit-proof.ts"
  "$ROOT/apps/web/pages/api/proof-status.ts"
  "$ROOT/docs/zkvote/submission-mode.md"
  "$ROOT/docs/zkvote/verification-route.md"
  "$ROOT/docs/zkvote/indexer-strategy.md"
)

for path in "${required[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "Missing required path: $path"
    exit 1
  fi
done

echo "Structure check passed."
