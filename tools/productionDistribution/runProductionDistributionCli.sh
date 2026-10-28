#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${repository_root}"

node_modules/.bin/rimraf libraries/config/lib
node_modules/.bin/tsc --build libraries/config/tsconfig.json --clean >&2
node_modules/.bin/tsc --project libraries/config/tsconfig.json >&2

exec node \
  "${repository_root}/tools/releaseCli/productionDistributionCli.mts" \
  "$@"
