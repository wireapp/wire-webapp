#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${repository_root}"

"${repository_root}/bin/yarn" nx run config-lib:build >&2

exec "${repository_root}/bin/yarn" ts-node \
  --project "${repository_root}/tsconfig.tools.json" \
  "${repository_root}/tools/production-distribution/productionDistributionCli.ts" \
  "$@"
