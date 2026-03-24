#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

grep -q "zkverifyjs-non-aggregation" "$ROOT/docs/zkvote/submission-mode.md"
grep -q "zkverifyjs-non-aggregation" "$ROOT/docs/zkvote/verification-route.md"
grep -q "sqlite" "$ROOT/docs/zkvote/indexer-strategy.md"

echo "Decision lock check passed."
