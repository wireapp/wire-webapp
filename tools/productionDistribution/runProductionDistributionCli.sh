#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${repository_root}"


exec node \
  "${repository_root}/tools/releaseCli/productionDistributionCli.mts" \
  "$@"
