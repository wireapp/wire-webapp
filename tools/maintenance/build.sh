#!/usr/bin/env bash

set -euo pipefail

: "${WIRE_WEBAPP_BUILD_VERSION:?WIRE_WEBAPP_BUILD_VERSION is required}"
: "${WIRE_WEBAPP_BUILD_COMMIT:?WIRE_WEBAPP_BUILD_COMMIT is required}"

readonly maintenance_build_script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly repository_root="$(cd "${maintenance_build_script_directory}/../.." && pwd)"

cd "${repository_root}"

export WIRE_WEBAPP_CONFIGURATION=production
export WIRE_WEBAPP_BUILD_VERSION
export WIRE_WEBAPP_BUILD_COMMIT
export FORCED_CONFIG_URL=''
export DISTRIBUTION=wire

./bin/yarn --immutable
./bin/yarn build:prod:public

if [[ ! -s apps/server/dist/s3/ebs.zip ]]; then
  echo 'Public production build did not produce apps/server/dist/s3/ebs.zip.' >&2
  exit 1
fi

if [[ ! -s apps/server/dist/version.json ]]; then
  echo 'Public production build did not produce apps/server/dist/version.json.' >&2
  exit 1
fi

if [[ ! -s apps/server/dist/index.js ]]; then
  echo 'Public production build did not produce apps/server/dist/index.js required by Docker.' >&2
  exit 1
fi

if [[ ! -d libraries/config/lib ]]; then
  echo 'Public production build did not produce libraries/config/lib required by Docker.' >&2
  exit 1
fi
