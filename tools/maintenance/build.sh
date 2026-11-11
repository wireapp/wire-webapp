#!/usr/bin/env bash

set -euo pipefail

: "${WIRE_WEBAPP_BUILD_VERSION:?WIRE_WEBAPP_BUILD_VERSION is required}"
: "${WIRE_WEBAPP_BUILD_COMMIT:?WIRE_WEBAPP_BUILD_COMMIT is required}"

maintenance_build_script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
webapp_source_directory="$(cd "${maintenance_build_script_directory}/../.." && pwd)"

cd "${webapp_source_directory}"

export WIRE_WEBAPP_CONFIGURATION=production
export WIRE_WEBAPP_BUILD_VERSION
export WIRE_WEBAPP_BUILD_COMMIT

npm clean-install
npx just setup
npx just package-server-public

if [[ ! -s apps/server/dist/s3/ebs.zip ]]; then
  echo 'Public production build did not produce apps/server/dist/s3/ebs.zip.' >&2
  exit 1
fi

if [[ ! -s apps/server/dist/version.json ]]; then
  echo 'Public production build did not produce apps/server/dist/version.json.' >&2
  exit 1
fi

if [[ ! -s apps/server/dist/index.js ]] || [[ ! -s apps/server/dist/configuration/server.config.js ]]; then
  echo 'Public production build did not produce the compiled server and configuration required by Docker.' >&2
  exit 1
fi
