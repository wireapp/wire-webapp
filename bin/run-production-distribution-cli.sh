#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${repository_root}"

./bin/yarn nx run config-lib:build >&2

exec ./bin/yarn ts-node \
  --project ./tsconfig.bin.json \
  ./bin/productionDistributionCli.ts \
  "$@"
