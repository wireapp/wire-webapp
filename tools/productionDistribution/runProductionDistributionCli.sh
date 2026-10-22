#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${repository_root}"

npm exec -- nx run config-lib:build >&2

exec node \
  "${repository_root}/tools/releaseCli/productionDistributionCli.mts" \
  "$@"
